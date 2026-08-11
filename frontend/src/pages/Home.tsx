import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Trophy, Palette, Gamepad2, ArrowRight } from 'lucide-react';
import { gamesApi } from '../services/gamesApi';
import { leaderboardApi } from '../services/leaderboardApi';
import { GameInfo, LeaderboardEntry } from '../types';
import { GameCard } from '../components/GameCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Home: React.FC = () => {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [gList, lList] = await Promise.all([
          gamesApi.getGames(),
          leaderboardApi.getLeaderboard()
        ]);
        setGames(gList);
        setTopScores(lList.slice(0, 5));
      } catch (err) {
        console.error('Failed to load landing page data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-24 pb-12">
      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden pt-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider animate-pulse">
            <Sparkles size={14} />
            <span>RETRO ARCADE HUB & AI GAMES</span>
          </div>

          <h1 className="font-heading text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-none text-white max-w-4xl mx-auto">
            PLAY. COMPETE.{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              HAVE FUN.
            </span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            A curated collection of fun browser games for quick challenges, friendly competition, and endless replayability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              to="/games/draw-guess"
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-heading text-lg px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Palette size={20} />
              <span>TRY DRAW & GUESS</span>
            </Link>

            <Link
              to="/games"
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-heading text-lg px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              <Gamepad2 size={20} />
              <span>EXPLORE GAMES</span>
            </Link>
          </div>

          {/* Floating game icons animation */}
          <div className="flex justify-center gap-8 pt-8 text-4xl opacity-80 select-none">
            <span className="animate-float">🎲</span>
            <span className="animate-float [animation-delay:0.5s]">🎨</span>
            <span className="animate-float [animation-delay:1s]">❌</span>
            <span className="animate-float [animation-delay:1.5s]">🐍</span>
            <span className="animate-float [animation-delay:2s]">🔢</span>
          </div>
        </div>
      </section>

      {/* ── NEW GAME HIGHLIGHT: DRAW & GUESS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-block bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider font-heading">
                ✨ NEW GAME RELEASE
              </div>
              <h2 className="font-heading text-4xl sm:text-5xl text-white">
                🎨 DRAW & GUESS
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Can you draw well enough for the AI computer to recognize it? Get a secret word, sketch it on the interactive canvas, and test machine vision intelligence!
              </p>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span> Easy, Medium, and Hard word banks
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span> Full canvas controls (Pencil, Eraser, Color Palette, Undo/Redo)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span> Real-time AI confidence scoring & global leaderboard tracking
                </li>
              </ul>
              <Link
                to="/games/draw-guess"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading text-base px-6 py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
              >
                <span>PLAY DRAW & GUESS NOW</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-inner">
              <div className="aspect-video bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center relative">
                <span className="text-7xl animate-pulse">🚀</span>
                <div className="absolute bottom-4 left-4 bg-slate-950/80 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 border border-slate-800">
                  Target: ROCKET
                </div>
                <div className="absolute bottom-4 right-4 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/30">
                  AI Confidence: 94%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED GAMES ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-heading text-3xl text-white">🎮 FEATURED GAMES</h2>
            <p className="text-slate-400 text-sm">Pick your favorite and start playing instantly.</p>
          </div>
          <Link to="/games" className="text-amber-400 hover:text-amber-300 font-semibold text-sm flex items-center gap-1">
            <span>VIEW ALL ({games.length})</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.slice(0, 6).map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="font-heading text-3xl text-white">HOW IT WORKS</h2>
          <p className="text-slate-400 text-sm">Jump into games in three simple steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { num: '01', title: 'CHOOSE A GAME', desc: 'Browse the collection and select your game of choice.' },
            { num: '02', title: 'PLAY & CHALLENGE', desc: 'Test your skill, draw on canvas, or battle smart AI opponents.' },
            { num: '03', title: 'SCORE & COMPETE', desc: 'Submit your high score to the PostgreSQL backend leaderboard.' },
          ].map((step) => (
            <div key={step.num} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4 text-center">
              <span className="font-heading text-4xl text-amber-500 block">{step.num}</span>
              <h3 className="font-heading text-xl text-white">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LEADERBOARD PREVIEW ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="text-amber-400" size={28} />
              <h2 className="font-heading text-2xl text-white">🏆 TOP PLAYERS</h2>
            </div>
            <Link to="/leaderboard" className="text-amber-400 hover:text-amber-300 font-semibold text-sm">
              Full Leaderboard →
            </Link>
          </div>

          <div className="space-y-2">
            {topScores.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No scores recorded yet. Be the first!</p>
            ) : (
              topScores.map((score, i) => (
                <div
                  key={score.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className={`font-heading text-lg w-8 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                      #{i + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white text-base block">{score.player_name}</span>
                      <span className="text-slate-500 text-xs uppercase font-medium">{score.game_type}</span>
                    </div>
                  </div>
                  <span className="font-heading text-amber-400 text-xl">{score.score} pts</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
