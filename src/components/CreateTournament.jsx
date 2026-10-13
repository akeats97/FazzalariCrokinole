import { useState } from 'react';
import {
  generateTeams,
  generateRoundRobin,
  shuffle,
  gamesPerTeamOptions,
  playoffOptions,
  describeFormat,
  ordinal,
} from '../utils/tournamentLogic';
import { createTournament } from '../firebase/db';
import Tricolore from './Tricolore';
import BracketDiagram from './BracketDiagram';

const MIN_PLAYERS = 8;  // 4 teams of 2
const MAX_PLAYERS = 16; // 8 teams of 2

export default function CreateTournament({ go, initialPlayers = [] }) {
  const [phase, setPhase] = useState('names');
  const [nameInput, setNameInput] = useState('');
  const [players, setPlayers] = useState(initialPlayers);
  const [teams, setTeams] = useState([]);
  const [gamesPerTeam, setGamesPerTeam] = useState(2);
  const [playoffTeams, setPlayoffTeams] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addPlayer(e) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    if (players.map((p) => p.toLowerCase()).includes(name.toLowerCase())) {
      setError(`"${name}" is already added.`);
      return;
    }
    if (players.length >= MAX_PLAYERS) {
      setError(`Maximum ${MAX_PLAYERS} players (${MAX_PLAYERS / 2} teams).`);
      return;
    }
    setError('');
    setPlayers((p) => [...p, name]);
    setNameInput('');
  }

  function removePlayer(name) {
    setPlayers((p) => p.filter((x) => x !== name));
  }

  function goToTeams() {
    if (players.length < MIN_PLAYERS) {
      setError(`Need at least ${MIN_PLAYERS} players (${MIN_PLAYERS / 2} teams of 2). Currently ${players.length}.`);
      return;
    }
    if (players.length % 2 !== 0) {
      setError(`Need an even number of players for teams of 2 (currently ${players.length}).`);
      return;
    }
    setError('');
    const n = players.length / 2;
    const gameOpts = gamesPerTeamOptions(n);
    if (!gameOpts.includes(gamesPerTeam)) setGamesPerTeam(gameOpts.includes(2) ? 2 : gameOpts[0]);
    if (!playoffOptions(n).includes(playoffTeams)) setPlayoffTeams(n);
    setTeams(generateTeams(players));
    setPhase('teams');
  }

  async function startTournament() {
    setLoading(true);
    setError('');
    try {
      const rounds = generateRoundRobin(teams, gamesPerTeam);
      const id = await createTournament({ teams, rounds, format: { gamesPerTeam, playoffTeams } });
      go('tournament', { tournamentId: id });
    } catch (err) {
      if (err.message === 'ACTIVE_EXISTS') {
        setError(
          'A tournament is already in progress. Finish it, or delete it from its ⚙ menu, before starting a new one.'
        );
        setPhase('names');
      } else {
        setError('Failed to create tournament. Please try again.');
      }
      setLoading(false);
    }
  }

  const teamCount = Math.floor(players.length / 2);
  const canProceed = players.length >= MIN_PLAYERS && players.length % 2 === 0;

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Tricolore />
      <div className="px-6 pt-6">
        <button
          className="font-sans text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
          onClick={() => (phase === 'teams' ? setPhase('names') : go('home'))}
        >
          ← {phase === 'teams' ? 'Back to Players' : 'Back'}
        </button>
      </div>

      {phase === 'names' && (
        <div className="flex flex-col gap-5 px-6 pt-5 pb-12 max-w-sm mx-auto w-full">
          <div>
            <h2 className="font-headline font-bold text-3xl text-ink">Add Players</h2>
            <p className="font-sans text-ink-muted text-sm mt-1">
              Enter {MIN_PLAYERS}–{MAX_PLAYERS} players (even number — teams of 2).
            </p>
          </div>

          <form onSubmit={addPlayer} className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setError(''); }}
              placeholder="First name"
              maxLength={20}
              className="flex-1 font-sans bg-cream-card border-2 border-ink/15 focus:border-forest rounded px-4 py-3 outline-none transition-colors text-ink text-base"
              autoFocus
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-5 py-3 bg-forest hover:bg-forest-light active:bg-forest-dark disabled:opacity-40 text-white font-bold uppercase tracking-wide text-sm rounded transition-colors"
            >
              Add
            </button>
          </form>

          {error && (
            <div className="border-l-4 border-l-rosso bg-rosso/5 border border-rosso/20 rounded px-4 py-3">
              <p className="font-sans text-sm text-rosso">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-sans text-sm text-ink-muted">
              {players.length} / {MAX_PLAYERS} players
            </span>
            {canProceed ? (
              <span className="font-sans text-xs text-forest font-bold">
                {teamCount} teams — ready!
              </span>
            ) : players.length >= MIN_PLAYERS && players.length % 2 !== 0 ? (
              <span className="font-sans text-xs text-rosso font-semibold">
                Need even number
              </span>
            ) : null}
          </div>

          {players.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-1.5 bg-cream-card border border-ink/15 rounded-full px-3 py-1.5 font-sans text-sm text-ink"
                >
                  {p}
                  <button
                    onClick={() => removePlayer(p)}
                    className="text-ink-faint hover:text-rosso transition-colors leading-none"
                    aria-label={`Remove ${p}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={goToTeams}
            disabled={!canProceed}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed mt-1"
          >
            Generate Teams ({players.length} players → {teamCount} teams)
          </button>
        </div>
      )}

      {phase === 'teams' && (
        <div className="flex flex-col gap-5 px-6 pt-5 pb-12 max-w-sm mx-auto w-full">
          <div>
            <h2 className="font-headline font-bold text-3xl text-ink">Confirm Teams</h2>
            <p className="font-sans text-ink-muted text-sm mt-1">
              Randomly paired. Reshuffle if needed.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {teams.map((team, i) => (
              <div
                key={team.id}
                className="flex items-center gap-3 bg-cream-card border border-ink/10 rounded px-4 py-3 border-l-4 border-l-forest"
              >
                <span className="font-headline font-bold text-forest text-lg w-7 text-center">
                  {i + 1}
                </span>
                <span className="font-sans font-semibold text-ink">
                  {team.names[0]} & {team.names[1]}
                </span>
              </div>
            ))}
          </div>

          <FormatPicker
            teamCount={teams.length}
            gamesPerTeam={gamesPerTeam}
            setGamesPerTeam={setGamesPerTeam}
            playoffTeams={playoffTeams}
            setPlayoffTeams={setPlayoffTeams}
          />

          {error && (
            <div className="border-l-4 border-l-rosso bg-rosso/5 border border-rosso/20 rounded px-4 py-3">
              <p className="font-sans text-sm text-rosso">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setTeams(generateTeams(shuffle(players)))}
              disabled={loading}
              className="btn-secondary"
            >
              Reshuffle Teams
            </button>
            <button
              onClick={startTournament}
              disabled={loading}
              className="btn-primary disabled:opacity-60"
            >
              {loading ? 'Starting…' : 'Start Tournament!'}
            </button>
          </div>
        </div>
      )}

      <Tricolore />
    </div>
  );
}

function Choice({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-0 px-1 py-2.5 rounded border-2 font-sans font-bold text-sm transition-colors ${
        selected
          ? 'bg-forest border-forest text-white'
          : 'bg-cream-card border-ink/15 text-ink hover:border-forest'
      }`}
    >
      {children}
    </button>
  );
}

function FormatPicker({ teamCount, gamesPerTeam, setGamesPerTeam, playoffTeams, setPlayoffTeams }) {
  const gameOpts = gamesPerTeamOptions(teamCount);
  const playoffOpts = playoffOptions(teamCount);
  if (!gameOpts.includes(gamesPerTeam) || !playoffOpts.includes(playoffTeams)) return null;
  const f = describeFormat(teamCount, gamesPerTeam, playoffTeams);

  return (
    <div className="flex flex-col gap-4 border-t border-ink/10 pt-5">
      <h3 className="font-headline font-bold text-2xl text-ink">Format</h3>

      <div className="flex flex-col gap-2">
        <p className="font-sans text-xs font-bold uppercase tracking-wider text-ink-muted">
          Round robin games per team
        </p>
        <div className="flex gap-1.5">
          {gameOpts.map((g) => (
            <Choice key={g} selected={g === gamesPerTeam} onClick={() => setGamesPerTeam(g)}>
              {g}
            </Choice>
          ))}
        </div>
      </div>

      {playoffOpts.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-ink-muted">
            Who makes the playoffs
          </p>
          <div className="flex gap-2">
            {playoffOpts.map((p) => (
              <Choice key={p} selected={p === playoffTeams} onClick={() => setPlayoffTeams(p)}>
                {p === teamCount ? `All ${p} teams` : `Top ${p}`}
              </Choice>
            ))}
          </div>
        </div>
      )}

      <div className="bg-cream-card border border-ink/10 border-l-4 border-l-forest rounded px-4 py-3 flex flex-col gap-1.5">
        <p className="font-sans text-sm text-ink">
          <span className="font-bold">Round robin:</span> {f.rrGames} games, played two at a time as boards free up.
          Every team plays {gamesPerTeam}.
        </p>
        <p className="font-sans text-sm text-ink">
          <span className="font-bold">Playoffs:</span>{' '}
          {f.eliminated > 0 ? `Top ${playoffTeams} advance, ${f.eliminated} out. ` : 'Everyone advances. '}
          {f.playoffStages.join(' → ')}.
        </p>
        <p className="font-sans text-xs text-ink-muted">
          Ranked by wins, then point differential, then points scored.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-sans text-xs font-bold uppercase tracking-wider text-ink-muted">
          Playoff bracket (by round robin finish)
        </p>
        <BracketDiagram
          bracket={f.bracket}
          seedNames
          eliminatedNote={
            f.eliminated > 0
              ? `${ordinal(playoffTeams + 1)} to ${ordinal(teamCount)} place are out after the round robin.`
              : null
          }
        />
      </div>
    </div>
  );
}
