import { useEffect, useState } from 'react';
import { checkActiveTournament, subscribeCupHistory } from '../firebase/db';
import Tricolore from './Tricolore';

export default function Home({ go }) {
  const [activeTournament, setActiveTournament] = useState(undefined);
  const [reigning, setReigning] = useState(undefined);

  useEffect(() => {
    checkActiveTournament()
      .then(setActiveTournament)
      .catch(() => setActiveTournament(null));
  }, []);

  useEffect(() => {
    const unsub = subscribeCupHistory((history) => {
      setReigning(history.length > 0 ? history[0] : null);
    });
    return unsub;
  }, []);

  const loading = activeTournament === undefined;

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Tricolore />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-headline font-bold text-5xl leading-none text-ink mb-1">
            Fazzalari
          </h1>
          <h2 className="font-headline italic text-3xl text-forest leading-none">
            Crokinole Cup
          </h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px flex-1 bg-ink/10 max-w-[60px]" />
            <span className="text-ink-faint text-sm">✦</span>
            <div className="h-px flex-1 bg-ink/10 max-w-[60px]" />
          </div>
        </div>

        {/* Reigning champions */}
        {reigning && (
          <div className="w-full max-w-sm bg-gold/10 border border-gold/30 border-l-4 border-l-gold rounded px-4 py-3 text-center">
            <p className="font-sans text-xs uppercase tracking-widest text-gold-dark font-bold mb-1">
              Reigning Champions
            </p>
            <p className="font-headline font-bold text-xl text-ink">
              {Array.isArray(reigning.winners)
                ? reigning.winners.join(' & ')
                : reigning.winners}
            </p>
            <p className="font-sans text-xs text-ink-muted mt-1">
              Location of cup: Welland, ON
            </p>
          </div>
        )}

        {/* Actions */}
        {loading ? (
          <div className="flex items-center gap-2 text-ink-muted">
            <Spinner />
            <span className="font-sans text-sm">Loading…</span>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            {activeTournament ? (
              <>
                <div className="border-l-4 border-l-forest bg-cream-card border border-ink/10 rounded p-4">
                  <p className="font-sans text-xs uppercase tracking-wider text-ink-muted mb-1">
                    Tournament In Progress
                  </p>
                  <p className="font-headline text-3xl font-bold text-ink tracking-widest">
                    PIN: {activeTournament.pin}
                  </p>
                  <p className="font-sans text-xs text-ink-muted mt-1">
                    Share this PIN with all players
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() =>
                    go('tournament', {
                      tournamentId: activeTournament.tournamentId,
                      pin: activeTournament.pin,
                    })
                  }
                >
                  Rejoin Tournament
                </button>
                <button className="btn-secondary" onClick={() => go('join')}>
                  Join with PIN
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={() => go('create')}>
                  Start Tournament
                </button>
                <button className="btn-secondary" onClick={() => go('join')}>
                  Join Tournament
                </button>
              </>
            )}

            <div className="relative flex items-center gap-3 mt-1">
              <div className="flex-1 h-px bg-ink/10" />
              <span className="font-sans text-xs text-ink-faint uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-ink/10" />
            </div>

            <button className="btn-danger" onClick={() => go('history')}>
              🏆 Cup History
            </button>
          </div>
        )}
      </div>

      <Tricolore />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
