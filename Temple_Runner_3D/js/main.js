/**
 * Main Game Controller & State Manager
 */
class GameController {
    constructor() {
        this.state = 'START_SCREEN'; // START_SCREEN, PLAYING, PAUSED, GAME_OVER

        // Core Game Objects
        this.gameScene = new GameScene();
        this.player = new Player(this.gameScene.scene);
        this.monster = new Monster(this.gameScene.scene);
        this.world = new World(this.gameScene.scene);
        this.obstacles = new ObstacleManager(this.gameScene.scene);
        this.collectibles = new CollectiblesManager(this.gameScene.scene);

        // Gameplay Metrics
        this.score = 0;
        this.runCoins = 0;
        this.baseSpeed = 16.0;
        this.currentSpeed = 16.0;
        this.maxSpeed = 34.0;
        this.distanceTravelled = 0;
        this.nextSpawnZ = 20;

        // Active Power-up Timers
        this.powerupTimers = {
            magnet: 0,
            shield: 0,
            boost: 0,
            multiplier: 0
        };

        // Delta timing
        this.lastTime = performance.now();

        this.initUI();
        this.bindInputs();
        this.updateStatsPreview();

        // Start animation loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    initUI() {
        // Start Screen Buttons
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-open-shop').addEventListener('click', () => this.openShop());

        // Pause Menu Buttons
        document.getElementById('btn-pause').addEventListener('click', () => this.pauseGame());
        document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
        document.getElementById('btn-restart-pause').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-quit-pause').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-sound-toggle').addEventListener('click', () => {
            const isMuted = audioManager.toggleMute();
            document.getElementById('btn-sound-toggle').innerText = `SOUND: ${isMuted ? 'OFF' : 'ON'}`;
        });

        // Game Over Screen Buttons
        document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
        document.getElementById('btn-shop-gameover').addEventListener('click', () => this.openShop());
        document.getElementById('btn-menu-gameover').addEventListener('click', () => this.quitToMenu());

        // Shop Modal Setup
        document.getElementById('btn-close-shop').addEventListener('click', () => this.closeShop());
        
        // Shop Tabs
        const tabPowerups = document.getElementById('tab-powerups');
        const tabSkins = document.getElementById('tab-skins');
        const contentPowerups = document.getElementById('shop-content-powerups');
        const contentSkins = document.getElementById('shop-content-skins');

        tabPowerups.addEventListener('click', () => {
            tabPowerups.classList.add('active');
            tabSkins.classList.remove('active');
            contentPowerups.classList.add('active');
            contentPowerups.classList.remove('hidden');
            contentSkins.classList.add('hidden');
            contentSkins.classList.remove('active');
        });

        tabSkins.addEventListener('click', () => {
            tabSkins.classList.add('active');
            tabPowerups.classList.remove('active');
            contentSkins.classList.add('active');
            contentSkins.classList.remove('hidden');
            contentPowerups.classList.add('hidden');
            contentPowerups.classList.remove('active');
        });

