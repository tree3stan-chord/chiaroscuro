/**
 * SuperSynth - Advanced polyphonic synthesizer with rich, sustained tones
 * Features multiple oscillators, proper ADSR, and effects
 */

import { NOTE_MAP } from './KeyboardSynth.js';

class SuperSynthVoice {
  constructor(ctx, noteInfo, destination) {
    this.ctx = ctx;
    this.noteInfo = noteInfo;
    this.isActive = true;

    // Create multiple oscillators for rich sound
    this.oscillators = [];
    this.gains = [];

    // Main oscillator
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = noteInfo.freq;

    // Sub oscillator (one octave down)
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = noteInfo.freq / 2;

    // Detuned oscillator for fatness
    const osc3 = ctx.createOscillator();
    osc3.type = 'sawtooth';
    osc3.frequency.value = noteInfo.freq * 1.01; // Slight detune

    // Individual gains for mixing
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();

    gain1.gain.value = 0.6;  // Main (increased)
    gain2.gain.value = 0.3;  // Sub (increased)
    gain3.gain.value = 0.4;  // Detuned (increased)

    // Filter for warmth
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 4000;
    this.filter.Q.value = 2;

    // Master envelope
    this.envelope = ctx.createGain();
    this.envelope.gain.value = 0;

    // Connect oscillators -> individual gains -> filter -> envelope -> destination
    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(this.filter);
    gain2.connect(this.filter);
    gain3.connect(this.filter);

    this.filter.connect(this.envelope);
    this.envelope.connect(destination);

    // Store references
    this.oscillators = [osc1, osc2, osc3];
    this.gains = [gain1, gain2, gain3];

    // Start oscillators
    const now = ctx.currentTime;
    this.oscillators.forEach(osc => osc.start(now));

    // ADSR Attack
    this.attackTime = 0.02;
    this.decayTime = 0.1;
    this.sustainLevel = 0.7;
    this.releaseTime = 0.5;

    // Apply attack and decay to sustain level - then HOLD at sustain!
    this.envelope.gain.setValueAtTime(0, now);
    this.envelope.gain.linearRampToValueAtTime(1.0, now + this.attackTime); // Attack to full
    this.envelope.gain.linearRampToValueAtTime(
      this.sustainLevel,
      now + this.attackTime + this.decayTime
    ); // Decay to sustain
    // Note: sustain level holds until release() is called!

    // Filter envelope for more interesting sound
    this.filter.frequency.setValueAtTime(200, now);
    this.filter.frequency.exponentialRampToValueAtTime(4000, now + this.attackTime);
    this.filter.frequency.exponentialRampToValueAtTime(2000, now + this.attackTime + this.decayTime);
  }

  modulate(params = {}) {
    const now = this.ctx.currentTime;

    // Pitch bend
    if (params.pitch !== undefined) {
      const bendRatio = Math.pow(2, params.pitch / 12);
      this.oscillators[0].frequency.setTargetAtTime(
        this.noteInfo.freq * bendRatio, now, 0.01
      );
      this.oscillators[1].frequency.setTargetAtTime(
        (this.noteInfo.freq / 2) * bendRatio, now, 0.01
      );
      this.oscillators[2].frequency.setTargetAtTime(
        (this.noteInfo.freq * 1.01) * bendRatio, now, 0.01
      );
    }

    // Filter cutoff
    if (params.filter !== undefined) {
      const cutoff = Math.max(200, Math.min(8000, params.filter));
      this.filter.frequency.setTargetAtTime(cutoff, now, 0.01);
    }

    // Volume
    if (params.volume !== undefined) {
      const targetLevel = this.sustainLevel * params.volume;
      this.envelope.gain.setTargetAtTime(targetLevel, now, 0.01);
    }
  }

