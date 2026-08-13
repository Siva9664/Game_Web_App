/**
 * app.js — GameVault SPA Router & Global Controller
 */

const App = (() => {
  const games = { snakes: SnakesGame, tictactoe: TicTacToeGame, memory: MemoryGame, snake: SnakeGame, puzzle2048: Puzzle2048 };
  let currentScreen = 'auth';
  let currentGame = null;

  // Toast container
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  // ── Confetti ──────────────────────────────────────────────────
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');
  let confettiParticles = [], confettiAF = null;

  function startConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiParticles = Array.from({ length: 180 }, () => ({
      x: Math.random() * confettiCanvas.width, y: Math.random() * -confettiCanvas.height,
      w: 8 + Math.random() * 8, h: 5 + Math.random() * 5,
      r: Math.random() * Math.PI * 2, dr: (Math.random() - .5) * .15,
      vy: 2 + Math.random() * 4, vx: (Math.random() - .5) * 2,
      color: `hsl(${Math.random() * 360},90%,60%)`,
    }));
    if (confettiAF) cancelAnimationFrame(confettiAF);
    drawConfetti();
    setTimeout(stopConfetti, 5000);
  }
  function drawConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach(p => {
      confettiCtx.save(); confettiCtx.translate(p.x, p.y); confettiCtx.rotate(p.r);
      confettiCtx.fillStyle = p.color; confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
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

  // ── Screen Navigation ─────────────────────────────────────────
  const transitionOverlay = document.getElementById('transition-overlay');

  function navigate(screenId) {
    if (screenId === currentScreen) return;
    Sound.click?.();
    transitionOverlay.classList.add('flash');

    setTimeout(() => {
      document.getElementById('screen-' + currentScreen)?.classList.remove('active');

      if (currentGame && games[currentGame]?.destroy) games[currentGame].destroy();
      currentGame = null;

      const next = document.getElementById('screen-' + screenId);
      if (next) next.classList.add('active');
      currentScreen = screenId;

      if (screenId === 'auth') {
        Platform.renderAuth();
      } else if (screenId === 'hub') {
        Platform.showPlatform();
      } else if (games[screenId]) {
        currentGame = screenId;
        games[screenId].init(next);
      }

      transitionOverlay.classList.remove('flash');
    }, 200);
  }

  // ── Modal ─────────────────────────────────────────────────────
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');

  function showModal(html, onShow) {
    modalContent.innerHTML = html;
    modalOverlay.classList.remove('hidden');
    if (onShow) onShow(modalContent);
  }
  function hideModal() { modalOverlay.classList.add('hidden'); }

  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) hideModal(); });

  // ── Toast ─────────────────────────────────────────────────────
  function showToast(label, desc = '') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="toast-label">${label}</div>${desc ? `<div class="toast-desc">${desc}</div>` : ''}`;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  // ── Achievement Toast ─────────────────────────────────────────
  window.addEventListener('achievement-unlocked', e => {
    if (e.detail) showToast('🏆 ' + e.detail.label, e.detail.desc);
  });

  // ── Settings ──────────────────────────────────────────────────
  function applySettings() {
    const s = Storage.getSettings();
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.setAttribute('data-colormode', s.colorMode);
    Sound.setEnabled?.(s.soundOn);
    const dm = document.getElementById('topbar-dark-toggle');
    if (dm) dm.textContent = s.colorMode === 'dark' ? '🌙' : '☀️';
  }

  // ── Global click delegation ───────────────────────────────────
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-navigate]') || (e.target.dataset?.navigate ? e.target : null);
    if (t && t.dataset.navigate) {
      navigate(t.dataset.navigate);
      return;
    }
    if (e.target.id === 'btn-back-hub' || e.target.closest('#btn-back-hub')) {
      navigate('hub'); return;
    }
    if (e.target.id === 'btn-close-modal' || e.target.closest('#btn-close-modal')) {
      hideModal(); return;
    }
    if (e.target.id === 'sidebar-backdrop') {
      document.getElementById('sidebar')?.classList.remove('mobile-open');
      e.target.classList.remove('show');
    }
  });

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    applySettings();
    // Check if already logged in (persistent session)
    const user = Auth.currentUser();
    if (user) {
      Platform.showPlatform();
    } else {
      Platform.renderAuth();
    }
    window.addEventListener('resize', () => {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, showModal, hideModal, showToast, startConfetti, stopConfetti, applySettings };
})();
