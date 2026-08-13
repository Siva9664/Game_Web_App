import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Pencil, Eraser, RotateCcw, RotateCw, Trash2, Palette as PaletteIcon, 
  Sparkles, CheckCircle2, XCircle, ArrowLeft, RefreshCw, Trophy
} from 'lucide-react';
import { drawGuessApi } from '../services/drawGuessApi';
import { DrawGuessResult } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const DrawGuess: React.FC = () => {
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'ANALYZING' | 'RESULT'>('IDLE');
  const [gameId, setGameId] = useState<string>('');
  const [targetWord, setTargetWord] = useState<string>('');
  const [result, setResult] = useState<DrawGuessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(6);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const colors = ['#ffffff', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];

  // Start new game session
  const handleStartGame = async (diff: 'EASY' | 'MEDIUM' | 'HARD' = difficulty) => {
    try {
      setErrorMsg('');
      setGameState('ANALYZING');
      const data = await drawGuessApi.startGame(diff);
      setGameId(data.game_id);
      setTargetWord(data.target_word);
      setDifficulty(data.difficulty);
      setGameState('PLAYING');
      
      // Clear canvas on new game
      setTimeout(() => initCanvas(), 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start game');
      setGameState('IDLE');
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial history
    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialData]);
    setHistoryIndex(0);
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      initCanvas();
    }
  }, [gameState]);

  // Save state for Undo / Redo
  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(data);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const handleClear = () => {
    initCanvas();
  };

  // Pointer Event listeners for touch/mouse/stylus
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      pushHistory();
    }
  };

  // Submit drawing to backend AI Vision endpoint
  const handleSubmitGuess = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64Image = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

    setGameState('ANALYZING');
    try {
      const res = await drawGuessApi.submitGuess(gameId, base64Image);
      setResult(res);
      setGameState('RESULT');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing AI guess');
      setGameState('PLAYING');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/games" className="flex items-center gap-2 text-slate-400 hover:text-amber-400 font-semibold text-sm transition-colors">
            <ArrowLeft size={18} />
            <span>BACK TO GAMES</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <h1 className="font-heading text-2xl bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              DRAW & GUESS
            </h1>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {/* ── STATE 1: IDLE / DIFFICULTY SELECT ── */}
        {gameState === 'IDLE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-8 shadow-2xl">
            <div className="space-y-3">
              <span className="text-6xl inline-block animate-float">🎨</span>
              <h2 className="font-heading text-3xl text-white">Can AI Guess Your Drawing?</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Choose a difficulty level. We'll secretely assign you a target word to sketch on the canvas!
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Select Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-3 px-4 rounded-xl font-heading text-sm transition-all ${
                      difficulty === d
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartGame(difficulty)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-heading text-lg py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              START DRAWING 🚀
            </button>
          </div>
        )}

        {/* ── STATE 2: ANALYZING ── */}
        {gameState === 'ANALYZING' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center max-w-xl mx-auto space-y-6">
            <LoadingSpinner message="🤖 AI IS LOOKING AT YOUR DRAWING..." />
            <p className="text-slate-400 text-sm">Evaluating strokes, patterns, and visual features...</p>
          </div>
        )}

        {/* ── STATE 3: PLAYING (CANVAS) ── */}
        {gameState === 'PLAYING' && (
          <div className="space-y-6">
            {/* Word Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-2xl p-6 text-center space-y-1 shadow-lg">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">Your Target Word</span>
              <div className="font-heading text-3xl sm:text-4xl text-white tracking-wider uppercase">
                🚀 {targetWord}
              </div>
              <p className="text-slate-400 text-xs">Draw it clearly without writing words or letters!</p>
            </div>

            {/* Canvas Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="relative touch-none overflow-hidden rounded-xl border border-slate-700/50 bg-slate-950 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  className="cursor-crosshair max-w-full h-auto bg-slate-950 rounded-xl"
                />
              </div>

              {/* Drawing Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {/* Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTool('pencil')}
                    className={`p-2.5 rounded-lg transition-colors ${tool === 'pencil' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    title="Pencil"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-2.5 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    title="Eraser"
                  >
                    <Eraser size={18} />
                  </button>
                  <div className="h-6 w-px bg-slate-800 mx-1" />
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Redo"
                  >
                    <RotateCw size={18} />
                  </button>
                  <button
                    onClick={handleClear}
                    className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    title="Clear Canvas"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Color Palette & Brush Size */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setColor(c); setTool('pencil'); }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && tool === 'pencil' ? 'scale-125 border-amber-400' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Size:</span>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="w-20 accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setGameState('IDLE')}
                  className="text-slate-400 hover:text-slate-200 text-sm font-semibold px-4 py-2"
                >
                  Abandon Game
                </button>

                <button
                  onClick={handleSubmitGuess}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-heading text-lg px-8 py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 hover:scale-105 transition-all"
                >
                  <Sparkles size={20} />
                  <span>🤖 GUESS DRAWING</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STATE 4: RESULT SCREEN ── */}
        {gameState === 'RESULT' && result && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-8 shadow-2xl">
            <div className="space-y-2">
              {result.is_correct ? (
                <>
                  <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="font-heading text-3xl text-emerald-400">AI Guessed It! 🎉</h2>
                  <p className="text-slate-400 text-sm">Great drawing! The computer identified your artwork correctly.</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle size={48} />
                  </div>
                  <h2 className="font-heading text-3xl text-amber-400">AI Is Confused 🤖</h2>
                  <p className="text-slate-400 text-sm">Close match! Try sketching with clearer outlines next time.</p>
                </>
              )}
            </div>

            {/* Scoreboard Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-left border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">TARGET WORD</span>
                  <span className="font-heading text-lg text-white uppercase">{result.target_word}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">AI GUESS</span>
                  <span className="font-heading text-lg text-amber-400 uppercase">{result.ai_guess || 'Unknown'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">CONFIDENCE</span>
                  <span className="font-heading text-lg text-slate-200">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">FINAL SCORE</span>
                  <span className="font-heading text-xl text-amber-400 flex items-center gap-1">
                    <Trophy size={18} />
                    {result.score}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleStartGame(difficulty)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={18} />
                <span>PLAY AGAIN</span>
              </button>
              <Link
                to="/games"
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-heading py-3.5 px-6 rounded-xl transition-colors text-center"
              >
                BACK TO GAMES
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
