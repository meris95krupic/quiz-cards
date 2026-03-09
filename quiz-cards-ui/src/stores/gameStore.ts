import { create } from 'zustand';
import type { Card, CardList, CurrentCardResponse, GamePlayer, GameResults, TurnResult } from '../types';
import { clearActiveGameId, saveActiveGameId } from '../utils/localStorage';
import { getListProgress, updateCardLevel } from '../utils/progress';
import { generateId } from '../utils/uuid';

export interface LocalAnswerResult {
  finished: boolean;
  respondingPlayer: GamePlayer; // updated score
  scoreDelta: number;           // +1, -1, or 0
  nextPlayer: GamePlayer | null;
  allPlayers: GamePlayer[];
  newCardLevel: number;         // updated learning level for the answered card
}

interface GameState {
  // ─── API mode ────────────────────────────────────────────────────────────────
  gameId: string | null;
  selectedList: CardList | null;
  currentCard: CurrentCardResponse | null;
  players: GamePlayer[];
  results: GameResults | null;
  isFlipped: boolean;

  // ─── Local mode ───────────────────────────────────────────────────────────────
  isLocalMode: boolean;
  localCards: Card[];
  localCardIndex: number;
  localCurrentPlayerIdx: number;
  localPlayers: GamePlayer[];
  localListId: string | null; // for progress tracking

  // ─── Setters (API mode) ──────────────────────────────────────────────────────
  setGameId: (id: string) => void;
  setSelectedList: (list: CardList) => void;
  setCurrentCard: (card: CurrentCardResponse) => void;
  setPlayers: (players: GamePlayer[]) => void;
  setResults: (results: GameResults) => void;
  setFlipped: (flipped: boolean) => void;

  // ─── Local mode actions ──────────────────────────────────────────────────────
  startLocalGame: (list: CardList, quickPlayers: { name: string; avatarId: number }[], maxCards?: number) => string;
  localGetCurrentCard: () => CurrentCardResponse | null;
  localAnswer: (result: TurnResult) => LocalAnswerResult;
  localGetResults: () => GameResults;

  // ─── Reset ───────────────────────────────────────────────────────────────────
  resetGame: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Selects `count` cards from `allCards` weighted by learning level.
 * Level 1 → weight 10 (appears often), Level 10 → weight 1 (appears rarely).
 */
function selectWeighted(
  allCards: Card[],
  progress: Record<string, number>,
  count: number,
): Card[] {
  // Build a weighted pool: each card gets (11 - level) slots
  const pool: Card[] = [];
  for (const card of allCards) {
    const level = progress[card.id] ?? 1;
    const weight = 11 - level;
    for (let i = 0; i < weight; i++) pool.push(card);
  }

  // Shuffle and pick first `count` unique cards
  const shuffled = shuffle(pool);
  const seen = new Set<string>();
  const selected: Card[] = [];
  for (const card of shuffled) {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      selected.push(card);
      if (selected.length >= count) break;
    }
  }

