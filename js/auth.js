/**
 * auth.js — Client-side Auth System (localStorage-based)
 * Provides login, signup, guest mode, profile, XP, session management
 */
const Auth = (() => {
  const KEY_USERS    = 'gv_users';
  const KEY_SESSION  = 'gv_session';
  const AVATARS = ['🦊','🐸','🐼','🦁','🐯','🐻','🤖','👾','🦄','🐲','🧸','🎭','🎩','👑','🔥','⚡'];
  const XP_PER_PLAY  = 5;
  const XP_PER_WIN   = 25;
  const XP_PER_LEVEL = 100;

  // ── Storage ──────────────────────────────────────────────────
  function getUsers()   { try { return JSON.parse(localStorage.getItem(KEY_USERS) || '{}'); } catch { return {}; } }
  function saveUsers(u) { localStorage.setItem(KEY_USERS, JSON.stringify(u)); }
  function getSession() { try { return JSON.parse(sessionStorage.getItem(KEY_SESSION) || 'null'); } catch { return null; } }
  function saveSession(s) { sessionStorage.setItem(KEY_SESSION, JSON.stringify(s)); }
  function clearSession()  { sessionStorage.removeItem(KEY_SESSION); }

  // ── Validation ───────────────────────────────────────────────
  function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function validatePassword(p) {
    return { ok: p.length >= 6, strength: p.length >= 10 && /[A-Z]/.test(p) && /[0-9]/.test(p) ? 'strong' : p.length >= 6 ? 'medium' : 'weak' };
  }
  function hashPassword(p) {
    // Simple deterministic hash (client-side only — for demo; real apps use bcrypt server-side)
    let h = 0;
    for (let i = 0; i < p.length; i++) h = ((h << 5) - h) + p.charCodeAt(i) | 0;
    return 'h_' + Math.abs(h).toString(36) + '_' + p.length;
  }

  // ── Auth Operations ──────────────────────────────────────────
  function signup({ username, email, password, avatar }) {
    const users = getUsers();
    if (!validateEmail(email)) return { ok: false, error: 'Invalid email address.' };
    if (Object.values(users).some(u => u.email === email.toLowerCase())) return { ok: false, error: 'Email already in use.' };
    if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) return { ok: false, error: 'Username taken.' };
    const { ok, strength } = validatePassword(password);
    if (!ok) return { ok: false, error: 'Password must be at least 6 characters.' };

    const id = 'u_' + Date.now();
    users[id] = {
      id, username, email: email.toLowerCase(),
      password: hashPassword(password),
      avatar: avatar || '🦊',
      createdAt: Date.now(),
      xp: 0, level: 1,
      stats: { played: 0, wins: 0, winRate: 0, streak: 0, maxStreak: 0 },
      gameHistory: [],
    };
    saveUsers(users);
    const session = { userId: id, username, avatar: users[id].avatar, guest: false };
    saveSession(session);
    return { ok: true, user: users[id], session };
  }

  function login({ email, password, remember }) {
    const users = getUsers();
    const user = Object.values(users).find(u => u.email === email.toLowerCase());
    if (!user) return { ok: false, error: 'No account found with that email.' };
    if (user.password !== hashPassword(password)) return { ok: false, error: 'Incorrect password.' };
    const session = { userId: user.id, username: user.username, avatar: user.avatar, guest: false };
    saveSession(session);
    if (remember) localStorage.setItem(KEY_SESSION, JSON.stringify(session));
    return { ok: true, user, session };
  }

  function loginAsGuest() {
    const session = { userId: 'guest', username: 'Guest', avatar: '🎭', guest: true };
    saveSession(session);
    return { ok: true, session };
  }

  function logout() {
    clearSession();
    localStorage.removeItem(KEY_SESSION);
  }

  function currentUser() {
    const session = getSession() || (()=>{try{return JSON.parse(localStorage.getItem(KEY_SESSION)||'null');}catch{return null;}})();
    if (!session) return null;
    if (session.guest) return { ...session, guest: true };
    const users = getUsers();
    return users[session.userId] ? { ...users[session.userId], session } : null;
  }

  function isLoggedIn() { const u = currentUser(); return !!u && !u.guest; }

  // ── XP & Progression ─────────────────────────────────────────
  function addXP(amount) {
    const user = currentUser();
    if (!user || user.guest) return;
    const users = getUsers();
    const u = users[user.id];
    if (!u) return;
    u.xp = (u.xp || 0) + amount;
    u.level = Math.floor(u.xp / XP_PER_LEVEL) + 1;
    saveUsers(users);
    window.dispatchEvent(new CustomEvent('xp-gained', { detail: { amount, total: u.xp, level: u.level } }));
  }

  function recordGameResult(gameId, won) {
    const user = currentUser();
    if (!user || user.guest) return;
    const users = getUsers();
    const u = users[user.id];
    if (!u) return;
    u.stats = u.stats || { played: 0, wins: 0, winRate: 0, streak: 0, maxStreak: 0 };
    u.stats.played++;
    if (won) {
      u.stats.wins++;
      u.stats.streak = (u.stats.streak || 0) + 1;
      u.stats.maxStreak = Math.max(u.stats.maxStreak || 0, u.stats.streak);
      if (u.stats.streak >= 5) Storage.checkAchievement('ttt_undefeated');
    } else {
      u.stats.streak = 0;
    }
    u.stats.winRate = Math.round((u.stats.wins / u.stats.played) * 100);
    u.gameHistory = u.gameHistory || [];
    u.gameHistory.unshift({ gameId, won, date: Date.now() });
    u.gameHistory = u.gameHistory.slice(0, 50);
    saveUsers(users);
    addXP(won ? XP_PER_WIN : XP_PER_PLAY);
  }

  function updateProfile(patch) {
    const user = currentUser();
    if (!user || user.guest) return false;
    const users = getUsers();
    Object.assign(users[user.id], patch);
    saveUsers(users);
    const session = getSession();
    if (session) { Object.assign(session, { username: users[user.id].username, avatar: users[user.id].avatar }); saveSession(session); }
    return true;
  }

  function xpForLevel(level) { return (level - 1) * XP_PER_LEVEL; }
  function xpProgress(user) {
    const lvlXP = xpForLevel(user.level);
    const nextXP = xpForLevel(user.level + 1);
    return Math.round(((user.xp - lvlXP) / (nextXP - lvlXP)) * 100);
  }

  return { signup, login, loginAsGuest, logout, currentUser, isLoggedIn, recordGameResult, addXP, updateProfile, xpProgress, AVATARS, XP_PER_LEVEL };
})();
