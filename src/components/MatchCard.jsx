import { useState } from 'react';

const ARENA_CONFIG = {
  'Cucina Colosseo': {
    border: 'border-l-forest',
    badge: 'bg-forest/10 text-forest border-forest/20',
    dot: 'bg-forest',
  },
  'Soggiorno Stadium': {
    border: 'border-l-rosso',
    badge: 'bg-rosso/10 text-rosso border-rosso/20',
    dot: 'bg-rosso',
  },
};

const DEFAULT_ARENA = {
  border: 'border-l-ink/30',
  badge: 'bg-ink/5 text-ink-muted border-ink/10',
  dot: 'bg-ink-muted',
};

export default function MatchCard({
  match,
  team1Name,
  team2Name,
  onSubmit,
  allowTie = true,
  label,
}) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const arena = ARENA_CONFIG[match.arena] ?? DEFAULT_ARENA;
  const isTBD = !onSubmit && !match.completed;
  const isCompleted = match.completed;
  const isWinner1 = isCompleted && Number(match.score1) > Number(match.score2);
  const isWinner2 = isCompleted && Number(match.score2) > Number(match.score1);

  async function handleSubmit(e) {
    e.preventDefault();
    const n1 = parseInt(s1, 10);
    const n2 = parseInt(s2, 10);
    if (isNaN(n1) || isNaN(n2) || n1 < 0 || n2 < 0) {
      setErr('Enter valid scores for both teams.');
      return;
    }
    if (!allowTie && n1 === n2) {
      setErr('No ties in the playoffs — one team must win.');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await onSubmit(n1, n2);
    } catch {
      setErr('Failed to save. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className={`bg-cream-card border border-ink/10 rounded border-l-4 overflow-hidden ${arena.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink/8 bg-cream">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${arena.dot}`} />
          <span className={`font-sans text-xs font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${arena.badge}`}>
            {match.arena}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {label && <span className="font-sans text-xs text-ink-faint">{label}</span>}
          {isCompleted && <span className="font-sans text-xs text-forest font-bold">✓ Final</span>}
          {isTBD && <span className="font-sans text-xs text-ink-faint italic">Awaiting…</span>}
        </div>
      </div>

      {/* Teams & Scores */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {/* Team 1 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isWinner1 && <span className="text-gold text-base leading-none shrink-0">★</span>}
            <span
              className={`font-headline font-bold text-base truncate ${
                isTBD ? 'text-ink-muted' : 'text-ink'
              }`}
            >
              {team1Name}
            </span>
          </div>
          {isCompleted ? (
            <span className={`font-headline text-2xl font-bold tabular-nums shrink-0 ${isWinner1 ? 'text-ink' : 'text-ink-muted'}`}>
              {match.score1}
            </span>
          ) : !isTBD ? (
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="999"
              value={s1}
              onChange={(e) => { setS1(e.target.value); setErr(''); }}
              placeholder="—"
              className="w-16 text-center font-headline text-xl font-bold bg-cream border-2 border-ink/15 focus:border-forest rounded py-1.5 outline-none transition-colors text-ink placeholder-ink-faint"
            />
          ) : null}
        </div>

        {/* vs divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-ink/8" />
          <span className="font-sans text-xs text-ink-faint">vs</span>
          <div className="flex-1 h-px bg-ink/8" />
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isWinner2 && <span className="text-gold text-base leading-none shrink-0">★</span>}
            <span
              className={`font-headline font-bold text-base truncate ${
                isTBD ? 'text-ink-muted' : 'text-ink'
              }`}
            >
              {team2Name}
            </span>
          </div>
          {isCompleted ? (
            <span className={`font-headline text-2xl font-bold tabular-nums shrink-0 ${isWinner2 ? 'text-ink' : 'text-ink-muted'}`}>
              {match.score2}
            </span>
          ) : !isTBD ? (
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="999"
              value={s2}
              onChange={(e) => { setS2(e.target.value); setErr(''); }}
              placeholder="—"
              className="w-16 text-center font-headline text-xl font-bold bg-cream border-2 border-ink/15 focus:border-forest rounded py-1.5 outline-none transition-colors text-ink placeholder-ink-faint"
            />
          ) : null}
        </div>
      </div>

      {/* Submit */}
      {!isCompleted && !isTBD && (
        <div className="px-4 pb-4">
          {err && <p className="font-sans text-xs text-rosso mb-2 text-center">{err}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting || !s1 || !s2}
            className="w-full py-2.5 rounded bg-ink text-cream font-sans font-bold text-sm uppercase tracking-wider hover:bg-ink-light active:bg-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Submit Score'}
          </button>
        </div>
      )}
    </div>
  );
}
