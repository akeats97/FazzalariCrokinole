import { useEffect, useState } from 'react';
import { getCupPhoto, setCupPhoto, removeCupPhoto } from '../firebase/db';
import { compressImage } from '../utils/compressImage';
import { isHostUnlocked } from '../utils/hostAuth';
import PasswordPrompt from './PasswordPrompt';

// Champion photo for a Cup History entry: an uploaded photo wins over the static imageUrl
export function CupPhotoImage({ entry, alt }) {
  const [uploaded, setUploaded] = useState(null);
  const version = entry.photoUpdatedAt?.toMillis?.() ?? null;

  useEffect(() => {
    if (!version) { setUploaded(null); return; }
    let cancelled = false;
    getCupPhoto(entry.id)
      .then((url) => { if (!cancelled) setUploaded(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [entry.id, version]);

  const src = uploaded ?? entry.imageUrl;
  if (!src) return null;
  return <img src={src} alt={alt} className="w-full h-auto" />;
}

export function CupPhotoControls({ entry }) {
  const [mode, setMode] = useState('idle'); // idle | password | ready | saving | confirmRemove
  const [error, setError] = useState('');
  const hasUploaded = Boolean(entry.photoUpdatedAt);
  const hasAnyPhoto = hasUploaded || Boolean(entry.imageUrl);

  function start() {
    setError('');
    setMode(isHostUnlocked() ? 'ready' : 'password');
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMode('saving');
    setError('');
    try {
      const dataUrl = await compressImage(file);
      await setCupPhoto(entry.id, dataUrl);
      setMode('idle');
    } catch (err) {
      setError(
        err.message === 'UNREADABLE'
          ? "That file couldn't be opened as a photo. Try a JPEG or PNG."
          : 'Upload failed. Check your connection and try again.'
      );
      setMode('ready');
    }
  }

  async function handleRemove() {
    setMode('saving');
    try {
      await removeCupPhoto(entry.id);
      setMode('idle');
    } catch {
      setError('Could not remove the photo. Try again.');
      setMode('ready');
    }
  }

  if (mode === 'idle') {
    return (
      <div className="px-4 pb-3 -mt-1">
        <button
          onClick={start}
          className="font-sans text-xs font-bold uppercase tracking-wide text-ink-muted hover:text-ink underline underline-offset-2"
        >
          {hasAnyPhoto ? 'Change photo' : 'Add photo'}
        </button>
      </div>
    );
  }

  if (mode === 'password') {
    return (
      <PasswordPrompt
        compact
        message="Enter the host password to change this photo."
        onCancel={() => setMode('idle')}
        onUnlock={() => setMode('ready')}
      />
    );
  }

  return (
    <div className="px-4 pb-4 flex flex-col gap-2">
      {error && <p className="font-sans text-xs text-rosso text-center">{error}</p>}
      {mode === 'confirmRemove' ? (
        <>
          <p className="font-sans text-xs text-ink text-center">Remove the uploaded photo?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('ready')}
              className="flex-1 py-2.5 rounded border-2 border-ink/15 text-ink-muted font-sans font-bold text-sm uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              className="flex-1 py-2.5 rounded bg-rosso text-white font-sans font-bold text-sm uppercase tracking-wider"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <label
            className={`w-full py-2.5 rounded bg-ink text-cream font-sans font-bold text-sm uppercase tracking-wider text-center cursor-pointer ${
              mode === 'saving' ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            {mode === 'saving' ? 'Saving…' : 'Choose photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={mode === 'saving'}
              className="hidden"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('idle')}
              disabled={mode === 'saving'}
              className="flex-1 py-2 rounded border-2 border-ink/15 text-ink-muted font-sans font-bold text-xs uppercase tracking-wider"
            >
              Done
            </button>
            {hasUploaded && (
              <button
                onClick={() => setMode('confirmRemove')}
                disabled={mode === 'saving'}
                className="flex-1 py-2 rounded border-2 border-rosso/30 text-rosso font-sans font-bold text-xs uppercase tracking-wider"
              >
                Remove photo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
