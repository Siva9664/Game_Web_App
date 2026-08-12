/** puzzle2048.js — 2048 Puzzle Game */
const Puzzle2048 = (() => {
  let container, grid, score, best, gameOver, merged;

  function init(el) {
    container = el;
    best = Storage.getStats().puzzle2048?.bestScore || 0;
    startGame();
  }

  function destroy() { container = null; }

  function startGame() {
    grid = Array(4).fill(null).map(() => Array(4).fill(0));
    score = 0; gameOver = false;
    Storage.recordPlay('puzzle2048');
    addTile(); addTile();
    render();
  }

  function addTile() {
    const empty = [];
    grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r,c]); }));
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < .9 ? 2 : 4;
  }

  function render() {
    container.innerHTML = `
      <div class="game-topbar">
        <button class="btn btn-secondary btn-sm" id="btn-back-hub">← Hub</button>
        <h2>🔢 2048</h2>
      </div>
      <div class="p2048-wrap">
        <div class="p2048-hud">
          <div class="p2048-score-box"><div class="p2048-score-num" id="p-score">${score}</div><div class="p2048-score-label">Score</div></div>
          <div class="p2048-score-box"><div class="p2048-score-num" id="p-best">${best}</div><div class="p2048-score-label">Best</div></div>
          <button class="btn btn-secondary btn-sm" id="btn-2048-new">New Game</button>
        </div>
        <div class="p2048-board" id="p-board" tabindex="0" aria-label="2048 game board">
          ${grid.flat().map(v => `<div class="tile ${tileClass(v)}">${v || ''}</div>`).join('')}
        </div>
        <p class="p2048-hint">Arrow keys or swipe to play</p>
      </div>`;

    container.querySelector('#btn-2048-new').addEventListener('click', startGame);
    container.querySelector('#p-board').focus();

    setupInput();
  }

  function tileClass(v) { return v === 0 ? 't-0' : v >= 2048 ? 't-2048' : `t-${v}`; }

  function updateBoard(newCells) {
    const board = container?.querySelector('#p-board');
    if (!board) return;
    const tiles = board.querySelectorAll('.tile');
    const flat = grid.flat();
    flat.forEach((v, i) => {
      const t = tiles[i];
      if (!t) return;
      const old = t.className;
      t.textContent = v || '';
      t.className = `tile ${tileClass(v)}`;
      if (newCells && newCells.includes(i)) t.classList.add('new');
      else if (merged && merged.includes(i)) t.classList.add('merge');
    });
    const s = container?.querySelector('#p-score'); if (s) s.textContent = score;
    const b = container?.querySelector('#p-best');  if (b) b.textContent = best;
  }

  function setupInput() {
    document.addEventListener('keydown', onKey);
    let tx = 0, ty = 0;
    const board = container?.querySelector('#p-board');
    board?.addEventListener('touchstart', e => { tx=e.touches[0].clientX; ty=e.touches[0].clientY; },{passive:true});
    board?.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    },{passive:true});
  }

  function onKey(e) {
    if (!container || !document.body.contains(container)) { document.removeEventListener('keydown', onKey); return; }
    const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
  }

  function move(dir) {
    if (gameOver) return;
    const prev = JSON.stringify(grid);
    merged = [];
    const newCells = [];

    function slideRow(row) {
      let r = row.filter(v => v);
      for (let i = 0; i < r.length - 1; i++) {
        if (r[i] === r[i+1]) {
          r[i] *= 2; score += r[i];
          if (r[i] === 2048) { Storage.checkAchievement('score_2048'); Sound.highTile(); }
          else Sound.merge();
          r.splice(i+1, 1); r.push(0);
        }
      }
      while (r.length < 4) r.push(0);
      return r;
    }

    function rotate90(g) {
      return g[0].map((_, c) => g.map(r => r[c]).reverse());
    }

    let g = grid.map(r => [...r]);
    if (dir === 'left')  g = g.map(slideRow);
    else if (dir === 'right') g = g.map(r => slideRow([...r].reverse()).reverse());
    else if (dir === 'up')   { g = rotate90(g).map(slideRow); g = rotate90(rotate90(rotate90(g))); }
    else if (dir === 'down') { g = rotate90(rotate90(rotate90(g))).map(slideRow); g = rotate90(g); }

    if (JSON.stringify(g) !== prev) {
      grid = g;
      if (score > best) { best = score; Storage.updateHighScore('puzzle2048','bestScore', score); }
      addTile();
      updateBoard(newCells);
      if (checkGameOver()) { setTimeout(showGameOver, 400); }
    }
  }

  function checkGameOver() {
    if (grid.flat().includes(0)) return false;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if ((c < 3 && grid[r][c] === grid[r][c+1]) || (r < 3 && grid[r][c] === grid[r+1][c])) return false;
    }
    return true;
  }

  function showGameOver() {
    gameOver = true;
    Sound.lose();
    App.showModal(`
      <span class="modal-emoji">🎯</span>
      <div class="modal-title">Game Over!</div>
      <p style="color:var(--c-text-muted)">Score: <strong style="color:var(--c-primary)">${score}</strong></p>
      <p style="color:var(--c-text-muted)">Best: <strong style="color:var(--c-primary)">${best}</strong></p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="btn-2048-again">🔢 Play Again</button>
        <button class="btn btn-secondary" data-navigate="hub">🏠 Hub</button>
      </div>`);
    document.querySelector('#btn-2048-again')?.addEventListener('click', () => { App.hideModal(); startGame(); });
  }

  return { init, destroy };
})();
