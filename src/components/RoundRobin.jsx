import MatchCard from './MatchCard';
import { getTeamName } from '../utils/tournamentLogic';
import { submitRRScore } from '../firebase/db';

export default function RoundRobin({ rounds, teams, tournamentId }) {
  const completedCount = rounds.reduce(
    (acc, r) => acc + r.matches.filter((m) => m.completed).length,
    0
  );
  const totalCount = rounds.reduce((acc, r) => acc + r.matches.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="bg-cream-card border border-ink/10 rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink-muted">
            Round Robin Progress
          </span>
          <span className="font-headline font-bold text-sm text-ink tabular-nums">
            {completedCount} / {totalCount}
          </span>
        </div>
        <div className="bg-ink/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-forest rounded-full transition-all duration-500"
            style={{ width: totalCount ? `${(completedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {rounds.map((round) => {
        const roundDone = round.matches.every((m) => m.completed);
        return (
          <div key={round.roundNumber}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-headline font-bold text-xl text-ink">
                Round {round.roundNumber}
              </h3>
              {roundDone && (
                <span className="font-sans text-xs font-bold text-forest uppercase tracking-wide">
                  ✓ Complete
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {round.matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  team1Name={getTeamName(teams, match.team1Id)}
                  team2Name={getTeamName(teams, match.team2Id)}
                  allowTie
                  onSubmit={(s1, s2) =>
                    submitRRScore(tournamentId, round.roundNumber - 1, match.id, s1, s2)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
