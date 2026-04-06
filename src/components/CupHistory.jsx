import { useEffect, useState } from 'react';
import { subscribeCupHistory } from '../firebase/db';
import Tricolore from './Tricolore';

export default function CupHistory({ go }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    const unsub = subscribeCupHistory(setHistory);
    return unsub;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Tricolore thick />

      <div className="px-6 pt-6">
        <button
          className="font-sans text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
          onClick={() => go('home')}
        >
          ← Back
        </button>
      </div>

      <div className="flex-1 px-6 pt-6 pb-12 max-w-sm mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gold/20 border border-gold/30 rounded flex items-center justify-center shrink-0">
            <span className="text-3xl leading-none">🏆</span>
          </div>
          <div>
            <h2 className="font-headline font-bold text-3xl text-ink leading-tight">
              Cup History
            </h2>
            <p className="font-sans text-ink-muted text-sm mt-0.5">
              All-time Fazzalari champions
            </p>
          </div>
        </div>

        {/* Decorative rule */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-forest/20" />
          <span className="text-forest text-xs">✦</span>
          <div className="h-px flex-1 bg-forest/20" />
        </div>

        {/* Loading */}
        {history === null && (
          <div className="flex items-center justify-center py-16 text-ink-muted">
            <Spinner />
          </div>
        )}

        {/* Empty */}
        {history !== null && history.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-ink/5 border border-ink/10 rounded mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <p className="font-headline font-bold text-xl text-ink mb-1">
              No champions yet.
            </p>
            <p className="font-sans text-sm text-ink-muted">
              Be the first to lift the Fazzalari Cup!
            </p>
          </div>
        )}

        {/* History list */}
        {history !== null && history.length > 0 && (
          <div className="flex flex-col gap-3">
            {history.map((entry, i) => {
              const date = entry.date?.toDate
                ? entry.date.toDate()
                : entry.date
                ? new Date(entry.date)
                : null;
              const dateStr = date
                ? date.toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—';

              const isLatest = i === 0;
              const medalEmoji = '🥇';

              return (
                <div
                  key={entry.id}
                  className={`rounded border border-l-4 overflow-hidden ${
                    isLatest
                      ? 'bg-gold/10 border-gold/20 border-l-gold'
                      : 'bg-cream-card border-ink/10 border-l-forest/30'
                  }`}
                >
                  {/* Champion photo */}
                  {entry.imageUrl && (
                    <img
                      src={entry.imageUrl}
                      alt={`${Array.isArray(entry.winners) ? entry.winners.join(' & ') : entry.winners} champions`}
                      className="w-full object-cover max-h-52"
                    />
                  )}

                  {/* Info row */}
                  <div className="flex items-center gap-4 px-4 py-4">
                    {/* Medal */}
                    <div className="shrink-0 w-9 text-center">
                      <span className="text-2xl leading-none">{medalEmoji}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-bold text-lg leading-tight truncate text-ink">
                        {Array.isArray(entry.winners)
                          ? entry.winners.join(' & ')
                          : entry.winners ?? '?'}
                      </p>
                      <p className="font-sans text-xs text-ink-muted mt-0.5">{dateStr}</p>
                    </div>

                    {isLatest && (
                      <span className="font-sans text-xs font-bold uppercase tracking-wider text-gold-dark bg-gold/20 border border-gold/30 rounded-full px-2 py-1 shrink-0">
                        Reigning
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Tricolore thick />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
