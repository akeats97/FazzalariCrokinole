import { useSyncExternalStore } from 'react';

// SHA-256 of the admin PIN, so the plain text isn't shipped in the bundle
const PASSWORD_HASH = 'b97d4904938f12a04277ff18c386c7460877bf4002ad82a0ee3a5ab88f2b9249';
const UNLOCK_KEY = 'manageUnlocked';

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Admin sign-in is remembered on this device until someone signs out
export function isHostUnlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function lockHost() {
  try {
    localStorage.removeItem(UNLOCK_KEY);
  } catch { /* ignore */ }
  notify();
}

// Returns true and remembers the sign-in on this device if the PIN matches
export async function unlockHost(pin) {
  if ((await sha256(pin.trim())) !== PASSWORD_HASH) return false;
  try {
    localStorage.setItem(UNLOCK_KEY, '1');
  } catch { /* ignore */ }
  notify();
  return true;
}

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === UNLOCK_KEY) fn(); };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

// Re-renders when someone signs in or out (in this tab or another)
export function useAdmin() {
  return useSyncExternalStore(subscribe, isHostUnlocked, () => false);
}
