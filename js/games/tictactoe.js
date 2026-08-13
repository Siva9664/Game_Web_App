/** tictactoe.js — Tic-Tac-Toe with Minimax AI */
const TicTacToeGame = (() => {
  let container, board, scores, mode, currentPlayer, gameOver, tttInterval;

  function init(el) {
    container = el;
    scores = { X: 0, O: 0, draws: 0 };
    mode = 'pvp';
    reset(true);
  }

  function destroy() { container = null; }

  function reset(full) {
    board = Array(9).fill('');
    currentPlayer = 'X';
    gameOver = false;
    if (full) render();
    else updateBoard();
  }

  function render() {
    container.innerHTML = `
      <div class="game-topbar">
        <button class="btn btn-secondary btn-sm" id="btn-back-hub">← Hub</button>
        <h2>❌⭕ Tic-Tac-Toe</h2>
      </div>
      <div class="ttt-wrap">
        <div class="ttt-mode-btns">
          <button class="mode-btn ${mode==='pvp'?'active':''}" data-mode="pvp">👥 2 Players</button>
          <button class="mode-btn ${mode==='easy'?'active':''}" data-mode="easy">🤖 Easy AI</button>
          <button class="mode-btn ${mode==='hard'?'active':''}" data-mode="hard">🤖 Hard AI</button>
        </div>
        <div class="ttt-scores">
          <div class="score-box"><div class="score-label">❌ X</div><div class="score-val" id="score-x">${scores.X}</div></div>
          <div class="score-box"><div class="score-label">🤝 Draws</div><div class="score-val" id="score-draws">${scores.draws}</div></div>
          <div class="score-box"><div class="score-label">⭕ O</div><div class="score-val" id="score-o">${scores.O}</div></div>
        </div>
        <div class="ttt-status" id="ttt-status">${currentPlayer === 'X' ? '❌ X\'s Turn' : '⭕ O\'s Turn'}</div>
        <div class="ttt-board" id="ttt-board">
          ${board.map((v,i) => `<button class="ttt-cell ${v} ${v?'taken':''}" data-i="${i}" aria-label="Cell ${i+1}">${v ? (v==='X'?'❌':'⭕') : ''}</button>`).join('')}
        </div>
        <button class="btn btn-secondary" id="btn-ttt-reset">↩ New Game</button>
      </div>`;

    container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode; scores = {X:0,O:0,draws:0}; reset(true);
    }));
    container.querySelector('#btn-ttt-reset').addEventListener('click', () => reset(true));
    container.querySelectorAll('.ttt-cell').forEach(cell => {
      cell.addEventListener('click', () => makeMove(+cell.dataset.i));
    });
  }

  function updateBoard() {
    const tttBoard = container?.querySelector('#ttt-board');
    const statusEl = container?.querySelector('#ttt-status');
    if (!tttBoard) return;
    board.forEach((v, i) => {
      const cell = tttBoard.children[i];
      if (!cell) return;
      cell.textContent = v ? (v==='X'?'❌':'⭕') : '';
      cell.className = `ttt-cell ${v} ${v?'taken':''}`;
    });
    if (statusEl) statusEl.textContent = gameOver ? '' : (currentPlayer==='X'?'❌ X\'s Turn':'⭕ O\'s Turn');
    if (container) {
      const sx = container.querySelector('#score-x'); if(sx) sx.textContent = scores.X;
      const so = container.querySelector('#score-o'); if(so) so.textContent = scores.O;
      const sd = container.querySelector('#score-draws'); if(sd) sd.textContent = scores.draws;
    }
  }

  function makeMove(idx) {
    if (gameOver || board[idx]) return;
    board[idx] = currentPlayer;
    Sound.place();
    const winner = checkWinner();
    if (winner) { endGame(winner); return; }
    if (board.every(c => c)) { endGame('draw'); return; }
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateBoard();
    if (currentPlayer === 'O' && mode !== 'pvp') {
      setTimeout(aiMove, 450);
    }
  }

  function aiMove() {
    if (gameOver) return;
    let idx;
    if (mode === 'easy') {
      const empty = board.map((v,i)=>v?-1:i).filter(i=>i>=0);
      idx = empty[Math.floor(Math.random()*empty.length)];
    } else {
      idx = bestMove();
    }
    if (idx !== undefined) makeMove(idx);
  }

  function bestMove() {
    let best = -Infinity, move = -1;
    board.forEach((v,i) => {
      if (!v) {
        board[i] = 'O';
        const score = minimax(board, 0, false);
        board[i] = '';
        if (score > best) { best = score; move = i; }
      }
    });
    return move;
  }

  function minimax(b, depth, isMax) {
    const w = checkWinnerBoard(b);
    if (w === 'O') return 10 - depth;
    if (w === 'X') return depth - 10;
    if (b.every(c=>c)) return 0;
    if (isMax) {
      let best = -Infinity;
      b.forEach((_,i) => { if(!b[i]){ b[i]='O'; best=Math.max(best,minimax(b,depth+1,false)); b[i]=''; } });
      return best;
    } else {
      let best = Infinity;
      b.forEach((_,i) => { if(!b[i]){ b[i]='X'; best=Math.min(best,minimax(b,depth+1,true)); b[i]=''; } });
      return best;
    }
  }

  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  function checkWinnerBoard(b) {
    for (const [a,c,d] of LINES) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a];
    return null;
  }

  function checkWinner() {
    for (const line of LINES) {
      const [a,b2,c] = line;
      if (board[a] && board[a]===board[b2] && board[a]===board[c]) {
        line.forEach(i => container?.querySelectorAll('.ttt-cell')[i]?.classList.add('win-cell'));
        return board[a];
      }
    }
    return null;
  }

  function endGame(result) {
    gameOver = true;
    Sound[result === 'draw' ? 'draw' : 'tttWin']?.();
    const status = container?.querySelector('#ttt-status');
    if (result === 'draw') {
      scores.draws++;
      if(status) status.textContent = '🤝 It\'s a Draw!';
      Storage.recordPlay('tictactoe');
    } else {
      scores[result]++;
      if(status) status.textContent = `${result==='X'?'❌':'⭕'} ${result} Wins!`;
      Storage.recordWin('tictactoe');
      Storage.checkAchievement('first_win');
      App.startConfetti();
      setTimeout(App.stopConfetti, 3500);
    }
    updateBoard();
    setTimeout(() => reset(false), 2200);
  }

  return { init, destroy };
})();
