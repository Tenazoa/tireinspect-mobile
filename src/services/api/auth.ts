import { apiClient } from './client';
import type { Inspector } from '../../types';

export async function apiLogin(email: string, password: string): Promise<{ inspector: Inspector; token: string }> {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return { inspector: data.inspector, token: data.access_token };
}

export async function apiMe(): Promise<Inspector> {
  const { data } = await apiClient.get('/auth/me');
  return data;
}
