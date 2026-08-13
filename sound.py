"""
sound.py
Generates simple procedural sound effects (hop, crash, splash, score-tick)
using numpy waveforms fed into pygame's mixer, so the game needs no
external .wav/.mp3 asset files. Fails silently if audio can't be
initialized (e.g. headless/CI environments) so the game still runs.

Background music: if you want music, drop an .ogg/.mp3 file next to this
script named "music.ogg" and it will be looped automatically - this is
optional and the game works fine without it.
"""
import os
import numpy as np
import pygame

MUSIC_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "music.ogg")


class SoundBank:
    def __init__(self):
        self.enabled = False
        self.sounds = {}
        try:
            pygame.mixer.init(frequency=44100, size=-16, channels=1)
            self.enabled = True
            self.sounds["hop"] = self._tone(440, 0.07, fade=True)
            self.sounds["crash"] = self._noise(0.35)
            self.sounds["splash"] = self._tone(220, 0.3, sweep_to=110)
            self.sounds["score"] = self._tone(880, 0.09, fade=True)
            self._start_music_if_available()
        except pygame.error:
            self.enabled = False

    def _to_sound(self, wave):
        """Shape a mono float wave to whatever channel count the mixer
        actually initialized with (can differ from what we requested,
        e.g. under some drivers), then build a pygame Sound from it."""
        audio = (wave * 32767 * 0.4).astype(np.int16)
        channels = pygame.mixer.get_init()[2] if pygame.mixer.get_init() else 1
        if channels >= 2:
            audio = np.column_stack([audio, audio])
        return pygame.sndarray.make_sound(np.ascontiguousarray(audio))

    def _tone(self, freq, duration, sweep_to=None, fade=False):
        rate = 44100
        n = int(rate * duration)
        t = np.linspace(0, duration, n, False)
        if sweep_to:
            freqs = np.linspace(freq, sweep_to, n)
            wave = np.sin(2 * np.pi * freqs * t)
        else:
            wave = np.sin(2 * np.pi * freq * t)
        if fade:
            wave *= np.linspace(1, 0, n)
        return self._to_sound(wave)

    def _noise(self, duration):
        rate = 44100
        n = int(rate * duration)
        wave = np.random.uniform(-1, 1, n) * np.linspace(1, 0, n)
        return self._to_sound(wave * 1.25)

    def _start_music_if_available(self):
        """Optional background music - only plays if music.ogg exists."""
        if os.path.exists(MUSIC_FILE):
            try:
                pygame.mixer.music.load(MUSIC_FILE)
                pygame.mixer.music.set_volume(0.35)
                pygame.mixer.music.play(loops=-1)
            except pygame.error:
                pass

    def play(self, name):
        if self.enabled and name in self.sounds:
            self.sounds[name].play()
