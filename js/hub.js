/**
 * hub.js — Game Hub Home Screen with Platform Shell integration
 */

const Hub = (() => {
  const GAMES = [
    {
      id: 'snakes', icon: '🐍', title: 'Snake & Ladder',
      desc: '2–4 players, AI opponents, power-ups, animated SVG snakes & ladders.',
      tags: ['2-4 Players', 'AI', 'Power-ups'], featured: true, category: 'Board',
    },
    {
      id: 'tictactoe', icon: '❌', title: 'Tic-Tac-Toe',
      desc: 'Classic 3×3 strategy. Play a friend or face an unbeatable AI.',
      tags: ['2 Players', 'AI'], category: 'Board',
    },
    {
      id: 'memory', icon: '🃏', title: 'Memory Match',
      desc: 'Flip cards, find pairs. Test your memory against the clock.',
      tags: ['Solo', 'Timer'], category: 'Puzzle',
    },
    {
      id: 'snake', icon: '🕹️', title: 'Classic Snake',
      desc: 'The legendary arcade snake. Eat, grow, survive. Beat your high score.',
      tags: ['Solo', 'Arcade'], category: 'Arcade',
    },
    {
      id: 'puzzle2048', icon: '🔢', title: '2048',
      desc: 'Slide tiles, merge numbers, reach 2048. Deceptively deep strategy.',
      tags: ['Solo', 'Puzzle'], category: 'Puzzle',
    },
    {
      id: null, icon: '🎲', title: 'Ludo',
      desc: 'Race all your pieces home before your rivals. Classic strategy.',
      tags: ['Coming Soon'], category: 'Board', comingSoon: true,
    },
    {
      id: null, icon: '♟️', title: 'Chess',
      desc: 'The ultimate strategy game. Challenge yourself or a friend.',
      tags: ['Coming Soon'], category: 'Board', comingSoon: true,
    },
    {
      id: null, icon: '🎴', title: 'Carrom',
      desc: 'Flick your striker and pocket the coins. Indoor fun!',
      tags: ['Coming Soon'], category: 'Board', comingSoon: true,
    },
  ];

  // ── Particle System ────────────────────────────────────────────
  let particleCanvas, particleCtx, particles = [], particleAF;

  function initParticles(canvas) {
    if (!canvas) return;
    particleCanvas = canvas;
    particleCtx = canvas.getContext('2d');
    resize();
    spawnParticles();
    if (particleAF) cancelAnimationFrame(particleAF);
    animateParticles();
  }

  function resize() {
    if (!particleCanvas) return;
    particleCanvas.width = particleCanvas.offsetWidth;
    particleCanvas.height = particleCanvas.offsetHeight;
  }

  function spawnParticles() {
    particles = Array.from({ length: 60 }, () => mkParticle());
  }

  function mkParticle() {
    return {
      x: Math.random() * (particleCanvas?.width || 800),
      y: Math.random() * (particleCanvas?.height || 600),
      r: 1 + Math.random() * 3, vx: (Math.random() - .5) * .4,
      vy: -(0.2 + Math.random() * .5), alpha: .2 + Math.random() * .5, life: 1,
    };
  }

  function animateParticles() {
    particleAF = requestAnimationFrame(animateParticles);
    if (!particleCtx) return;
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() || '#e8a045';
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

  // ── Build full platform shell into #screen-hub ─────────────────
  function buildPlatformShell() {
    const hubScreen = document.getElementById('screen-hub');
    if (!hubScreen) return;

    // Clear old content except backdrop
    const backdrop = document.getElementById('sidebar-backdrop') || document.createElement('div');
    backdrop.id = 'sidebar-backdrop'; backdrop.className = 'sidebar-backdrop';

    // Build sidebar and topbar
    const sidebar = Platform.buildSidebar();
    const topbar  = Platform.buildTopbar();
    const main    = document.getElementById('platform-main') || document.createElement('div');
    main.id = 'platform-main'; main.className = 'platform-main';

    // Clear and reassemble
    hubScreen.innerHTML = '';
    hubScreen.appendChild(backdrop);
    hubScreen.appendChild(sidebar);
    hubScreen.appendChild(topbar);
    hubScreen.appendChild(main);

    renderHubContent(main);
  }

  // ── Render hub content inside main area ────────────────────────
  function renderHubContent(main) {
    const stats = Storage.getStats();
    const user = Auth.currentUser();

    main.innerHTML = `
      <!-- Particle canvas -->
      <canvas id="hub-particles" style="position:fixed;inset:60px 0 0 240px;width:calc(100% - 240px);height:calc(100% - 60px);pointer-events:none;z-index:0;opacity:.4" aria-hidden="true"></canvas>

      <!-- Hero Banner -->
      <div style="position:relative;background:var(--gradient-card);border:1px solid var(--c-border);border-radius:24px;padding:2.5rem 2rem;margin-bottom:2rem;overflow:hidden;z-index:1">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary) 15%,transparent),transparent);pointer-events:none"></div>
        <div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
          <div>
            <div style="font-size:.85rem;color:var(--c-primary);font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">⭐ Featured Game</div>
            <h2 style="font-family:'Fredoka One',sans-serif;font-size:2.2rem;color:var(--c-text);margin-bottom:.5rem">🐍 Snake & Ladder</h2>
            <p style="color:var(--c-text-muted);max-width:400px;line-height:1.6">The classic board game reimagined. Play with friends, battle AI opponents, collect power-ups, and climb to victory!</p>
            <div style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap">
              <button class="btn btn-primary btn-lg" data-navigate="snakes">▶ Play Now</button>
              <span style="display:flex;align-items:center;gap:.4rem;color:var(--c-text-muted);font-size:.85rem">2–4 Players · AI · Power-ups</span>
            </div>
          </div>
          <div style="font-size:6rem;filter:drop-shadow(0 8px 16px rgba(0,0,0,.4));animation:float 3s ease-in-out infinite">🐍</div>
        </div>
      </div>

      <!-- User XP bar (if logged in) -->
      ${user && !user.guest ? `
        <div style="background:var(--c-surface);border:1px solid var(--c-border);border-radius:16px;padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;z-index:1;position:relative">
          <div style="font-size:2rem">${user.avatar}</div>
          <div style="flex:1">
            <div style="font-weight:700">Welcome back, ${user.username}! <span style="color:var(--c-text-muted);font-size:.85rem">Level ${user.level || 1}</span></div>
            <div style="height:6px;background:var(--c-surface2);border-radius:99px;margin-top:.35rem;overflow:hidden">
              <div style="height:100%;width:${Auth.xpProgress(user)}%;background:linear-gradient(90deg,var(--c-primary),var(--c-accent));border-radius:99px;transition:width .5s"></div>
            </div>
          </div>
          <div style="color:var(--c-primary);font-family:'Fredoka One',sans-serif">${user.xp || 0} XP</div>
        </div>` : ''}

      <!-- Category Filters -->
      <div style="display:flex;gap:.5rem;margin-bottom:1.25rem;flex-wrap:wrap;position:relative;z-index:1">
        ${['All','Board','Puzzle','Arcade'].map(c=>`
          <button class="theme-pill active" data-cat="${c}" style="${c==='All'?'border-color:var(--c-primary);color:var(--c-primary)':''}">${c}</button>`).join('')}
      </div>

      <!-- Game Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem;position:relative;z-index:1" id="hub-game-grid">
        ${GAMES.map((g, i) => {
          const st = stats[g.id] || {};
          let statText = '';
          if (g.id === 'snake') statText = `Best: ${st.highScore || 0}`;
          else if (g.id === 'puzzle2048') statText = `Best: ${st.bestScore || 0}`;
          else if (st.wins !== undefined) statText = `${st.wins}W / ${st.played || 0}P`;

          return `
            <article class="game-card ${g.featured?'featured':''} ${g.comingSoon?'coming-soon':''}"
                     role="${g.comingSoon?'img':'button'}"
                     tabindex="${g.comingSoon?-1:0}"
                     aria-label="${g.comingSoon?g.title+' — Coming Soon':'Play '+g.title}"
                     ${g.id&&!g.comingSoon?`data-navigate="${g.id}"`:''}
                     style="animation-delay:${i*.06}s;${g.comingSoon?'opacity:.5;filter:grayscale(.6);cursor:not-allowed':''}">
              <span class="card-icon" aria-hidden="true">${g.icon}</span>
              <h2 class="card-title">${g.title}</h2>
              <p class="card-desc">${g.desc}</p>
              <div class="card-tags">${g.tags.map(t=>`<span class="card-tag">${t}</span>`).join('')}</div>
              ${statText?`<div class="card-stats">${statText}</div>`:''}
            </article>`;
        }).join('')}
      </div>

      <!-- Footer stats -->
      <div style="display:flex;gap:2rem;justify-content:center;padding:2rem 0;z-index:1;position:relative">
        ${[
          ['Games Played', Object.values(stats).reduce((s,g)=>s+(g.played||0),0)],
          ['Total Wins',   Object.values(stats).reduce((s,g)=>s+(g.wins||0),0)],
          ['Achievements', Storage.getAllAchievements().filter(a=>a.unlocked).length],
        ].map(([label,val])=>`
          <div style="text-align:center">
            <div style="font-family:'Fredoka One',sans-serif;font-size:2rem;color:var(--c-primary)">${val}</div>
            <div style="font-size:.8rem;color:var(--c-text-muted)">${label}</div>
          </div>`).join('')}
      </div>`;

    // Category filter
    main.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        main.querySelectorAll('[data-cat]').forEach(b => { b.style.borderColor = ''; b.style.color = ''; b.classList.remove('active'); });
        btn.style.borderColor = 'var(--c-primary)'; btn.style.color = 'var(--c-primary)';
        const cat = btn.dataset.cat;
        main.querySelectorAll('.game-card').forEach((card, i) => {
          const g = GAMES[i];
          card.style.display = (cat === 'All' || !g || g.category === cat) ? '' : 'none';
        });
        Sound.click?.();
      });
    });

    // Init particles
    initParticles(main.querySelector('#hub-particles'));
  }

  function refresh() { buildPlatformShell(); }
  function init()    { /* App.js calls Platform.showPlatform() which calls buildPlatformShell */ }

  return { init, refresh, buildPlatformShell, renderHubContent };
})();
