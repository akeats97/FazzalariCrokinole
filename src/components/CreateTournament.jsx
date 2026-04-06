import { useState } from 'react';
import { generateTeams, generateRoundRobin, generatePin, shuffle } from '../utils/tournamentLogic';
import { createTournament } from '../firebase/db';
import Tricolore from './Tricolore';

const MIN_PLAYERS = 8;  // 4 teams of 2
const MAX_PLAYERS = 16; // 8 teams of 2

export default function CreateTournament({ go }) {
  const [phase, setPhase] = useState('names');
  const [nameInput, setNameInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
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
    setTeams(generateTeams(players));
    setPhase('teams');
  }

  async function startTournament() {
    setLoading(true);
    setError('');
    try {
      const pin = generatePin();
      const rounds = generateRoundRobin(teams);
      const id = await createTournament({ pin, teams, rounds });
      go('tournament', { tournamentId: id, pin });
    } catch (err) {
      if (err.message === 'ACTIVE_EXISTS') {
        setError(
          `A tournament is already active (PIN: ${err.existingPin}). Complete it before starting a new one.`
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
