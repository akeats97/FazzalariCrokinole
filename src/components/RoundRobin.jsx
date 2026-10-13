import MatchCard from './MatchCard';
import { getTeamName } from '../utils/tournamentLogic';
import { submitRRScore } from '../firebase/db';

// One list of games instead of rounds: whichever board frees up plays the next game in Up Next.
// Games are still stored in rounds, so each keeps its round index for saving.
export default function RoundRobin({ rounds, teams, tournamentId }) {
  const games = rounds.flatMap((round, roundIdx) =>
    round.matches.map((match) => ({ match, roundIdx }))
  ).map((g, i) => ({ ...g, number: i + 1 }));

  const upNext = games.filter((g) => !g.match.completed);
  // Most recently scored first; older games without a timestamp keep schedule order
  const done = games
    .filter((g) => g.match.completed)
    .sort((a, b) => (b.match.scoredAt ?? 0) - (a.match.scoredAt ?? 0) || b.number - a.number);

  const card = ({ match, roundIdx, number }) => {
    const save = (s1, s2) => submitRRScore(tournamentId, roundIdx, match.id, s1, s2);
    return (
      <MatchCard
        key={match.id}
        match={match}
        team1Name={getTeamName(teams, match.team1Id)}
        team2Name={getTeamName(teams, match.team2Id)}
        label={`Game ${number}`}
        showArena={false}
        allowTie
        onSubmit={save}
        onEdit={save}
      />
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="bg-cream-card border border-ink/10 rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink-muted">
            Round Robin Progress
          </span>
          <span className="font-headline font-bold text-sm text-ink tabular-nums">
            {done.length} / {games.length}
          </span>
        </div>
        <div className="bg-ink/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-forest rounded-full transition-all duration-500"
            style={{ width: games.length ? `${(done.length / games.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {upNext.length > 0 && (
        <section>
          <h3 className="font-headline font-bold text-xl text-ink mb-1">Up Next</h3>
          <p className="font-sans text-xs text-ink-muted mb-3">
            When a board frees up, play the next game on the list.
          </p>
          <div className="flex flex-col gap-3">{upNext.map(card)}</div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h3 className="font-headline font-bold text-xl text-ink mb-3">Done</h3>
          <div className="flex flex-col gap-3">{done.map(card)}</div>
        </section>
      )}
    </div>
  );
}
