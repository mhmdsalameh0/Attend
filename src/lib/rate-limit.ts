type Attempt = {
  count: number;
  lockedUntil?: number;
};

const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

export function isPinLocked(key: string) {
  const attempt = attempts.get(key);
  return Boolean(attempt?.lockedUntil && attempt.lockedUntil > Date.now());
}

export function recordFailedPin(key: string) {
  const attempt = attempts.get(key) ?? { count: 0 };
  const count = attempt.count + 1;

  attempts.set(key, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + WINDOW_MS : undefined,
  });
}

export function clearFailedPin(key: string) {
  attempts.delete(key);
}
