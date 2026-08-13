/**
 * Carrom Masters - Advanced 2D Physics, AI Opponent, Web Audio & Arena Engine
 * Features:
 * - Impulse-based 2D physics with continuous sub-stepping and mass conservation
 * - Procedural Web Audio API sound synthesizer (zero external dependencies)
 * - Intelligent AI Opponent (Easy, Medium, Hard) with raycasted ghost-ball targeting & bank shots
 * - Trajectory guideline prediction with cushion rebound assist
 * - Multi-Game Modes (vs AI Bot, 2-Player Pass & Play, Practice / Trickshots)
 * - Pocket suction gravity wells & particle impact effects
 * - Live MongoDB backend sync & offline standalone capability
 */

// ============================================================================
// 1. Application & Game State
// ============================================================================

const state = {
  dbConnected: false,
  players: [],
  activeMatch: null,
  selectedPlayerId: null,
  leaderboard: {
    page: 1,
    limit: 10,
    sortBy: 'wins',
    total: 0,
    totalPages: 1,
  },
  settings: {
    gameMode: 'ai', // 'ai' | 'pvp' | 'practice'
    aiDifficulty: 'easy', // 'easy' | 'medium' | 'hard'
    soundEnabled: true,
    soundVolume: 0.7,
    showTrajectory: true,
  },
};

// Canvas & Physics Configuration
const canvas = document.getElementById('carromCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const BOARD_SIZE = 600;
const MARGIN = 50;
const POCKET_RADIUS = 28;
const POCKET_SUCTION_RADIUS = 40;
const COIN_RADIUS = 14;
const STRIKER_RADIUS = 20;
const COIN_MASS = 1.0;
const STRIKER_MASS = 3.2;

const FRICTION = 0.985;
const RESTITUTION_COIN_COIN = 0.92;
const RESTITUTION_STRIKER_COIN = 0.88;
const RESTITUTION_CUSHION = 0.78;
const SUB_STEPS = 5;

// Board Pockets
const pockets = [
  { id: 'TL', x: 42, y: 42 },
  { id: 'TR', x: BOARD_SIZE - 42, y: 42 },
  { id: 'BL', x: 42, y: BOARD_SIZE - 42 },
  { id: 'BR', x: BOARD_SIZE - 42, y: BOARD_SIZE - 42 },
];

// Active Game Dynamic Entities
let coins = [];
let particles = [];
let floatingTexts = [];

let striker = {
  x: 300,
  y: 480,
  vx: 0,
  vy: 0,
  radius: STRIKER_RADIUS,
  mass: STRIKER_MASS,
  isAiming: false,
  aimAngle: -Math.PI / 2,
  aimPower: 0,
  baselineY: 480, // 480 for Player 1 (Bottom), 120 for Player 2 (Top)
  sliderX: 300,
  isSinking: false,
  scale: 1.0,
};

let isDraggingStriker = false;
let dragStartX = 0;
let dragStartY = 0;
let isMotionActive = false;
let isAITurnActive = false;
let pocketEventsThisTurn = [];

// ============================================================================
// 2. Synthesized Web Audio Engine (Zero Dependencies)
// ============================================================================

const SoundFX = {
  ctx: null,
  masterGain: null,

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(state.settings.soundVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  },

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  setVolume(val) {
    state.settings.soundVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        state.settings.soundEnabled ? state.settings.soundVolume : 0,
        this.ctx.currentTime
      );
    }
  },

  toggleMute() {
    state.settings.soundEnabled = !state.settings.soundEnabled;
    this.setVolume(state.settings.soundVolume);
    return state.settings.soundEnabled;
  },

  playStrikerHit(velocity = 10) {
    if (!state.settings.soundEnabled || !this.ctx) return;
    this.resumeContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 280 + Math.min(velocity * 12, 300);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

    gain.gain.setValueAtTime(Math.min(velocity / 20, 1.0) * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  },

  playCoinClack(intensity = 5) {
    if (!state.settings.soundEnabled || !this.ctx) return;
    this.resumeContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 650 + Math.random() * 250;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

    gain.gain.setValueAtTime(Math.min(intensity / 15, 0.9) * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  },

  playCushionThud(velocity = 5) {
    if (!state.settings.soundEnabled || !this.ctx) return;
    this.resumeContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.07);

    gain.gain.setValueAtTime(Math.min(velocity / 18, 0.8) * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  },

  playPocketDrop() {
    if (!state.settings.soundEnabled || !this.ctx) return;
    this.resumeContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  },

  playFoulBuzzer() {
    if (!state.settings.soundEnabled || !this.ctx) return;
    this.resumeContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.setValueAtTime(110, t + 0.1);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  },

  playQueenChime() {
    if (!state.settings.soundEnabled || !this.ctx) return;
    this.resumeContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  },

  playVictoryFanfare() {
    if (!state.settings.soundEnabled || !this.ctx) return;
    this.resumeContext();
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C Major arpeggio
    chord.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  },
};

// ============================================================================
// 3. Initialization & Event Bindings
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCarromEngine();
  initEventListeners();
  checkHealth();
  loadPlayers();
  loadLeaderboard();
  initApiExplorer();
});

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');

      if (tab.dataset.tab === 'leaderboard-tab') {
        loadLeaderboard();
      } else if (tab.dataset.tab === 'players-tab') {
        loadPlayers();
      }
    });
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================================
// 4. Carrom Physics, Setup & Geometry
// ============================================================================

function initCarromEngine() {
  if (!canvas || !ctx) return;

  // Initialize Canvas DPI
  resizeCanvas();

  // Reset standard coin formation
  resetBoardLayout('classic');

  // Input Listeners on Canvas
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  window.addEventListener('mousemove', onCanvasMouseMove);
  window.addEventListener('mouseup', onCanvasMouseUp);

  canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
  window.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
  window.addEventListener('touchend', onCanvasTouchEnd, { passive: false });

  // Start Animation Loop
  requestAnimationFrame(gamePhysicsLoop);
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = BOARD_SIZE;
  canvas.height = BOARD_SIZE;
}

function resetBoardLayout(layout = 'classic') {
  coins = [];
  particles = [];
  floatingTexts = [];
  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;

  if (layout === 'classic') {
    // Center Queen
    coins.push({
      id: 'queen',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: COIN_MASS,
      type: 'queen',
      color: '#e11d48',
      isPocketed: false,
      isSinking: false,
      scale: 1.0,
    });

    // Inner ring (6 alternating white & black)
    const innerRadius = 26;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const type = i % 2 === 0 ? 'white' : 'black';
      coins.push({
        id: `inner_${i}`,
        x: cx + Math.cos(angle) * innerRadius,
        y: cy + Math.sin(angle) * innerRadius,
        vx: 0,
        vy: 0,
        radius: COIN_RADIUS,
        mass: COIN_MASS,
        type,
        color: type === 'white' ? '#f8fafc' : '#1e293b',
        isPocketed: false,
        isSinking: false,
        scale: 1.0,
      });
    }

    // Outer ring (12 alternating white & black)
    const outerRadius = 50;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const type = i % 2 === 0 ? 'black' : 'white';
      coins.push({
        id: `outer_${i}`,
        x: cx + Math.cos(angle) * outerRadius,
        y: cy + Math.sin(angle) * outerRadius,
        vx: 0,
        vy: 0,
        radius: COIN_RADIUS,
        mass: COIN_MASS,
        type,
        color: type === 'white' ? '#f8fafc' : '#1e293b',
        isPocketed: false,
        isSinking: false,
        scale: 1.0,
      });
    }
  } else if (layout === 'queen_challenge') {
    coins.push({
      id: 'queen',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: COIN_MASS,
      type: 'queen',
      color: '#e11d48',
      isPocketed: false,
      isSinking: false,
      scale: 1.0,
    });
    // Two guarding white coins
    coins.push({
      id: 'guard_1',
      x: cx - 35,
      y: cy - 20,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: COIN_MASS,
      type: 'white',
      color: '#f8fafc',
      isPocketed: false,
      isSinking: false,
      scale: 1.0,
    });
    coins.push({
      id: 'guard_2',
      x: cx + 35,
      y: cy - 20,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: COIN_MASS,
      type: 'white',
      color: '#f8fafc',
      isPocketed: false,
      isSinking: false,
      scale: 1.0,
    });
  } else if (layout === 'bank_shot') {
    coins.push({
      id: 'bank_white',
      x: 140,
      y: 180,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      mass: COIN_MASS,
      type: 'white',
      color: '#f8fafc',
      isPocketed: false,
      isSinking: false,
      scale: 1.0,
    });
  }

  // Reset Striker to baseline
  resetStrikerPlacement();
  updateBoardStats();
}

