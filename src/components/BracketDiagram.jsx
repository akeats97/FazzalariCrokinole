import { getTeamName, ordinal } from '../utils/tournamentLogic';

// Tree-style picture of a playoff bracket: one column per round, lines from
// each game to the game its winner moves on to, with the champion under the final.

const BOX_W = 132;
const BOX_H = 52;
const ROW_H = 64; // vertical space per leaf game
const COL_GAP = 24;
const HEADER_H = 24;
const CHAMP_H = 48;
const CHAMP_GAP = 20; // champion sits under the final

const SHORT_ROUND = {
  'Play-in': 'Play-in',
  'First Round': 'R1',
  Quarterfinals: 'QF',
  Semifinals: 'SF',
  'Final Four': 'F4',
};

const SHORT_HEADER = {
  'First Round': 'First Round',
  Quarterfinals: 'Quarters',
  Semifinals: 'Semis',
  'Final Four': 'Final Four',
  'Play-in': 'Play-in',
};

// Builds positioned nodes: { id, col, y (in rows), slots: [{teamId, score, won}] }
function layout(bracket) {
  const nodes = {};
  bracket.rounds.forEach((round, col) =>
    round.matches.forEach((m, i) => {
      nodes[m.id] = {
        id: m.id,
        col,
        label: `${SHORT_ROUND[round.name] ?? round.name}${round.matches.length > 1 ? i + 1 : ''}`,
        feedsTo: m.feedsTo,
        feedsSlot: m.feedsSlot,
        slots: [
          { teamId: m.team1Id, score: m.completed ? m.score1 : null, won: m.completed && m.winnerId === m.team1Id },
          { teamId: m.team2Id, score: m.completed ? m.score2 : null, won: m.completed && m.winnerId === m.team2Id },
        ],
      };
    })
  );
  const f = bracket.final;
  const anyFinalGame = f.games.some((g) => g.completed);
  nodes.final = {
    id: 'final',
    col: bracket.rounds.length,
    label: 'Final',
    feedsTo: null,
    slots: [
      { teamId: f.team1Id, score: anyFinalGame ? f.team1Wins : null, won: f.winnerId && f.winnerId === f.team1Id },
      { teamId: f.team2Id, score: anyFinalGame ? f.team2Wins : null, won: f.winnerId && f.winnerId === f.team2Id },
    ],
  };

  // Place games depth-first from the final so games feeding the same target sit together
  const feeders = (id) =>
    Object.values(nodes)
      .filter((n) => n.feedsTo === id)
      .sort((a, b) => a.feedsSlot - b.feedsSlot);
  let nextRow = 0;
  const place = (node) => {
    const kids = feeders(node.id);
    kids.forEach(place);
    node.y = kids.length ? kids.reduce((sum, k) => sum + k.y, 0) / kids.length : nextRow++;
  };
  place(nodes.final);
  // Any game not reached from the final (shouldn't happen) still gets a row
  Object.values(nodes).forEach((n) => { if (n.y === undefined) n.y = nextRow++; });

  return { nodes: Object.values(nodes), rows: nextRow, cols: bracket.rounds.length + 1 };
}