  release() {
    if (!this.isActive) return;
    this.isActive = false;

    const now = this.ctx.currentTime;

    // Release envelope
    this.envelope.gain.cancelScheduledValues(now);
    this.envelope.gain.setValueAtTime(this.envelope.gain.value, now);
    this.envelope.gain.exponentialRampToValueAtTime(0.001, now + this.releaseTime);

    // Filter close during release
    this.filter.frequency.setTargetAtTime(200, now, this.releaseTime / 4);

    // Stop oscillators after release
    this.oscillators.forEach(osc => {
      osc.stop(now + this.releaseTime + 0.1);
    });
  }
}

class SuperSynth {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.activeVoices = new Map(); // key -> voice
    this.pressedKeys = new Set();

    // Create effects chain
    if (audioEngine && audioEngine.audioContext) {
      const ctx = audioEngine.audioContext;

      // Compressor for punch
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 2;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.001;
      this.compressor.release.value = 0.1;

      // Subtle chorus/delay for space
      this.delay = ctx.createDelay(0.5);
      this.delay.delayTime.value = 0.02;

      this.delayGain = ctx.createGain();
      this.delayGain.gain.value = 0.15;

      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.value = 0.3;

      // Output gain
      this.outputGain = ctx.createGain();
      this.outputGain.gain.value = 0.8; // Increased for better audibility

      // Routing: voices -> compressor -> output & delay
      this.compressor.connect(this.outputGain);
      this.compressor.connect(this.delay);

      this.delay.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delay);
      this.delay.connect(this.delayGain);

      this.delayGain.connect(this.outputGain);
      this.outputGain.connect(audioEngine.masterGainNode);
    }

    this.onNoteStart = null;
    this.onNoteEnd = null;
  }

  startNote(key, velocity = 0.8) {
    if (!this.audioEngine || !this.audioEngine.audioContext) return null;
    if (this.pressedKeys.has(key)) return null;

    const noteInfo = NOTE_MAP[key];
    if (!noteInfo) return null;

    this.pressedKeys.add(key);

    const ctx = this.audioEngine.audioContext;

    // Create voice
    const voice = new SuperSynthVoice(ctx, noteInfo, this.compressor);
    voice.velocity = velocity;

    this.activeVoices.set(key, voice);

    // Callback for visual
    let synthBlobId = null;
    if (this.onNoteStart) {
      synthBlobId = this.onNoteStart(noteInfo, key);
      voice.synthBlobId = synthBlobId;
    }

    console.log(`SuperSynth: Started ${noteInfo.note} (${noteInfo.freq}Hz)`);

    return noteInfo;
  }

  stopNote(key) {
    if (!this.pressedKeys.has(key)) return;

    this.pressedKeys.delete(key);

    const voice = this.activeVoices.get(key);
    if (!voice) return;

    // Trigger release
    voice.release();

    // Callback for visual
    if (this.onNoteEnd && voice.synthBlobId) {
      this.onNoteEnd(voice.synthBlobId, key, voice.noteInfo);
    }

    // Clean up after release
    setTimeout(() => {
      this.activeVoices.delete(key);
    }, (voice.releaseTime + 0.2) * 1000);

    console.log(`SuperSynth: Released ${voice.noteInfo.note}`);
  }

  modulateNote(key, params = {}) {
    const voice = this.activeVoices.get(key);
    if (!voice) return;

    voice.modulate(params);
  }

  // Global modulation (affects all voices)
  setGlobalFilter(cutoff) {
    this.activeVoices.forEach(voice => {
      voice.modulate({ filter: cutoff });
    });
  }

  setGlobalDetune(cents) {
    this.activeVoices.forEach(voice => {
      voice.modulate({ pitch: cents / 100 });
    });
  }

  stopAll() {
    const keys = Array.from(this.pressedKeys);
    keys.forEach(key => this.stopNote(key));
  }

  cleanup() {
    this.stopAll();
    this.activeVoices.clear();
    this.pressedKeys.clear();

    if (this.compressor) this.compressor.disconnect();
    if (this.delay) this.delay.disconnect();
    if (this.delayGain) this.delayGain.disconnect();
    if (this.delayFeedback) this.delayFeedback.disconnect();
    if (this.outputGain) this.outputGain.disconnect();
  }
}

export default SuperSynth;