  // If weighted selection didn't fill all slots, append remaining cards
  if (selected.length < count) {
    for (const card of shuffle(allCards)) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        selected.push(card);
        if (selected.length >= count) break;
      }
    }
  }

  return selected;
}

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  selectedList: null,
  currentCard: null,
  players: [],
  results: null,
  isFlipped: false,

  isLocalMode: false,
  localCards: [],
  localCardIndex: 0,
  localCurrentPlayerIdx: 0,
  localPlayers: [],
  localListId: null,

  // ─── API mode setters ─────────────────────────────────────────────────────────

  setGameId: (id) => {
    saveActiveGameId(id);
    set({ gameId: id });
  },
  setSelectedList: (list) => set({ selectedList: list }),
  setCurrentCard: (card) => set({ currentCard: card, isFlipped: false }),
  setPlayers: (players) => set({ players }),
  setResults: (results) => set({ results }),
  setFlipped: (flipped) => set({ isFlipped: flipped }),

  // ─── Local mode ───────────────────────────────────────────────────────────────

  startLocalGame: (list, quickPlayers, maxCards) => {
    const fakeGameId = `local-${generateId()}`;
    const allCards = list.cards ?? [];
    const n = quickPlayers.length;
    const cap = maxCards ? Math.min(maxCards, allCards.length) : allCards.length;
    const count = Math.max(n, Math.floor(cap / Math.max(n, 1)) * Math.max(n, 1));

    // Use learning progress to weight card selection
    const progress = getListProgress(list.id);
    const cards = selectWeighted(allCards, progress, count);

    const localPlayers: GamePlayer[] = quickPlayers.map((p, i) => ({
      id: generateId(),
      gameId: fakeGameId,
      name: p.name,
      avatarId: p.avatarId,
      score: 0,
      turnOrder: i,
    }));

    saveActiveGameId(fakeGameId);
    set({
      isLocalMode: true,
      gameId: fakeGameId,
      selectedList: list,
      localListId: list.id,
      localCards: cards,
      localCardIndex: 0,
      localCurrentPlayerIdx: 0,
      localPlayers,
      isFlipped: false,
      results: null,
    });

    return fakeGameId;
  },

  localGetCurrentCard: (): CurrentCardResponse | null => {
    const { localCards, localCardIndex, localCurrentPlayerIdx, localPlayers, localListId } = get();
    if (localCardIndex >= localCards.length || localPlayers.length === 0) return null;
    const card = localCards[localCardIndex];
    return {
      card,
      currentPlayer: localPlayers[localCurrentPlayerIdx],
      cardIndex: localCardIndex,
      totalCards: localCards.length,
      cardLevel: localListId ? (getListProgress(localListId)[card.id] ?? 1) : 1,
    };
  },

  localAnswer: (result: TurnResult): LocalAnswerResult => {
    const state = get();
    const { localCards, localCardIndex, localCurrentPlayerIdx, localListId } = state;
    const players = state.localPlayers.map((p) => ({ ...p }));
    const answeredCard = localCards[localCardIndex];

    // Update learning level: correct +1, wrong/skip -1
    const levelDelta = result === 'correct' ? 1 : -1;
    const newCardLevel = localListId
      ? updateCardLevel(localListId, answeredCard.id, levelDelta)
      : 1;

    const nextCardIndex = localCardIndex + 1;
    const nextPlayerIdx = nextCardIndex % players.length;
    const finished = nextCardIndex >= localCards.length;

    if (result !== 'skip') {
      const scoreDelta = result === 'correct' ? 1 : -1;
      players[localCurrentPlayerIdx].score += scoreDelta;
    }

    set({
      localPlayers: players,
      localCardIndex: nextCardIndex,
      localCurrentPlayerIdx: nextPlayerIdx,
      isFlipped: false,
    });

    return {
      finished,
      respondingPlayer: players[localCurrentPlayerIdx],
      scoreDelta: result === 'correct' ? 1 : result === 'wrong' ? -1 : 0,
      nextPlayer: finished ? null : players[nextPlayerIdx],
      allPlayers: players,
      newCardLevel,
    };
  },

  localGetResults: (): GameResults => {
    const { localPlayers, gameId, selectedList, localCards } = get();
    const sorted = [...localPlayers].sort((a, b) => b.score - a.score);
    return {
      game: {
        id: gameId ?? 'local',
        cardListId: selectedList?.id ?? '',
        status: 'finished',
        currentCardIndex: localCards.length,
        createdAt: new Date().toISOString(),
      },
      players: sorted,
      turns: [],
    };
  },

  // ─── Reset ────────────────────────────────────────────────────────────────────

  resetGame: () => {
    clearActiveGameId();
    set({
      gameId: null,
      selectedList: null,
      currentCard: null,
      players: [],
      results: null,
      isFlipped: false,
      isLocalMode: false,
      localCards: [],
      localCardIndex: 0,
      localCurrentPlayerIdx: 0,
      localPlayers: [],
      localListId: null,
    });
  },
}));
