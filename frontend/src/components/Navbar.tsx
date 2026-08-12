import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, Menu, X, Trophy, User, Home, Palette } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Games', path: '/games', icon: Gamepad2 },
    { name: 'Draw & Guess', path: '/games/draw-guess', icon: Palette, badge: 'NEW' },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-3xl transform group-hover:scale-110 transition-transform">🎮</span>
            <span className="font-heading text-2xl bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              GAME WEB APP
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive(link.path)
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <Link
              to="/games/draw-guess"
              className="ml-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-heading px-5 py-2 rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
            >
              PLAY NOW 🚀
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-300 hover:text-white p-2 rounded-lg"
              aria-label="Toggle Navigation"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium ${
                  isActive(link.path)
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span className="bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
