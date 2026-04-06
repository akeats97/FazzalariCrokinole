import MatchCard from './MatchCard';
import { getTeamName } from '../utils/tournamentLogic';
import { submitBracketScore, submitFinalGame } from '../firebase/db';

export default function PlayoffBracket({ bracket, teams, tournamentId }) {
  if (!bracket) return null;

  return (
    <div className="flex flex-col gap-8">
      {bracket.rounds.map((round) => (
        <BracketRound
          key={round.name}
          round={round}
          teams={teams}
          tournamentId={tournamentId}
        />
      ))}
      <ChampionshipFinal
        final={bracket.final}
        teams={teams}
        tournamentId={tournamentId}
      />
    </div>
  );
}

function BracketRound({ round, teams, tournamentId }) {
  const allDone = round.matches.every((m) => m.completed);
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-headline font-bold text-xl text-ink">{round.name}</h3>
        {allDone && (
          <span className="font-sans text-xs font-bold text-forest uppercase tracking-wide">
            ✓ Complete
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {round.matches.map((match, i) => {
          const canPlay = match.team1Id && match.team2Id;
          return (
            <MatchCard
              key={match.id}
              match={match}
              team1Name={getTeamName(teams, match.team1Id)}
              team2Name={getTeamName(teams, match.team2Id)}
              allowTie={false}
              label={`Match ${i + 1}`}
              onSubmit={
                canPlay
                  ? (s1, s2) => submitBracketScore(tournamentId, match.id, s1, s2)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function ChampionshipFinal({ final, teams, tournamentId }) {
  const t1 = getTeamName(teams, final.team1Id);
  const t2 = getTeamName(teams, final.team2Id);
  const ready = final.team1Id && final.team2Id;

  const showGame3 = final.team1Wins >= 1 && final.team2Wins >= 1;
  const gamesToShow = final.games.filter((g) => g.gameNum <= 2 || showGame3);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-1">
        <h3 className="font-headline font-bold text-xl text-ink">
          Championship Final
        </h3>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-white bg-rosso rounded-full px-3 py-1">
          Best of 3
        </span>
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-white bg-ink rounded-full px-3 py-1">
          Soggiorno Stadium
        </span>
      </div>

      {!ready && (
        <div className="bg-cream-card border border-ink/10 rounded px-4 py-6 text-center">
          <p className="font-sans text-ink-muted text-sm">
            Awaiting finalists from previous rounds…
          </p>
        </div>
      )}

      {ready && !final.winnerId && (final.team1Wins > 0 || final.team2Wins > 0) && (
        <div className="bg-cream-card border border-ink/10 border-l-4 border-l-forest rounded px-4 py-3 mb-4">
          <p className="font-sans text-sm font-semibold text-ink">
            Series: <span className="text-forest">{t1}</span> {final.team1Wins} — {final.team2Wins} <span className="text-rosso">{t2}</span>
          </p>
        </div>
      )}

      {final.winnerId && (
        <div className="bg-gold/10 border border-gold/30 border-l-4 border-l-gold rounded px-4 py-4 mb-4 text-center">
          <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold-dark mb-1">
            Champion
          </p>
          <p className="font-headline font-bold text-2xl text-ink">
            ★ {getTeamName(teams, final.winnerId)}
          </p>
        </div>
      )}

      {ready && (
        <div className="flex flex-col gap-3">
          {gamesToShow.map((game) => {
            const prevComplete = final.games
              .filter((g) => g.gameNum < game.gameNum)
              .every((g) => g.completed);
            const canPlay = ready && !final.winnerId && prevComplete;

            const matchLike = {
              id: `final-g${game.gameNum}`,
              team1Id: final.team1Id,
              team2Id: final.team2Id,
              arena: 'Soggiorno Stadium',
              score1: game.score1,
              score2: game.score2,
              completed: game.completed,
            };

            return (
              <MatchCard
                key={game.gameNum}
                match={matchLike}
                team1Name={t1}
                team2Name={t2}
                allowTie={false}
                label={`Game ${game.gameNum}`}
                onSubmit={
                  canPlay
                    ? (s1, s2) => submitFinalGame(tournamentId, game.gameNum, s1, s2)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
