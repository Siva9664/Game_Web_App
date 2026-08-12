import { fetchApi } from './api';
import { LeaderboardEntry } from '../types';

export const leaderboardApi = {
  getLeaderboard: async (gameType?: string): Promise<LeaderboardEntry[]> => {
    const query = gameType ? `?game=${gameType}` : '';
    return fetchApi<LeaderboardEntry[]>(`/scores/leaderboard${query}`);
  },
  submitScore: async (gameType: string, score: number, playerName: string = 'Guest') => {
    return fetchApi('/scores', {
      method: 'POST',
      body: JSON.stringify({ game_type: gameType, score, player_name: playerName }),
    });
  },
};
