/**
 * Sound Engine using Web Audio API (Synthesized SFX & Procedural Background Music)
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgMusicTimer = null;
        this.isPlayingMusic = false;
        this.beatStep = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
        return !this.muted;
    }

    // Footstep Sound
    playFootstep() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    // Coin Pickup Chime
    playCoinSound() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.06); // E6

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    // Powerup Collect Arpeggio
    playPowerupSound() {
        if (this.muted || !this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.05 + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.05);
            osc.stop(this.ctx.currentTime + idx * 0.05 + 0.15);
        });
    }

    // Jump Whoosh
    playJumpSound() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    // Slide Rustle
    playSlideSound() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    // Crash / Defeat Heavy Impact
    playCrashSound() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    // Shield Dissipation Ring
    playShieldAbsorbSound() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    // Monster Roar Sound
    playMonsterRoar() {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(70, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(120, this.ctx.currentTime + 0.3);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.7);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.7);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.7);
    }

    // Procedural Background Drum Music Loop
    startMusic() {
        if (this.isPlayingMusic || this.muted) return;
        this.init();
        this.isPlayingMusic = true;
        this.beatStep = 0;
        
        const tempo = 135; // BPM
        const interval = (60 / tempo / 4) * 1000;

        this.bgMusicTimer = setInterval(() => {
            if (this.muted || !this.isPlayingMusic) return;
            this.playDrumStep(this.beatStep);
            this.beatStep = (this.beatStep + 1) % 16;
        }, interval);
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.bgMusicTimer) {
            clearInterval(this.bgMusicTimer);
            this.bgMusicTimer = null;
        }
    }

    playDrumStep(step) {
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        // Bass Drum on steps 0, 4, 8, 12
        if (step % 4 === 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, time);
            osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.12);
        }

        // Tribal Tom / Snare on steps 4, 12
        if (step === 4 || step === 12) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, time);
            osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);

            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.15);
        }

        // Hi-Hat Tick on odd steps
        if (step % 2 === 1) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, time);

            gain.gain.setValueAtTime(0.03, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.03);
        }
    }
}

const audioManager = new SoundEngine();
