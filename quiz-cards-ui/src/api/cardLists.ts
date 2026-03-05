import type { CardList, ImportCardList } from '../types';
import { apiClient } from './client';

export const cardListsApi = {
  getAll: async (): Promise<CardList[]> => {
    const { data } = await apiClient.get<CardList[]>('/card-lists');
    return data;
  },

  getById: async (id: string): Promise<CardList> => {
    const { data } = await apiClient.get<CardList>(`/card-lists/${id}`);
    return data;
  },

  importList: async (list: ImportCardList): Promise<CardList> => {
    const { data } = await apiClient.post<CardList>('/card-lists/import', list);
    return data;
  },

  deleteList: async (id: string): Promise<void> => {
    await apiClient.delete(`/card-lists/${id}`);
  },
};
