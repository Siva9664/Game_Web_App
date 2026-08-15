/**
 * UI Manager & Controller Input System for Subway Surfers 3D
 */

class UIManager {
    constructor() {
        this.bindElements();
        this.bindEvents();
        this.initSwipeDetection();
        this.startHUDLoop();
    }

    bindElements() {
        // Screens
        this.hudOverlay = document.getElementById('hud-overlay');
        this.screenStart = document.getElementById('screen-start');
        this.screenPause = document.getElementById('screen-pause');
        this.screenGameOver = document.getElementById('screen-gameover');
        this.modalLeaderboard = document.getElementById('modal-leaderboard');

        // HUD Elements
        this.hudScore = document.getElementById('hud-score');
        this.hudCoins = document.getElementById('hud-coins');
        this.hudMultiplier = document.getElementById('hud-multiplier');
        
        // Powerup Badges
        this.timerMagnet = document.getElementById('timer-magnet');
        this.timerJetpack = document.getElementById('timer-jetpack');
        this.timerHoverboard = document.getElementById('timer-hoverboard');
        this.timerMultiplier = document.getElementById('timer-multiplier');
        this.timerSneakers = document.getElementById('timer-sneakers');

        // Stats Display
        this.finalScoreVal = document.getElementById('final-score-val');
        this.finalCoinsVal = document.getElementById('final-coins-val');
        this.formSubmitScore = document.getElementById('form-submit-score');
        this.playerNameInput = document.getElementById('player-name-input');
        this.submitStatusMsg = document.getElementById('submit-status-msg');
        this.leaderboardTbody = document.getElementById('leaderboard-tbody');

        // Buttons
        this.btnStart = document.getElementById('btn-start-game');
        this.btnViewLeaderboard = document.getElementById('btn-view-leaderboard');
        this.btnPause = document.getElementById('btn-pause-game');
        this.btnResume = document.getElementById('btn-resume-game');
        this.btnRestartPause = document.getElementById('btn-restart-from-pause');
        this.btnRestartGameOver = document.getElementById('btn-restart-game');
        this.btnGameOverLeaderboard = document.getElementById('btn-gameover-leaderboard');
        this.btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
        this.btnBackFromLB = document.getElementById('btn-back-from-lb');

        // Touch Control Buttons
        this.btnTouchLeft = document.getElementById('btn-touch-left');
        this.btnTouchRight = document.getElementById('btn-touch-right');
        this.btnTouchUp = document.getElementById('btn-touch-up');
        this.btnTouchDown = document.getElementById('btn-touch-down');
    }

    bindEvents() {
        this.btnStart.addEventListener('click', () => this.startGame());
        this.btnPause.addEventListener('click', () => this.pauseGame());
        this.btnResume.addEventListener('click', () => this.resumeGame());
        this.btnRestartPause.addEventListener('click', () => this.restartGame());
        this.btnRestartGameOver.addEventListener('click', () => this.restartGame());

        this.btnViewLeaderboard.addEventListener('click', () => this.openLeaderboard());
        this.btnGameOverLeaderboard.addEventListener('click', () => this.openLeaderboard());
        this.btnCloseLeaderboard.addEventListener('click', () => this.closeLeaderboard());
        this.btnBackFromLB.addEventListener('click', () => this.closeLeaderboard());

        this.formSubmitScore.addEventListener('submit', (e) => this.handleSubmitScore(e));

        // Keyboard Controls
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Touch button clicks
        if (this.btnTouchLeft) {
            this.btnTouchLeft.addEventListener('click', () => window.gameEngine && window.gameEngine.moveLeft());
            this.btnTouchRight.addEventListener('click', () => window.gameEngine && window.gameEngine.moveRight());
            this.btnTouchUp.addEventListener('click', () => window.gameEngine && window.gameEngine.jump());
            this.btnTouchDown.addEventListener('click', () => window.gameEngine && window.gameEngine.slide());
        }
    }

