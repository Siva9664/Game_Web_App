import React, { useEffect, useState } from 'react';
import { Trophy, Filter } from 'lucide-react';
import { leaderboardApi } from '../services/leaderboardApi';
import { LeaderboardEntry } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Leaderboard: React.FC = () => {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [gameFilter, setGameFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const data = await leaderboardApi.getLeaderboard(gameFilter || undefined);
        setScores(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [gameFilter]);

  const gameOptions = [
    { label: 'All Games', value: '' },
    { label: '🎨 Draw & Guess', value: 'draw-guess' },
    { label: '🐍 Snake & Ladder', value: 'snakes' },
    { label: '🕹️ Classic Snake', value: 'snake' },
    { label: '🔢 2048', value: 'puzzle2048' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <Trophy size={32} />
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl text-white">GLOBAL LEADERBOARD</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Real-time high scores persisted in PostgreSQL database backend.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
        {gameOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setGameFilter(opt.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              gameFilter === opt.value
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <LoadingSpinner message="🏆 LOADING LEADERBOARD..." />
      ) : scores.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          No scores found for this category yet. Be the first to play!
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="divide-y divide-slate-800">
            {scores.map((entry, idx) => (
              <div
                key={entry.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`font-heading text-lg w-8 ${
                    idx === 0 ? 'text-amber-400 text-xl' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-white block text-base">{entry.player_name}</span>
                    <span className="text-slate-500 text-xs uppercase font-semibold">{entry.game_type}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading text-xl text-amber-400 block">{entry.score} pts</span>
                  <span className="text-slate-500 text-xs">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
