import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Games } from './pages/Games';
import { DrawGuess } from './pages/DrawGuess';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { LegacyGameWrapper } from './pages/LegacyGameWrapper';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/draw-guess" element={<DrawGuess />} />
            <Route path="/games/:gameId" element={<LegacyGameWrapper />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
