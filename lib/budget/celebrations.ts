import confetti from "canvas-confetti";

const STORAGE_KEY = "mjolnir:celebrated-goals";

/**
 * Check if a goal's celebration has already been shown.
 */
export function hasCelebrated(goalId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const ids: string[] = JSON.parse(stored);
    return ids.includes(goalId);
  } catch {
    return false;
  }
}

/**
 * Mark a goal as celebrated so the animation doesn't fire again.
 */
export function markCelebrated(goalId: string): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    if (!ids.includes(goalId)) {
      ids.push(goalId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // localStorage unavailable — silently skip
  }
}

/**
 * Fire a 3-second confetti burst.
 */
export function fireCelebration(): void {
  const duration = 3000;
  const end = Date.now() + duration;

  function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }

  frame();
}
