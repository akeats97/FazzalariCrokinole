import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  runTransaction,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import { computeStandings, generateBracket, isRoundRobinComplete } from '../utils/tournamentLogic';

const META_REF = doc(db, 'meta', 'activeTournament');

// ── READ ──────────────────────────────────────────────────────────────────────

export async function checkActiveTournament() {
  const snap = await getDoc(META_REF);
  if (!snap.exists() || !snap.data().tournamentId) return null;
  const { tournamentId } = snap.data();
  const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!tSnap.exists()) return null;
  const { status, teams } = tSnap.data();
  if (status === 'complete') return null;
  return { tournamentId, status, teamCount: teams.length };
}

export function subscribeTournament(tournamentId, cb) {
  return onSnapshot(doc(db, 'tournaments', tournamentId), (snap) => {
    cb(snap.exists() ? { ...snap.data(), id: snap.id } : null);
  });
}

export function subscribeCupHistory(cb) {
  return onSnapshot(
    query(collection(db, 'cupHistory'), orderBy('date', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createTournament({ teams, rounds, format }) {
  // Block if active tournament already exists
  const activeMeta = await getDoc(META_REF);
  if (activeMeta.exists() && activeMeta.data().tournamentId) {
    const existing = await getDoc(
      doc(db, 'tournaments', activeMeta.data().tournamentId)
    );
    if (existing.exists() && existing.data().status !== 'complete') {
      throw new Error('ACTIVE_EXISTS');
    }
  }

  const tRef = doc(collection(db, 'tournaments'));
  const standings = teams.map((t) => ({
    teamId: t.id,
    wins: 0,
    losses: 0,
    scoreDiff: 0,
    pf: 0,
    pa: 0,
  }));

  await setDoc(tRef, {
    id: tRef.id,
    status: 'roundrobin',
    teams,
    rounds,
    format,
    standings,
    bracket: null,
    winnersTeamId: null,
    createdAt: serverTimestamp(),
    completedAt: null,
  });
  await setDoc(META_REF, { tournamentId: tRef.id });
  return tRef.id;
}

// ── SCORE SUBMISSION ──────────────────────────────────────────────────────────

export async function submitRRScore(tournamentId, roundIdx, matchId, score1, score2) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'tournaments', tournamentId);
    const snap = await tx.get(ref);
    const data = snap.data();
    if (playoffsStarted(data.bracket)) throw new Error('PLAYOFFS_STARTED');

    const rounds = data.rounds.map((r, ri) =>
      ri !== roundIdx
        ? r
        : {
            ...r,
            matches: r.matches.map((m) =>
              m.id !== matchId ? m : { ...m, score1, score2, completed: true, ...stamp(m) }
            ),
          }
    );

    const standings = computeStandings(data.teams, rounds);
    const update = { rounds, standings };

    // Re-seed the bracket if a round robin score changes before any playoff game is played
    if (isRoundRobinComplete(rounds)) {
      update.bracket = generateBracket(standings.slice(0, playoffSize(data)));
      update.status = 'playoffs';
    }

    tx.update(ref, update);
  });
}

export async function submitBracketScore(tournamentId, matchId, score1, score2) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'tournaments', tournamentId);
    const snap = await tx.get(ref);
    const bracket = JSON.parse(JSON.stringify(snap.data().bracket));

    let found = false;
    for (const round of bracket.rounds) {
      const match = round.matches.find((m) => m.id === matchId);
      if (!match) continue;
      found = true;

      const winner = score1 > score2 ? match.team1Id : match.team2Id;
      if (match.completed && match.winnerId !== winner && nextGameStarted(bracket, match.feedsTo)) {
        throw new Error('DOWNSTREAM_STARTED');
      }
      Object.assign(match, stamp(match));
      match.score1 = score1;
      match.score2 = score2;
      match.completed = true;
      match.winnerId = winner;

      if (match.feedsTo === 'final') {
        if (match.feedsSlot === 1) bracket.final.team1Id = winner;
        else bracket.final.team2Id = winner;
      } else {
        for (const r2 of bracket.rounds) {
          const m2 = r2.matches.find((m) => m.id === match.feedsTo);
          if (m2) {
            if (match.feedsSlot === 1) m2.team1Id = winner;
            else m2.team2Id = winner;
          }
        }
      }
      break;
    }

    if (!found) throw new Error('Match not found: ' + matchId);
    tx.update(ref, { bracket });
  });
}