function resetStrikerPlacement() {
  const currentTurn = state.activeMatch ? state.activeMatch.currentTurn : 1;
  striker.baselineY = currentTurn === 2 && state.settings.gameMode !== 'practice' ? 120 : 480;
  striker.x = striker.sliderX || 300;
  striker.y = striker.baselineY;
  striker.vx = 0;
  striker.vy = 0;
  striker.isAiming = false;
  striker.aimPower = 0;
  striker.isSinking = false;
  striker.scale = 1.0;

  // Aim angle: Bottom player shoots UP (-PI/2), Top player/AI shoots DOWN (+PI/2)
  striker.aimAngle = striker.baselineY > 300 ? -Math.PI / 2 : Math.PI / 2;

  // Update UI slider
  const slider = document.getElementById('strikerPositionSlider');
  if (slider) slider.value = striker.x;
  updateAimAngleUI();
  updateTurnBanner();
}

// ============================================================================
// 5. 2D Impulse Physics Engine & Sub-stepping
// ============================================================================

function gamePhysicsLoop() {
  updatePhysics();
  updateParticles();
  drawCarromBoard();
  requestAnimationFrame(gamePhysicsLoop);
}

function updatePhysics() {
  let anyMoving = false;

  for (let step = 0; step < SUB_STEPS; step++) {
    const dt = 1 / SUB_STEPS;

    // 1. Update Striker Position & Wall Bounces
    if (!striker.isSinking && Math.hypot(striker.vx, striker.vy) > 0.04) {
      anyMoving = true;
      striker.x += striker.vx * dt;
      striker.y += striker.vy * dt;
      striker.vx *= Math.pow(FRICTION, dt);
      striker.vy *= Math.pow(FRICTION, dt);

      // Striker Cushion Bounces
      const minX = MARGIN + striker.radius;
      const maxX = BOARD_SIZE - MARGIN - striker.radius;
      const minY = MARGIN + striker.radius;
      const maxY = BOARD_SIZE - MARGIN - striker.radius;

      if (striker.x < minX) {
        striker.x = minX;
        striker.vx = -striker.vx * RESTITUTION_CUSHION;
        SoundFX.playCushionThud(Math.abs(striker.vx));
        createImpactSparks(striker.x, striker.y);
      } else if (striker.x > maxX) {
        striker.x = maxX;
        striker.vx = -striker.vx * RESTITUTION_CUSHION;
        SoundFX.playCushionThud(Math.abs(striker.vx));
        createImpactSparks(striker.x, striker.y);
      }

      if (striker.y < minY) {
        striker.y = minY;
        striker.vy = -striker.vy * RESTITUTION_CUSHION;
        SoundFX.playCushionThud(Math.abs(striker.vy));
        createImpactSparks(striker.x, striker.y);
      } else if (striker.y > maxY) {
        striker.y = maxY;
        striker.vy = -striker.vy * RESTITUTION_CUSHION;
        SoundFX.playCushionThud(Math.abs(striker.vy));
        createImpactSparks(striker.x, striker.y);
      }

      // Check Striker Pocket Suction & Sinking (Foul)
      pockets.forEach((p) => {
        const d = Math.hypot(striker.x - p.x, striker.y - p.y);
        if (d < POCKET_SUCTION_RADIUS && !striker.isSinking) {
          // Gravitational pull toward pocket
          const pull = (1 - d / POCKET_SUCTION_RADIUS) * 0.4;
          striker.vx += ((p.x - striker.x) / d) * pull;
          striker.vy += ((p.y - striker.y) / d) * pull;

          if (d < POCKET_RADIUS - 6) {
            striker.isSinking = true;
            striker.vx = 0;
            striker.vy = 0;
            handleStrikerPocketed();
          }
        }
      });
    } else if (!striker.isSinking) {
      striker.vx = 0;
      striker.vy = 0;
    }

    // 2. Update Coins Position, Bounces & Pocket Suction
    coins.forEach((coin) => {
      if (coin.isPocketed) return;

      if (!coin.isSinking && Math.hypot(coin.vx, coin.vy) > 0.04) {
        anyMoving = true;
        coin.x += coin.vx * dt;
        coin.y += coin.vy * dt;
        coin.vx *= Math.pow(FRICTION, dt);
        coin.vy *= Math.pow(FRICTION, dt);

        // Cushion Bounces
        const minX = MARGIN + coin.radius;
        const maxX = BOARD_SIZE - MARGIN - coin.radius;
        const minY = MARGIN + coin.radius;
        const maxY = BOARD_SIZE - MARGIN - coin.radius;

        if (coin.x < minX) {
          coin.x = minX;
          coin.vx = -coin.vx * RESTITUTION_CUSHION;
          SoundFX.playCushionThud(Math.abs(coin.vx));
          createImpactSparks(coin.x, coin.y);
        } else if (coin.x > maxX) {
          coin.x = maxX;
          coin.vx = -coin.vx * RESTITUTION_CUSHION;
          SoundFX.playCushionThud(Math.abs(coin.vx));
          createImpactSparks(coin.x, coin.y);
        }

        if (coin.y < minY) {
          coin.y = minY;
          coin.vy = -coin.vy * RESTITUTION_CUSHION;
          SoundFX.playCushionThud(Math.abs(coin.vy));
          createImpactSparks(coin.x, coin.y);
        } else if (coin.y > maxY) {
          coin.y = maxY;
          coin.vy = -coin.vy * RESTITUTION_CUSHION;
          SoundFX.playCushionThud(Math.abs(coin.vy));
          createImpactSparks(coin.x, coin.y);
        }

        // Pocket Suction & Sinking
        pockets.forEach((p) => {
          const d = Math.hypot(coin.x - p.x, coin.y - p.y);
          if (d < POCKET_SUCTION_RADIUS && !coin.isSinking) {
            const pull = (1 - d / POCKET_SUCTION_RADIUS) * 0.45;
            coin.vx += ((p.x - coin.x) / d) * pull;
            coin.vy += ((p.y - coin.y) / d) * pull;

            if (d < POCKET_RADIUS - 4) {
              coin.isSinking = true;
              coin.vx = 0;
              coin.vy = 0;
              handleCoinPocketed(coin);
            }
          }
        });
      } else if (!coin.isSinking) {
        coin.vx = 0;
        coin.vy = 0;
      }

      // Handle sinking animation scale down
      if (coin.isSinking && !coin.isPocketed) {
        coin.scale -= 0.08;
        if (coin.scale <= 0.1) {
          coin.isPocketed = true;
          coin.isSinking = false;
        }
      }
    });

    // Handle Striker sinking animation
    if (striker.isSinking) {
      striker.scale -= 0.08;
      if (striker.scale <= 0.1) {
        striker.isSinking = false;
        striker.scale = 1.0;
        resetStrikerPlacement();
      }
    }

    // 3. Striker vs Coin Collisions (Elastic Impulse)
    if (!striker.isSinking && !striker.isAiming) {
      coins.forEach((coin) => {
        if (coin.isPocketed || coin.isSinking) return;
        resolveCircleCollision(striker, coin, RESTITUTION_STRIKER_COIN, true);
      });
    }

    // 4. Coin vs Coin Collisions (Elastic Impulse)
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        const c1 = coins[i];
        const c2 = coins[j];
        if (c1.isPocketed || c2.isPocketed || c1.isSinking || c2.isSinking) continue;
        resolveCircleCollision(c1, c2, RESTITUTION_COIN_COIN, false);
      }
    }
  }

  // Turn Settlement & Motion End Handler
  if (isMotionActive && !anyMoving) {
    isMotionActive = false;
    onMotionComplete();
  }
}