    handleKeyDown(e) {
        if (!window.gameEngine) return;
        
        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                window.gameEngine.moveLeft();
                break;
            case 'ArrowRight':
            case 'KeyD':
                window.gameEngine.moveRight();
                break;
            case 'ArrowUp':
            case 'KeyW':
                window.gameEngine.jump();
                break;
            case 'ArrowDown':
            case 'KeyS':
                window.gameEngine.slide();
                break;
            case 'Space':
                window.gameEngine.activateHoverboard();
                break;
            case 'KeyP':
                if (window.gameEngine.isPaused) this.resumeGame();
                else this.pauseGame();
                break;
        }
    }

    initSwipeDetection() {
        let startX = 0;
        let startY = 0;
        let lastTap = 0;

        window.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;

            // Double tap detection for Hoverboard
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                if (window.gameEngine) window.gameEngine.activateHoverboard();
            }
            lastTap = currentTime;
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            const diffX = e.changedTouches[0].clientX - startX;
            const diffY = e.changedTouches[0].clientY - startY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal Swipe
                if (Math.abs(diffX) > 30) {
                    if (diffX > 0) window.gameEngine && window.gameEngine.moveRight();
                    else window.gameEngine && window.gameEngine.moveLeft();
                }
            } else {
                // Vertical Swipe
                if (Math.abs(diffY) > 30) {
                    if (diffY < 0) window.gameEngine && window.gameEngine.jump();
                    else window.gameEngine && window.gameEngine.slide();
                }
            }
        }, { passive: true });
    }

    startGame() {
        this.screenStart.classList.add('hidden');
        this.screenPause.classList.add('hidden');
        this.screenGameOver.classList.add('hidden');
        this.hudOverlay.classList.remove('hidden');

        if (window.gameEngine) {
            window.gameEngine.start();
        }
    }

    pauseGame() {
        if (!window.gameEngine || window.gameEngine.isGameOver) return;
        window.gameEngine.isPaused = true;
        this.screenPause.classList.remove('hidden');
    }

    resumeGame() {
        if (!window.gameEngine) return;
        window.gameEngine.isPaused = false;
        this.screenPause.classList.add('hidden');
    }

    restartGame() {
        window.location.reload();
    }

    showGameOver(score, coins) {
        this.hudOverlay.classList.add('hidden');
        this.screenGameOver.classList.remove('hidden');
        this.finalScoreVal.textContent = score;
        this.finalCoinsVal.textContent = coins;
    }

    async handleSubmitScore(e) {
        e.preventDefault();
        const username = this.playerNameInput.value.trim();
        if (!username || !window.gameEngine) return;

        this.submitStatusMsg.style.color = '#00f0ff';
        this.submitStatusMsg.textContent = 'Submitting score...';

        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    score: window.gameEngine.score,
                    coins: window.gameEngine.coins
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                this.submitStatusMsg.style.color = '#32ff7e';
                this.submitStatusMsg.textContent = `Score Saved! You are Ranked #${data.rank} 🏆`;
                this.formSubmitScore.querySelector('button').disabled = true;
            } else {
                this.submitStatusMsg.style.color = '#ff3860';
                this.submitStatusMsg.textContent = 'Error: ' + data.message;
            }
        } catch (err) {
            this.submitStatusMsg.style.color = '#ff3860';
            this.submitStatusMsg.textContent = 'Failed to connect to backend server.';
        }
    }

    async openLeaderboard() {
        this.modalLeaderboard.classList.remove('hidden');
        this.leaderboardTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading Top Runners...</td></tr>';

        try {
            const response = await fetch('/api/scores');
            const data = await response.json();

            if (data.status === 'success' && data.scores.length > 0) {
                let html = '';
                data.scores.forEach((s, idx) => {
                    let medal = idx + 1;
                    if (idx === 0) medal = '🥇';
                    else if (idx === 1) medal = '🥈';
                    else if (idx === 2) medal = '🥉';

                    html += `
                        <tr>
                            <td>${medal}</td>
                            <td>${s.username}</td>
                            <td style="color:#00f0ff; font-weight:800;">${s.score}</td>
                            <td style="color:#ffd700;">🪙 ${s.coins}</td>
                        </tr>
                    `;
                });
                this.leaderboardTbody.innerHTML = html;
            } else {
                this.leaderboardTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No high scores yet!</td></tr>';
            }
        } catch (err) {
            this.leaderboardTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ff3860;">Failed to fetch leaderboard scores.</td></tr>';
        }
    }

    closeLeaderboard() {
        this.modalLeaderboard.classList.add('hidden');
    }

    startHUDLoop() {
        setInterval(() => {
            if (!window.gameEngine || !window.gameEngine.isStarted || window.gameEngine.isGameOver) return;

            // Update Score & Coins
            this.hudScore.textContent = window.gameEngine.score;
            this.hudCoins.textContent = window.gameEngine.coins;
            this.hudMultiplier.textContent = (window.gameEngine.powerups.multiplier.active ? 2 : 1) + 'x';

            // Powerup UI Progress Bars
            this.updatePowerupBadge(this.timerMagnet, window.gameEngine.powerups.magnet);
            this.updatePowerupBadge(this.timerJetpack, window.gameEngine.powerups.jetpack);
            this.updatePowerupBadge(this.timerMultiplier, window.gameEngine.powerups.multiplier);
            this.updatePowerupBadge(this.timerSneakers, window.gameEngine.powerups.sneakers);

            // Hoverboard Badge
            if (window.gameEngine.powerups.hoverboard.active) {
                this.timerHoverboard.classList.remove('hidden');
            } else {
                this.timerHoverboard.classList.add('hidden');
            }
        }, 100);
    }

    updatePowerupBadge(element, pData) {
        if (pData.active) {
            element.classList.remove('hidden');
            const fillPct = (pData.duration / pData.max) * 100;
            const fillEl = element.querySelector('.pu-fill');
            if (fillEl) fillEl.style.width = fillPct + '%';
        } else {
            element.classList.add('hidden');
        }
    }
}

// Global UI Manager
window.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
});
