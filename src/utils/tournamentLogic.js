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
// Two arenas = at most 2 concurrent matches per round.
// Every team plays exactly `gamesPerTeam` games with no repeat opponents.
// Among many random valid schedules, keep the one with the fewest
// back-to-back games (a team playing two rounds in a row).

export const MATCHES_PER_ROUND = 2;

// Games-per-team choices that produce a valid schedule for n teams
export function gamesPerTeamOptions(n) {
  const opts = [];
  for (let g = 1; g <= n - 1; g++) if ((n * g) % 2 === 0) opts.push(g);
  return opts;
}

// Random graph where every team has exactly g opponents (null if this attempt dead-ends)
function randomRegularPairs(ids, g) {
  const deg = Object.fromEntries(ids.map((id) => [id, 0]));
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
  }
  const chosen = [];
  for (const [a, b] of shuffle(pairs)) {
    if (deg[a] < g && deg[b] < g) {
      chosen.push([a, b]);
      deg[a]++;
      deg[b]++;
    }
  }
  return ids.every((id) => deg[id] === g) ? chosen : null;
}

// Packs pairs into rounds of up to 2 disjoint games, preferring rested teams
function packRounds(pairs) {
  const remaining = shuffle(pairs);
  const rounds = [];
  let lastPlayed = new Set();
  let backToBack = 0;

  while (remaining.length) {
    const round = [];
    const busy = new Set();
    for (let slot = 0; slot < MATCHES_PER_ROUND; slot++) {
      let best = -1;
      let bestCost = Infinity;
      remaining.forEach(([a, b], i) => {
        if (busy.has(a) || busy.has(b)) return;
        const cost = (lastPlayed.has(a) ? 1 : 0) + (lastPlayed.has(b) ? 1 : 0);
        if (cost < bestCost) { bestCost = cost; best = i; }
      });
      if (best === -1) break;
      const [a, b] = remaining.splice(best, 1)[0];
      round.push([a, b]);
      busy.add(a);
      busy.add(b);
      backToBack += bestCost;
    }
    rounds.push(round);
    lastPlayed = busy;
  }
  return { rounds, backToBack };
}

export function generateRoundRobin(teams, gamesPerTeam = 2) {
  const ids = teams.map((t) => t.id);
  let best = null;

  for (let attempt = 0; attempt < 400; attempt++) {
    const pairs = randomRegularPairs(ids, gamesPerTeam);
    if (!pairs) continue;
    const packed = packRounds(pairs);
    const minRounds = Math.ceil(pairs.length / MATCHES_PER_ROUND);
    const score = (packed.rounds.length - minRounds) * 100 + packed.backToBack;
    if (!best || score < best.score) best = { ...packed, score };
    if (score === 0) break;
  }
  if (!best) throw new Error(`Can't schedule ${gamesPerTeam} games each for ${ids.length} teams`);

  return best.rounds.map((pairs, ri) => ({
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
  return Object.values(stats).sort(
    (a, b) => b.wins - a.wins || b.scoreDiff - a.scoreDiff || b.pf - a.pf
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

  // 6 teams: Quarterfinals (1st and 2nd have byes) → Semifinals → Final
  if (n === 6) {
    return {
      phase: '6team',
      rounds: [
        {
          name: 'Quarterfinals',
          matches: [
            mk('sf1', s(3), s(6), 'ff1', 1),
            mk('sf2', s(4), s(5), 'ff2', 1),
          ],
        },
        {
          name: 'Semifinals',
          matches: [
            mk('ff1', null, s(1), 'final', 1),
            mk('ff2', null, s(2), 'final', 2),
          ],
        },
      ],
      final: makeFinal(),
    };
  }

  // 7 teams: Quarterfinals (1st has a bye) → Semifinals → Final
  if (n === 7) {
    return {
      phase: '7team',
      rounds: [
        {
          name: 'Quarterfinals',
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

// ── FORMAT ───────────────────────────────────────────────────────────────────

// Playoff sizes offered for n teams: everyone, or the top 4
export function playoffOptions(n) {
  return n > 4 ? [n, 4] : [n];
}

// Plain-language summary of a format, for the setup preview
export function describeFormat(n, gamesPerTeam, playoffTeams) {
  const rrGames = (n * gamesPerTeam) / 2;
  const rrRounds = Math.ceil(rrGames / MATCHES_PER_ROUND);
  const seeds = Array.from({ length: playoffTeams }, (_, i) => ({ teamId: `s${i + 1}` }));
  const bracket = generateBracket(seeds);
  const playoffStages = [...bracket.rounds.map((r) => r.name), 'Final (best of 3)'];
  const playoffGames = bracket.rounds.reduce((sum, r) => sum + r.matches.length, 0);
  return { rrGames, rrRounds, playoffStages, playoffGames, eliminated: n - playoffTeams, bracket };
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

// 1 -> "1st", 2 -> "2nd", 11 -> "11th"
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getTeamName(teams, teamId) {
  if (!teamId) return 'TBD';
  const team = teams.find((t) => t.id === teamId);
  if (!team) return '?';
  return team.names.join(' & ');
}

export function isRoundRobinComplete(rounds) {
  return rounds.every((r) => r.matches.every((m) => m.completed));
}