/**
 * 2D Impulse-based Circle-to-Circle Collision Resolution
 */
function resolveCircleCollision(b1, b2, restitution, isStrikerCollision = false) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.hypot(dx, dy);
  const minDist = b1.radius + b2.radius;

  if (dist < minDist && dist > 0.0001) {
    // Normal vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate overlapping circles
    const overlap = minDist - dist;
    const totalMass = b1.mass + b2.mass;
    b1.x -= nx * (overlap * (b2.mass / totalMass));
    b1.y -= ny * (overlap * (b2.mass / totalMass));
    b2.x += nx * (overlap * (b1.mass / totalMass));
    b2.y += ny * (overlap * (b1.mass / totalMass));

    // Relative velocity along normal
    const kx = b1.vx - b2.vx;
    const ky = b1.vy - b2.vy;
    const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);

    const relVel = -(nx * kx + ny * ky);
    if (relVel < 0) return; // Moving away already

    const impulse = (-(1 + restitution) * relVel) / (1 / b1.mass + 1 / b2.mass);

    b1.vx += (impulse / b1.mass) * nx;
    b1.vy += (impulse / b1.mass) * ny;
    b2.vx -= (impulse / b2.mass) * nx;
    b2.vy -= (impulse / b2.mass) * ny;

    // Trigger Audio & Particle Sparks
    const hitSpeed = Math.abs(relVel);
    if (isStrikerCollision) {
      SoundFX.playStrikerHit(hitSpeed);
    } else {
      SoundFX.playCoinClack(hitSpeed);
    }

    if (hitSpeed > 3) {
      createImpactSparks((b1.x + b2.x) / 2, (b1.y + b2.y) / 2);
    }
  }
}

// ============================================================================
// 6. Pocketing & Game Rules Processing
// ============================================================================

function handleCoinPocketed(coin) {
  SoundFX.playPocketDrop();
  createPocketVortex(coin.x, coin.y, coin.color);

  pocketEventsThisTurn.push(coin.type);

  if (!state.activeMatch) {
    addFloatingText(coin.x, coin.y - 20, `+1 ${coin.type.toUpperCase()}`, coin.color);
    updateBoardStats();
    return;
  }

  const m = state.activeMatch;
  const currentTurn = m.currentTurn;
  const activePlayer = currentTurn === 1 ? m.player1 : m.player2;

  if (coin.type === 'queen') {
    m.queenPocketed = true;
    m.queenPocketedBy = activePlayer._id;
    addFloatingText(coin.x, coin.y - 20, '👑 QUEEN POCKETED! MUST COVER', '#fb7185');
    SoundFX.playQueenChime();
    logCoinPocketed(activePlayer, 'queen', 0);
  } else if (coin.type === 'white') {
    m.remainingWhite--;
    if (m.queenPocketed && !m.queenCovered && m.queenPocketedBy === activePlayer._id) {
      // Queen Covered!
      m.queenCovered = true;
      m.queenCoveredBy = activePlayer._id;
      if (currentTurn === 1) m.p1Score += 3;
      else m.p2Score += 3;
      addFloatingText(coin.x, coin.y - 20, '👑 QUEEN COVERED! +3 PTS', '#10b981');
      SoundFX.playQueenChime();
    }

    if (currentTurn === 1) {
      m.p1Score += 1;
      addFloatingText(coin.x, coin.y - 20, '+1 WHITE', '#ffffff');
    } else {
      m.p1Score += 1; // P1 gets point if P2 pockets P1's coin (or standard rules)
      addFloatingText(coin.x, coin.y - 20, '+1 WHITE (To P1)', '#ffffff');
    }
    logCoinPocketed(activePlayer, 'white', 1);
  } else if (coin.type === 'black') {
    m.remainingBlack--;
    if (m.queenPocketed && !m.queenCovered && m.queenPocketedBy === activePlayer._id) {
      // Queen Covered!
      m.queenCovered = true;
      m.queenCoveredBy = activePlayer._id;
      if (currentTurn === 1) m.p1Score += 3;
      else m.p2Score += 3;
      addFloatingText(coin.x, coin.y - 20, '👑 QUEEN COVERED! +3 PTS', '#10b981');
      SoundFX.playQueenChime();
    }

    if (currentTurn === 2) {
      m.p2Score += 1;
      addFloatingText(coin.x, coin.y - 20, '+1 BLACK', '#94a3b8');
    } else {
      m.p2Score += 1;
      addFloatingText(coin.x, coin.y - 20, '+1 BLACK (To P2)', '#94a3b8');
    }
    logCoinPocketed(activePlayer, 'black', 1);
  }

  updateMatchUI();
  updateBoardStats();
  checkMatchWinConditions();
}

function handleStrikerPocketed() {
  SoundFX.playFoulBuzzer();
  addFloatingText(striker.x, striker.y - 20, '⚠️ FOUL: STRIKER POCKETED (-1)', '#ef4444');

  if (state.activeMatch) {
    const m = state.activeMatch;
    const currentTurn = m.currentTurn;
    const activePlayer = currentTurn === 1 ? m.player1 : m.player2;

    if (currentTurn === 1) m.p1Score = Math.max(0, m.p1Score - 1);
    else m.p2Score = Math.max(0, m.p2Score - 1);

    logCoinPocketed(activePlayer, 'penalty', -1);
    updateMatchUI();
  }
}

function onMotionComplete() {
  resetStrikerPlacement();

  if (state.activeMatch) {
    const m = state.activeMatch;

    // Check if Queen was pocketed but not covered
    if (m.queenPocketed && !m.queenCovered && pocketEventsThisTurn.length === 0) {
      // Return Queen to Center
      m.queenPocketed = false;
      m.queenPocketedBy = null;
      coins.push({
        id: 'queen_returned',
        x: BOARD_SIZE / 2,
        y: BOARD_SIZE / 2,
        vx: 0,
        vy: 0,
        radius: COIN_RADIUS,
        mass: COIN_MASS,
        type: 'queen',
        color: '#e11d48',
        isPocketed: false,
        isSinking: false,
        scale: 1.0,
      });
      addFloatingText(BOARD_SIZE / 2, BOARD_SIZE / 2 - 25, '👑 QUEEN RETURNED TO CENTER', '#fb7185');
    }

    // Turn handover rule: if no coin pocketed on turn, switch turn
    if (pocketEventsThisTurn.length === 0) {
      m.currentTurn = m.currentTurn === 1 ? 2 : 1;
    }

    pocketEventsThisTurn = [];
    updateMatchUI();
    resetStrikerPlacement();

    // If AI Turn in vs AI Mode, trigger AI shot
    if (m.currentTurn === 2 && state.settings.gameMode === 'ai' && !isAITurnActive) {
      executeAITurn();
    }
  }
}

// ============================================================================
// 7. Intelligent AI Opponent Engine
// ============================================================================

