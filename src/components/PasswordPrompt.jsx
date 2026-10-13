import { useState } from 'react';
import { unlockHost } from '../utils/hostAuth';

export default function PasswordPrompt({ onUnlock, onCancel, message, compact = false }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setChecking(true);
    const ok = await unlockHost(password);
    setChecking(false);
    if (!ok) {
      setError('Incorrect password.');
      setPassword('');
      return;
    }
    onUnlock();
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col ${compact ? 'gap-2 px-4 pb-4' : 'gap-4 px-5 py-6'}`}>
      {message && (
        <p className={`font-sans text-ink-muted ${compact ? 'text-xs text-center' : 'text-sm'}`}>{message}</p>
      )}
      <input
        type="password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError(''); }}
        placeholder="Password"
        autoFocus
        className={`font-sans bg-cream border-2 border-ink/15 focus:border-forest rounded outline-none transition-colors text-ink text-base ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
      />
      {error && (
        compact ? (
          <p className="font-sans text-xs text-rosso text-center">{error}</p>
        ) : (
          <div className="border-l-4 border-l-rosso bg-rosso/5 border border-rosso/20 rounded px-4 py-3">
            <p className="font-sans text-sm text-rosso">{error}</p>
          </div>
        )
      )}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded border-2 border-ink/15 text-ink-muted font-sans font-bold text-sm uppercase tracking-wider"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!password || checking}
          className={compact
            ? 'flex-1 py-2.5 rounded bg-ink text-cream font-sans font-bold text-sm uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed'
            : 'btn-primary disabled:opacity-40 disabled:cursor-not-allowed'}
        >
          Sign In
        </button>
      </div>
    </form>
  );
}
