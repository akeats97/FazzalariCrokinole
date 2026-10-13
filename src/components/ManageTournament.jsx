import { useState } from 'react';
import { updateTeamNames, deleteTournament } from '../firebase/db';

export default function ManageTournament({ tournament, go, onClose }) {
  const [names, setNames] = useState(() => tournament.teams.map((t) => [...t.names]));
  const [confirming, setConfirming] = useState(null); // 'restart' | 'delete' | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const dirty = names.some((pair, i) =>
    pair.some((n, j) => n.trim() !== tournament.teams[i].names[j])
  );

  function setName(teamIdx, slot, value) {
    setError('');
    setSaved(false);
    setNames((prev) =>
      prev.map((pair, i) => (i !== teamIdx ? pair : pair.map((n, j) => (j === slot ? value : n))))
    );
  }

  async function saveNames() {
    const trimmed = names.map((pair) => pair.map((n) => n.trim()));
    const flat = trimmed.flat();
    if (flat.some((n) => !n)) {
      setError('Every player needs a name.');
      return;
    }
    const lower = flat.map((n) => n.toLowerCase());
    const dupe = flat.find((n, i) => lower.indexOf(n.toLowerCase()) !== i);
    if (dupe) {
      setError(`"${dupe}" appears more than once.`);
      return;
    }
    setBusy(true);
    try {
      const teams = tournament.teams.map((t, i) => ({ ...t, names: trimmed[i] }));
      await updateTeamNames(tournament.id, teams);
      setNames(trimmed);
      setSaved(true);
    } catch {
      setError('Failed to save names. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      const players = tournament.teams.flatMap((t) => t.names);
      await deleteTournament(tournament.id);
      if (confirming === 'restart') go('create', { players, tournamentId: null });
      else go('home', { tournamentId: null });
    } catch {
      setError('Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 bg-ink/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-cream w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-lg sm:rounded-lg safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-cream border-b border-ink/10 px-5 py-4 flex items-center justify-between">
          <h2 className="font-headline font-bold text-2xl text-ink">Manage Tournament</h2>
          <button
            onClick={onClose}
            className="font-sans text-2xl leading-none text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-8 px-5 py-6">
          {/* Edit names */}
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="section-title mb-1">Edit Players</h3>
              <p className="font-sans text-sm text-ink-muted">
                Fix a name or swap someone in. Teams, scores, and the schedule stay the same.
              </p>
            </div>

            {names.map((pair, i) => (
              <div key={tournament.teams[i].id} className="flex items-center gap-2">
                <span className="font-headline font-bold text-forest text-lg w-6 text-center shrink-0">
                  {i + 1}
                </span>
                {pair.map((n, j) => (
                  <input
                    key={j}
                    type="text"
                    value={n}
                    maxLength={20}
                    onChange={(e) => setName(i, j, e.target.value)}
                    className="flex-1 min-w-0 font-sans bg-cream-card border-2 border-ink/15 focus:border-forest rounded px-3 py-2 outline-none transition-colors text-ink text-base"
                  />
                ))}
              </div>
            ))}

            <button
              onClick={saveNames}
              disabled={busy || !dirty}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saved && !dirty ? 'Names Saved ✓' : 'Save Names'}
            </button>
          </section>

          {error && (
            <div className="border-l-4 border-l-rosso bg-rosso/5 border border-rosso/20 rounded px-4 py-3">
              <p className="font-sans text-sm text-rosso">{error}</p>
            </div>
          )}

          {/* Restart / delete */}
          <section className="flex flex-col gap-3 border-t border-ink/10 pt-6">
            <div>
              <h3 className="section-title mb-1">Start Over</h3>
              <p className="font-sans text-sm text-ink-muted">
                Need to add or remove players, or re-pair the teams? Start over with this
                player list pre-filled, or delete the tournament entirely. All scores entered so far
                will be lost.
              </p>
            </div>

            {confirming ? (
              <div className="border-l-4 border-l-rosso bg-rosso/5 border border-rosso/20 rounded p-4 flex flex-col gap-3">
                <p className="font-sans text-sm text-ink">
                  {confirming === 'restart'
                    ? 'Delete this tournament and set up a new one with the same players?'
                    : 'Permanently delete this tournament?'}{' '}
                  Everyone following along will be sent back to the home screen.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={busy}
                    className="btn-secondary py-3"
                  >
                    Cancel
                  </button>
                  <button onClick={handleConfirm} disabled={busy} className="btn-danger py-3 disabled:opacity-60">
                    {busy ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => setConfirming('restart')} className="btn-secondary">
                  Start Over with These Players
                </button>
                <button onClick={() => setConfirming('delete')} className="btn-danger">
                  Delete Tournament
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