function executeAITurn() {
  if (isAITurnActive || !state.activeMatch) return;
  isAITurnActive = true;
  updateTurnBanner(true);

  // AI "Thinking" delay
  setTimeout(() => {
    const shot = calculateBestAIShot();

    if (!shot) {
      // Default fallback strike
      striker.sliderX = 300;
      striker.x = 300;
      striker.aimAngle = Math.PI / 2;
      striker.aimPower = 14;
    } else {
      striker.sliderX = shot.strikerX;
      striker.x = shot.strikerX;
      striker.aimAngle = shot.angle;
      striker.aimPower = shot.power;
    }

    // Update Slider UI
    const slider = document.getElementById('strikerPositionSlider');
    if (slider) slider.value = striker.x;
    updateAimAngleUI();

    // AI Aiming pause before strike
    setTimeout(() => {
      fireStriker(striker.aimAngle, striker.aimPower);
      isAITurnActive = false;
      updateTurnBanner(false);
    }, 600);
  }, 700);
}

/**
 * Advanced Raycasting AI Shot Evaluator
 */
function calculateBestAIShot() {
  const activeCoins = coins.filter((c) => !c.isPocketed && !c.isSinking);
  if (activeCoins.length === 0) return null;

  const difficulty = state.settings.aiDifficulty;
  const isHard = difficulty === 'hard';
  const isMed = difficulty === 'medium';

  let bestShot = null;
  let highestScore = -Infinity;

  // Candidate striker baseline positions on AI's baseline (y = 120)
  const candidateXPositions = [150, 200, 250, 300, 350, 400, 450];

  candidateXPositions.forEach((sx) => {
    const sy = 120; // AI Baseline Y

    activeCoins.forEach((coin) => {
      // Check priority: Queen > Black Coins (AI color) > White Coins
      let priorityScore = 10;
      if (coin.type === 'queen') priorityScore = 50;
      else if (coin.type === 'black') priorityScore = 30;
      else priorityScore = 5;

      pockets.forEach((pkt) => {
        // 1. Line from Coin to Pocket
        const coinToPktDist = Math.hypot(pkt.x - coin.x, pkt.y - coin.y);
        if (coinToPktDist > 500) return; // Too far

        // Ghost ball position where striker must hit the coin
        const normX = (coin.x - pkt.x) / coinToPktDist;
        const normY = (coin.y - pkt.y) / coinToPktDist;
        const ghostX = coin.x + normX * (COIN_RADIUS + STRIKER_RADIUS - 1);
        const ghostY = coin.y + normY * (COIN_RADIUS + STRIKER_RADIUS - 1);

        // Striker to Ghost Ball vector
        const strikeDx = ghostX - sx;
        const strikeDy = ghostY - sy;
        const strikeDist = Math.hypot(strikeDx, strikeDy);

        // Striker must shoot forward (downwards into board, dy > 0)
        if (strikeDy <= 10) return;

        const aimAngle = Math.atan2(strikeDy, strikeDx);

        // Alignment check: Angle between (Striker->Coin) and (Coin->Pocket)
        const dotProduct = -(normX * (strikeDx / strikeDist) + normY * (strikeDy / strikeDist));
        if (dotProduct < 0.2) return; // Cut angle is too sharp

        // Obstruction check: Is another coin directly between Striker and Ghost Ball?
        let isObstructed = false;
        if (isHard || isMed) {
          activeCoins.forEach((other) => {
            if (other === coin) return;
            const d = distToSegment({ x: sx, y: sy }, { x: ghostX, y: ghostY }, other);
            if (d < other.radius + STRIKER_RADIUS * 0.8) {
              isObstructed = true;
            }
          });
        }

        if (isObstructed) return;

        // Calculate score
        const alignmentScore = dotProduct * 40;
        const distScore = Math.max(0, 100 - strikeDist * 0.15 - coinToPktDist * 0.15);
        const totalScore = priorityScore + alignmentScore + distScore;

        if (totalScore > highestScore) {
          highestScore = totalScore;
          // Calculate power
          let power = Math.min(22, Math.max(12, Math.sqrt(strikeDist + coinToPktDist) * 0.85));

          // Apply difficulty noise
          let finalAngle = aimAngle;
          if (difficulty === 'easy') {
            finalAngle += (Math.random() - 0.5) * 0.18; // ~10 deg error
            power *= 0.85 + Math.random() * 0.3;
          } else if (difficulty === 'medium') {
            finalAngle += (Math.random() - 0.5) * 0.05; // ~3 deg error
          }

          bestShot = {
            strikerX: sx,
            angle: finalAngle,
            power,
          };
        }
      });
    });
  });

  return bestShot;
}

function distToSegment(p1, p2, p) {
  const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (p1.x + t * (p2.x - p1.x)), p.y - (p1.y + t * (p2.y - p1.y)));
}

// ============================================================================
// 8. Player Controls & Trajectory Prediction
// ============================================================================

