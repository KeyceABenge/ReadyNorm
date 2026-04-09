/**
 * Login Rate Limiter
 * Tracks failed passcode attempts and enforces lockout after N failures.
 * Uses localStorage for persistence across page reloads.
 */

const STORAGE_KEY = "login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getAttemptData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, firstAttempt: null, lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, firstAttempt: null, lockedUntil: null };
  }
}

function saveAttemptData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isLockedOut() {
  const data = getAttemptData();
  if (!data.lockedUntil) return { locked: false, remainingSeconds: 0 };
  const remaining = data.lockedUntil - Date.now();
  if (remaining <= 0) {
    // Lockout expired — reset
    clearAttempts();
    return { locked: false, remainingSeconds: 0 };
  }
  return { locked: true, remainingSeconds: Math.ceil(remaining / 1000) };
}

export function recordFailedAttempt() {
  const data = getAttemptData();
  const now = Date.now();
  
  // Reset if first attempt was more than lockout duration ago
  if (data.firstAttempt && now - data.firstAttempt > LOCKOUT_DURATION_MS) {
    data.count = 0;
    data.firstAttempt = null;
  }

  data.count += 1;
  if (!data.firstAttempt) data.firstAttempt = now;

  if (data.count >= MAX_ATTEMPTS) {
    data.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  saveAttemptData(data);
  
  return {
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - data.count),
    isLocked: data.count >= MAX_ATTEMPTS,
  };
}

export function clearAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAttemptsRemaining() {
  const data = getAttemptData();
  return Math.max(0, MAX_ATTEMPTS - data.count);
}