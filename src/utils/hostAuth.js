// SHA-256 of the host password, so the plain text isn't shipped in the bundle
const PASSWORD_HASH = '106a6a89e47bee59eeeb413371f5f656e0f89d4b2e233148bdbc17b4ff6329e1';
const UNLOCK_KEY = 'manageUnlocked';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Host mode is remembered on this device until someone taps "Lock host mode"
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
}

// Returns true and remembers the unlock on this device if the password matches
export async function unlockHost(password) {
  if ((await sha256(password)) !== PASSWORD_HASH) return false;
  try {
    localStorage.setItem(UNLOCK_KEY, '1');
  } catch { /* ignore */ }
  return true;
}
