/**
 * storage.js — GameVault LocalStorage API
 * Manages persistent state: stats, settings, achievements, leaderboard
 */

const Storage = (() => {
  const KEYS = {
    STATS:        'gamevault_stats',
    SETTINGS:     'gamevault_settings',
    ACHIEVEMENTS: 'gamevault_achievements',
    LEADERBOARD:  'gamevault_leaderboard',
  };

  // ─── Default Data ─────────────────────────────────────────────────────────

  const DEFAULT_SETTINGS = {
    theme:      'classic',
    colorMode:  'dark',
    soundOn:    true,
    musicOn:    false,
  };

  const DEFAULT_STATS = {
    snakes:    { wins: 0, played: 0 },
    tictactoe: { wins: 0, played: 0 },
    memory:    { wins: 0, played: 0, bestTime: null },
    snake:     { highScore: 0, played: 0 },
    puzzle2048:{ bestScore: 0, played: 0, best2048: false },
  };

  const ACHIEVEMENTS_DEFS = [
    { id: 'first_win',       label: '🏆 First Victory',    desc: 'Win any game for the first time' },
    { id: 'triple_six',      label: '🎲 Lucky Sixes',       desc: 'Roll three 6s in a row in Snake & Ladder' },
    { id: 'snake_charmer',   label: '🐍 Snake Charmer',     desc: 'Land on 5 snakes in one game' },
    { id: 'ladder_legend',   label: '🪜 Ladder Legend',     desc: 'Climb 5 ladders in one game' },
    { id: 'memory_perfect',  label: '🧠 Photographic',      desc: 'Win Memory Match without a mismatch' },
    { id: 'snake_100',       label: '💯 Century Club',      desc: 'Score 100 in Classic Snake' },
    { id: 'ttt_undefeated',  label: '⚡ Undefeated',        desc: 'Win Tic-Tac-Toe 5 times in a row' },
    { id: 'score_2048',      label: '🔢 2048 Master',       desc: 'Reach the 2048 tile' },
  ];

  // ─── Core Helpers ─────────────────────────────────────────────────────────

  function load(key, defaultVal) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...load(KEYS.SETTINGS, {}) };
  }

  function saveSettings(patch) {
    const current = getSettings();
    save(KEYS.SETTINGS, { ...current, ...patch });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  function getStats() {
    const stored = load(KEYS.STATS, {});
    // Merge defaults deeply
    const result = {};
    for (const game in DEFAULT_STATS) {
      result[game] = { ...DEFAULT_STATS[game], ...(stored[game] || {}) };
    }
    return result;
  }

  function recordWin(game) {
    const stats = getStats();
    if (!stats[game]) stats[game] = { wins: 0, played: 0 };
    stats[game].wins++;
    stats[game].played++;
    save(KEYS.STATS, stats);
    checkAchievement('first_win');
  }

  function recordPlay(game) {
    const stats = getStats();
    if (!stats[game]) stats[game] = { wins: 0, played: 0 };
    stats[game].played++;
    save(KEYS.STATS, stats);
  }

  function updateHighScore(game, field, value) {
    const stats = getStats();
    if (!stats[game]) stats[game] = {};
    if (stats[game][field] === null || stats[game][field] === undefined || value > stats[game][field]) {
      stats[game][field] = value;
      save(KEYS.STATS, stats);
      return true; // new record
    }
    return false;
  }

  function updateBestTime(game, timeMs) {
    const stats = getStats();
    if (!stats[game]) stats[game] = {};
    if (!stats[game].bestTime || timeMs < stats[game].bestTime) {
      stats[game].bestTime = timeMs;
      save(KEYS.STATS, stats);
      return true;
    }
    return false;
  }

  // ─── Leaderboard ──────────────────────────────────────────────────────────

  function getLeaderboard() {
    return load(KEYS.LEADERBOARD, []);
  }

  function addLeaderboardEntry(entry) {
    const board = getLeaderboard();
    board.push({ ...entry, date: Date.now() });
    // Keep top 50 per game
    board.sort((a, b) => (b.score || 0) - (a.score || 0));
    save(KEYS.LEADERBOARD, board.slice(0, 100));
  }

  // ─── Achievements ─────────────────────────────────────────────────────────

  function getUnlocked() {
    return load(KEYS.ACHIEVEMENTS, []);
  }

  function checkAchievement(id) {
    const unlocked = getUnlocked();
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      save(KEYS.ACHIEVEMENTS, unlocked);
      // Dispatch event for toast notification
      window.dispatchEvent(new CustomEvent('achievement-unlocked', {
        detail: ACHIEVEMENTS_DEFS.find(a => a.id === id)
      }));
      return true;
    }
    return false;
  }

  function getAllAchievements() {
    const unlocked = getUnlocked();
    return ACHIEVEMENTS_DEFS.map(a => ({ ...a, unlocked: unlocked.includes(a.id) }));
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    getSettings,
    saveSettings,
    getStats,
    recordWin,
    recordPlay,
    updateHighScore,
    updateBestTime,
    getLeaderboard,
    addLeaderboardEntry,
    getAllAchievements,
    checkAchievement,
    resetAll,
    ACHIEVEMENTS_DEFS,
  };
})();