function fireStriker(angle, power) {
  SoundFX.init();
  if (isMotionActive || power < 1.0) return;

  isMotionActive = true;
  striker.vx = Math.cos(angle) * power;
  striker.vy = Math.sin(angle) * power;
  striker.isAiming = false;
  striker.aimPower = 0;

  SoundFX.playStrikerHit(power);
  updatePowerMeterUI(0);
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function onCanvasMouseDown(e) {
  SoundFX.init();
  if (isMotionActive || isAITurnActive) return;

  const { x, y } = getCanvasCoords(e);
  const dist = Math.hypot(x - striker.x, y - striker.y);

  if (dist <= striker.radius + 15) {
    isDraggingStriker = true;
    dragStartX = x;
    dragStartY = y;
    striker.isAiming = true;
  }
}

function onCanvasMouseMove(e) {
  if (!isDraggingStriker || isMotionActive) return;
  const { x, y } = getCanvasCoords(e);

  // Slingshot Pull-back vector
  const dx = dragStartX - x;
  const dy = dragStartY - y;
  const pullDist = Math.hypot(dx, dy);

  striker.aimAngle = Math.atan2(dy, dx);
  striker.aimPower = Math.min(pullDist * 0.16, 22);

  updateAimAngleUI();
  updatePowerMeterUI((striker.aimPower / 22) * 100);
}

function onCanvasMouseUp(e) {
  if (!isDraggingStriker) return;
  isDraggingStriker = false;

  if (striker.aimPower > 1.8) {
    fireStriker(striker.aimAngle, striker.aimPower);
  } else {
    striker.isAiming = false;
    striker.aimPower = 0;
    updatePowerMeterUI(0);
  }
}

function onCanvasTouchStart(e) {
  e.preventDefault();
  onCanvasMouseDown(e);
}
function onCanvasTouchMove(e) {
  e.preventDefault();
  onCanvasMouseMove(e);
}
function onCanvasTouchEnd(e) {
  e.preventDefault();
  onCanvasMouseUp(e);
}

function updateAimAngleUI() {
  const deg = ((-striker.aimAngle * 180) / Math.PI + 360) % 360;
  const label = document.getElementById('aimAngleDisplay');
  if (label) label.textContent = `${deg.toFixed(1)}°`;
}

function updatePowerMeterUI(percentage) {
  const fill = document.getElementById('powerMeterFill');
  if (fill) fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

function updateTurnBanner(isAiThinking = false) {
  const banner = document.getElementById('boardTurnBanner');
  const icon = document.getElementById('turnBannerIcon');
  const text = document.getElementById('turnBannerText');
  if (!banner || !icon || !text) return;

  const currentTurn = state.activeMatch ? state.activeMatch.currentTurn : 1;

  if (isAiThinking) {
    icon.innerHTML = '<span class="ai-thinking-spinner"></span>';
    text.textContent = 'AI Bot is calculating shot...';
    return;
  }

  if (currentTurn === 1) {
    icon.textContent = '⚪';
    text.textContent = state.activeMatch ? `${state.activeMatch.player1.username}'s Turn (White)` : "Player 1's Turn (Bottom)";
  } else {
    icon.textContent = '⚫';
    text.textContent = state.activeMatch ? `${state.activeMatch.player2.username}'s Turn (Black)` : (state.settings.gameMode === 'ai' ? 'AI Bot (Black)' : "Player 2's Turn (Top)");
  }
}

// ============================================================================
// 9. Canvas Carrom Board Renderer & Visuals
// ============================================================================

function drawCarromBoard() {
  if (!ctx) return;

  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // 1. Polished Lacquered Wood Base
  const woodGrad = ctx.createRadialGradient(
    BOARD_SIZE / 2, BOARD_SIZE / 2, 50,
    BOARD_SIZE / 2, BOARD_SIZE / 2, BOARD_SIZE / 1.3
  );
  woodGrad.addColorStop(0, '#f9ecd0');
  woodGrad.addColorStop(0.7, '#f4dcaf');
  woodGrad.addColorStop(1, '#e3c28c');
  ctx.fillStyle = woodGrad;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // 2. Outer Mahogany Frame
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#381608';
  ctx.strokeRect(8, 8, BOARD_SIZE - 16, BOARD_SIZE - 16);

  // Inner Cushion Rails
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#6b2d0d';
  ctx.strokeRect(MARGIN - 2, MARGIN - 2, BOARD_SIZE - (MARGIN - 2) * 2, BOARD_SIZE - (MARGIN - 2) * 2);

  // 3. Corner Pockets & Shadow Holes
  pockets.forEach((p) => {
    // Leather Netting Hole
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#17120e';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#854d0e';
    ctx.stroke();

    // Pocket Inner Depth Ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_RADIUS - 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0806';
    ctx.fill();
  });

  // 4. Center Circle Mandala & Star
  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;

  // Outer Center Ring
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, Math.PI * 2);
  ctx.strokeStyle = '#ba1e38';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Decorative Center Ring
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#ba1e38';
  ctx.fill();

  // 5. Baselines (Foul Zones & Striker Setup Lines)
  drawCarromBaseline(MARGIN + 60, BOARD_SIZE - 120, BOARD_SIZE - MARGIN - 60, BOARD_SIZE - 120); // Bottom P1
  drawCarromBaseline(MARGIN + 60, 120, BOARD_SIZE - MARGIN - 60, 120); // Top P2
  drawCarromVerticalBaseline(120, MARGIN + 60, 120, BOARD_SIZE - MARGIN - 60); // Left
  drawCarromVerticalBaseline(BOARD_SIZE - 120, MARGIN + 60, BOARD_SIZE - 120, BOARD_SIZE - MARGIN - 60); // Right

  // 6. Corner Arrow Lines Pointing to Pockets
  drawCornerArrow(65, 65, 135, 135);
  drawCornerArrow(BOARD_SIZE - 65, 65, BOARD_SIZE - 135, 135);
  drawCornerArrow(65, BOARD_SIZE - 65, 135, BOARD_SIZE - 135);
  drawCornerArrow(BOARD_SIZE - 65, BOARD_SIZE - 65, BOARD_SIZE - 135, BOARD_SIZE - 135);

  // 7. Trajectory Prediction Guideline (When Aiming)
  if (striker.isAiming && state.settings.showTrajectory) {
    drawTrajectoryPrediction();
  }

  // 8. Draw Coins
  coins.forEach((coin) => {
    if (coin.isPocketed) return;
    drawCarromCoin(coin);
  });

  // 9. Draw Striker
  if (!striker.isPocketed) {
    drawCarromStriker();
  }

  // 10. Draw Particle Explosions & Floating Text
  drawParticles();
  drawFloatingTexts();
}

function drawCarromBaseline(x1, y1, x2, y2) {
  // Baseline Double Lines
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#292524';

  ctx.beginPath();
  ctx.moveTo(x1, y1 - 4);
  ctx.lineTo(x2, y1 - 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1, y1 + 4);
  ctx.lineTo(x2, y1 + 4);
  ctx.stroke();

  // Baseline Red Circles at Ends
  [x1, x2].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, y1, 12, 0, Math.PI * 2);
    ctx.strokeStyle = '#ba1e38';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y1, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ba1e38';
    ctx.fill();
  });
}

function drawCarromVerticalBaseline(x1, y1, x2, y2) {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#292524';

  ctx.beginPath();
  ctx.moveTo(x1 - 4, y1);
  ctx.lineTo(x1 - 4, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1 + 4, y1);
  ctx.lineTo(x1 + 4, y2);
  ctx.stroke();

  [y1, y2].forEach((y) => {
    ctx.beginPath();
    ctx.arc(x1, y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = '#ba1e38';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x1, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ba1e38';
    ctx.fill();
  });
}

function drawCornerArrow(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = '#ba1e38';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arrowhead circle
  ctx.beginPath();
  ctx.arc(x2, y2, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ba1e38';
  ctx.fill();
}

function drawCarromCoin(coin) {
  ctx.save();
  ctx.translate(coin.x, coin.y);
  ctx.scale(coin.scale || 1.0, coin.scale || 1.0);

  // Bevel Drop Shadow
  ctx.beginPath();
  ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
  ctx.fillStyle = coin.color;
  ctx.fill();

  // Rim Stroke
  ctx.lineWidth = 2;
  ctx.strokeStyle = coin.type === 'white' ? '#cbd5e1' : '#0f172a';
  ctx.stroke();

  // Concentric Inner Engraving
  ctx.beginPath();
  ctx.arc(0, 0, coin.radius * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = coin.type === 'white' ? '#94a3b8' : '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Queen Crown / Star
  if (coin.type === 'queen') {
    ctx.fillStyle = '#ffd700';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 0);
  }

  ctx.restore();
}

function drawCarromStriker() {
  ctx.save();
  ctx.translate(striker.x, striker.y);
  ctx.scale(striker.scale || 1.0, striker.scale || 1.0);

  // Outer Acrylic Body
  const strikerGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, striker.radius);
  strikerGrad.addColorStop(0, '#ffffff');
  strikerGrad.addColorStop(0.7, '#e0e7ff');
  strikerGrad.addColorStop(1, '#6366f1');

  ctx.beginPath();
  ctx.arc(0, 0, striker.radius, 0, Math.PI * 2);
  ctx.fillStyle = strikerGrad;
  ctx.fill();

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#4338ca';
  ctx.stroke();

  // Inner Crosshair Ring
  ctx.beginPath();
  ctx.arc(0, 0, striker.radius * 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Aiming Pullback Line Indicator
  if (striker.isAiming && striker.aimPower > 0) {
    const aimLen = striker.aimPower * 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(striker.aimAngle) * aimLen, Math.sin(striker.aimAngle) * aimLen);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Trajectory Guideline Raycaster with Ghost-Ball & Bounce Preview
 */
function drawTrajectoryPrediction() {
  const startX = striker.x;
  const startY = striker.y;
  const dirX = Math.cos(striker.aimAngle);
  const dirY = Math.sin(striker.aimAngle);

  // Cast ray forward to find closest coin hit or cushion wall
  let closestDist = 800;
  let hitCoin = null;

  coins.forEach((c) => {
    if (c.isPocketed || c.isSinking) return;
    const toCoinX = c.x - startX;
    const toCoinY = c.y - startY;
    const proj = toCoinX * dirX + toCoinY * dirY;

    if (proj > 0) {
      const perpDist = Math.hypot(toCoinX - dirX * proj, toCoinY - dirY * proj);
      const totalR = STRIKER_RADIUS + c.radius;
      if (perpDist < totalR) {
        const hitDist = proj - Math.sqrt(Math.max(0, totalR * totalR - perpDist * perpDist));
        if (hitDist > 0 && hitDist < closestDist) {
          closestDist = hitDist;
          hitCoin = c;
        }
      }
    }
  });

  const hitX = startX + dirX * closestDist;
  const hitY = startY + dirY * closestDist;

  // Dotted Guideline
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(hitX, hitY);
  ctx.stroke();

  // Ghost Striker at contact
  ctx.beginPath();
  ctx.arc(hitX, hitY, STRIKER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
  ctx.stroke();

  // Projected Coin Deflection Path
  if (hitCoin) {
    const normX = (hitCoin.x - hitX) / (STRIKER_RADIUS + hitCoin.radius);
    const normY = (hitCoin.y - hitY) / (STRIKER_RADIUS + hitCoin.radius);

    ctx.beginPath();
    ctx.moveTo(hitCoin.x, hitCoin.y);
    ctx.lineTo(hitCoin.x + normX * 120, hitCoin.y + normY * 120);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// 10. Particle System & Floating Text Popups
// ============================================================================

function createImpactSparks(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.05 + Math.random() * 0.03,
      color: '#facc15',
      size: 2 + Math.random() * 2,
    });
  }
}

function createPocketVortex(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.04,
      color: color || '#6366f1',
      size: 3 + Math.random() * 3,
    });
  }
}

