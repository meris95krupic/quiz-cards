// ─── Players ──────────────────────────────────────────────────────────────────

export interface QuickPlayer {
  id: string;
  name: string;
  avatarId: number; // 1–10
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarId: number;
}

// ─── Cards & Lists ────────────────────────────────────────────────────────────

export type CardType = 'qa' | 'multiple_choice';

export interface Card {
  id: string;
  cardListId: string;
  type: CardType;
  front: string;
  back: string;
  options?: string[];      // multiple_choice only
  correctIndex?: number;   // multiple_choice only
  position: number;
  bgColor?: string;
}

export interface CardList {
  id: string;
  title: string;
  description?: string;
  bgColor?: string;
  cards?: Card[];
}

// ─── JSON Import Format ───────────────────────────────────────────────────────

export interface ImportCard {
  type: CardType;
  front: string;
  back: string;
  options?: string[];
  correctIndex?: number;
  bgColor?: string;
}

export interface ImportCardList {
  title: string;
  description?: string;
  bgColor?: string;
  cards: ImportCard[];
}

// ─── Games ────────────────────────────────────────────────────────────────────

export type GameStatus = 'lobby' | 'in_progress' | 'finished';
export type TurnResult = 'correct' | 'wrong' | 'skip';

export interface GamePlayer {
  id: string;
  gameId: string;
  userId?: string;
  name: string;
  avatarId: number;
  score: number;
  turnOrder: number;
}

export interface Game {
  id: string;
  cardListId: string;
  status: GameStatus;
  currentCardIndex: number;
  createdAt: string;
  finishedAt?: string;
}

export interface CurrentCardResponse {
  card: Card;
  currentPlayer: GamePlayer;
  cardIndex: number;
  totalCards: number;
  cardLevel: number; // learning level 1–10
}

export interface GameResults {
  game: Game;
  players: GamePlayer[];  // sorted by score desc
  turns: GameTurn[];
}

export interface GameTurn {
  id: string;
  gameId: string;
  gamePlayerId: string;
  cardId: string;
  result: TurnResult;
  playedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  avatarId: number;
  inviteCode: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  statusCode: number;
}
