/**
 * sound.js — GameVault Web Audio Engine
 * All sounds synthesized via Web Audio API (no external files needed)
 */

const Sound = (() => {
  let ctx = null;
  let enabled = true;
  let masterGain = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    }
    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setEnabled(val) {
    enabled = val;
    if (masterGain) masterGain.gain.value = val ? 0.4 : 0;
  }

  function isEnabled() { return enabled; }

  // ─── Primitive Sound Builders ─────────────────────────────────────────────

  function playTone(freq, type, duration, gainVal = 0.5, startDelay = 0) {
    if (!enabled) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.connect(g);
      g.connect(masterGain);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + startDelay);

      g.gain.setValueAtTime(0, c.currentTime + startDelay);
      g.gain.linearRampToValueAtTime(gainVal, c.currentTime + startDelay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);

      osc.start(c.currentTime + startDelay);
      osc.stop(c.currentTime + startDelay + duration + 0.01);
    } catch (e) { /* ignore */ }
  }

  function playNoise(duration, gainVal = 0.2, startDelay = 0) {
    if (!enabled) return;
    try {
      const c = getCtx();
      const bufferSize = c.sampleRate * duration;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const source = c.createBufferSource();
      source.buffer = buffer;

      const g = c.createGain();
      g.gain.setValueAtTime(gainVal, c.currentTime + startDelay);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);

      source.connect(g);
      g.connect(masterGain);
      source.start(c.currentTime + startDelay);
    } catch (e) { /* ignore */ }
  }

  // ─── Game Sound Effects ───────────────────────────────────────────────────

  const SFX = {
    // Dice roll — noisy rattling sound
    diceRoll() {
      playNoise(0.15, 0.3);
      playTone(200, 'sawtooth', 0.05, 0.2, 0.05);
      playNoise(0.15, 0.3, 0.1);
      playTone(150, 'sawtooth', 0.05, 0.2, 0.15);
    },

    // Token step — light tick
    tokenStep() {
      playTone(800, 'sine', 0.06, 0.15);
    },

    // Token lands — soft thud
    tokenLand() {
      playTone(300, 'triangle', 0.15, 0.3);
      playTone(150, 'sine', 0.12, 0.2, 0.05);
    },

    // Snake bite — descending chromatic
    snakeBite() {
      [600, 500, 400, 300, 200].forEach((f, i) => {
        playTone(f, 'sawtooth', 0.1, 0.3, i * 0.06);
      });
    },

    // Ladder climb — ascending arpeggio
    ladderClimb() {
      [300, 400, 500, 650, 800].forEach((f, i) => {
        playTone(f, 'triangle', 0.1, 0.4, i * 0.07);
      });
    },

    // Card flip
    cardFlip() {
      playTone(600, 'sine', 0.08, 0.2);
      playTone(900, 'sine', 0.08, 0.15, 0.05);
    },

    // Card match
    cardMatch() {
      [523, 659, 784, 1047].forEach((f, i) => {
        playTone(f, 'sine', 0.15, 0.4, i * 0.08);
      });
    },

    // Card mismatch
    cardMiss() {
      playTone(200, 'sawtooth', 0.2, 0.3);
    },

    // Button click
    click() {
      playTone(700, 'sine', 0.05, 0.3);
    },

    // Win fanfare — ascending major chord arpeggios
    win() {
      const notes = [261, 329, 392, 523, 659, 784, 1047];
      notes.forEach((f, i) => {
        playTone(f, 'sine', 0.4, 0.5, i * 0.12);
      });
      setTimeout(() => {
        [523, 659, 784, 1047].forEach((f, i) => {
          playTone(f, 'triangle', 0.6, 0.6, i * 0.08);
        });
      }, 900);
    },

    // Elimination / loss
    lose() {
      [400, 350, 300, 250].forEach((f, i) => {
        playTone(f, 'sawtooth', 0.2, 0.3, i * 0.1);
      });
    },

    // Snake eat (classic snake game)
    eat() {
      playTone(523, 'square', 0.06, 0.4);
      playTone(659, 'square', 0.06, 0.4, 0.06);
    },

    // Game over (classic snake)
    gameOver() {
      [400, 350, 300, 200, 150].forEach((f, i) => {
        playTone(f, 'sawtooth', 0.15, 0.3, i * 0.1);
      });
    },

    // 2048 tile merge
    merge() {
      playTone(440, 'sine', 0.08, 0.3);
      playTone(550, 'sine', 0.08, 0.3, 0.05);
    },

    // 2048 high tile
    highTile() {
      [440, 550, 660, 880].forEach((f, i) => {
        playTone(f, 'sine', 0.12, 0.4, i * 0.06);
      });
    },

    // Turn change
    turnChange() {
      playTone(440, 'sine', 0.1, 0.2);
      playTone(550, 'sine', 0.1, 0.2, 0.08);
    },

    // Power-up
    powerup() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        playTone(f, 'triangle', 0.12, 0.5, i * 0.06);
      });
    },

    // X or O placed in Tic-Tac-Toe
    place() {
      playTone(550, 'triangle', 0.1, 0.3);
    },

    // Tic-Tac-Toe win line
    tttWin() {
      [523, 659, 784, 1047].forEach((f, i) => {
        playTone(f, 'triangle', 0.2, 0.5, i * 0.1);
      });
    },

    // Draw
    draw() {
      playTone(300, 'sine', 0.3, 0.3);
      playTone(350, 'sine', 0.3, 0.25, 0.15);
    },
  };

  return { setEnabled, isEnabled, ...SFX };
})();
