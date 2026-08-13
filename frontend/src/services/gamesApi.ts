import { fetchApi } from './api';
import { GameInfo } from '../types';

export const gamesApi = {
  getGames: async (): Promise<GameInfo[]> => {
    return fetchApi<GameInfo[]>('/games');
  },
  getGame: async (id: string): Promise<GameInfo> => {
    return fetchApi<GameInfo>(`/games/${id}`);
  },
};
