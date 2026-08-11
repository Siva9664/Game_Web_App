import React from 'react';
import { Link } from 'react-router-dom';
import { GameInfo } from '../types';
import { Play } from 'lucide-react';

interface GameCardProps {
  game: GameInfo;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-5xl group-hover:scale-110 transition-transform">{game.icon}</span>
          {game.featured && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full">
              FEATURED
            </span>
          )}
        </div>
        <h3 className="text-xl font-heading text-white mb-2 group-hover:text-amber-400 transition-colors">
          {game.name}
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-4">
          {game.description}
        </p>
      </div>

      <div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {game.tags.map((tag) => (
            <span key={tag} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-lg font-medium">
              {tag}
            </span>
          ))}
        </div>

        <Link
          to={game.route}
          className="w-full bg-slate-800 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-slate-950 text-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all group-hover:shadow-md"
        >
          <Play size={16} fill="currentColor" />
          <span>PLAY GAME</span>
        </Link>
      </div>
    </div>
  );
};
