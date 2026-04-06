// ── ARENAS ───────────────────────────────────────────────────────────────────

export const ARENAS = ['Cucina Colosseo', 'Soggiorno Stadium'];
const ra = () => ARENAS[Math.floor(Math.random() * 2)];

// ── PIN ──────────────────────────────────────────────────────────────────────

export function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── SHUFFLE ──────────────────────────────────────────────────────────────────

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── TEAM GENERATION ──────────────────────────────────────────────────────────

// Pairs mode: randomly pair players into teams of 2
export function generateTeams(players) {
  const shuffled = shuffle(players.map((p) => p.trim()).filter(Boolean));
  const teams = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    teams.push({ id: `t${i / 2 + 1}`, names: [shuffled[i], shuffled[i + 1]] });
  }
  return teams;
}

// ── ROUND-ROBIN SCHEDULING ───────────────────────────────────────────────────
//
// Two arenas = exactly 2 concurrent matches per round (max).
// Greedy scheduler: assign shuffled matchups to rounds ensuring no team
// appears twice in the same round.
//
// Team counts → rounds:
//   4 teams → 3 rounds (6 games = all C(4,2) unique pairs, each team plays 3×)
//   5 teams → 3 rounds (6 games, ~2-3 games per team)
//   6 teams → 3 rounds (6 games, each team plays 2×, 1 bye round)
//   7-8 teams → 4 rounds (8 games, each team plays 2×)

export function generateRoundRobin(teams) {
  const MATCHES_PER_ROUND = 2;
  const n = teams.length;
  const numRounds = n <= 6 ? 3 : 4;

  // All possible matchups, shuffled
  const allPairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allPairs.push([teams[i].id, teams[j].id]);
    }
  }
  const shuffledPairs = shuffle(allPairs);

  // Greedy assignment
  const rounds = [];
  const used = [];

  for (const [t1, t2] of shuffledPairs) {
    let placed = false;
    for (let r = 0; r < rounds.length; r++) {
      if (
        rounds[r].length < MATCHES_PER_ROUND &&
        !used[r].has(t1) &&
        !used[r].has(t2)
      ) {
        rounds[r].push([t1, t2]);
        used[r].add(t1);
        used[r].add(t2);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rounds.push([[t1, t2]]);
      used.push(new Set([t1, t2]));
    }
  }

  return rounds.slice(0, numRounds).map((pairs, ri) => ({
    roundNumber: ri + 1,
    matches: pairs.map((pair, mi) => ({
      id: `r${ri + 1}m${mi + 1}`,
      team1Id: pair[0],
      team2Id: pair[1],
      arena: ARENAS[mi % 2],
      score1: null,
      score2: null,
      completed: false,
    })),
  }));
}

// ── STANDINGS ────────────────────────────────────────────────────────────────

export function computeStandings(teams, rounds) {
  const stats = {};
  for (const t of teams) {
    stats[t.id] = { teamId: t.id, wins: 0, losses: 0, scoreDiff: 0, pf: 0, pa: 0 };
  }
  for (const round of rounds) {
    for (const m of round.matches) {
      if (!m.completed) continue;
      const s1 = Number(m.score1);
      const s2 = Number(m.score2);
      if (stats[m.team1Id]) {
        stats[m.team1Id].pf += s1;
        stats[m.team1Id].pa += s2;
        stats[m.team1Id].scoreDiff += s1 - s2;
      }
      if (stats[m.team2Id]) {
        stats[m.team2Id].pf += s2;
        stats[m.team2Id].pa += s1;
        stats[m.team2Id].scoreDiff += s2 - s1;
      }
      if (s1 > s2) {
        if (stats[m.team1Id]) stats[m.team1Id].wins++;
        if (stats[m.team2Id]) stats[m.team2Id].losses++;
      } else if (s2 > s1) {
        if (stats[m.team2Id]) stats[m.team2Id].wins++;
        if (stats[m.team1Id]) stats[m.team1Id].losses++;
      }
    }
  }
  return Object.values(stats).sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : b.scoreDiff - a.scoreDiff
  );
}

