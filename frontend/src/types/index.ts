export interface GameInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  featured?: boolean;
  route: string;
}

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  game_type: string;
  score: number;
  created_at: string;
}

export interface DrawGuessStartResponse {
  game_id: string;
  target_word: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface DrawGuessResult {
  game_id: string;
  target_word: string;
  ai_guess: string;
  confidence: number;
  is_correct: boolean;
  score: number;
  attempts: number;
  status: string;
  completed_at: string;
}

export interface UserHistoryItem {
  id: string;
  game_type: string;
  status: string;
  score: number;
  started_at: string;
  completed_at?: string;
}
