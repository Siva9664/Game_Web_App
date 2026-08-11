/**
 * hub.js — Game Hub Home Screen
 */

const Hub = (() => {
  const GAMES = [
    {
      id: 'snakes', icon: '🐍', title: 'Snake & Ladder',
      desc: '2–4 players, AI opponents, power-ups, animated board with SVG snakes & ladders.',
      tags: ['2-4 Players', 'AI', 'Power-ups'], featured: true,
    },
    {
      id: 'tictactoe', icon: '❌', title: 'Tic-Tac-Toe',
      desc: 'Classic 3×3 strategy. Challenge a friend or face an unbeatable AI.',
      tags: ['2 Players', 'AI'],
    },
    {
      id: 'memory', icon: '🃏', title: 'Memory Match',
      desc: 'Flip cards and find matching pairs. Test your memory against the clock.',
      tags: ['Solo', 'Timer'],
    },
    {
      id: 'snake', icon: '🕹️', title: 'Classic Snake',
      desc: 'The original arcade experience. Eat, grow, survive. Beat your high score.',
      tags: ['Solo', 'Arcade'],
    },
    {
      id: 'puzzle2048', icon: '🔢', title: '2048',
      desc: 'Slide tiles, merge numbers, reach 2048. Simple rules, deep strategy.',
      tags: ['Solo', 'Puzzle'],
    },
  ];

  // ── Particle System ────────────────────────────────────────────────
  let particleCanvas, particleCtx, particles = [], particleAF;

  function initParticles() {
    particleCanvas = document.getElementById('hub-particles');
    if (!particleCanvas) return;
    particleCtx = particleCanvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    spawnParticles();
    animateParticles();
  }

  function resize() {
    particleCanvas.width = particleCanvas.offsetWidth;
    particleCanvas.height = particleCanvas.offsetHeight;
  }

  function spawnParticles() {
    particles = Array.from({ length: 60 }, () => mkParticle());
  }

  function mkParticle() {
    return {
      x: Math.random() * (particleCanvas.width || 800),
      y: Math.random() * (particleCanvas.height || 600),
      r: 1 + Math.random() * 3,
      vx: (Math.random() - .5) * .4,
      vy: -(0.2 + Math.random() * .5),
      alpha: .2 + Math.random() * .5,
      life: 1,
    };
  }

  function animateParticles() {
    particleAF = requestAnimationFrame(animateParticles);
    if (!particleCtx) return;
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    // Get primary color from CSS
    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--c-primary').trim() || '#e8a045';

    particles.forEach((p, i) => {
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      particleCtx.fillStyle = primary;
      particleCtx.globalAlpha = p.alpha * p.life;
      particleCtx.fill();
      particleCtx.globalAlpha = 1;

      p.x += p.vx; p.y += p.vy; p.life -= .003;
      if (p.life <= 0 || p.y < -10) particles[i] = mkParticle();
    });
  }

  // ── Render Hub ─────────────────────────────────────────────────────
  function renderCards() {
    const container = document.getElementById('hub-games');
    if (!container) return;
    const stats = Storage.getStats();

    container.innerHTML = GAMES.map((g, idx) => {
      const st = stats[g.id] || {};
      let statText = '';
      if (st.wins !== undefined) statText = `${st.wins} wins · ${st.played || 0} played`;
      else if (st.highScore !== undefined) statText = `Best: ${st.highScore || 0}`;
      else if (st.bestScore !== undefined) statText = `Best: ${st.bestScore || 0}`;

      return `
        <article class="game-card ${g.featured ? 'featured' : ''}"
                 role="button" tabindex="0" aria-label="Play ${g.title}"
                 data-navigate="${g.id}"
                 style="animation-delay:${idx * .08}s">
          <span class="card-icon" aria-hidden="true">${g.icon}</span>
          <h2 class="card-title">${g.title}</h2>
          <p class="card-desc">${g.desc}</p>
          <div class="card-tags">${g.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}</div>
          ${statText ? `<div class="card-stats">${statText}</div>` : ''}
        </article>`;
    }).join('');

    // Keyboard support
    container.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  }

  function renderStatsBar() {
    const bar = document.getElementById('hub-stats-bar');
    if (!bar) return;
    const stats = Storage.getStats();
    const totalWins = Object.values(stats).reduce((s, g) => s + (g.wins || 0), 0);
    const totalGames = Object.values(stats).reduce((s, g) => s + (g.played || 0), 0);
    const achieved = Storage.getAllAchievements().filter(a => a.unlocked).length;

    bar.innerHTML = `
      <div class="stat-item"><div class="stat-num">${totalGames}</div><div class="stat-label">Games Played</div></div>
      <div class="stat-item"><div class="stat-num">${totalWins}</div><div class="stat-label">Total Wins</div></div>
      <div class="stat-item"><div class="stat-num">${achieved}</div><div class="stat-label">Achievements</div></div>
    `;
  }

  function refresh() {
    renderCards();
    renderStatsBar();
    // Re-init particles if canvas stopped
    if (!particleAF) initParticles();
  }

  function init() {
    initParticles();
    renderCards();
    renderStatsBar();
  }

  return { init, refresh };
})();
