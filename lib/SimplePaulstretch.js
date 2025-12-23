/**
 * SimplePaulstretch - A simpler, working implementation of paulstretch
 * Just focuses on time stretching with smooth granular synthesis
 */

class SimplePaulstretch {
  constructor(audioContext) {
    this.ctx = audioContext;

    // Circular buffer for capture
    this.bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    // Grain parameters
    this.grainSize = 0.1; // 100ms grains
    this.stretchFactor = 1.0;
    this.grainOverlap = 2; // Number of overlapping grains

    // Playback state
    this.isPlaying = false;
    this.grains = [];
    this.nextGrainTime = 0;

    // Output
    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 0.5;

    // Capture setup
    this.scriptNode = null;
  }

  startCapture(inputNode) {
    if (this.scriptNode) return;

    // Create script processor for capture (will upgrade to AudioWorklet later)
    this.scriptNode = this.ctx.createScriptProcessor(2048, 1, 1);

    this.scriptNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);

      // Write to circular buffer
      for (let i = 0; i < input.length; i++) {
        this.buffer[this.writeIndex] = input[i];
        this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      }

      // Silent output (we generate audio separately)
      const output = e.outputBuffer.getChannelData(0);
      output.fill(0);
    };

    // Connect input to script node
    inputNode.connect(this.scriptNode);
    // Connect to destination just to keep it running
    this.scriptNode.connect(this.ctx.destination);
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    console.log('🎵 SimplePaulstretch.start() - beginning grain synthesis');
    console.log('  - stretchFactor:', this.stretchFactor);
    console.log('  - grainSize:', this.grainSize);
    this.scheduleNextGrain();
  }

  stop() {
    this.isPlaying = false;
    // Stop all active grains
    this.grains.forEach(grain => {
      if (grain.source) {
        try {
          grain.source.stop();
        } catch(e) {}
      }
    });
    this.grains = [];
  }

  fadeOut(duration = 1.5) {
    // Gradually fade out over duration seconds, then stop
    const now = this.ctx.currentTime;
    this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, now);
    this.outputGain.gain.linearRampToValueAtTime(0, now + duration);

    // Stop after fade completes
    setTimeout(() => {
      this.stop();
      // Reset gain for next time
      this.outputGain.gain.value = 0.5;
    }, duration * 1000);
  }

  scheduleNextGrain() {
    if (!this.isPlaying) return;

    const now = this.ctx.currentTime;

    // Schedule grain
    if (now >= this.nextGrainTime) {
      this.createGrain();

      // Schedule next grain based on overlap
      const grainSpacing = (this.grainSize * this.stretchFactor) / this.grainOverlap;
      this.nextGrainTime = now + grainSpacing;
    }

    // Keep scheduling
    setTimeout(() => this.scheduleNextGrain(), 10);
  }

  createGrain() {
    const grainSamples = Math.floor(this.grainSize * this.ctx.sampleRate);
    const grainBuffer = this.ctx.createBuffer(1, grainSamples, this.ctx.sampleRate);
    const channelData = grainBuffer.getChannelData(0);

    // Random position in buffer (with some history)
    const offset = Math.floor(Math.random() * this.ctx.sampleRate * 0.5); // Up to 0.5s back
    let readIndex = (this.writeIndex - grainSamples - offset + this.bufferSize) % this.bufferSize;

    // Debug: Check if buffer has data
    if (this.grains.length === 0) { // Only log for first grain
      let maxSample = 0;
      for (let i = 0; i < Math.min(1000, this.buffer.length); i++) {
        maxSample = Math.max(maxSample, Math.abs(this.buffer[i]));
      }
      console.log('🎵 Creating grain - buffer max sample:', maxSample, 'writeIndex:', this.writeIndex);
    }

    // Fill grain with Hann window
    for (let i = 0; i < grainSamples; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / grainSamples));
      const sampleIndex = Math.floor(readIndex + i / this.stretchFactor) % this.bufferSize;
      channelData[i] = this.buffer[sampleIndex] * window;
    }

    // Create source and play
    const source = this.ctx.createBufferSource();
    source.buffer = grainBuffer;

    const grainGain = this.ctx.createGain();
    grainGain.gain.value = 0.5 / Math.sqrt(this.grainOverlap); // Normalize for overlap

    source.connect(grainGain);
    grainGain.connect(this.outputGain);

    const now = this.ctx.currentTime;
    source.start(now);

    // Track grain for cleanup
    const grain = { source, gain: grainGain, startTime: now };
    this.grains.push(grain);

    // Clean up finished grains
    this.grains = this.grains.filter(g => g.startTime > now - this.grainSize * 2);
  }

  setStretchFactor(factor) {
    this.stretchFactor = Math.max(0.5, Math.min(20, factor));
  }

  setGrainSize(size) {
    this.grainSize = Math.max(0.02, Math.min(0.5, size));
  }

  setVolume(volume) {
    this.outputGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.01);
  }

  connect(destination) {
    this.outputGain.connect(destination);
  }

  disconnect() {
    this.outputGain.disconnect();
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
  }
}

export default SimplePaulstretch;