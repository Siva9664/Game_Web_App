/** snakes.js — Snake & Ladder Game */
const SnakesGame = (() => {
  const SNAKES  = {99:78,95:75,93:73,87:24,64:60,62:19,54:34,17:7};
  const LADDERS = {4:14,9:31,20:38,28:84,40:59,51:67,63:81,71:91};
  const POWERUPS= {22:'double',33:'shield',44:'swap',55:'mystery',66:'extra'};
  const COLORS  = ['#e74c3c','#3498db','#2ecc71','#f39c12'];
  const EMOJIS  = ['😀','🦊','🐸','🐼','🦁','🐯','🐻','🐺','🤖','👾'];
  const EMOJI_DEFAULT = ['🦊','🐸','🐼','🦁'];

  let state = {};
  let container = null;

  // ── Cell Position ─────────────────────────────────────────────
  function cellPos(n) {
    const rowFromBottom = Math.floor((n - 1) / 10);
    const gridRow = 9 - rowFromBottom;
    const posInRow = (n - 1) % 10;
    const gridCol = rowFromBottom % 2 === 0 ? posInRow : 9 - posInRow;
    return { row: gridRow, col: gridCol };
  }

  // ── SVG Overlay ───────────────────────────────────────────────
  function buildSVG(boardEl) {
    const size = boardEl.offsetWidth || 520;
    const cellSize = size / 10;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('board-svg');

    function center(n) {
      const { row, col } = cellPos(n);
      return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
    }

    // Draw ladders
    Object.entries(LADDERS).forEach(([from, to]) => {
      const f = center(+from), t = center(+to);
      // Left rail
      const dx = 4, dy = 4;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      [[-dx,-dy],[dx,dy]].forEach(([ox,oy]) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', f.x+ox); line.setAttribute('y1', f.y+oy);
        line.setAttribute('x2', t.x+ox); line.setAttribute('y2', t.y+oy);
        line.setAttribute('stroke','var(--c-ladder)'); line.setAttribute('stroke-width','3');
        line.setAttribute('stroke-linecap','round'); line.setAttribute('opacity','0.85');
        g.appendChild(line);
      });
      // Rungs
      const steps = 5;
      for (let i = 1; i < steps; i++) {
        const r = i / steps;
        const rx = f.x + (t.x - f.x) * r, ry = f.y + (t.y - f.y) * r;
        const rung = document.createElementNS('http://www.w3.org/2000/svg','line');
        rung.setAttribute('x1', rx - dx*2); rung.setAttribute('y1', ry - dy*2);
        rung.setAttribute('x2', rx + dx*2); rung.setAttribute('y2', ry + dy*2);
        rung.setAttribute('stroke','var(--c-ladder)'); rung.setAttribute('stroke-width','2');
        rung.setAttribute('stroke-linecap','round'); rung.setAttribute('opacity','0.7');
        g.appendChild(rung);
      }
      svg.appendChild(g);
    });

    // Draw snakes (curved paths)
    Object.entries(SNAKES).forEach(([from, to]) => {
      const f = center(+from), t = center(+to);
      const mx = (f.x + t.x) / 2 + (Math.random() > .5 ? 25 : -25);
      const my = (f.y + t.y) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', `M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`);
      path.setAttribute('fill','none');
      path.setAttribute('stroke','var(--c-snake)');
      path.setAttribute('stroke-width','4');
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('opacity','0.8');
      // Head circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      circle.setAttribute('cx', f.x); circle.setAttribute('cy', f.y);
      circle.setAttribute('r','5'); circle.setAttribute('fill','var(--c-snake)');
      svg.appendChild(path); svg.appendChild(circle);
    });

    return svg;
  }

  // ── Render Setup Screen ───────────────────────────────────────
  function renderSetup() {
    const s = Storage.getSettings();
    container.innerHTML = `
      <div class="game-topbar">
        <button class="btn btn-secondary btn-sm" id="btn-back-hub">← Hub</button>
        <h2>🐍 Snake & Ladder</h2>
        <div style="display:flex;gap:.5rem">
          <select id="sl-theme" class="setup-input" style="width:auto;padding:.4rem .6rem">
            ${['classic','dark','neon','jungle','space'].map(t=>`<option value="${t}" ${s.theme===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="snakes-setup">
        <div class="setup-title">Game Setup</div>

        <div class="setup-section">
          <label>Number of Players</label>
          <div style="display:flex;gap:.5rem">
            ${[2,3,4].map(n=>`<button class="btn btn-secondary ${state.numPlayers===n?'btn-primary':''}" data-nplayers="${n}">${n} Players</button>`).join('')}
          </div>
        </div>

        <div class="setup-section" id="player-rows">
          <label>Player Names & Avatars</label>
          ${state.players.map((p,i)=>`
            <div class="player-setup-row" id="prow-${i}">
              <span class="emoji-pick" data-pi="${i}" style="background:${p.color}20;border-radius:8px;padding:.25rem">${p.emoji}</span>
              <input class="setup-input" id="pname-${i}" value="${p.name}" placeholder="Player ${i+1}" style="flex:1" />
              <label style="font-size:.8rem;color:var(--c-text-muted);display:flex;align-items:center;gap:.3rem">
                AI <input type="checkbox" data-ai="${i}" ${p.ai?'checked':''} style="width:16px;height:16px" />
              </label>
            </div>`).join('')}
        </div>

        <div class="setup-section">
          <label>AI Difficulty</label>
          <div style="display:flex;gap:.5rem">
            ${['Easy','Medium','Hard'].map(d=>`<button class="btn btn-secondary ${state.aiDiff===d.toLowerCase()?'btn-primary':''}" data-diff="${d.toLowerCase()}">${d}</button>`).join('')}
          </div>
        </div>

        <div class="setup-section">
          <div class="toggle-row">
            <span>⚡ Power-up Tiles</span>
            <label class="toggle"><input type="checkbox" id="tog-powerup" ${state.powerupsOn?'checked':''}><span class="toggle-slider"></span></label>
          </div>
        </div>

        <button class="btn btn-primary btn-lg w-full" id="btn-start-game">🎲 Start Game!</button>
      </div>`;

    // Theme select
    container.querySelector('#sl-theme').addEventListener('change', e => {
      Storage.saveSettings({ theme: e.target.value });
      App.applySettings();
    });

    // Num players
    container.querySelectorAll('[data-nplayers]').forEach(b => {
      b.addEventListener('click', () => {
        state.numPlayers = +b.dataset.nplayers;
        // Pad/trim players
        while (state.players.length < state.numPlayers)
          state.players.push({ name: 'Player ' + (state.players.length+1), emoji: EMOJI_DEFAULT[state.players.length], color: COLORS[state.players.length], ai: false, shield: false });
        state.players = state.players.slice(0, state.numPlayers);
        renderSetup();
      });
    });

    // AI diff
    container.querySelectorAll('[data-diff]').forEach(b => {
      b.addEventListener('click', () => { state.aiDiff = b.dataset.diff; renderSetup(); });
    });

    // Emoji picker
    container.querySelectorAll('.emoji-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const pi = +btn.dataset.pi;
        const pick = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        state.players[pi].emoji = pick;
        btn.textContent = pick;
      });
    });

    // AI toggles
    container.querySelectorAll('[data-ai]').forEach(cb => {
      cb.addEventListener('change', () => { state.players[+cb.dataset.ai].ai = cb.checked; });
    });

    // Name inputs
    state.players.forEach((_, i) => {
      const inp = container.querySelector(`#pname-${i}`);
      if (inp) inp.addEventListener('input', () => { state.players[i].name = inp.value || 'Player '+(i+1); });
    });

    // Powerup toggle
    container.querySelector('#tog-powerup').addEventListener('change', e => { state.powerupsOn = e.target.checked; });

    // Start
    container.querySelector('#btn-start-game').addEventListener('click', startGame);
  }

  // ── Start Game ────────────────────────────────────────────────
  function startGame() {
    state.positions = state.players.map(() => 0);
    state.currentTurn = 0;
    state.rankings = [];
    state.diceHistory = [];
    state.consecutiveSixes = 0;
    state.snakesHit = 0;
    state.laddersClimbed = 0;
    state.gameOver = false;
    state.rolling = false;
    Storage.recordPlay('snakes');
    renderGame();
    if (state.players[state.currentTurn].ai) setTimeout(aiTurn, 1200);
  }

  // ── Render Game ───────────────────────────────────────────────
  function renderGame() {
    const cur = state.players[state.currentTurn];
    container.innerHTML = `
      <div class="game-topbar">
        <button class="btn btn-secondary btn-sm" id="btn-back-hub">← Hub</button>
        <h2>🐍 Snake & Ladder</h2>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-secondary btn-sm" id="btn-restart">↩ Restart</button>
        </div>
      </div>
      <div class="snakes-layout">
        <div class="snakes-sidebar" id="sidebar-left">
          <div class="dice-area">
            <h3>🎲 ${cur.emoji} ${cur.name}'s Turn</h3>
            <div class="dice-display">
              <div class="single-die" id="die1">🎲</div>
            </div>
            <button class="btn btn-primary w-full" id="btn-roll" ${state.rolling?'disabled':''}>Roll Dice!</button>
          </div>
        </div>

        <div class="board-wrap">
          <div class="board-container">
            <div class="board-grid" id="board-grid"></div>
          </div>
        </div>

        <div class="snakes-sidebar">
          <div class="players-panel">
            <h3>👥 Players</h3>
            ${state.players.map((p,i)=>`
              <div class="player-card ${i===state.currentTurn&&!state.gameOver?'active-player':''} ${state.rankings.includes(i)?'eliminated':''}">
                <div class="player-token-icon" style="background:${p.color}">${p.emoji}</div>
                <div class="player-info">
                  <div class="player-name">${p.name}${p.ai?' 🤖':''}</div>
                  <div class="player-pos">Square ${state.positions[i]||1}</div>
                </div>
                <div class="player-rank">${state.rankings.indexOf(i)>=0?['🥇','🥈','🥉','4️⃣'][state.rankings.indexOf(i)]:'⬜'}</div>
              </div>`).join('')}
          </div>
          <div class="turn-log">
            <h3>📋 Log</h3>
            <div class="log-entries" id="log-entries">
              ${state.diceHistory.slice(-15).reverse().map(e=>`<div class="log-entry log-${e.type||''}">${e.text}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;

    buildBoard();

    container.querySelector('#btn-roll')?.addEventListener('click', rollDice);
    container.querySelector('#btn-restart')?.addEventListener('click', () => { state = initState(); renderSetup(); });
  }

  // ── Build Board ───────────────────────────────────────────────
  function buildBoard() {
    const grid = container.querySelector('#board-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const rowFromBottom = 9 - r;
        const n = rowFromBottom % 2 === 0
          ? rowFromBottom * 10 + c + 1
          : rowFromBottom * 10 + (9 - c) + 1;
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.id = `cell-${n}`;
        if (SNAKES[n])  cell.classList.add('has-snake');
        if (LADDERS[n]) cell.classList.add('has-ladder');
        if (state.powerupsOn && POWERUPS[n]) cell.classList.add('powerup-cell');
        cell.innerHTML = `<span class="cell-num">${n}</span><div class="token-group" id="tokens-${n}"></div>`;
        grid.appendChild(cell);
      }
    }
    // Place tokens
    state.players.forEach((p, i) => {
      if (state.rankings.includes(i)) return;
      const pos = state.positions[i] || 1;
      const tg = container.querySelector(`#tokens-${pos}`);
      if (tg) {
        const t = document.createElement('div');
        t.className = `token${i === state.currentTurn ? ' active-token' : ''}`;
        t.style.background = p.color;
        t.textContent = p.emoji;
        tg.appendChild(t);
      }
    });
    // SVG overlay
    const boardContainer = container.querySelector('.board-container');
    const existing = boardContainer?.querySelector('.board-svg');
    if (existing) existing.remove();
    if (boardContainer) {
      const svg = buildSVG(container.querySelector('#board-grid'));
      boardContainer.appendChild(svg);
    }
  }

  // ── Roll Dice ─────────────────────────────────────────────────
  function rollDice() {
    if (state.rolling || state.gameOver) return;
    state.rolling = true;
    const btn = container.querySelector('#btn-roll');
    if (btn) btn.disabled = true;

    Sound.diceRoll();
    const die = container.querySelector('#die1');
    if (die) die.classList.add('rolling');

    // Animate random faces
    const interval = setInterval(() => {
      if (die) die.textContent = ['⚀','⚁','⚂','⚃','⚄','⚅'][Math.floor(Math.random()*6)];
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      if (die) die.classList.remove('rolling');
      const roll = 1 + Math.floor(Math.random() * 6);
      const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
      if (die) { die.textContent = faces[roll-1]; die.classList.add('result'); }
      processRoll(roll);
    }, 800);
  }

  // ── Process Roll ──────────────────────────────────────────────
  async function processRoll(roll) {
    const pi = state.currentTurn;
    const player = state.players[pi];

    // Track consecutive sixes
    if (roll === 6) {
      state.consecutiveSixes++;
      if (state.consecutiveSixes >= 3) {
        Storage.checkAchievement('triple_six');
      }
    } else { state.consecutiveSixes = 0; }

    addLog(`${player.emoji} ${player.name} rolled a ${roll}`, '');

    const currentPos = state.positions[pi] || 1;
    let newPos = currentPos === 0 ? roll : currentPos + roll;
    if (newPos > 100) newPos = currentPos; // bounce back

    // Animate movement step by step
    await animateMove(pi, currentPos === 0 ? 0 : currentPos, newPos);
    state.positions[pi] = newPos;

    // Check snake
    if (SNAKES[newPos]) {
      const dest = SNAKES[newPos];
      addLog(`🐍 Snake! ${player.name} slides from ${newPos} to ${dest}`, 'snake');
      Sound.snakeBite();
      state.snakesHit++;
      if (state.snakesHit >= 5) Storage.checkAchievement('snake_charmer');
      if (!player.shield) {
        await sleep(400);
        await animateMove(pi, newPos, dest);
        state.positions[pi] = dest;
        newPos = dest;
      } else {
        player.shield = false;
        addLog(`🛡️ Shield saved ${player.name}!`, 'powerup');
      }
    }

    // Check ladder
    else if (LADDERS[newPos]) {
      const dest = LADDERS[newPos];
      addLog(`🪜 Ladder! ${player.name} climbs from ${newPos} to ${dest}`, 'ladder');
      Sound.ladderClimb();
      state.laddersClimbed++;
      if (state.laddersClimbed >= 5) Storage.checkAchievement('ladder_legend');
      await sleep(300);
      await animateMove(pi, newPos, dest);
      state.positions[pi] = dest;
      newPos = dest;
    }

    // Check power-up
    if (state.powerupsOn && POWERUPS[newPos]) {
      triggerPowerup(pi, POWERUPS[newPos]);
    }

    // Check win
    if (newPos >= 100) {
      state.positions[pi] = 100;
      state.rankings.push(pi);
      addLog(`🏆 ${player.name} wins!`, 'win');
      Sound.win();
      Storage.recordWin('snakes');
      Storage.checkAchievement('first_win');

      const remaining = state.players.filter((_,i) => !state.rankings.includes(i));
      if (remaining.length <= 1) {
        // Game over — rank remaining
        state.players.forEach((_,i) => { if (!state.rankings.includes(i)) state.rankings.push(i); });
        state.gameOver = true;
        renderGame();
        await sleep(600);
        App.startConfetti();
        showWinModal();
        return;
      }
      state.rolling = false;
      advanceTurn();
      return;
    }

    state.rolling = false;
    renderGame();

    // Extra turn on 6
    if (roll === 6) {
      addLog(`🎉 ${player.name} gets an extra turn!`, '');
    } else {
      advanceTurn();
    }

    if (state.players[state.currentTurn].ai && !state.gameOver) {
      setTimeout(aiTurn, 1200);
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Step-by-step animation ────────────────────────────────────
  async function animateMove(pi, from, to) {
    if (from === to || from === 0) return;
    const player = state.players[pi];
    const step = from < to ? 1 : -1;
    let pos = from + step;
    while (true) {
      // Move token
      const oldGroup = container.querySelector(`#tokens-${pos - step}`);
      if (oldGroup) {
        const tok = oldGroup.querySelector('.moving');
        if (tok) oldGroup.removeChild(tok);
      }
      const newGroup = container.querySelector(`#tokens-${pos}`);
      if (newGroup) {
        const t = document.createElement('div');
        t.className = 'token moving';
        t.style.background = player.color;
        t.textContent = player.emoji;
        newGroup.appendChild(t);
        Sound.tokenStep();
      }
      await sleep(90);
      if (pos === to) break;
      pos += step;
    }
    // Cleanup moving class
    container.querySelectorAll('.token.moving').forEach(t => t.classList.remove('moving'));
    Sound.tokenLand();
  }

  // ── Power-up Trigger ──────────────────────────────────────────
  function triggerPowerup(pi, type) {
    const player = state.players[pi];
    Sound.powerup();
    const msgs = {
      double: ['⚡ Double Roll!', 'Roll again with 2 dice next turn'],
      shield: ['🛡️ Shield Activated!', 'Protected from the next snake'],
      swap:   ['🔄 Position Swap!', 'Swapped with the nearest player'],
      mystery:['🎭 Mystery Power!', 'Something random happened...'],
      extra:  ['⏩ Extra Turn!', 'Roll the dice again!'],
    };
    const [title, desc] = msgs[type] || ['⚡ Power-up!', ''];

    if (type === 'shield') player.shield = true;
    if (type === 'swap') {
      const others = state.players.map((_,i)=>i).filter(i=>i!==pi&&!state.rankings.includes(i));
      if (others.length) {
        const target = others.reduce((a,b) => Math.abs(state.positions[b]-state.positions[pi]) < Math.abs(state.positions[a]-state.positions[pi]) ? b : a);
        [state.positions[pi], state.positions[target]] = [state.positions[target], state.positions[pi]];
      }
    }

    addLog(`⚡ ${player.name}: ${title}`, 'powerup');
    App.showToast(title, desc);
  }

  // ── Advance Turn ──────────────────────────────────────────────
  function advanceTurn() {
    let next = (state.currentTurn + 1) % state.players.length;
    let tries = 0;
    while (state.rankings.includes(next) && tries < state.players.length) {
      next = (next + 1) % state.players.length;
      tries++;
    }
    state.currentTurn = next;
    Sound.turnChange();
    renderGame();
  }

  // ── AI Turn ───────────────────────────────────────────────────
  function aiTurn() {
    if (state.gameOver || !state.players[state.currentTurn].ai) return;
    const btn = container.querySelector('#btn-roll');
    if (btn) { btn.disabled = true; btn.textContent = '🤖 Thinking...'; }
    const delay = { easy: 800, medium: 1000, hard: 1200 }[state.aiDiff] || 1000;
    setTimeout(rollDice, delay);
  }

  // ── Log ───────────────────────────────────────────────────────
  function addLog(text, type) {
    state.diceHistory.push({ text, type });
    const el = container.querySelector('#log-entries');
    if (el) {
      const div = document.createElement('div');
      div.className = `log-entry log-${type}`;
      div.textContent = text;
      el.insertBefore(div, el.firstChild);
    }
  }

  // ── Win Modal ─────────────────────────────────────────────────
  function showWinModal() {
    const ranks = state.rankings.map((pi,i) => {
      const p = state.players[pi];
      return `<div class="win-rank-row">
        <span class="rank-medal">${['🥇','🥈','🥉','4️⃣'][i]}</span>
        <span class="rank-name">${p.emoji} ${p.name}</span>
        <span class="rank-pos">Sq ${state.positions[pi]}</span>
      </div>`;
    }).join('');

    App.showModal(`
      <span class="modal-emoji">🏆</span>
      <div class="modal-title">${state.players[state.rankings[0]].name} Wins!</div>
      <div class="win-ranks">${ranks}</div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="btn-play-again">🎲 Play Again</button>
        <button class="btn btn-secondary" data-navigate="hub">🏠 Hub</button>
      </div>
    `);
    document.querySelector('#btn-play-again')?.addEventListener('click', () => {
      App.hideModal(); App.stopConfetti();
      state = { ...initState(), players: state.players.map(p=>({...p,shield:false})) };
      startGame();
    });
  }

  // ── Init State ────────────────────────────────────────────────
  function initState() {
    return {
      numPlayers: 2,
      players: [
        { name: 'Player 1', emoji: EMOJI_DEFAULT[0], color: COLORS[0], ai: false, shield: false },
        { name: 'Player 2', emoji: EMOJI_DEFAULT[1], color: COLORS[1], ai: false, shield: false },
      ],
      aiDiff: 'medium',
      powerupsOn: true,
      positions: [], currentTurn: 0, rankings: [],
      diceHistory: [], consecutiveSixes: 0,
      snakesHit: 0, laddersClimbed: 0,
      gameOver: false, rolling: false,
    };
  }

  // ── Public API ────────────────────────────────────────────────
  function init(el) {
    container = el;
    state = initState();
    renderSetup();
  }
  function destroy() { container = null; App.stopConfetti(); }

  return { init, destroy };
})();
