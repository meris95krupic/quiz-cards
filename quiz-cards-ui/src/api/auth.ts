import type { AuthTokens, LoginDto, RegisterDto, User } from '../types';
import { apiClient } from './client';

export const authApi = {
  register: async (dto: RegisterDto): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/register', dto);
    return data;
  },

  login: async (dto: LoginDto): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', dto);
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
};
