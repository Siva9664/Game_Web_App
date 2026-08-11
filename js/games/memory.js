/** memory.js — Memory Match / Flip Card Game */
const MemoryGame = (() => {
  let container, cards, flipped, matched, moves, timer, startTime, timerInterval, gridSize;

  const SETS = {
    4: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'],
    6: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🦄','🐲'],
  };

  function init(el) {
    container = el;
    gridSize = 4;
    startNewGame();
  }

  function destroy() {
    clearInterval(timerInterval);
    container = null;
  }

  function startNewGame() {
    const pool = SETS[gridSize].slice(0, (gridSize * gridSize) / 2);
    const doubled = [...pool, ...pool];
    cards = doubled.sort(() => Math.random() - .5).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    flipped = []; matched = []; moves = 0; startTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 500);
    render();
  }

  function render() {
    container.innerHTML = `
      <div class="game-topbar">
        <button class="btn btn-secondary btn-sm" id="btn-back-hub">← Hub</button>
        <h2>🃏 Memory Match</h2>
      </div>
      <div class="memory-wrap">
        <div class="memory-hud">
          <div class="memory-stat"><div class="memory-stat-num" id="mem-moves">${moves}</div><div class="memory-stat-label">Moves</div></div>
          <div class="memory-stat"><div class="memory-stat-num" id="mem-time">0:00</div><div class="memory-stat-label">Time</div></div>
          <div class="memory-stat"><div class="memory-stat-num">${matched.length}/${cards.length/2}</div><div class="memory-stat-label">Pairs</div></div>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-secondary btn-sm ${gridSize===4?'btn-primary':''}" data-size="4">4×4</button>
            <button class="btn btn-secondary btn-sm ${gridSize===6?'btn-primary':''}" data-size="6">6×6</button>
          </div>
        </div>
        <div class="memory-board" data-size="${gridSize}" id="mem-board">
          ${cards.map(c => `
            <div class="memory-card-wrap">
              <div class="memory-card ${c.flipped||c.matched?'flipped':''} ${c.matched?'matched':''}" data-id="${c.id}">
                <div class="card-back"></div>
                <div class="card-front">${c.emoji}</div>
              </div>
            </div>`).join('')}
        </div>
        <button class="btn btn-secondary" id="btn-mem-restart">↩ New Game</button>
      </div>`;

    container.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => { gridSize = +b.dataset.size; startNewGame(); }));
    container.querySelector('#btn-mem-restart').addEventListener('click', startNewGame);
    container.querySelectorAll('.memory-card').forEach(card => {
      card.addEventListener('click', () => flipCard(+card.dataset.id));
    });
  }

  function flipCard(id) {
    const c = cards[id];
    if (c.matched || c.flipped || flipped.length >= 2) return;

    c.flipped = true;
    flipped.push(id);
    Sound.cardFlip();

    const cardEl = container?.querySelector(`.memory-card[data-id="${id}"]`);
    if (cardEl) cardEl.classList.add('flipped');

    if (flipped.length === 2) {
      moves++;
      const [a, b] = flipped;
      if (cards[a].emoji === cards[b].emoji) {
        cards[a].matched = cards[b].matched = true;
        matched.push(a, b);
        Sound.cardMatch();
        flipped = [];
        updateHUD();
        container?.querySelectorAll(`.memory-card[data-id="${a}"],.memory-card[data-id="${b}"]`)
          .forEach(el => el.classList.add('matched'));
        if (matched.length === cards.length) {
          setTimeout(winGame, 500);
        }
      } else {
        Sound.cardMiss();
        const [ea, eb] = [container?.querySelector(`.memory-card[data-id="${a}"]`),
                          container?.querySelector(`.memory-card[data-id="${b}"]`)];
        ea?.classList.add('shake'); eb?.classList.add('shake');
        setTimeout(() => {
          cards[a].flipped = cards[b].flipped = false;
          flipped = [];
          ea?.classList.remove('flipped','shake'); eb?.classList.remove('flipped','shake');
          updateHUD();
        }, 900);
      }
      updateHUD();
    }
  }

  function updateHUD() {
    const el = container?.querySelector('#mem-moves');
    if (el) el.textContent = moves;
    const pEl = container?.querySelector('.memory-stat-num:last-of-type');
  }

  function updateTimer() {
    const el = container?.querySelector('#mem-time');
    if (!el) return;
    const s = Math.floor((Date.now() - startTime) / 1000);
    el.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }

  function winGame() {
    clearInterval(timerInterval);
    const elapsed = Date.now() - startTime;
    const isNew = Storage.updateBestTime('memory', elapsed);
    Storage.recordWin('memory');
    Storage.checkAchievement('first_win');
    if (moves === cards.length / 2) Storage.checkAchievement('memory_perfect');
    App.startConfetti();
    Sound.win();
    const s = Math.floor(elapsed / 1000);
    App.showModal(`
      <span class="modal-emoji">🎉</span>
      <div class="modal-title">You Won!</div>
      <p style="color:var(--c-text-muted);margin:.5rem 0">Completed in <strong style="color:var(--c-primary)">${moves} moves</strong> and <strong style="color:var(--c-primary)">${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}</strong></p>
      ${isNew ? '<p style="color:var(--c-accent);font-weight:700">🏆 New Best Time!</p>' : ''}
      <div class="modal-actions">
        <button class="btn btn-primary" id="btn-mem-again">🃏 Play Again</button>
        <button class="btn btn-secondary" data-navigate="hub">🏠 Hub</button>
      </div>`);
    document.querySelector('#btn-mem-again')?.addEventListener('click', () => { App.hideModal(); App.stopConfetti(); startNewGame(); });
  }

  return { init, destroy };
})();
