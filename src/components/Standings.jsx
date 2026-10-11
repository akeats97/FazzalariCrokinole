import { getTeamName } from '../utils/tournamentLogic';

const PLAYOFF_NOTES = {
  4: { byeCount: 0, note: 'All 4 teams play in the Semifinals.' },
  5: { byeCount: 1, note: '1st place advances directly to the Semifinals. 4th vs 5th in Play-in.' },
  6: { byeCount: 2, note: '1st and 2nd place advance directly to the Final Four.' },
  7: { byeCount: 1, note: '1st place advances directly to the Semifinals.' },
  8: { byeCount: 0, note: 'All 8 teams play in the Quarterfinals.' },
};

export default function Standings({ standings, teams, teamCount, showPlayoffNote = false }) {
  if (!standings || standings.length === 0) return null;

  const { byeCount = 0, note = '' } = PLAYOFF_NOTES[teamCount] ?? {};

  return (
    <div>
      <h3 className="section-title">Standings</h3>
      <div className="border border-ink/10 rounded overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem] bg-forest px-4 py-2.5">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-white/70">#</span>
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-white/70">Team</span>
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-white/70 text-center">W</span>
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-white/70 text-center">L</span>
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-white/70 text-right">+/−</span>
        </div>

        {standings.map((row, i) => {
          const rank = i + 1;
          const hasBye = showPlayoffNote && byeCount > 0 && rank <= byeCount;
          const isFirst = rank === 1;
          const name = getTeamName(teams, row.teamId);

          return (
            <div
              key={row.teamId}
              className={`grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem] px-4 py-3 border-t border-ink/8 items-center ${
                isFirst ? 'bg-gold/10' : i % 2 === 0 ? 'bg-cream' : 'bg-cream-card'
              }`}
            >
              <span className={`font-headline font-bold text-sm ${isFirst ? 'text-gold-dark' : 'text-ink-faint'}`}>
                {rank}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                {isFirst && <span className="text-gold text-sm leading-none shrink-0">★</span>}
                <span className="font-sans font-semibold text-sm text-ink truncate">{name}</span>
                {hasBye && (
                  <span className="font-sans text-xs text-forest bg-forest/10 border border-forest/20 rounded-full px-1.5 py-0.5 shrink-0 font-bold uppercase tracking-wide">
                    BYE
                  </span>
                )}
              </div>
              <span className="font-headline font-bold text-sm text-forest text-center">{row.wins}</span>
              <span className="font-sans text-sm text-ink-muted text-center">{row.losses}</span>
              <span
                className={`font-sans text-sm font-semibold tabular-nums text-right ${
                  row.scoreDiff > 0 ? 'text-forest' : row.scoreDiff < 0 ? 'text-rosso' : 'text-ink-faint'
                }`}
              >
                {row.scoreDiff > 0 ? '+' : ''}{row.scoreDiff}
              </span>
            </div>
          );
        })}
      </div>

      {showPlayoffNote && note && (
        <p className="font-sans text-xs text-ink-muted mt-2">{note}</p>
      )}
    </div>
  );
}