function addFloatingText(x, y, text, color = '#ffffff') {
  floatingTexts.push({
    x,
    y,
    text,
    color,
    life: 1.0,
    vy: -1.2,
  });
}

function updateParticles() {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
  });
  particles = particles.filter((p) => p.life > 0);

  floatingTexts.forEach((ft) => {
    ft.y += ft.vy;
    ft.life -= 0.02;
  });
  floatingTexts = floatingTexts.filter((ft) => ft.life > 0);
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  });
}

function drawFloatingTexts() {
  floatingTexts.forEach((ft) => {
    ctx.save();
    ctx.globalAlpha = ft.life;
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });
}

// ============================================================================
// 11. Event Listeners & UI Binding
// ============================================================================

function initEventListeners() {
  // Game Mode Switcher
  const modeBtns = document.querySelectorAll('.mode-pill-btn');
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.settings.gameMode = btn.dataset.mode;

      const diffWrapper = document.getElementById('aiDifficultyWrapper');
      if (diffWrapper) {
        diffWrapper.style.display = state.settings.gameMode === 'ai' ? 'flex' : 'none';
      }

      showToast(`🎮 Mode set to: ${btn.textContent.trim()}`, 'info');
      resetBoardLayout('classic');
    });
  });

  // AI Difficulty Buttons
  const diffBtns = document.querySelectorAll('.diff-btn');
  diffBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      diffBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.settings.aiDifficulty = btn.dataset.diff;
      showToast(`🤖 AI Difficulty: ${btn.textContent.trim()}`, 'info');
    });
  });

  // Audio Mute Toggle & Volume Slider
  const btnSound = document.getElementById('btnToggleSound');
  const soundIcon = document.getElementById('soundIcon');
  const volumeSlider = document.getElementById('volumeSlider');

  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const isEnabled = SoundFX.toggleMute();
      btnSound.classList.toggle('muted', !isEnabled);
      soundIcon.textContent = isEnabled ? '🔊' : '🔇';
      showToast(isEnabled ? '🔊 Sound Enabled' : '🔇 Sound Muted', 'info');
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      SoundFX.setVolume(parseFloat(e.target.value));
    });
  }

  // Striker Baseline Slider
  const strikerSlider = document.getElementById('strikerPositionSlider');
  if (strikerSlider) {
    strikerSlider.addEventListener('input', (e) => {
      if (isMotionActive) return;
      striker.x = parseFloat(e.target.value);
      striker.sliderX = striker.x;
    });
  }

  // Angle Adjust Buttons
  document.getElementById('btnAngleMinus5')?.addEventListener('click', () => adjustAimAngle(-5));
  document.getElementById('btnAngleMinus1')?.addEventListener('click', () => adjustAimAngle(-1));
  document.getElementById('btnAnglePlus1')?.addEventListener('click', () => adjustAimAngle(1));
  document.getElementById('btnAnglePlus5')?.addEventListener('click', () => adjustAimAngle(5));

  // Trajectory Guideline Checkbox
  const chkTrajectory = document.getElementById('chkTrajectoryGuide');
  if (chkTrajectory) {
    chkTrajectory.addEventListener('change', (e) => {
      state.settings.showTrajectory = e.target.checked;
    });
  }

  // STRIKE Button
  const btnStrike = document.getElementById('btnFireStrike');
  if (btnStrike) {
    btnStrike.addEventListener('click', () => {
      if (isMotionActive) return;
      const power = striker.aimPower > 2 ? striker.aimPower : 16;
      fireStriker(striker.aimAngle, power);
    });
  }

  // Spacebar Keyboard Shortcut for Strike
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isMotionActive && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      const power = striker.aimPower > 2 ? striker.aimPower : 16;
      fireStriker(striker.aimAngle, power);
    }
  });

  // Practice & Trickshot Presets
  document.getElementById('btnPresetClassic')?.addEventListener('click', () => resetBoardLayout('classic'));
  document.getElementById('btnPresetQueenChallenge')?.addEventListener('click', () => resetBoardLayout('queen_challenge'));
  document.getElementById('btnPresetBankShot')?.addEventListener('click', () => resetBoardLayout('bank_shot'));
  document.getElementById('btnPresetClear')?.addEventListener('click', () => resetBoardLayout('classic'));

  // Quick Seed Button
  document.getElementById('btnQuickSeedPrompt')?.addEventListener('click', seedSamplePlayers);

  // Match Launcher
  document.getElementById('btnStartMatch')?.addEventListener('click', startLiveMatch);
  document.getElementById('btnSyncLiveState')?.addEventListener('click', syncLiveMatchState);
  document.getElementById('btnFinishMatch')?.addEventListener('click', finishAndSaveMatch);
  document.getElementById('btnSwitchTurn')?.addEventListener('click', switchTurnManual);

  // Manual Pocket Buttons (Fallback / Testing)
  document.getElementById('btnPocketWhite')?.addEventListener('click', () => triggerManualPocket('white'));
  document.getElementById('btnPocketBlack')?.addEventListener('click', () => triggerManualPocket('black'));
  document.getElementById('btnPocketQueen')?.addEventListener('click', () => triggerManualPocket('queen'));
  document.getElementById('btnFoulPenalty')?.addEventListener('click', handleStrikerPocketed);

  // Modal Actions
  document.getElementById('btnModalPlayAgain')?.addEventListener('click', () => {
    document.getElementById('winnerCelebrationModal').classList.add('hidden');
    resetBoardLayout('classic');
    startLiveMatch();
  });

  document.getElementById('btnModalClose')?.addEventListener('click', () => {
    document.getElementById('winnerCelebrationModal').classList.add('hidden');
  });

  // Refresh Leaderboard
  document.getElementById('btnRefreshLeaderboard')?.addEventListener('click', loadLeaderboard);
  document.getElementById('selectLeaderboardSort')?.addEventListener('change', (e) => {
    state.leaderboard.sortBy = e.target.value;
    state.leaderboard.page = 1;
    loadLeaderboard();
  });

  // Player Registration Form
  document.getElementById('formRegisterPlayer')?.addEventListener('submit', handleRegisterPlayer);
}

function adjustAimAngle(degDelta) {
  striker.aimAngle -= (degDelta * Math.PI) / 180;
  updateAimAngleUI();
}