export default function BracketDiagram({ bracket, teams, standings, seedNames = false, eliminatedNote }) {
  if (!bracket) return null;
  const { nodes, rows, cols } = layout(bracket);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const x = (col) => col * (BOX_W + COL_GAP);
  const top = (node) => HEADER_H + node.y * ROW_H + (ROW_H - BOX_H) / 2;
  const finalNode = byId.final;
  const champTop = top(finalNode) + BOX_H + CHAMP_GAP;
  const width = x(cols - 1) + BOX_W;
  const height = Math.max(HEADER_H + Math.max(rows, 1) * ROW_H, champTop + CHAMP_H + 4);

  // Seed = round robin finish, shown before each team
  const seedOf = (teamId) => {
    if (seedNames) return null; // the name already says "3rd place"
    const i = standings?.findIndex((row) => row.teamId === teamId) ?? -1;
    return i >= 0 ? i + 1 : null;
  };

  const nameFor = (teamId, node, slotIdx) => {
    if (teamId) {
      if (seedNames) return `${ordinal(Number(teamId.slice(1)))} place`;
      return getTeamName(teams, teamId);
    }
    const feeder = nodes.find((n) => n.feedsTo === node.id && n.feedsSlot === slotIdx + 1);
    return feeder ? `Winner ${feeder.label}` : '';
  };

  const champId = bracket.final.winnerId;
  const headers = [
    ...bracket.rounds.map((r) => SHORT_HEADER[r.name] ?? r.name),
    'Final · Best of 3',
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto -mx-4 px-4 pb-1">
        <div className="relative" style={{ width, height }}>
          {/* Round headers */}
          {headers.map((h, col) => (
            <div
              key={h}
              className="absolute top-0 font-sans text-[10px] font-bold uppercase tracking-widest text-ink-muted"
              style={{ left: x(col), width: BOX_W }}
            >
              {h}
            </div>
          ))}

          {/* Connector lines */}
          <svg className="absolute inset-0 text-ink/30" width={width} height={height} aria-hidden="true">
            {nodes.map((n) => {
              const target = n.feedsTo ? byId[n.feedsTo] : null;
              const x1 = x(n.col) + BOX_W;
              const y1 = top(n) + BOX_H / 2;
              let x2, y2;
              if (target) {
                x2 = x(target.col);
                y2 = top(target) + (n.feedsSlot === 1 ? BOX_H * 0.27 : BOX_H * 0.73);
              } else {
                const cx = x(n.col) + BOX_W / 2;
                return (
                  <path
                    key={n.id}
                    d={`M${cx} ${top(n) + BOX_H} V${champTop}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                );
              }
              const mid = x1 + COL_GAP / 2;
              return (
                <path
                  key={n.id}
                  d={`M${x1} ${y1} H${mid} V${y2} H${x2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          {/* Games */}
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`absolute bg-cream-card border rounded overflow-hidden flex flex-col ${
                n.id === 'final' ? 'border-2 border-forest' : 'border-ink/15'
              }`}
              style={{ left: x(n.col), top: top(n), width: BOX_W, height: BOX_H }}
            >
              {n.slots.map((slot, i) => {
                const name = nameFor(slot.teamId, n, i);
                const seed = slot.teamId ? seedOf(slot.teamId) : null;
                return (
                  <div
                    key={i}
                    className={`flex-1 flex items-center gap-1.5 px-2 min-w-0 ${i === 1 ? 'border-t border-ink/10' : ''} ${
                      slot.won ? 'bg-forest/10' : ''
                    }`}
                  >
                    {seed && (
                      <span className="font-headline font-bold text-[11px] text-forest w-3 text-center shrink-0 tabular-nums">
                        {seed}
                      </span>
                    )}
                    <span
                      className={`flex-1 truncate font-sans text-xs ${
                        slot.teamId
                          ? slot.won ? 'font-bold text-ink' : 'font-semibold text-ink'
                          : 'italic text-ink-faint'
                      }`}
                    >
                      {name}
                    </span>
                    {slot.score !== null && slot.score !== undefined && (
                      <span className={`font-headline text-sm tabular-nums ${slot.won ? 'font-bold text-forest' : 'text-ink-muted'}`}>
                        {slot.score}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Champion */}
          <div
            className="absolute bg-gold/15 border border-gold/50 rounded flex items-center justify-center gap-1.5 text-center px-2"
            style={{ left: x(finalNode.col), top: champTop, width: BOX_W, height: CHAMP_H }}
          >
            <span className="text-gold text-base leading-none">★</span>
            <span className="font-headline font-bold text-sm text-ink leading-tight truncate">
              {champId && !seedNames ? getTeamName(teams, champId) : 'Champions'}
            </span>
          </div>
        </div>
      </div>
      {eliminatedNote && (
        <p className="font-sans text-xs text-ink-muted">{eliminatedNote}</p>
      )}
    </div>
  );
}
