/** snake.js — Classic Arcade Snake Game */
const SnakeGame = (() => {
  let container, canvas, ctx, snake, dir, nextDir, food, score, highScore, gameLoop, gameState, cellSize, cols, rows;

  function init(el) {
    container = el;
    highScore = Storage.getStats().snake?.highScore || 0;
    gameState = 'idle';
    render();
  }

  function destroy() {
    clearInterval(gameLoop);
    container = null;
  }

  function render() {
    container.innerHTML = `
      <div class="game-topbar">
        <button class="btn btn-secondary btn-sm" id="btn-back-hub">← Hub</button>
        <h2>🕹️ Classic Snake</h2>
      </div>
      <div class="snake-wrap">
        <div class="snake-hud">
          <div class="snake-score-box"><div class="snake-score-num" id="sn-score">0</div><div class="snake-score-label">Score</div></div>
          <div class="snake-score-box"><div class="snake-score-num" id="sn-best">${highScore}</div><div class="snake-score-label">Best</div></div>
          <div style="display:flex;gap:.5rem;flex-direction:column">
            <select id="sn-speed" class="setup-input" style="padding:.4rem .6rem;width:auto">
              <option value="150">🐢 Slow</option>
              <option value="100" selected>🐍 Normal</option>
              <option value="65">⚡ Fast</option>
            </select>
          </div>
        </div>
        <div class="snake-canvas-wrap">
          <canvas id="snake-canvas"></canvas>
          <div class="snake-overlay" id="sn-overlay">
            <div style="font-family:'Fredoka One',sans-serif;font-size:2rem;color:var(--c-primary)">🐍 Snake</div>
            <p style="color:var(--c-text-muted);font-size:.9rem">Use arrow keys or D-pad to move</p>
            <button class="btn btn-primary btn-lg" id="btn-sn-start">▶ Start Game</button>
          </div>
        </div>
        <div class="snake-controls" aria-label="Direction controls">
          <button class="d-btn d-up"    data-dir="up"    aria-label="Move up">▲</button>
          <button class="d-btn d-left"  data-dir="left"  aria-label="Move left">◀</button>
          <button class="d-btn d-down"  data-dir="down"  aria-label="Move down">▼</button>
          <button class="d-btn d-right" data-dir="right" aria-label="Move right">▶</button>
        </div>
      </div>`;

    canvas = container.querySelector('#snake-canvas');
    ctx = canvas.getContext('2d');
    setupCanvas();

    container.querySelector('#btn-sn-start')?.addEventListener('click', startGame);
    container.querySelectorAll('.d-btn').forEach(b => b.addEventListener('click', () => setDir(b.dataset.dir)));
    document.addEventListener('keydown', onKey);

    // Touch swipe
    let tx = 0, ty = 0;
    canvas.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive:true});
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 'right' : 'left');
      else setDir(dy > 0 ? 'down' : 'up');
    }, {passive:true});
  }

  function setupCanvas() {
    const size = Math.min(400, window.innerWidth - 40);
    cellSize = Math.floor(size / 20);
    cols = Math.floor(size / cellSize);
    rows = cols;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    drawIdle();
  }

  function drawIdle() {
    if (!ctx) return;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-board-bg').trim() || '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function startGame() {
    const overlay = container?.querySelector('#sn-overlay');
    if (overlay) overlay.style.display = 'none';
    snake = [{ x: Math.floor(cols/2), y: Math.floor(rows/2) }];
    dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
    score = 0; gameState = 'running';
    Storage.recordPlay('snake');
    placeFood();
    updateScoreUI();
    clearInterval(gameLoop);
    const speed = +(container?.querySelector('#sn-speed')?.value || 100);
    gameLoop = setInterval(tick, speed);
  }

  function tick() {
    if (gameState !== 'running') return;
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) { endGame(); return; }
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) { endGame(); return; }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      Sound.eat();
      placeFood();
      if (score > highScore) {
        highScore = score;
        Storage.updateHighScore('snake','highScore', score);
        if (score >= 100) Storage.checkAchievement('snake_100');
      }
    } else {
      snake.pop();
    }
    updateScoreUI();
    draw();
  }

  function draw() {
    if (!ctx) return;
    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue('--c-board-bg').trim() || '#111';
    const primary = style.getPropertyValue('--c-primary').trim() || '#4caf50';
    const accent = style.getPropertyValue('--c-accent').trim() || '#f59e0b';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      ctx.fillRect(x * cellSize + cellSize/2, y * cellSize + cellSize/2, 1, 1);
    }

    // Snake
    snake.forEach((s, i) => {
      const alpha = 1 - (i / snake.length) * .4;
      ctx.fillStyle = i === 0 ? primary : primary + 'cc';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.roundRect(s.x * cellSize + 1, s.y * cellSize + 1, cellSize - 2, cellSize - 2, 4);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Food
    ctx.font = `${cellSize - 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍎', food.x * cellSize + cellSize/2, food.y * cellSize + cellSize/2);
  }

  function placeFood() {
    let pos;
    do { pos = { x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows) }; }
    while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function endGame() {
    clearInterval(gameLoop);
    gameState = 'over';
    Sound.gameOver();
    App.showModal(`
      <span class="modal-emoji">💀</span>
      <div class="modal-title">Game Over!</div>
      <p style="color:var(--c-text-muted)">Score: <strong style="color:var(--c-primary)">${score}</strong></p>
      <p style="color:var(--c-text-muted)">Best: <strong style="color:var(--c-primary)">${highScore}</strong></p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="btn-sn-again">▶ Play Again</button>
        <button class="btn btn-secondary" data-navigate="hub">🏠 Hub</button>
      </div>`);
    document.querySelector('#btn-sn-again')?.addEventListener('click', () => { App.hideModal(); startGame(); });
  }

  function setDir(d) {
    if (gameState === 'idle') return;
    const map = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
    const nd = map[d];
    if (!nd) return;
    // Prevent reverse
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
  }

  function onKey(e) {
    if (!container || !document.body.contains(container)) { document.removeEventListener('keydown', onKey); return; }
    const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', w:'up', s:'down', a:'left', d:'right' };
    if (map[e.key]) { e.preventDefault(); setDir(map[e.key]); }
    if ((e.key === ' ' || e.key === 'Enter') && gameState === 'idle') startGame();
  }

  function updateScoreUI() {
    const s = container?.querySelector('#sn-score'); if (s) s.textContent = score;
    const b = container?.querySelector('#sn-best');  if (b) b.textContent = highScore;
  }

  return { init, destroy };
})();
