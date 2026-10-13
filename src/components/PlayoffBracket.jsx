import MatchCard from './MatchCard';
import BracketDiagram from './BracketDiagram';
import { getTeamName } from '../utils/tournamentLogic';
import { submitBracketScore, submitFinalGame } from '../firebase/db';

// Singular name for one game of each bracket round, e.g. "Quarterfinal 2"
const GAME_NAMES = {
  'Play-in': 'Play-in',
  'First Round': 'First Round Game',
  Quarterfinals: 'Quarterfinal',
  Semifinals: 'Semifinal',
  'Final Four': 'Final Four Game',
};

function gameLabel(bracket, matchId) {
  for (const round of bracket.rounds) {
    const i = round.matches.findIndex((m) => m.id === matchId);
    if (i !== -1) return `${GAME_NAMES[round.name] ?? round.name} ${i + 1}`;
  }
  return matchId;
}

// Name for an empty bracket slot: the game whose winner fills it
function feederLabel(bracket, targetId, slot) {
  for (const round of bracket.rounds) {
    const feeder = round.matches.find((m) => m.feedsTo === targetId && m.feedsSlot === slot);
    if (feeder) return `Winner of ${gameLabel(bracket, feeder.id)}`;
  }
  return 'TBD';
}

function slotName(bracket, teams, teamId, targetId, slot) {
  return teamId ? getTeamName(teams, teamId) : feederLabel(bracket, targetId, slot);
}

// preview: a projected bracket shown during the round robin; read-only
export default function PlayoffBracket({ bracket, teams, standings, tournamentId, preview = false }) {
  if (!bracket) return null;

  return (
    <div className="flex flex-col gap-8">
      {preview && (
        <div className="bg-cream-card border border-ink/10 border-l-4 border-l-gold rounded px-4 py-3">
          <p className="font-sans text-sm text-ink">
            <span className="font-bold">Projected bracket</span> if the round robin ended now.
            It updates as scores come in and locks when the last round robin game is scored.
          </p>
        </div>
      )}
      <BracketDiagram bracket={bracket} teams={teams} standings={standings} />
      {!preview && (
        <>
          {bracket.rounds.map((round) => (
            <BracketRound
              key={round.name}
              round={round}
              bracket={bracket}
              teams={teams}
              preview={preview}
              tournamentId={tournamentId}
            />
          ))}
          <ChampionshipFinal
            bracket={bracket}
            final={bracket.final}
            preview={preview}
            teams={teams}
            tournamentId={tournamentId}
          />
        </>
      )}
    </div>
  );
}

function BracketRound({ round, bracket, teams, tournamentId, preview }) {
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
          const canPlay = !preview && match.team1Id && match.team2Id;
          return (
            <MatchCard
              key={match.id}
              match={match}
              team1Name={slotName(bracket, teams, match.team1Id, match.id, 1)}
              team2Name={slotName(bracket, teams, match.team2Id, match.id, 2)}
              allowTie={false}
              label={gameLabel(bracket, match.id)}
              onSubmit={
                canPlay
                  ? (s1, s2) => submitBracketScore(tournamentId, match.id, s1, s2)
                  : undefined
              }
              onEdit={preview ? undefined : (s1, s2) => submitBracketScore(tournamentId, match.id, s1, s2)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChampionshipFinal({ bracket, final, teams, tournamentId, preview }) {
  const t1 = slotName(bracket, teams, final.team1Id, 'final', 1);
  const t2 = slotName(bracket, teams, final.team2Id, 'final', 2);
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
            {t1} vs {t2}
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
            const canPlay = !preview && ready && !final.winnerId && prevComplete;

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
                onEdit={preview ? undefined : (s1, s2) => submitFinalGame(tournamentId, game.gameNum, s1, s2)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
