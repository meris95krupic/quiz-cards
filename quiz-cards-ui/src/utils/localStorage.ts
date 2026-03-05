import type { CardList, QuickPlayer } from '../types';

const KEYS = {
  QUICK_PLAYERS: 'quiz_quick_players',
  ACTIVE_GAME:   'quiz_active_game',
  AUTH_TOKEN:    'auth_token',
  CURRENT_USER:  'quiz_current_user',
  LOCAL_LISTS:   'quiz_local_lists',
} as const;

// ─── Quick Players ────────────────────────────────────────────────────────────

export const getQuickPlayers = (): QuickPlayer[] => {
  try {
    const raw = localStorage.getItem(KEYS.QUICK_PLAYERS);
    return raw ? (JSON.parse(raw) as QuickPlayer[]) : [];
  } catch {
    return [];
  }
};

export const saveQuickPlayers = (players: QuickPlayer[]): void => {
  localStorage.setItem(KEYS.QUICK_PLAYERS, JSON.stringify(players));
};

// ─── Local Card Lists (offline mode) ─────────────────────────────────────────

export const getLocalLists = (): CardList[] => {
  try {
    const raw = localStorage.getItem(KEYS.LOCAL_LISTS);
    return raw ? (JSON.parse(raw) as CardList[]) : [];
  } catch {
    return [];
  }
};

export const saveLocalLists = (lists: CardList[]): void => {
  localStorage.setItem(KEYS.LOCAL_LISTS, JSON.stringify(lists));
};

// ─── Active Game ──────────────────────────────────────────────────────────────

export const getActiveGameId = (): string | null => {
  return localStorage.getItem(KEYS.ACTIVE_GAME);
};

export const saveActiveGameId = (gameId: string): void => {
  localStorage.setItem(KEYS.ACTIVE_GAME, gameId);
};

export const clearActiveGameId = (): void => {
  localStorage.removeItem(KEYS.ACTIVE_GAME);
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const getAuthToken = (): string | null => {
  return localStorage.getItem(KEYS.AUTH_TOKEN);
};

export const saveAuthToken = (token: string): void => {
  localStorage.setItem(KEYS.AUTH_TOKEN, token);
};

export const clearAuth = (): void => {
  localStorage.removeItem(KEYS.AUTH_TOKEN);
  localStorage.removeItem(KEYS.CURRENT_USER);
};
