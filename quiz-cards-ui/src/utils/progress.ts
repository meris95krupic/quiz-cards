/**
 * Spaced-repetition progress stored in localStorage.
 *
 * Structure: { [listId]: { [cardId]: level } }
 * Level 1  = new / not yet known
 * Level 10 = mastered (appears rarely)
 */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

type ListProgress = Record<string, number>; // cardId → level
type AllProgress  = Record<string, ListProgress>; // listId → ListProgress

const STORAGE_KEY = 'quiz_card_progress';

function loadAll(): AllProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AllProgress) : {};
  } catch {
    return {};
  }
}

function saveAll(all: AllProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getListProgress(listId: string): ListProgress {
  return loadAll()[listId] ?? {};
}

export function getCardLevel(listId: string, cardId: string): number {
  return getListProgress(listId)[cardId] ?? MIN_LEVEL;
}

/**
 * Applies delta (+1 correct, -1 wrong/skip) and persists.
 * Returns the new level.
 */
export function updateCardLevel(listId: string, cardId: string, delta: number): number {
  const all = loadAll();
  if (!all[listId]) all[listId] = {};
  const current = all[listId][cardId] ?? MIN_LEVEL;
  const next = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, current + delta));
  all[listId][cardId] = next;
  saveAll(all);
  return next;
}