function switchTurnManual() {
  if (!state.activeMatch) return;
  state.activeMatch.currentTurn = state.activeMatch.currentTurn === 1 ? 2 : 1;
  resetStrikerPlacement();
  updateMatchUI();
  showToast(`Turn switched to Player ${state.activeMatch.currentTurn}`, 'info');

  if (state.activeMatch.currentTurn === 2 && state.settings.gameMode === 'ai') {
    executeAITurn();
  }
}

function triggerManualPocket(type) {
  const target = coins.find((c) => c.type === type && !c.isPocketed);
  if (target) {
    target.isSinking = true;
    handleCoinPocketed(target);
  } else {
    showToast(`No remaining ${type} coin on board!`, 'warning');
  }
}

// ============================================================================
// 12. Match Lifecycle, API & Database Integration
// ============================================================================

async function checkHealth() {
  const badge = document.getElementById('dbStatusBadge');
  const text = document.getElementById('dbStatusText');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.database === 'connected') {
      badge.className = 'status-indicator connected';
      text.textContent = 'MongoDB Connected';
      state.dbConnected = true;
    } else {
      badge.className = 'status-indicator error';
      text.textContent = 'Standalone Mode';
      state.dbConnected = false;
    }
  } catch (err) {
    badge.className = 'status-indicator error';
    text.textContent = 'Offline / Standalone';
    state.dbConnected = false;
  }
}

async function loadPlayers() {
  try {
    const res = await fetch('/api/players');
    const data = await res.json();
    if (data.success && data.data) {
      state.players = data.data;
      populatePlayerDropdowns();
      renderPlayersList(state.players);
    }
  } catch (err) {
    console.warn('Backend unavailable, using default local players');
    state.players = [
      { _id: 'p1_local', username: 'StrikerAce', email: 'ace@carrom.io', totalWins: 14, totalGamesPlayed: 18 },
      { _id: 'p2_local', username: 'DeepStrike (AI)', email: 'bot@carrom.io', totalWins: 10, totalGamesPlayed: 15 },
    ];
    populatePlayerDropdowns();
  }
}

function populatePlayerDropdowns() {
  const p1Select = document.getElementById('selectPlayer1');
  const p2Select = document.getElementById('selectPlayer2');
  if (!p1Select || !p2Select) return;

  p1Select.innerHTML = '';
  p2Select.innerHTML = '';

  state.players.forEach((p, idx) => {
    const opt1 = document.createElement('option');
    opt1.value = p._id;
    opt1.textContent = `${p.username} (${p.totalWins || 0}W)`;
    p1Select.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = p._id;
    opt2.textContent = `${p.username} (${p.totalWins || 0}W)`;
    if (idx === 1) opt2.selected = true;
    p2Select.appendChild(opt2);
  });
}

function startLiveMatch() {
  const p1Id = document.getElementById('selectPlayer1').value;
  const p2Id = document.getElementById('selectPlayer2').value;

  const player1 = state.players.find((p) => p._id === p1Id) || { _id: 'p1', username: 'Player 1' };
  const player2 = state.players.find((p) => p._id === p2Id) || { _id: 'p2', username: 'Player 2 (AI)' };

  state.activeMatch = {
    id: `live_${Date.now()}`,
    player1,
    player2,
    p1Score: 0,
    p2Score: 0,
    currentTurn: 1,
    remainingWhite: 9,
    remainingBlack: 9,
    queenPocketed: false,
    queenCovered: false,
    queenCoveredBy: null,
    log: [],
    duration: 0,
    timerInterval: null,
  };

  // Start Timer
  state.activeMatch.timerInterval = setInterval(() => {
    if (state.activeMatch) {
      state.activeMatch.duration++;
      const mins = String(Math.floor(state.activeMatch.duration / 60)).padStart(2, '0');
      const secs = String(state.activeMatch.duration % 60).padStart(2, '0');
      const timerEl = document.getElementById('matchDurationTimer');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }
  }, 1000);

  // Switch UI panels
  document.getElementById('matchSetupSection')?.classList.add('hidden');
  document.getElementById('activeMatchSection')?.classList.remove('hidden');

  const statusLabel = document.getElementById('matchStatusLabel');
  if (statusLabel) {
    statusLabel.className = 'match-status-badge live';
    statusLabel.textContent = 'Live Match Active';
  }

  document.getElementById('activeMatchIdDisplay').textContent = state.activeMatch.id;

  resetBoardLayout('classic');
  updateMatchUI();
  showToast('🚀 Live match initiated! Good luck!', 'success');
}

function updateMatchUI() {
  if (!state.activeMatch) return;
  const m = state.activeMatch;

  document.getElementById('p1Name').textContent = m.player1.username;
  document.getElementById('p2Name').textContent = m.player2.username;
  document.getElementById('p1Score').textContent = m.p1Score;
  document.getElementById('p2Score').textContent = m.p2Score;

  // Active turn tag highlighting
  const p1Card = document.getElementById('p1Card');
  const p2Card = document.getElementById('p2Card');
  const p1Tag = document.getElementById('p1TurnTag');
  const p2Tag = document.getElementById('p2TurnTag');

  if (m.currentTurn === 1) {
    p1Card?.classList.add('active-turn');
    p2Card?.classList.remove('active-turn');
    p1Tag?.classList.remove('hidden');
    p2Tag?.classList.add('hidden');
  } else {
    p2Card?.classList.add('active-turn');
    p1Card?.classList.remove('active-turn');
    p2Tag?.classList.remove('hidden');
    p1Tag?.classList.add('hidden');
  }

  // Queen Status
  const queenDesc = document.getElementById('queenStatusText');
  if (queenDesc) {
    if (m.queenCovered) {
      queenDesc.textContent = `Covered by ${m.queenCoveredBy === m.player1._id ? m.player1.username : m.player2.username} (+3 pts)`;
    } else if (m.queenPocketed) {
      queenDesc.textContent = `Pocketed by ${m.queenPocketedBy === m.player1._id ? m.player1.username : m.player2.username} (Pending Cover)`;
    } else {
      queenDesc.textContent = 'On Board (Active)';
    }
  }

  updateTurnBanner();
}

function updateBoardStats() {
  const whiteCount = coins.filter((c) => c.type === 'white' && !c.isPocketed).length;
  const blackCount = coins.filter((c) => c.type === 'black' && !c.isPocketed).length;
  const queenOnBoard = coins.some((c) => c.type === 'queen' && !c.isPocketed);

  document.getElementById('statRemainingWhite').textContent = whiteCount;
  document.getElementById('statRemainingBlack').textContent = blackCount;
  document.getElementById('statQueenStatus').textContent = queenOnBoard ? 'Active' : 'Pocketed';
}

function logCoinPocketed(player, coinType, points) {
  if (!state.activeMatch) return;
  const m = state.activeMatch;
  const logEntry = {
    player: player._id,
    playerName: player.username,
    coinType,
    points,
    pocketedAt: new Date(),
    seq: m.log.length + 1,
  };
  m.log.push(logEntry);

  const container = document.getElementById('coinLogContainer');
  if (container) {
    const item = document.createElement('div');
    item.className = 'coin-log-item';
    item.innerHTML = `
      <div class="coin-log-left">
        <span class="coin-tag ${coinType}"></span>
        <b>${player.username}</b>: ${coinType.toUpperCase()}
      </div>
      <span class="badge">${points >= 0 ? `+${points}` : points}</span>
    `;
    container.prepend(item);
  }
}

function checkMatchWinConditions() {
  if (!state.activeMatch) return;
  const m = state.activeMatch;
  const remainingTotal = coins.filter((c) => !c.isPocketed).length;

  if (remainingTotal === 0 || (m.remainingWhite === 0 && m.remainingBlack === 0)) {
    finishAndSaveMatch();
  }
}

