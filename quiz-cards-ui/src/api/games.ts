import type { CurrentCardResponse, Game, GamePlayer, OnlineGameResults, OnlineGameState, TurnResult } from '../types';
import { apiClient } from './client';

export const gamesApi = {
  create: async (cardListId: string): Promise<Game> => {
    const { data } = await apiClient.post<Game>('/games', { cardListId });
    return data;
  },

  getById: async (id: string): Promise<Game> => {
    const { data } = await apiClient.get<Game>(`/games/${id}`);
    return data;
  },

  addPlayer: async (
    gameId: string,
    player: { name: string; avatarId: number; userId?: string }
  ): Promise<GamePlayer> => {
    const { data } = await apiClient.post<GamePlayer>(`/games/${gameId}/players`, player);
    return data;
  },

  start: async (gameId: string): Promise<Game> => {
    const { data } = await apiClient.post<Game>(`/games/${gameId}/start`);
    return data;
  },

  getCurrentCard: async (gameId: string): Promise<CurrentCardResponse> => {
    const { data } = await apiClient.get<CurrentCardResponse>(`/games/${gameId}/current-card`);
    return data;
  },

  answer: async (gameId: string, result: TurnResult, chosenIndex?: number): Promise<void> => {
    await apiClient.post(`/games/${gameId}/answer`, { result, ...(chosenIndex !== undefined && { chosenIndex }) });
  },

  getResults: async (gameId: string): Promise<OnlineGameResults> => {
    const { data } = await apiClient.get<OnlineGameResults>(`/games/${gameId}/results`);
    return data;
  },

  getState: async (gameId: string): Promise<OnlineGameState> => {
    const { data } = await apiClient.get<OnlineGameState>(`/games/${gameId}/state`);
    return data;
  },
};
