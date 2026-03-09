import type { CardList, ShopSubmission } from '../types';
import { apiClient } from './client';

export const shopApi = {
  getApproved: async (): Promise<ShopSubmission[]> => {
    const { data } = await apiClient.get<ShopSubmission[]>('/shop');
    return data;
  },

  getPending: async (): Promise<ShopSubmission[]> => {
    const { data } = await apiClient.get<ShopSubmission[]>('/shop/pending');
    return data;
  },

  submit: async (listId: string): Promise<ShopSubmission> => {
    const { data } = await apiClient.post<ShopSubmission>(`/shop/submit/${listId}`);
    return data;
  },

  approve: async (id: string): Promise<ShopSubmission> => {
    const { data } = await apiClient.post<ShopSubmission>(`/shop/${id}/approve`);
    return data;
  },

  reject: async (id: string): Promise<ShopSubmission> => {
    const { data } = await apiClient.post<ShopSubmission>(`/shop/${id}/reject`);
    return data;
  },

  importToMyLists: async (id: string): Promise<CardList> => {
    const { data } = await apiClient.post<CardList>(`/shop/${id}/import`);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/shop/${id}`);
  },
};
