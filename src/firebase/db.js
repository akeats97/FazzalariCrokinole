import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
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
  const { tournamentId, pin } = snap.data();
  const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!tSnap.exists()) return null;
  if (tSnap.data().status === 'complete') return null;
  return { tournamentId, pin };
}

export async function joinByPin(pin) {
  const snap = await getDoc(META_REF);
  if (!snap.exists() || !snap.data().tournamentId) return { error: 'NO_ACTIVE' };
  const { tournamentId } = snap.data();
  const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!tSnap.exists()) return { error: 'NOT_FOUND' };
  const data = tSnap.data();
  if (data.pin !== pin) return { error: 'WRONG_PIN' };
  if (data.status === 'complete') return { error: 'EXPIRED' };
  return { tournamentId, data: { id: tournamentId, ...data } };
}

export function subscribeTournament(tournamentId, cb) {
  return onSnapshot(doc(db, 'tournaments', tournamentId), (snap) => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() });
  });
}

export function subscribeCupHistory(cb) {
  return onSnapshot(
    query(collection(db, 'cupHistory'), orderBy('date', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createTournament({ pin, teams, rounds }) {
  // Block if active tournament already exists
  const activeMeta = await getDoc(META_REF);
  if (activeMeta.exists() && activeMeta.data().tournamentId) {
    const existing = await getDoc(
      doc(db, 'tournaments', activeMeta.data().tournamentId)
    );
    if (existing.exists() && existing.data().status !== 'complete') {
      const err = new Error('ACTIVE_EXISTS');
      err.existingPin = activeMeta.data().pin;
      throw err;
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
    pin,
    status: 'roundrobin',
    teams,
    rounds,
    standings,
    bracket: null,
    winnersTeamId: null,
    createdAt: serverTimestamp(),
    completedAt: null,
  });
  await setDoc(META_REF, { tournamentId: tRef.id, pin });
  return tRef.id;
}

// ── SCORE SUBMISSION ──────────────────────────────────────────────────────────

export async function submitRRScore(tournamentId, roundIdx, matchId, score1, score2) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'tournaments', tournamentId);
    const snap = await tx.get(ref);
    const data = snap.data();

    const rounds = data.rounds.map((r, ri) =>
      ri !== roundIdx
        ? r
        : {
            ...r,
            matches: r.matches.map((m) =>
              m.id !== matchId ? m : { ...m, score1, score2, completed: true }
            ),
          }
    );

    const standings = computeStandings(data.teams, rounds);
    const update = { rounds, standings };

    if (isRoundRobinComplete(rounds)) {
      update.bracket = generateBracket(standings);
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

      match.score1 = score1;
      match.score2 = score2;
      match.completed = true;
      const winner = score1 > score2 ? match.team1Id : match.team2Id;
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
    game.score1 = score1;
    game.score2 = score2;
    game.completed = true;

    const w1 = bracket.final.games.filter((g) => g.completed && g.score1 > g.score2).length;
    const w2 = bracket.final.games.filter((g) => g.completed && g.score2 > g.score1).length;
    bracket.final.team1Wins = w1;
    bracket.final.team2Wins = w2;
    if (w1 >= 2) bracket.final.winnerId = bracket.final.team1Id;
    else if (w2 >= 2) bracket.final.winnerId = bracket.final.team2Id;

    tx.update(ref, { bracket });
  });
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
  await setDoc(META_REF, { tournamentId: null, pin: null });
}