// ── BRACKET GENERATION ───────────────────────────────────────────────────────

function makeFinal() {
  return {
    team1Id: null,
    team2Id: null,
    arena: 'Soggiorno Stadium',
    games: [
      { gameNum: 1, score1: null, score2: null, completed: false },
      { gameNum: 2, score1: null, score2: null, completed: false },
      { gameNum: 3, score1: null, score2: null, completed: false },
    ],
    team1Wins: 0,
    team2Wins: 0,
    winnerId: null,
  };
}

export function generateBracket(standings) {
  const n = standings.length;
  const s = (rank) => standings[rank - 1]?.teamId ?? null;
  const mk = (id, t1, t2, feedsTo, feedsSlot) => ({
    id, team1Id: t1, team2Id: t2, arena: ra(),
    score1: null, score2: null, completed: false, winnerId: null,
    feedsTo, feedsSlot,
  });

  // 4 teams: Semifinals → Final
  if (n === 4) {
    return {
      phase: '4team',
      rounds: [
        {
          name: 'Semifinals',
          matches: [
            mk('sf1', s(1), s(4), 'final', 1),
            mk('sf2', s(2), s(3), 'final', 2),
          ],
        },
      ],
      final: makeFinal(),
    };
  }

  // 5 teams: Play-in (4v5) → Semis → Final
  if (n === 5) {
    return {
      phase: '5team',
      rounds: [
        {
          name: 'Play-in',
          matches: [
            mk('pi1', s(4), s(5), 'sf1', 2), // winner faces 1st seed in sf1
          ],
        },
        {
          name: 'Semifinals',
          matches: [
            mk('sf1', s(1), null, 'final', 1), // 1st seed has bye; pi1 winner fills slot 2
            mk('sf2', s(2), s(3), 'final', 2),
          ],
        },
      ],
      final: makeFinal(),
    };
  }

  // 6 teams: Semis → Final Four → Final
  if (n === 6) {
    return {
      phase: '6team',
      rounds: [
        {
          name: 'Semifinals',
          matches: [
            mk('sf1', s(3), s(6), 'ff1', 1),
            mk('sf2', s(4), s(5), 'ff2', 1),
          ],
        },
        {
          name: 'Final Four',
          matches: [
            mk('ff1', null, s(1), 'final', 1),
            mk('ff2', null, s(2), 'final', 2),
          ],
        },
      ],
      final: makeFinal(),
    };
  }

  // 7 teams: First Round → Semis → Final
  if (n === 7) {
    return {
      phase: '7team',
      rounds: [
        {
          name: 'First Round',
          matches: [
            mk('fr1', s(2), s(7), 'sf1', 2),
            mk('fr2', s(3), s(6), 'sf2', 1),
            mk('fr3', s(4), s(5), 'sf2', 2),
          ],
        },
        {
          name: 'Semifinals',
          matches: [
            mk('sf1', s(1), null, 'final', 1),
            mk('sf2', null, null, 'final', 2),
          ],
        },
      ],
      final: makeFinal(),
    };
  }

  // 8 teams: Quarters → Semis → Final
  return {
    phase: '8team',
    rounds: [
      {
        name: 'Quarterfinals',
        matches: [
          mk('qf1', s(1), s(8), 'sf1', 1),
          mk('qf2', s(2), s(7), 'sf2', 1),
          mk('qf3', s(3), s(6), 'sf2', 2),
          mk('qf4', s(4), s(5), 'sf1', 2),
        ],
      },
      {
        name: 'Semifinals',
        matches: [
          mk('sf1', null, null, 'final', 1),
          mk('sf2', null, null, 'final', 2),
        ],
      },
    ],
    final: makeFinal(),
  };
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

export function getTeamName(teams, teamId) {
  if (!teamId) return 'TBD';
  const team = teams.find((t) => t.id === teamId);
  if (!team) return '?';
  return team.names.join(' & ');
}

export function isRoundRobinComplete(rounds) {
  return rounds.every((r) => r.matches.every((m) => m.completed));
}
