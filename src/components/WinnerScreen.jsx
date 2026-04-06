import { useState } from 'react';
import { getTeamName } from '../utils/tournamentLogic';
import { crownWinner } from '../firebase/db';
import Tricolore from './Tricolore';

export default function WinnerScreen({ tournament, go }) {
  const [crowning, setCrowning] = useState(false);
  const [crowned, setCrowned] = useState(tournament.status === 'complete');

  const winnerTeamId = tournament.bracket?.final?.winnerId;
  const winnerTeam = tournament.teams.find((t) => t.id === winnerTeamId);
  const winnerName = winnerTeam
    ? winnerTeam.names.join(' & ')
    : getTeamName(tournament.teams, winnerTeamId);

  // Already complete (someone else crowned)
  if (crowned || tournament.status === 'complete') {
    const champId = tournament.winnersTeamId;
    const champTeam = tournament.teams.find((t) => t.id === champId);
    const champName = champTeam ? champTeam.names.join(' & ') : winnerName;
    return <CrownedScreen champName={champName} go={go} />;
  }

  async function handleCrown() {
    if (!winnerTeam) return;
    setCrowning(true);
    try {
      await crownWinner(tournament.id, winnerTeam);
      setCrowned(true);
    } catch {
      setCrowning(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Tricolore thick />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-gold/20 border-2 border-gold/40 rounded flex items-center justify-center">
            <span className="text-5xl leading-none">🏆</span>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-ink-muted mb-2">
              Championship Winner
            </p>
            <h2 className="font-headline font-bold text-4xl text-ink leading-tight">
              {winnerName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-12 bg-gold/40" />
            <span className="text-gold text-xl">★</span>
            <div className="h-px w-12 bg-gold/40" />
          </div>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="font-sans text-sm text-ink-muted">
            Tap below to officially record the result and close the tournament.
          </p>
          <button
            onClick={handleCrown}
            disabled={crowning}
            className="btn-primary disabled:opacity-60"
          >
            {crowning ? 'Recording…' : 'Crown Champion & End Tournament'}
          </button>
        </div>
      </div>

      <Tricolore thick />
    </div>
  );
}

function CrownedScreen({ champName, go }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Tricolore thick />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-8">
        <div className="flex flex-col items-center gap-6">
          <div className="w-32 h-32 bg-gold/20 border-2 border-gold/40 rounded-lg flex items-center justify-center">
            <span className="text-7xl leading-none">🏆</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-ink-muted">
              Fazzalari Cup Champions
            </p>
            <h2 className="font-headline font-bold text-4xl text-ink leading-tight">
              {champName}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-forest text-xl">★</span>
              <span className="text-gold text-2xl">★</span>
              <span className="text-rosso text-xl">★</span>
            </div>
          </div>

          <p className="font-sans text-sm text-ink-muted max-w-xs">
            The result has been recorded in the Fazzalari Cup History.
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button onClick={() => go('history')} className="btn-primary">
            View Cup History
          </button>
          <button onClick={() => go('home')} className="btn-secondary">
            Return to Home
          </button>
        </div>
      </div>

      <Tricolore thick />
    </div>
  );
}
