import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { gamesApi } from '../services/gamesApi';
import { GameInfo } from '../types';
import { GameCard } from '../components/GameCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Games: React.FC = () => {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadGames() {
      try {
        const data = await gamesApi.getGames();
        setGames(data);
      } catch (err) {
        console.error('Failed to load games:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGames();
  }, []);

  const categories = ['All', 'Creative', 'Board', 'Puzzle', 'Arcade'];

  const filteredGames = games.filter((g) => {
    const matchesCat = category === 'All' || g.category.toLowerCase() === category.toLowerCase();
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
                          g.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <h1 className="font-heading text-4xl sm:text-5xl text-white">ALL GAMES</h1>
        <p className="text-slate-400 text-base leading-relaxed">
          Select any game to jump right in. From AI visual drawing to classic retro strategy!
        </p>
      </div>

      {/* Controls: Search & Category */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                category === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-4xl">🎮</span>
          <h3 className="font-heading text-xl text-white mt-2">NO GAMES FOUND</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search query or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};
