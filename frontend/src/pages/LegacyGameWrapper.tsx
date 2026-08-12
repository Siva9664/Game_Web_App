import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const LegacyGameWrapper: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();

  // Map route params to HTML game screen IDs in game.html
  const screenMap: Record<string, string> = {
    snakes: 'screen-snakes',
    tictactoe: 'screen-tictactoe',
    memory: 'screen-memory',
    snake: 'screen-snake',
    puzzle2048: 'screen-2048',
  };

  const targetScreen = gameId ? screenMap[gameId] || 'screen-hub' : 'screen-hub';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800 py-3 px-6 flex items-center justify-between">
        <Link
          to="/games"
          className="flex items-center gap-2 text-slate-400 hover:text-amber-400 font-semibold text-sm transition-colors"
        >
          <ArrowLeft size={18} />
          <span>BACK TO GAMES</span>
        </Link>
        <span className="font-heading text-amber-400 uppercase tracking-wider text-sm">
          {gameId} Mode
        </span>
      </div>

      <div className="flex-1 w-full relative">
        <iframe
          src={`/game.html#${targetScreen}`}
          title={`Game - ${gameId}`}
          className="w-full h-[calc(100vh-64px)] border-0"
        />
      </div>
    </div>
  );
};
