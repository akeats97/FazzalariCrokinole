import { useEffect, useMemo, useState, useRef } from 'react';
import { subscribeTournament, playoffSize } from '../firebase/db';
import RoundRobin from './RoundRobin';
import Standings from './Standings';
import PlayoffBracket from './PlayoffBracket';
import WinnerScreen from './WinnerScreen';
import Tricolore from './Tricolore';
import ManageTournament from './ManageTournament';
import { useAdmin } from '../utils/hostAuth';
import { generateBracket } from '../utils/tournamentLogic';

const TABS = {
  roundrobin: ['Matches', 'Standings', 'Playoffs'],
  playoffs: ['Bracket', 'Standings', 'Round Robin'],
};

export default function TournamentView({ tournamentId, go }) {
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Matches');
  const [showManage, setShowManage] = useState(false);
  const admin = useAdmin();
  const prevStatus = useRef(null);

  // Bracket as it would be seeded right now (arenas are random, so only rebuild when standings change)
  const standingsKey = JSON.stringify(tournament?.standings ?? null);
  const projectedBracket = useMemo(
    () =>
      tournament?.status === 'roundrobin'
        ? generateBracket(tournament.standings.slice(0, playoffSize(tournament)))
        : null,
    [standingsKey, tournament?.status]
  );

  useEffect(() => {
    if (!tournamentId) { setError('No tournament ID.'); return; }
    const unsub = subscribeTournament(tournamentId, (data) => {
      if (!data) {
        setError('This tournament was deleted.');
        return;
      }
      if (prevStatus.current === 'roundrobin' && data.status === 'playoffs') {
        setTab('Bracket');
      }
      prevStatus.current = data.status;
      setTournament(data);
    });
    return unsub;
  }, [tournamentId]);

  useEffect(() => {
    if (!tournament) return;
    const validTabs = TABS[tournament.status] ?? ['Matches'];
    if (!validTabs.includes(tab)) setTab(validTabs[0]);
  }, [tournament?.status]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4 text-center bg-cream">
        <p className="font-sans text-rosso">{error}</p>
        <button onClick={() => go('home')} className="btn-secondary max-w-xs">
          Return Home
        </button>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Spinner />
      </div>
    );
  }

  // Complete or final winner → show winner screen
  if (tournament.status === 'complete' || tournament.bracket?.final?.winnerId) {
    return <WinnerScreen tournament={tournament} go={go} />;
  }

  const tabs = TABS[tournament.status] ?? ['Matches'];
  const statusLabel = tournament.status === 'roundrobin' ? 'Round Robin' : 'Playoffs';
  const statusColor = tournament.status === 'playoffs' ? 'bg-rosso' : 'bg-forest';

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Tricolore />

      {/* Top bar */}
      <div className="bg-cream border-b border-ink/10 px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-10">
        <button
          className="font-sans text-sm text-ink-muted hover:text-ink transition-colors shrink-0"
          onClick={() => go('home')}
        >
          ← Home
        </button>

        <span className="font-headline font-bold text-lg text-ink truncate">
          Fazzalari Cup
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-sans text-xs font-bold text-white uppercase tracking-wide rounded-full px-3 py-1 ${statusColor}`}>
            {statusLabel}
          </span>
          {admin && (
            <button
              onClick={() => setShowManage(true)}
              className="text-xl leading-none text-ink-muted hover:text-ink transition-colors"
              title="Manage tournament"
              aria-label="Manage tournament"
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {showManage && admin && (
        <ManageTournament
          tournament={tournament}
          go={go}
          onClose={() => setShowManage(false)}
        />
      )}

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex border-b border-ink/10 bg-cream">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 font-sans text-sm font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'text-forest border-forest'
                  : 'text-ink-muted border-transparent hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full safe-bottom">
        {tournament.status === 'roundrobin' && (
          <>
            {tab === 'Matches' && (
              <RoundRobin
                rounds={tournament.rounds}
                teams={tournament.teams}
                tournamentId={tournament.id}
              />
            )}
            {tab === 'Standings' && (
              <Standings
                standings={tournament.standings}
                teams={tournament.teams}
                playoffTeams={playoffSize(tournament)}
              />
            )}
            {tab === 'Playoffs' && (
              <PlayoffBracket
                bracket={projectedBracket}
                teams={tournament.teams}
                standings={tournament.standings}
                tournamentId={tournament.id}
                preview
              />
            )}
          </>
        )}
        {tournament.status === 'playoffs' && (
          <>
            {tab === 'Bracket' && (
              <PlayoffBracket
                bracket={tournament.bracket}
                teams={tournament.teams}
                standings={tournament.standings}
                tournamentId={tournament.id}
              />
            )}
            {tab === 'Standings' && (
              <Standings
                standings={tournament.standings}
                teams={tournament.teams}
                playoffTeams={playoffSize(tournament)}
                showPlayoffNote
              />
            )}
            {tab === 'Round Robin' && (
              <RoundRobin
                rounds={tournament.rounds}
                teams={tournament.teams}
                tournamentId={tournament.id}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-forest" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
