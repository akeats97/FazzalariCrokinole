import { useEffect, useState } from 'react';

const BUNDLE_RE = /\/assets\/index-[\w-]+\.js/;
const CHECK_MS = 60_000;

// True once the deployed site serves a different app bundle than the one running
export function useNewVersion() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const running = document.querySelector('script[src*="/assets/index-"]')?.getAttribute('src');
    if (!running) return;

    async function check() {
      if (document.visibilityState !== 'visible') return;
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text();
        const deployed = html.match(BUNDLE_RE)?.[0];
        if (deployed && deployed !== running) setAvailable(true);
      } catch { /* offline: try again later */ }
    }

    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  return available;
}
