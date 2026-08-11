import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🎮</span>
              <span className="font-heading text-xl text-white">GAME WEB APP</span>
            </div>
            <p className="text-sm leading-relaxed">
              Play. Compete. Have Fun. A collection of fun browser games for quick challenges, friendly competition, and endless replayability.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-white text-base mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-amber-400 transition-colors">Home</Link></li>
              <li><Link to="/games" className="hover:text-amber-400 transition-colors">All Games</Link></li>
              <li><Link to="/games/draw-guess" className="hover:text-amber-400 transition-colors">Draw & Guess</Link></li>
              <li><Link to="/leaderboard" className="hover:text-amber-400 transition-colors">Leaderboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-white text-base mb-4">Featured Games</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/games/draw-guess" className="hover:text-amber-400 transition-colors">🎨 Draw & Guess</Link></li>
              <li><Link to="/games/snakes" className="hover:text-amber-400 transition-colors">🐍 Snake & Ladder</Link></li>
              <li><Link to="/games/tictactoe" className="hover:text-amber-400 transition-colors">❌ Tic-Tac-Toe</Link></li>
              <li><Link to="/games/snake" className="hover:text-amber-400 transition-colors">🕹️ Classic Snake</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-white text-base mb-4">Architecture</h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              FastAPI • PostgreSQL / MongoDB Repository Pattern • React • TypeScript • Vite • Tailwind
            </p>
            <div className="text-xs text-slate-500">
              © {new Date().getFullYear()} Game Web App. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
