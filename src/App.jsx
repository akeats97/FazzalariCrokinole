import { useState } from 'react';
import Home from './components/Home';
import CreateTournament from './components/CreateTournament';
import JoinTournament from './components/JoinTournament';
import TournamentView from './components/TournamentView';
import CupHistory from './components/CupHistory';

export default function App() {
  const [view, setView] = useState('home');
  const [tournamentId, setTournamentId] = useState(null);
  const [pin, setPin] = useState(null);

  function go(to, opts = {}) {
    if (opts.tournamentId !== undefined) setTournamentId(opts.tournamentId);
    if (opts.pin !== undefined) setPin(opts.pin);
    setView(to);
    window.scrollTo(0, 0);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {view === 'home' && <Home go={go} />}
      {view === 'create' && <CreateTournament go={go} />}
      {view === 'join' && <JoinTournament go={go} />}
      {view === 'tournament' && (
        <TournamentView tournamentId={tournamentId} pin={pin} go={go} />
      )}
      {view === 'history' && <CupHistory go={go} />}
    </div>
  );
}