export async function submitFinalGame(tournamentId, gameNum, score1, score2) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'tournaments', tournamentId);
    const snap = await tx.get(ref);
    const bracket = JSON.parse(JSON.stringify(snap.data().bracket));

    const game = bracket.final.games.find((g) => g.gameNum === gameNum);
    if (!game) throw new Error('Game not found');
    Object.assign(game, stamp(game));
    game.score1 = score1;
    game.score2 = score2;
    game.completed = true;

    const w1 = bracket.final.games.filter((g) => g.completed && g.score1 > g.score2).length;
    const w2 = bracket.final.games.filter((g) => g.completed && g.score2 > g.score1).length;
    bracket.final.team1Wins = w1;
    bracket.final.team2Wins = w2;
    if (w1 >= 2) bracket.final.winnerId = bracket.final.team1Id;
    else if (w2 >= 2) bracket.final.winnerId = bracket.final.team2Id;
    else bracket.final.winnerId = null;

    tx.update(ref, { bracket });
  });
}

// When a game was first scored and last edited (ms), for later stats.
// Client clock, since serverTimestamp() can't be used inside arrays.
function stamp(game) {
  const now = Date.now();
  return game.completed ? { editedAt: now } : { scoredAt: now };
}

// Older tournaments have no format: every team made the playoffs
export function playoffSize(tournament) {
  return tournament.format?.playoffTeams ?? tournament.teams.length;
}

function playoffsStarted(bracket) {
  if (!bracket) return false;
  return (
    bracket.rounds.some((r) => r.matches.some((m) => m.completed)) ||
    bracket.final.games.some((g) => g.completed)
  );
}

function nextGameStarted(bracket, feedsTo) {
  if (feedsTo === 'final') return bracket.final.games.some((g) => g.completed);
  for (const round of bracket.rounds) {
    const next = round.matches.find((m) => m.id === feedsTo);
    if (next) return next.completed;
  }
  return false;
}

// ── COMPLETE ──────────────────────────────────────────────────────────────────

export async function crownWinner(tournamentId, winnerTeam) {
  const ref = doc(db, 'tournaments', tournamentId);
  await updateDoc(ref, {
    status: 'complete',
    winnersTeamId: winnerTeam.id,
    completedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'cupHistory'), {
    winners: winnerTeam.names,
    date: serverTimestamp(),
    tournamentId,
  });
  await setDoc(META_REF, { tournamentId: null });
}

// ── MANAGE ────────────────────────────────────────────────────────────────────

export async function updateTeamNames(tournamentId, teams) {
  await updateDoc(doc(db, 'tournaments', tournamentId), { teams });
}

export async function deleteTournament(tournamentId) {
  await deleteDoc(doc(db, 'tournaments', tournamentId));
  const meta = await getDoc(META_REF);
  if (meta.exists() && meta.data().tournamentId === tournamentId) {
    await setDoc(META_REF, { tournamentId: null });
  }
}

// ── CUP PHOTOS ────────────────────────────────────────────────────────────────
// Stored apart from cupHistory so the home screen's history listener stays small

export async function getCupPhoto(entryId) {
  const snap = await getDoc(doc(db, 'cupPhotos', entryId));
  return snap.exists() ? snap.data().dataUrl : null;
}

export async function setCupPhoto(entryId, dataUrl) {
  await setDoc(doc(db, 'cupPhotos', entryId), { dataUrl, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, 'cupHistory', entryId), { photoUpdatedAt: serverTimestamp() });
}

export async function removeCupPhoto(entryId) {
  await deleteDoc(doc(db, 'cupPhotos', entryId));
  await updateDoc(doc(db, 'cupHistory', entryId), { photoUpdatedAt: null });
}
