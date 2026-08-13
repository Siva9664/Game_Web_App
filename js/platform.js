/**
 * platform.js — Platform Shell: Auth UI, Sidebar, Topbar, Profile
 */
const Platform = (() => {
  let selectedAvatar = '🦊';

  // ── Auth Screen ───────────────────────────────────────────────
  function renderAuth() {
    const screen = document.getElementById('screen-auth');
    if (!screen) return;
    screen.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">
          <span class="logo-icon">🎮</span>
          <span class="logo-text">GameVault</span>
        </div>
        <div class="auth-tabs">
          <div class="auth-tab active" data-tab="login">Sign In</div>
          <div class="auth-tab" data-tab="signup">Create Account</div>
        </div>
        <div id="auth-form-wrap"></div>
        <div class="guest-btn">
          <button class="form-link" id="btn-guest">Continue as Guest →</button>
        </div>
      </div>`;

    screen.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        screen.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderForm(tab.dataset.tab);
      });
    });
    screen.querySelector('#btn-guest').addEventListener('click', () => {
      Auth.loginAsGuest();
      App.showToast('👋 Playing as Guest', 'Stats won\'t be saved');
      showPlatform();
    });

    renderForm('login');
  }

  function renderForm(type) {
    const wrap = document.querySelector('#auth-form-wrap');
    if (!wrap) return;

    if (type === 'login') {
      wrap.innerHTML = `
        <form class="auth-form" id="login-form" novalidate>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" id="login-email" type="email" placeholder="you@example.com" autocomplete="email" />
            <span class="form-error" id="err-email">Invalid email</span>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" id="login-pass" type="password" placeholder="••••••••" autocomplete="current-password" />
            <span class="form-error" id="err-pass">Incorrect password</span>
          </div>
          <div class="form-row">
            <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;cursor:pointer">
              <input type="checkbox" id="remember-me" /> Remember me
            </label>
            <button type="button" class="form-link" id="btn-forgot">Forgot password?</button>
          </div>
          <div class="form-error" id="err-login" style="text-align:center"></div>
          <button type="submit" class="btn btn-primary w-full btn-lg" style="margin-top:.25rem">Sign In →</button>
          <div class="auth-divider">or</div>
          <div class="social-btns">
            <button type="button" class="social-btn" id="btn-google">🌐 Google</button>
          </div>
        </form>`;

      wrap.querySelector('#login-form').addEventListener('submit', e => {
        e.preventDefault();
        const email = wrap.querySelector('#login-email').value.trim();
        const pass  = wrap.querySelector('#login-pass').value;
        const remember = wrap.querySelector('#remember-me').checked;
        const errEl = wrap.querySelector('#err-login');
        errEl.classList.remove('show');
        const result = Auth.login({ email, password: pass, remember });
        if (result.ok) {
          App.showToast('✅ Welcome back, ' + result.user.username + '!');
          showPlatform();
        } else {
          errEl.textContent = result.error;
          errEl.classList.add('show');
          Sound.cardMiss?.();
        }
      });
      wrap.querySelector('#btn-forgot').addEventListener('click', () => {
        App.showToast('📧 Reset link sent!', 'Check your email (demo mode)');
      });
      wrap.querySelector('#btn-google').addEventListener('click', () => {
        App.showToast('🌐 Google Auth', 'In demo mode — using guest login');
        Auth.loginAsGuest();
        showPlatform();
      });

    } else {
      wrap.innerHTML = `
        <form class="auth-form" id="signup-form" novalidate>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input class="form-input" id="su-username" type="text" placeholder="CoolPlayer123" maxlength="20" />
            <span class="form-error" id="err-username">Username taken or invalid</span>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" id="su-email" type="email" placeholder="you@example.com" />
            <span class="form-error" id="err-su-email">Invalid or already used</span>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" id="su-pass" type="password" placeholder="Min. 6 characters" />
            <span class="form-hint" id="pass-strength"></span>
          </div>
          <div class="form-group">
            <label class="form-label">Choose Avatar</label>
            <div class="avatar-grid" id="avatar-grid">
              ${Auth.AVATARS.map((a,i) => `<div class="avatar-opt ${i===0?'selected':''}" data-avatar="${a}">${a}</div>`).join('')}
            </div>
          </div>
          <div class="form-error" id="err-signup" style="text-align:center"></div>
          <button type="submit" class="btn btn-primary w-full btn-lg" style="margin-top:.25rem">Create Account 🚀</button>
        </form>`;

      selectedAvatar = Auth.AVATARS[0];
      wrap.querySelectorAll('.avatar-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          wrap.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          selectedAvatar = opt.dataset.avatar;
        });
      });
      wrap.querySelector('#su-pass').addEventListener('input', e => {
        const { strength } = Auth.validatePassword?.(e.target.value) || {};
        const el = wrap.querySelector('#pass-strength');
        if (el) el.textContent = strength ? 'Strength: ' + strength : '';
        if (!window.Auth.validatePassword) {
          const v = e.target.value;
          const el2 = wrap.querySelector('#pass-strength');
          if (el2) el2.textContent = v.length < 6 ? 'Too short' : v.length < 10 ? 'Strength: medium' : 'Strength: strong';
        }
      });
      wrap.querySelector('#signup-form').addEventListener('submit', e => {
        e.preventDefault();
        const username = wrap.querySelector('#su-username').value.trim();
        const email    = wrap.querySelector('#su-email').value.trim();
        const password = wrap.querySelector('#su-pass').value;
        const errEl = wrap.querySelector('#err-signup');
        errEl.classList.remove('show');
        if (!username || username.length < 2) { errEl.textContent = 'Username must be at least 2 characters.'; errEl.classList.add('show'); return; }
        const result = Auth.signup({ username, email, password, avatar: selectedAvatar });
        if (result.ok) {
          App.showToast('🎉 Welcome, ' + username + '!', 'Account created successfully');
          showPlatform();
        } else {
          errEl.textContent = result.error;
          errEl.classList.add('show');
          Sound.cardMiss?.();
        }
      });
    }
  }

  // ── Platform Shell ────────────────────────────────────────────
  function showPlatform() {
    // Switch screen-hub to platform layout
    const hub = document.getElementById('screen-hub');
    const auth = document.getElementById('screen-auth');
    if (auth) auth.classList.remove('active');
    hub.classList.add('active');
    Hub.buildPlatformShell();
  }

  // ── Sidebar ───────────────────────────────────────────────────
  function buildSidebar() {
    const user = Auth.currentUser();
    const sidebar = document.createElement('nav');
    sidebar.id = 'sidebar'; sidebar.className = 'sidebar';
    sidebar.setAttribute('aria-label', 'Main navigation');

    const nav = [
      { icon: '🏠', label: 'Game Hub',      id: 'hub' },
      { icon: '🕹️', label: 'My Games',       id: 'mygames' },
      { icon: '🏆', label: 'Leaderboard',    id: 'leaderboard' },
      { icon: '👤', label: 'Profile',        id: 'profile' },
      { icon: '⚙️', label: 'Settings',       id: 'settings' },
    ];

    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <span style="font-size:1.8rem">🎮</span>
        <span class="logo-text">GameVault</span>
      </div>
      <div class="sidebar-nav" id="sidebar-nav">
        ${nav.map(n => `
          <button class="nav-item ${n.id==='hub'?'active':''}" data-nav="${n.id}" aria-label="${n.label}">
            <span class="nav-icon">${n.icon}</span>
            <span class="nav-label">${n.label}</span>
          </button>`).join('')}
        <button class="nav-item" id="nav-theme" aria-label="Toggle theme">
          <span class="nav-icon">🎨</span>
          <span class="nav-label">Theme</span>
        </button>
        <button class="nav-item" id="nav-sound" aria-label="Toggle sound">
          <span class="nav-icon">🔊</span>
          <span class="nav-label">Sound</span>
        </button>
      </div>
      <div class="sidebar-user" id="sidebar-user-btn">
        <div class="user-avatar-sm">${user?.avatar || '🎭'}</div>
        <div class="user-info">
          <div class="uname">${user?.username || 'Guest'}</div>
          <div class="ulevel">Lv.${user?.level || 1}${user?.guest ? ' · Guest' : ''}</div>
        </div>
      </div>
      <button class="sidebar-collapse-btn" id="sidebar-collapse" aria-label="Collapse sidebar">◀</button>
      `;

    sidebar.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        sidebar.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        handleNav(btn.dataset.nav);
        // Close mobile sidebar
        sidebar.classList.remove('mobile-open');
        document.querySelector('.sidebar-backdrop')?.classList.remove('show');
        Sound.click?.();
      });
    });

    sidebar.querySelector('#nav-theme')?.addEventListener('click', () => {
      const themes = ['classic','dark','neon','jungle','space'];
      const s = Storage.getSettings();
      const idx = themes.indexOf(s.theme);
      const next = themes[(idx + 1) % themes.length];
      Storage.saveSettings({ theme: next });
      App.applySettings();
      App.showToast('🎨 Theme: ' + next.charAt(0).toUpperCase() + next.slice(1));
    });

    sidebar.querySelector('#nav-sound')?.addEventListener('click', () => {
      const s = Storage.getSettings();
      Storage.saveSettings({ soundOn: !s.soundOn });
      App.applySettings();
      App.showToast(s.soundOn ? '🔇 Sound Off' : '🔊 Sound On');
    });

    sidebar.querySelector('#sidebar-collapse')?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const topbar = document.getElementById('platform-topbar');
      const main   = document.getElementById('platform-main');
      const collapsed = sidebar.classList.contains('collapsed');
      if (topbar) topbar.classList.toggle('sidebar-collapsed', collapsed);
      if (main)   main.classList.toggle('sidebar-collapsed', collapsed);
      sidebar.querySelector('#sidebar-collapse').textContent = collapsed ? '▶' : '◀';
    });

    sidebar.querySelector('#sidebar-user-btn')?.addEventListener('click', () => {
      if (Auth.isLoggedIn()) handleNav('profile');
      else App.navigate('auth');
    });

    return sidebar;
  }

  function buildTopbar() {
    const user = Auth.currentUser();
    const bar = document.createElement('header');
    bar.id = 'platform-topbar'; bar.className = 'platform-topbar';
    bar.innerHTML = `
      <button class="hamburger" id="hamburger-btn" aria-label="Open menu">☰</button>
      <div class="topbar-search">
        <span>🔍</span>
        <input type="text" placeholder="Search games…" id="topbar-search-input" aria-label="Search games" />
      </div>
      <div class="topbar-right">
        <button class="icon-btn" id="topbar-dark-toggle" title="Toggle mode" aria-label="Toggle dark mode">🌙</button>
        <div class="topbar-avatar" id="topbar-avatar" title="Account" aria-label="User menu">${user?.avatar || '🎭'}</div>
        ${!Auth.isLoggedIn() ? `<button class="btn btn-primary btn-sm" id="btn-topbar-login">Login</button>` : ''}
      </div>`;

    bar.querySelector('#hamburger-btn')?.addEventListener('click', () => {
      const sb = document.getElementById('sidebar');
      const bd = document.querySelector('.sidebar-backdrop');
      sb?.classList.toggle('mobile-open');
      bd?.classList.toggle('show');
    });
    bar.querySelector('#topbar-dark-toggle')?.addEventListener('click', () => {
      const s = Storage.getSettings();
      Storage.saveSettings({ colorMode: s.colorMode === 'dark' ? 'light' : 'dark' });
      App.applySettings();
    });
    bar.querySelector('#topbar-avatar')?.addEventListener('click', () => {
      if (Auth.isLoggedIn()) handleNav('profile');
      else App.navigate('auth');
    });
    bar.querySelector('#btn-topbar-login')?.addEventListener('click', () => App.navigate('auth'));
    bar.querySelector('#topbar-search-input')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.game-card').forEach(card => {
        const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
        card.style.display = (!q || title.includes(q)) ? '' : 'none';
      });
    });
    return bar;
  }

  function handleNav(id) {
    const main = document.getElementById('platform-main');
    if (!main) return;
    if (id === 'hub') {
      Hub.renderHubContent(main);
    } else if (id === 'profile') {
      renderProfile(main);
    } else if (id === 'leaderboard') {
      renderLeaderboard(main);
    } else if (id === 'mygames') {
      renderMyGames(main);
    } else if (id === 'settings') {
      renderSettings(main);
    }
  }

  // ── Profile Page ──────────────────────────────────────────────
  function renderProfile(main) {
    const user = Auth.currentUser();
    if (!user) { main.innerHTML = '<p style="padding:2rem;color:var(--c-text-muted)">Please log in to view your profile.</p>'; return; }
    const progress = Auth.xpProgress(user);
    const stats = user.stats || {};
    const xpCur = (user.xp || 0) - ((user.level - 1) * 100);
    const xpNext = 100;

    main.innerHTML = `
      <div class="profile-wrap">
        <div class="profile-banner">
          <div class="profile-avatar" id="profile-avatar-btn" title="Change avatar">${user.avatar || '🦊'}</div>
          <div class="profile-info">
            <div class="profile-name">${user.username}</div>
            <div class="profile-handle">${user.guest ? 'Guest Player' : user.email || ''}</div>
            <div class="xp-bar-wrap">
              <div class="xp-bar-label">
                <span>Level ${user.level || 1}</span>
                <span>${xpCur}/${xpNext} XP</span>
              </div>
              <div class="xp-bar"><div class="xp-fill" style="width:${progress}%"></div></div>
            </div>
          </div>
        </div>
        <div class="profile-stats-grid">
          <div class="profile-stat-card"><div class="profile-stat-num">${stats.played || 0}</div><div class="profile-stat-label">Games Played</div></div>
          <div class="profile-stat-card"><div class="profile-stat-num">${stats.wins || 0}</div><div class="profile-stat-label">Wins</div></div>
          <div class="profile-stat-card"><div class="profile-stat-num">${stats.winRate || 0}%</div><div class="profile-stat-label">Win Rate</div></div>
          <div class="profile-stat-card"><div class="profile-stat-num">${stats.maxStreak || 0}</div><div class="profile-stat-label">Best Streak</div></div>
          <div class="profile-stat-card"><div class="profile-stat-num">${user.level || 1}</div><div class="profile-stat-label">Level</div></div>
          <div class="profile-stat-card"><div class="profile-stat-num">${user.xp || 0}</div><div class="profile-stat-label">Total XP</div></div>
        </div>
        ${!user.guest ? `
        <div style="background:var(--c-surface);border:1px solid var(--c-border);border-radius:16px;padding:1.25rem;margin-bottom:1rem">
          <h3 style="color:var(--c-primary);margin-bottom:1rem">Edit Profile</h3>
          <div style="display:flex;flex-direction:column;gap:.75rem;max-width:360px">
            <input class="form-input" id="edit-username" value="${user.username}" placeholder="Username" />
            <div class="avatar-grid" id="edit-avatar-grid">
              ${Auth.AVATARS.map(a => `<div class="avatar-opt ${a===user.avatar?'selected':''}" data-avatar="${a}">${a}</div>`).join('')}
            </div>
            <button class="btn btn-primary" id="btn-save-profile">💾 Save Changes</button>
            <button class="btn btn-danger btn-sm" id="btn-logout">🚪 Log Out</button>
          </div>
        </div>` : `
        <div style="text-align:center;padding:1rem">
          <p style="color:var(--c-text-muted);margin-bottom:.75rem">Sign up to save your progress!</p>
          <button class="btn btn-primary" data-navigate="auth">Create Account</button>
        </div>`}
      </div>`;

    let newAvatar = user.avatar;
    main.querySelectorAll('.avatar-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        main.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected'); newAvatar = opt.dataset.avatar;
      });
    });
    main.querySelector('#btn-save-profile')?.addEventListener('click', () => {
      const newName = main.querySelector('#edit-username')?.value.trim();
      if (!newName) return;
      Auth.updateProfile({ username: newName, avatar: newAvatar });
      rebuildSidebar();
      App.showToast('✅ Profile updated!');
      renderProfile(main);
    });
    main.querySelector('#btn-logout')?.addEventListener('click', () => {
      Auth.logout();
      App.showToast('👋 Logged out');
      App.navigate('auth');
    });
  }

  function renderLeaderboard(main) {
    const stats = Storage.getStats();
    const games = [['🐍 Snake & Ladder','snakes'],['❌⭕ Tic-Tac-Toe','tictactoe'],['🃏 Memory','memory'],['🐍 Classic Snake','snake'],['🔢 2048','puzzle2048']];
    main.innerHTML = `
      <div style="max-width:600px;margin:0 auto">
        <h2 style="color:var(--c-primary);margin-bottom:1rem;font-family:'Fredoka One',sans-serif">🏆 Leaderboard</h2>
        ${games.map(([name, id]) => {
          const s = stats[id] || {};
          return `<div style="background:var(--c-surface);border:1px solid var(--c-border);border-radius:14px;padding:1rem;margin-bottom:.75rem;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700">${name}</span>
            <span style="color:var(--c-primary);font-family:'Fredoka One',sans-serif">${s.wins||s.highScore||s.bestScore||0}</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderMyGames(main) {
    const user = Auth.currentUser();
    const history = user?.gameHistory || [];
    main.innerHTML = `
      <div style="max-width:600px;margin:0 auto">
        <h2 style="color:var(--c-primary);margin-bottom:1rem;font-family:'Fredoka One',sans-serif">🕹️ My Games</h2>
        ${!history.length ? '<p style="color:var(--c-text-muted)">No games played yet! Go pick one from the hub.</p>' :
          history.slice(0,20).map(g => `
            <div style="background:var(--c-surface);border:1px solid var(--c-border);border-radius:12px;padding:.75rem 1rem;margin-bottom:.5rem;display:flex;justify-content:space-between;align-items:center">
              <span>${g.gameId}</span>
              <span style="color:${g.won?'var(--c-accent)':'var(--c-text-muted)'}">${g.won?'🏆 Win':'❌ Loss'}</span>
              <span style="font-size:.75rem;color:var(--c-text-muted)">${new Date(g.date).toLocaleDateString()}</span>
            </div>`).join('')}
      </div>`;
  }

  function renderSettings(main) {
    const s = Storage.getSettings();
    const themes = ['classic','dark','neon','jungle','space'];
    main.innerHTML = `
      <div style="max-width:480px;margin:0 auto">
        <h2 style="color:var(--c-primary);margin-bottom:1rem;font-family:'Fredoka One',sans-serif">⚙️ Settings</h2>
        <div style="background:var(--c-surface);border:1px solid var(--c-border);border-radius:16px;padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
          <div>
            <div style="font-weight:700;margin-bottom:.5rem">Theme</div>
            <div class="theme-pills">
              ${themes.map(t=>`<button class="theme-pill ${s.theme===t?'active':''}" data-theme="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
            </div>
          </div>
          <div class="toggle-row">
            <span>🌙 Dark Mode</span>
            <label class="toggle"><input type="checkbox" id="tog-dark" ${s.colorMode==='dark'?'checked':''}><span class="toggle-slider"></span></label>
          </div>
          <div class="toggle-row">
            <span>🔊 Sound Effects</span>
            <label class="toggle"><input type="checkbox" id="tog-sound" ${s.soundOn?'checked':''}><span class="toggle-slider"></span></label>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" style="margin-top:1rem" id="btn-reset-all">🗑️ Reset All Stats</button>
      </div>`;

    main.querySelectorAll('[data-theme]').forEach(b => {
      b.addEventListener('click', () => { Storage.saveSettings({ theme: b.dataset.theme }); App.applySettings(); renderSettings(main); });
    });
    main.querySelector('#tog-dark').addEventListener('change', e => { Storage.saveSettings({ colorMode: e.target.checked ? 'dark' : 'light' }); App.applySettings(); });
    main.querySelector('#tog-sound').addEventListener('change', e => { Storage.saveSettings({ soundOn: e.target.checked }); App.applySettings(); });
    main.querySelector('#btn-reset-all').addEventListener('click', () => { Storage.resetAll(); App.showToast('🗑️ Stats reset'); });
  }

  function rebuildSidebar() {
    const old = document.getElementById('sidebar');
    if (old) { old.replaceWith(buildSidebar()); }
  }

  // ── XP Toast ─────────────────────────────────────────────────
  window.addEventListener('xp-gained', e => {
    App.showToast(`⚡ +${e.detail.amount} XP`, `Level ${e.detail.level}`);
    const lvlEl = document.querySelector('.sidebar-user .ulevel');
    if (lvlEl) lvlEl.textContent = `Lv.${e.detail.level}`;
  });

  return { renderAuth, buildSidebar, buildTopbar, showPlatform, handleNav, rebuildSidebar };
})();
