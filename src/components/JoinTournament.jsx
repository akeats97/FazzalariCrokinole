import { useState } from 'react';
import { joinByPin } from '../firebase/db';
import Tricolore from './Tricolore';

export default function JoinTournament({ go }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    const trimmed = pin.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await joinByPin(trimmed);
      if (result.error) {
        const msgs = {
          NO_ACTIVE: 'No active tournament found.',
          NOT_FOUND: 'Tournament not found.',
          WRONG_PIN: 'Incorrect PIN. Please check and try again.',
          EXPIRED: 'This tournament has ended. View Cup History for results.',
        };
        setError(msgs[result.error] ?? 'Something went wrong.');
      } else {
        go('tournament', { tournamentId: result.tournamentId, pin: trimmed });
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Tricolore />
      <div className="px-6 pt-6">
        <button
          className="font-sans text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
          onClick={() => go('home')}
        >
          ← Back
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 text-center">
        <div className="w-full max-w-xs flex flex-col gap-7">
          <div>
            <h2 className="font-headline font-bold text-3xl text-ink">Join Tournament</h2>
            <p className="font-sans text-ink-muted mt-1 text-sm">
              Enter the 4-digit PIN to join the action.
            </p>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-5 items-center">
            <div className="flex flex-col items-center gap-2 w-full">
              <label className="font-sans text-xs uppercase tracking-wider text-ink-muted">
                Tournament PIN
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setError('');
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                }}
                placeholder="0000"
                className="w-44 text-center text-5xl font-headline font-bold tracking-[0.25em] bg-cream-card border-2 border-ink/20 focus:border-forest rounded py-4 outline-none transition-colors text-ink"
                autoFocus
              />
            </div>

            {error && (
              <div className="border-l-4 border-l-rosso bg-rosso/5 border border-rosso/20 rounded px-4 py-3 w-full text-left">
                <p className="font-sans text-sm text-rosso">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining…' : 'Join Tournament'}
            </button>
          </form>
        </div>
      </div>
      <Tricolore />
    </div>
  );
}
