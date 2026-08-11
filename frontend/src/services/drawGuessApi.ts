import { fetchApi } from './api';
import { DrawGuessStartResponse, DrawGuessResult } from '../types';

export const drawGuessApi = {
  startGame: async (difficulty: 'EASY' | 'MEDIUM' | 'HARD'): Promise<DrawGuessStartResponse> => {
    return fetchApi<DrawGuessStartResponse>('/draw-guess/start', {
      method: 'POST',
      body: JSON.stringify({ difficulty }),
    });
  },
  submitGuess: async (gameId: string, imageBase64: string): Promise<DrawGuessResult> => {
    return fetchApi<DrawGuessResult>(`/draw-guess/${gameId}/guess`, {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
  },
};
