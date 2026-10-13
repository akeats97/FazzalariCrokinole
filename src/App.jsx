import { useState } from 'react';
import Home from './components/Home';
import CreateTournament from './components/CreateTournament';
import TournamentView from './components/TournamentView';
import CupHistory from './components/CupHistory';
import { useNewVersion } from './utils/useNewVersion';

// Remember where we were so a refresh (e.g. for a new version) reopens the same screen
const NAV_KEY = 'nav';

function loadNav() {
  try {
    const nav = JSON.parse(sessionStorage.getItem(NAV_KEY));
    if (nav && nav.view !== 'create' && nav.view !== 'join') return nav;
  } catch { /* ignore */ }
  return { view: 'home', tournamentId: null };
}

function saveNav(nav) {
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify(nav));
  } catch { /* ignore */ }
}

export default function App() {
  const [initial] = useState(loadNav);
  const [view, setView] = useState(initial.view);
  const [tournamentId, setTournamentId] = useState(initial.tournamentId);
  const [prefillPlayers, setPrefillPlayers] = useState([]);
  const newVersion = useNewVersion();

  function go(to, opts = {}) {
    const next = {
      view: to,
      tournamentId: opts.tournamentId !== undefined ? opts.tournamentId : tournamentId,
    };
    setTournamentId(next.tournamentId);
    if (to === 'create') setPrefillPlayers(opts.players ?? []);
    setView(to);
    saveNav(next);
    window.scrollTo(0, 0);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {view === 'home' && <Home go={go} />}
      {view === 'create' && <CreateTournament go={go} initialPlayers={prefillPlayers} />}
      {view === 'tournament' && (
        <TournamentView tournamentId={tournamentId} go={go} />
      )}
      {view === 'history' && <CupHistory go={go} />}

      {newVersion && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-ink text-cream px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-lg">
          <p className="font-sans text-sm">A new version of the app is ready.</p>
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 bg-forest hover:bg-forest-light text-white font-sans font-bold text-sm uppercase tracking-wider rounded px-4 py-2"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
