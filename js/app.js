/**
 * app.js — GameVault SPA Router & Global Controller
 */

const App = (() => {
  const screens = {};
  const games = { snakes: SnakesGame, tictactoe: TicTacToeGame, memory: MemoryGame, snake: SnakeGame, puzzle2048: Puzzle2048 };
  let currentScreen = 'hub';
  let currentGame = null;
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  // ── Confetti ─────────────────────────────────────────────────────
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');
  let confettiParticles = [];
  let confettiAF = null;

  function startConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiParticles = Array.from({ length: 180 }, () => ({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height,
      w: 8 + Math.random() * 8, h: 5 + Math.random() * 5,
      r: Math.random() * Math.PI * 2,
      dr: (Math.random() - .5) * .15,
      vy: 2 + Math.random() * 4,
      vx: (Math.random() - .5) * 2,
      color: `hsl(${Math.random() * 360},90%,60%)`,
    }));
    if (confettiAF) cancelAnimationFrame(confettiAF);
    drawConfetti();
    setTimeout(stopConfetti, 5000);
  }

  function drawConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach(p => {
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.r);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      confettiCtx.restore();
      p.x += p.vx; p.y += p.vy; p.r += p.dr;
      if (p.y > confettiCanvas.height) { p.y = -20; p.x = Math.random() * confettiCanvas.width; }
    });
    confettiAF = requestAnimationFrame(drawConfetti);
  }

  function stopConfetti() {
    if (confettiAF) { cancelAnimationFrame(confettiAF); confettiAF = null; }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  // ── Screen Navigation ────────────────────────────────────────────
  const transitionOverlay = document.getElementById('transition-overlay');

  function navigate(screenId) {
    if (screenId === currentScreen) return;
    Sound.click();
    transitionOverlay.classList.add('flash');

    setTimeout(() => {
      // Deactivate current
      const prev = document.getElementById('screen-' + currentScreen);
      if (prev) prev.classList.remove('active');

      // Destroy current game if any
      if (currentGame && games[currentGame] && games[currentGame].destroy) {
        games[currentGame].destroy();
      }
      currentGame = null;

      // Activate new
      const next = document.getElementById('screen-' + screenId);
      if (next) next.classList.add('active');
      currentScreen = screenId;

      // Init game if applicable
      if (games[screenId]) {
        currentGame = screenId;
        games[screenId].init(next);
      } else if (screenId === 'hub') {
        Hub.refresh();
      }

      transitionOverlay.classList.remove('flash');
    }, 200);
  }

  // ── Modal ────────────────────────────────────────────────────────
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');

  function showModal(html, onShow) {
    modalContent.innerHTML = html;
    modalOverlay.classList.remove('hidden');
    if (onShow) onShow(modalContent);
  }

  function hideModal() {
    modalOverlay.classList.add('hidden');
  }

  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) hideModal();
  });

  // ── Toast ────────────────────────────────────────────────────────
  function showToast(label, desc = '') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="toast-label">${label}</div>${desc ? `<div class="toast-desc">${desc}</div>` : ''}`;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  // ── Achievement Listener ─────────────────────────────────────────
  window.addEventListener('achievement-unlocked', e => {
    const a = e.detail;
    if (a) showToast('🏆 Achievement: ' + a.label, a.desc);
  });

  // ── Theme & Settings ─────────────────────────────────────────────
  function applySettings() {
    const s = Storage.getSettings();
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.setAttribute('data-colormode', s.colorMode);
    Sound.setEnabled(s.soundOn);
    // Update icon buttons
    const dm = document.getElementById('btn-dark-toggle');
    if (dm) dm.textContent = s.colorMode === 'dark' ? '🌙' : '☀️';
    const snd = document.getElementById('btn-sound-toggle');
    if (snd) snd.textContent = s.soundOn ? '🔊' : '🔇';
  }

  // ── Global Button Handlers ───────────────────────────────────────
  document.addEventListener('click', e => {
    const t = e.target;

    if (t.id === 'btn-dark-toggle' || t.closest('#btn-dark-toggle')) {
      const s = Storage.getSettings();
      const next = s.colorMode === 'dark' ? 'light' : 'dark';
      Storage.saveSettings({ colorMode: next });
      applySettings();
      Sound.click();
      return;
    }

    if (t.id === 'btn-sound-toggle' || t.closest('#btn-sound-toggle')) {
      const s = Storage.getSettings();
      Storage.saveSettings({ soundOn: !s.soundOn });
      applySettings();
      Sound.click();
      return;
    }

    if (t.id === 'btn-stats' || t.closest('#btn-stats')) {
      Sound.click();
      showStatsModal();
      return;
    }

    if (t.dataset.navigate) {
      navigate(t.dataset.navigate);
      return;
    }

    if (t.id === 'btn-back-hub' || t.closest('#btn-back-hub')) {
      navigate('hub');
      return;
    }

    if (t.id === 'btn-close-modal' || t.closest('#btn-close-modal')) {
      hideModal();
      return;
    }
  });

  function showStatsModal() {
    const stats = Storage.getStats();
    const achievements = Storage.getAllAchievements();
    const unlocked = achievements.filter(a => a.unlocked).length;

    const rows = [
      ['🐍 Snake & Ladder', stats.snakes.wins + ' W / ' + stats.snakes.played + ' P'],
      ['❌⭕ Tic-Tac-Toe',  stats.tictactoe.wins + ' W / ' + stats.tictactoe.played + ' P'],
      ['🃏 Memory Match',   stats.memory.wins + ' W / ' + stats.memory.played + ' P'],
      ['🐍 Classic Snake',  'Best: ' + (stats.snake.highScore || 0)],
      ['🔢 2048',           'Best: ' + (stats.puzzle2048.bestScore || 0)],
    ].map(([name, val]) => `
      <div class="stats-row">
        <div class="game-name">${name}</div>
        <div class="game-stat">${val}</div>
      </div>`).join('');

    const achHTML = achievements.map(a => `
      <div class="achievement-item ${a.unlocked ? 'unlocked' : ''}">
        <div>
          <div class="achievement-label">${a.label}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
      </div>`).join('');

    showModal(`
      <span class="modal-emoji">📊</span>
      <div class="modal-title">Your Stats</div>
      <div class="stats-grid">${rows}</div>
      <div style="text-align:left;margin-top:1rem;">
        <strong style="color:var(--c-primary)">Achievements (${unlocked}/${achievements.length})</strong>
        <div class="achievement-list">${achHTML}</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="btn-close-modal">Close</button>
        <button class="btn btn-danger btn-sm" onclick="Storage.resetAll();App.hideModal();App.showToast('Stats reset!')">Reset</button>
      </div>
    `);
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    applySettings();
    Hub.init();
    window.addEventListener('resize', () => {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, showModal, hideModal, showToast, startConfetti, stopConfetti, applySettings };
})();
