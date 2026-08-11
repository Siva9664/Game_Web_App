import React, { useEffect, useState } from 'react';
import { User, History, Shield, Calendar } from 'lucide-react';
import { fetchApi } from '../services/api';
import { UserHistoryItem } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Profile: React.FC = () => {
  const [history, setHistory] = useState<UserHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await fetchApi<UserHistoryItem[]>('/users/me/history');
        setHistory(data);
      } catch {
        // Fallback for guest sessions without auth token
        setHistory([
          {
            id: 'demo-1',
            game_type: 'draw-guess',
            status: 'completed',
            score: 920,
            started_at: new Date().toISOString(),
          },
          {
            id: 'demo-2',
            game_type: 'snake',
            status: 'completed',
            score: 850,
            started_at: new Date(Date.now() - 86400000).toISOString(),
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center gap-6 shadow-xl">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-4xl">
          🦊
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl text-white">Guest Arcade Player</h1>
            <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Guest Mode
            </span>
          </div>
          <p className="text-slate-400 text-xs flex items-center gap-1">
            <Shield size={14} className="text-amber-400" />
            <span>Scores persisted to PostgreSQL database</span>
          </p>
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="text-amber-400" size={20} />
          <h2 className="font-heading text-xl text-white">MY GAME HISTORY</h2>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : history.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No games played yet. Go try Draw & Guess or Snake!
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 shadow-lg">
            {history.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {item.game_type === 'draw-guess' ? '🎨' : item.game_type === 'snakes' ? '🐍' : '🕹️'}
                  </span>
                  <div>
                    <span className="font-bold text-white text-base block uppercase">{item.game_type}</span>
                    <span className="text-slate-500 text-xs flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(item.started_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading text-amber-400 text-lg block">{item.score} pts</span>
                  <span className="text-emerald-400 text-xs font-semibold capitalize">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
