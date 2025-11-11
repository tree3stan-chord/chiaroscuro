/**
 * DrawModeSynth - Generates ethereal tones from drawing on the vortex
 * Maps interaction position and velocity to pleasing harmonic tones
 */

class DrawModeSynth {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.activeVoices = [];

    // Output chain
    this.reverb = this.createReverb();
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 1;

    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 0.4;

    // Routing
    this.filter.connect(this.reverb);
    this.reverb.connect(this.outputGain);
  }

  createReverb() {
    const convolver = this.ctx.createConvolver();

    // Create simple reverb impulse response
    const length = this.ctx.sampleRate * 2;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (this.ctx.sampleRate * 0.5));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }

    convolver.buffer = impulse;
    return convolver;
  }

  // Create tone from interaction
  drawTone(x, y, velocity, normalizedX, normalizedY) {
    // Map position to frequency (pentatonic scale for pleasantness)
    const pentatonic = [1, 1.125, 1.25, 1.5, 1.6875]; // Intervals
    const baseFreq = 220; // A3

    const scaleIndex = Math.floor(normalizedX * pentatonic.length);
    const octave = Math.floor(normalizedY * 3); // 3 octaves range
    const freq = baseFreq * pentatonic[scaleIndex] * Math.pow(2, octave);

    // Create voice
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.01; // Slight detune for shimmer

    const envelope = this.ctx.createGain();
    envelope.gain.value = 0;

    osc1.connect(envelope);
    osc2.connect(envelope);
    envelope.connect(this.filter);

    const now = this.ctx.currentTime;
    const duration = 0.3 + velocity * 1.0; // Longer for faster drags
    const volume = 0.3 + velocity * 0.4;

    // Attack
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(volume, now + 0.02);
    // Release
    envelope.gain.linearRampToValueAtTime(0, now + duration);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);

    // Track for cleanup
    this.activeVoices.push({ osc1, osc2, envelope, endTime: now + duration });

    // Clean up old voices
    this.activeVoices = this.activeVoices.filter(v => v.endTime > now);

    // Modulate filter based on velocity
    this.filter.frequency.setTargetAtTime(
      500 + velocity * 3000,
      now,
      0.1
    );
  }

  connect(destination) {
    this.outputGain.connect(destination);
  }

  disconnect() {
    this.outputGain.disconnect();
    this.activeVoices.forEach(v => {
      try {
        v.osc1.stop();
        v.osc2.stop();
      } catch(e) {}
    });
    this.activeVoices = [];
  }
}

export default DrawModeSynth;
