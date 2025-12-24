/**
 * SimplePaulstretch - Granular time stretching
 * Creates a dense cloud of overlapping grains for smooth stretching
 */

class SimplePaulstretch {
  constructor(audioContext) {
    this.ctx = audioContext;

    // Circular buffer for capture
    this.bufferSize = this.ctx.sampleRate * 4; // 4 seconds of audio
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.bufferFilled = 0;

    // Grain parameters
    this.grainSize = 0.15; // 150ms grains - larger for smoother sound
    this.stretchFactor = 2.0;
    this.grainOverlap = 6; // More overlap = smoother, denser sound

    // Read position for time stretching
    this.readPosition = 0;

    // Playback state
    this.isPlaying = false;
    this.grains = [];
    this.nextGrainTime = 0;

    // Output - higher base volume
    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 0.8;

    // Capture setup
    this.scriptNode = null;
  }

  startCapture(inputNode) {
    if (this.scriptNode) return;

    this.scriptNode = this.ctx.createScriptProcessor(2048, 1, 1);

    this.scriptNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);

      for (let i = 0; i < input.length; i++) {
        this.buffer[this.writeIndex] = input[i];
        this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      }
      this.bufferFilled = Math.min(this.bufferFilled + input.length, this.bufferSize);

      // Silent output
      e.outputBuffer.getChannelData(0).fill(0);
    };

    inputNode.connect(this.scriptNode);
    this.scriptNode.connect(this.ctx.destination);
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    // Start reading from recent audio
    this.readPosition = Math.max(0, this.writeIndex - this.ctx.sampleRate * 0.5);
    this.nextGrainTime = this.ctx.currentTime;
    this.scheduleNextGrain();
  }

  stop() {
    this.isPlaying = false;
    this.grains.forEach(grain => {
      try { grain.source.stop(); } catch(e) {}
    });
    this.grains = [];
  }

  fadeOut(duration = 1.5) {
    const now = this.ctx.currentTime;
    this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, now);
    this.outputGain.gain.linearRampToValueAtTime(0, now + duration);

    setTimeout(() => {
      this.stop();
      this.outputGain.gain.value = 0.8;
    }, duration * 1000);
  }

  scheduleNextGrain() {
    if (!this.isPlaying) return;

    const now = this.ctx.currentTime;

    if (now >= this.nextGrainTime) {
      this.createGrain();

      // Dense grain spacing - independent of stretch factor
      // More grains per second = smoother sound
      const grainSpacing = this.grainSize / this.grainOverlap;
      this.nextGrainTime = now + grainSpacing;
    }

    setTimeout(() => this.scheduleNextGrain(), 5); // Faster polling
  }

  createGrain() {
    const grainSamples = Math.floor(this.grainSize * this.ctx.sampleRate);

    // Need enough buffer to read from
    if (this.bufferFilled < grainSamples * 2) {
      return;
    }

    // Create grain buffer
    const grainBuffer = this.ctx.createBuffer(1, grainSamples, this.ctx.sampleRate);
    const channelData = grainBuffer.getChannelData(0);

    // Calculate safe read position (stay behind write position)
    const safeDistance = this.ctx.sampleRate * 0.1; // 100ms safety margin
    const maxReadPos = (this.writeIndex - safeDistance + this.bufferSize) % this.bufferSize;

    // Add slight randomization for richer sound
    const jitter = Math.floor((Math.random() - 0.5) * this.ctx.sampleRate * 0.05);
    let readPos = (this.readPosition + jitter + this.bufferSize) % this.bufferSize;

    // Fill grain with Hann-windowed audio
    for (let i = 0; i < grainSamples; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / grainSamples));
      const idx = Math.floor(readPos + i) % this.bufferSize;
      channelData[i] = this.buffer[idx] * window;
    }

    // Create and connect nodes
    const source = this.ctx.createBufferSource();
    source.buffer = grainBuffer;

    // Higher grain volume for audible output
    const grainGain = this.ctx.createGain();
    grainGain.gain.value = 1.0 / Math.sqrt(this.grainOverlap);

    source.connect(grainGain);
    grainGain.connect(this.outputGain);

    const now = this.ctx.currentTime;
    source.start(now);

    // Track grain
    this.grains.push({ source, startTime: now });

    // Advance read position slowly based on stretch factor
    // Higher stretch = slower advancement = more time stretching
    const advancement = grainSamples / this.stretchFactor / this.grainOverlap;
    this.readPosition = (this.readPosition + advancement) % this.bufferSize;

    // Cleanup old grains
    this.grains = this.grains.filter(g => g.startTime > now - this.grainSize * 2);
  }

  setStretchFactor(factor) {
    this.stretchFactor = Math.max(1, Math.min(20, factor));
  }

  setGrainSize(size) {
    this.grainSize = Math.max(0.05, Math.min(0.5, size));
  }

  setVolume(volume) {
    this.outputGain.gain.setTargetAtTime(Math.min(1, volume), this.ctx.currentTime, 0.01);
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