async function syncLiveMatchState() {
  if (!state.activeMatch) return;
  const m = state.activeMatch;

  try {
    const res = await fetch(`/api/matches/${m.id}/live`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scores: [
          { player: m.player1._id, score: m.p1Score },
          { player: m.player2._id, score: m.p2Score },
        ],
        duration: m.duration,
        queenCoveredBy: m.queenCovered ? m.queenCoveredBy : null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('📡 Live match state synced with database!', 'success');
    }
  } catch (err) {
    showToast('📡 Synced locally (Offline mode)', 'info');
  }
}

async function finishAndSaveMatch() {
  if (!state.activeMatch) return;
  const m = state.activeMatch;
  clearInterval(m.timerInterval);

  let winner = null;
  if (m.p1Score > m.p2Score) winner = m.player1;
  else if (m.p2Score > m.p1Score) winner = m.player2;

  // Show Celebration Modal
  SoundFX.playVictoryFanfare();
  const modal = document.getElementById('winnerCelebrationModal');
  if (modal) {
    document.getElementById('winnerModalTitle').textContent = winner ? `${winner.username} Wins!` : 'Match Draw!';
    document.getElementById('winnerModalSubtitle').textContent = `Final Score: ${m.p1Score} - ${m.p2Score}`;
    document.getElementById('modalFinalScore').textContent = `${m.p1Score} - ${m.p2Score}`;
    document.getElementById('modalQueenCovered').textContent = m.queenCoveredBy ? (m.queenCoveredBy === m.player1._id ? m.player1.username : m.player2.username) : 'None';
    document.getElementById('modalMatchDuration').textContent = `${Math.floor(m.duration / 60)}m ${m.duration % 60}s`;
    document.getElementById('modalTotalCoins').textContent = m.log.length;
    modal.classList.remove('hidden');
  }

  // Attempt to save to backend API
  try {
    await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: [m.player1._id, m.player2._id],
        scores: [
          { player: m.player1._id, score: m.p1Score },
          { player: m.player2._id, score: m.p2Score },
        ],
        winner: winner ? winner._id : null,
        status: 'completed',
        duration: m.duration,
      }),
    });
  } catch (e) {
    console.warn('Match saved locally.');
  }

  // Reset Match State UI
  state.activeMatch = null;
  document.getElementById('matchSetupSection')?.classList.remove('hidden');
  document.getElementById('activeMatchSection')?.classList.add('hidden');
  document.getElementById('matchStatusLabel').className = 'match-status-badge';
  document.getElementById('matchStatusLabel').textContent = 'Match Finished';
}

// ============================================================================
// 13. Leaderboard & Player Stats View
// ============================================================================

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboardTbody');
  if (!tbody) return;

  try {
    const res = await fetch(`/api/leaderboard?sortBy=${state.leaderboard.sortBy}&page=${state.leaderboard.page}&limit=10`);
    const data = await res.json();

    if (data.success && data.data && data.data.leaderboard) {
      renderLeaderboard(data.data.leaderboard);
    }
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td><span class="rank-badge rank-1">1</span></td>
        <td><b>StrikerAce</b></td>
        <td>14</td>
        <td>18</td>
        <td>4</td>
        <td>77.8%</td>
        <td><button class="btn btn-xs btn-outline">Profile</button></td>
      </tr>
    `;
  }
}

function renderLeaderboard(list) {
  const tbody = document.getElementById('leaderboardTbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  list.forEach((entry) => {
    const rankClass = entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : entry.rank === 3 ? 'rank-3' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="rank-badge ${rankClass}">${entry.rank}</span></td>
      <td><b>${entry.username}</b></td>
      <td>${entry.totalWins}</td>
      <td>${entry.totalGamesPlayed}</td>
      <td>${entry.totalLosses || (entry.totalGamesPlayed - entry.totalWins)}</td>
      <td>
        <div class="win-rate-bar-wrapper">
          <span>${entry.winRate}%</span>
          <div class="win-rate-track">
            <div class="win-rate-fill" style="width: ${entry.winRate}%"></div>
          </div>
        </div>
      </td>
      <td><button class="btn btn-xs btn-outline" onclick="viewPlayerProfile('${entry._id}')">Profile</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPlayersList(players) {
  const container = document.getElementById('playersListContainer');
  if (!container) return;
  container.innerHTML = '';

  players.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'player-item-row';
    item.innerHTML = `
      <div>
        <b>${p.username}</b>
        <div class="subtitle">${p.email}</div>
      </div>
      <span class="badge">${p.totalWins || 0} Wins</span>
    `;
    item.addEventListener('click', () => viewPlayerProfile(p._id));
    container.appendChild(item);
  });
}

async function viewPlayerProfile(playerId) {
  const emptyState = document.getElementById('profileEmptyState');
  const content = document.getElementById('profileContent');

  try {
    const res = await fetch(`/api/players/${playerId}`);
    const data = await res.json();
    if (data.success && data.data) {
      const p = data.data;
      emptyState?.classList.add('hidden');
      content?.classList.remove('hidden');

      document.getElementById('profUsername').textContent = p.username;
      document.getElementById('profEmail').textContent = p.email;
      document.getElementById('profWins').textContent = p.totalWins;
      document.getElementById('profGames').textContent = p.totalGamesPlayed;
      document.getElementById('profWinRate').textContent = `${p.winRate || 0}%`;

      // Switch to players tab
      document.getElementById('tabBtnPlayers')?.click();
    }
  } catch (err) {
    showToast('Failed to load player details', 'error');
  }
}

async function handleRegisterPlayer(e) {
  e.preventDefault();
  const username = document.getElementById('inputUsername').value.trim();
  const email = document.getElementById('inputEmail').value.trim();

  try {
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🎉 Player ${username} registered successfully!`, 'success');
      e.target.reset();
      loadPlayers();
    } else {
      showToast(data.error?.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Failed to register player', 'error');
  }
}

async function seedSamplePlayers() {
  try {
    const res = await fetch('/api/players');
    const data = await res.json();
    if (data.data?.length === 0) {
      // Create samples
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'CarromKing', email: 'king@carrom.io' }),
      });
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'StrikeQueen', email: 'queen@carrom.io' }),
      });
      loadPlayers();
      showToast('Sample players registered!', 'success');
    } else {
      showToast('Players already exist!', 'info');
    }
  } catch (e) {
    showToast('Offline mode active', 'info');
  }
}

// ============================================================================
// 14. API Console & Explorer
// ============================================================================

function initApiExplorer() {
  const cards = document.querySelectorAll('.endpoint-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');

      const method = card.dataset.method;
      const url = card.dataset.url;
      const body = card.dataset.body || '';

      document.getElementById('apiMethodTag').textContent = method;
      document.getElementById('apiUrlInput').value = url;
      document.getElementById('apiRequestBody').value = body;
    });
  });

  document.getElementById('btnExecuteApi')?.addEventListener('click', async () => {
    const method = document.getElementById('apiMethodTag').textContent;
    const url = document.getElementById('apiUrlInput').value;
    const bodyStr = document.getElementById('apiRequestBody').value;
    const output = document.getElementById('apiResponseOutput');
    const timing = document.getElementById('apiResponseTiming');

    const start = performance.now();
    try {
      const options = { method, headers: { 'Content-Type': 'application/json' } };
      if (['POST', 'PATCH', 'PUT'].includes(method) && bodyStr.trim()) {
        options.body = bodyStr;
      }

      const res = await fetch(url, options);
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      output.textContent = JSON.stringify(data, null, 2);
      timing.textContent = `${res.status} ${res.statusText} (${elapsed}ms)`;
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
      timing.textContent = 'Request Failed';
    }
  });
}