        // Shop Upgrade Buttons
        document.querySelectorAll('.btn-upgrade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-type');
                if (shopManager.upgradePowerup(type)) {
                    audioManager.playCoinSound();
                    this.refreshShopUI();
                }
            });
        });

        // Shop Skins Selection Buttons
        document.querySelectorAll('.btn-select-skin').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skinId = e.currentTarget.getAttribute('data-skin');
                const cost = parseInt(e.currentTarget.getAttribute('data-cost') || '0');

                if (shopManager.data.unlockedSkins.includes(skinId)) {
                    shopManager.selectSkin(skinId);
                    this.player.buildCharacter(skinId);
                } else if (cost > 0 && shopManager.buySkin(skinId)) {
                    audioManager.playPowerupSound();
                    this.player.buildCharacter(skinId);
                }
                this.refreshShopUI();
            });
        });
    }

    updateStatsPreview() {
        document.getElementById('best-score-val').innerText = `${Math.floor(shopManager.data.bestScore)}m`;
        document.getElementById('total-coins-val').innerText = shopManager.data.totalCoins;
    }

    openShop() {
        this.refreshShopUI();
        document.getElementById('shop-screen').classList.remove('hidden');
        document.getElementById('shop-screen').classList.add('active');
    }

    closeShop() {
        document.getElementById('shop-screen').classList.add('hidden');
        document.getElementById('shop-screen').classList.remove('active');
        this.updateStatsPreview();
    }

    refreshShopUI() {
        document.getElementById('shop-coins-display').innerText = shopManager.data.totalCoins;

        // Refresh upgrade cards
        ['magnet', 'shield', 'boost', 'multiplier'].forEach(type => {
            const lvl = shopManager.getUpgradeLevel(type);
            const cost = shopManager.getUpgradeCost(type);
            const card = document.querySelector(`.upgrade-card[data-upgrade="${type}"]`);
            if (card) {
                card.querySelector('.lvl-num').innerText = lvl;
                const btn = card.querySelector('.btn-upgrade');
                if (lvl >= 5) {
                    btn.innerText = 'MAX LEVEL';
                    btn.disabled = true;
                } else {
                    btn.innerHTML = `UPGRADE (<span class="upg-cost">${cost}</span> 🪙)`;
                    btn.disabled = shopManager.data.totalCoins < cost;
                }
            }
        });

        // Refresh skins grid
        const equippedSkin = shopManager.getSelectedSkin();
        document.querySelectorAll('.skin-card').forEach(card => {
            const skinId = card.getAttribute('data-skin');
            const btn = card.querySelector('.btn-select-skin');

            if (skinId === equippedSkin) {
                card.classList.add('selected');
                btn.innerText = 'EQUIPPED';
                btn.disabled = true;
            } else if (shopManager.data.unlockedSkins.includes(skinId)) {
                card.classList.remove('selected');
                btn.innerText = 'EQUIP';
                btn.disabled = false;
            } else {
                card.classList.remove('selected');
                const cost = shopManager.costs.skins[skinId];
                btn.innerText = `BUY ${cost} 🪙`;
                btn.disabled = shopManager.data.totalCoins < cost;
            }
        });
    }

    bindInputs() {
        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.state === 'START_SCREEN' && e.code === 'Space') {
                this.startGame();
                return;
            }

            if (this.state !== 'PLAYING') return;

            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.player.moveLeft();
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.player.moveRight();
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    this.player.jump();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.player.slide();
                    break;
                case 'KeyP':
                case 'Escape':
                    this.pauseGame();
                    break;
            }
        });

        // Touch Swipe Controls for Mobile/Tablets
        let touchStartX = 0;
        let touchStartY = 0;

        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (this.state !== 'PLAYING' || e.changedTouches.length === 0) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            const threshold = 30;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > threshold) this.player.moveRight();
                else if (diffX < -threshold) this.player.moveLeft();
            } else {
                if (diffY < -threshold) this.player.jump();
                else if (diffY > threshold) this.player.slide();
            }
        }, { passive: true });

        // Touch Control Buttons for Mobile
        document.getElementById('touch-left').addEventListener('click', () => this.state === 'PLAYING' && this.player.moveLeft());
        document.getElementById('touch-right').addEventListener('click', () => this.state === 'PLAYING' && this.player.moveRight());
        document.getElementById('touch-jump').addEventListener('click', () => this.state === 'PLAYING' && this.player.jump());
        document.getElementById('touch-slide').addEventListener('click', () => this.state === 'PLAYING' && this.player.slide());
    }

    startGame() {
        audioManager.init();
        audioManager.startMusic();

        this.score = 0;
        this.runCoins = 0;
        this.distanceTravelled = 0;
        this.currentSpeed = this.baseSpeed;
        this.nextSpawnZ = 20;

        // Reset Power-ups
        Object.keys(this.powerupTimers).forEach(k => this.powerupTimers[k] = 0);

        // Reset World & Entities
        this.player.reset();
        this.player.buildCharacter(shopManager.getSelectedSkin());
        this.monster.reset();
        this.world.reset();
        this.obstacles.reset();
        this.collectibles.reset();

        // UI State
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.remove('active');
        document.getElementById('gameover-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.remove('active');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        this.state = 'PLAYING';
    }

    pauseGame() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            audioManager.stopMusic();
            document.getElementById('pause-screen').classList.remove('hidden');
            document.getElementById('pause-screen').classList.add('active');
        }
    }

    resumeGame() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            audioManager.startMusic();
            document.getElementById('pause-screen').classList.add('hidden');
            document.getElementById('pause-screen').classList.remove('active');
        }
    }

    restartGame() {
        this.startGame();
    }

    quitToMenu() {
        this.state = 'START_SCREEN';
        audioManager.stopMusic();
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.remove('active');
        document.getElementById('gameover-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.remove('active');
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('start-screen').classList.add('active');
        this.updateStatsPreview();
    }

    gameOver(reason = "The Shadow Guardian claimed your soul.") {
        this.state = 'GAME_OVER';
        audioManager.stopMusic();
        audioManager.playMonsterRoar();

        const finalScore = Math.floor(this.score);
        const isNewRecord = shopManager.saveRunStats(finalScore, this.runCoins);

        document.getElementById('gameover-reason').innerText = reason;
        document.getElementById('final-score-val').innerText = finalScore;
        document.getElementById('final-coins-val').innerText = this.runCoins;
        document.getElementById('new-record-tag').innerText = isNewRecord ? "YES! 🎉" : "NO";

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('gameover-screen').classList.remove('hidden');
        document.getElementById('gameover-screen').classList.add('active');
    }

    showToast(message) {
        const toast = document.getElementById('game-toast');
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1600);
    }

    activatePowerup(type) {
        const duration = shopManager.getPowerupDuration(type);
        this.powerupTimers[type] = duration;
        this.showToast(`+${duration}s ${type.toUpperCase()}!`);

        if (type === 'boost') {
            audioManager.playPowerupSound();
        }
    }

    updatePowerups(delta) {
        Object.keys(this.powerupTimers).forEach(type => {
            if (this.powerupTimers[type] > 0) {
                this.powerupTimers[type] -= delta;
                const maxDur = shopManager.getPowerupDuration(type);
                const pct = Math.max(0, (this.powerupTimers[type] / maxDur) * 100);

                const pill = document.getElementById(`powerup-${type}`);
                if (pill) {
                    pill.classList.remove('hidden');
                    pill.querySelector('.fill').style.width = `${pct}%`;
                }

                this.player.setPowerupVisual(type, true);

                if (this.powerupTimers[type] <= 0) {
                    this.powerupTimers[type] = 0;
                    if (pill) pill.classList.add('hidden');
                    this.player.setPowerupVisual(type, false);
                }
            }
        });
    }

    gameLoop(time) {
        const delta = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (this.state === 'PLAYING') {
            const isBoosting = this.powerupTimers.boost > 0;
            const effectiveSpeed = isBoosting ? 38.0 : this.currentSpeed;

            // Speed Scaling with Distance
            if (!isBoosting && this.currentSpeed < this.maxSpeed) {
                this.currentSpeed += delta * 0.15;
            }

            // Player Update
            this.player.update(delta, effectiveSpeed);

            // Monster Update
            this.monster.update(delta, this.player.position, this.player.isStumbling);

            // World & Embers
            this.world.update(this.player.position.z);
            this.gameScene.updateEmbers(this.player.position.z);

            // Spawn Obstacles & Collectibles ahead of player
            if (this.player.position.z + 50 > this.nextSpawnZ) {
                this.obstacles.spawnObstaclePattern(this.nextSpawnZ);
                this.collectibles.spawnCoinPattern(this.nextSpawnZ);
                this.nextSpawnZ += 18;
            }

            this.obstacles.update(this.player.position.z);
            this.collectibles.update(delta, this.player.position, this.powerupTimers.magnet > 0);

            // Power-up Active Timers
            this.updatePowerups(delta);

            // Coin & Powerup Collection Checks
            const coinsEarned = this.collectibles.checkCoinCollections(this.player.position);
            if (coinsEarned > 0) {
                const multiplierVal = this.powerupTimers.multiplier > 0 ? 2 : 1;
                this.runCoins += coinsEarned * multiplierVal;
                this.score += coinsEarned * 15 * multiplierVal;
            }

            const powerupType = this.collectibles.checkPowerupCollections(this.player.position);
            if (powerupType) {
                this.activatePowerup(powerupType);
            }

            // Collision Checks (Ignore if boosting!)
            if (!isBoosting) {
                const hitObstacleType = this.obstacles.checkCollisions(this.player);

                if (hitObstacleType) {
                    if (this.powerupTimers.shield > 0) {
                        // Shield protects from crash!
                        this.powerupTimers.shield = 0;
                        this.showToast("SHIELD PROTECTED YOU!");
                        audioManager.playShieldAbsorbSound();
                    } else if (!this.player.isStumbling) {
                        // Trigger Stumble
                        this.player.triggerStumble();
                        this.showToast("STUMBLED! MONSTER CLOSING IN!");
                        document.getElementById('danger-vignette').classList.add('active');
                        setTimeout(() => document.getElementById('danger-vignette').classList.remove('active'), 2500);
                    }
                }

                // Monster Catch Check
                if (this.monster.isCatchingPlayer()) {
                    this.gameOver("The Shadow Guardian caught up and claimed your soul!");
                }

                // Check Gap Fall
                if (this.world.checkGapFall(this.player.position)) {
                    if (this.powerupTimers.shield > 0) {
                        this.powerupTimers.shield = 0;
                        this.player.jump();
                        this.showToast("SHIELD SAVED FROM FALL!");
                    } else {
                        this.gameOver("You fell into the ancient lava pit!");
                    }
                }
            }

            // Distance & Score Calculation
            this.distanceTravelled = this.player.position.z;
            const scoreMultiplier = this.powerupTimers.multiplier > 0 ? 2 : 1;
            this.score += delta * effectiveSpeed * scoreMultiplier;

            // HUD Display Updates
            document.getElementById('score-display').innerText = Math.floor(this.score);
            document.getElementById('coin-display').innerText = this.runCoins;
            document.getElementById('multiplier-display').innerText = `${scoreMultiplier}x`;

            // Camera follow update
            this.gameScene.updateCamera(this.player.position, isBoosting);
        } else if (this.state === 'START_SCREEN' || this.state === 'PAUSED') {
            // Idle camera spin effect on start screen
            if (this.state === 'START_SCREEN') {
                this.gameScene.camera.position.x = Math.sin(time * 0.0005) * 5;
                this.gameScene.camera.lookAt(0, 1.5, 0);
            }
        }

        // Render WebGL Scene
        this.gameScene.renderer.render(this.gameScene.scene, this.gameScene.camera);

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Instantiate Game on DOM Content Loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameController();
});
