/**
 * BandProcessor - Per-band audio processing and grain synthesis
 * Each instance handles one frequency band:
 * - Bandpass filtering to isolate the frequency range
 * - Circular buffer to capture band audio
 * - Independent grain synthesis with time-stretch
 */

class BandProcessor {
  constructor(audioContext, bandInfo, bandIndex) {
    this.ctx = audioContext;
    this.bandInfo = bandInfo; // { min, max, color, name }
    this.bandIndex = bandIndex;

    // Bandpass filter for this frequency range
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = (bandInfo.min + bandInfo.max) / 2; // Center frequency
    this.filter.Q.value = 1.0; // Moderate Q for good selectivity without ringing

    // Gain node for this band's synthesis output
    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 0; // Start silent

    // Circular buffer for this band's audio (2 seconds)
    this.bufferSize = this.ctx.sampleRate * 2;
    this.audioBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    // ScriptProcessor to capture filtered audio
    // Note: ScriptProcessor is deprecated but widely supported
    // Future: migrate to AudioWorklet
    this.scriptNode = this.ctx.createScriptProcessor(4096, 1, 1);
    this.scriptNode.onaudioprocess = (e) => this.captureAudio(e);

    // Grain synthesis parameters
    this.isGenerating = false;
    this.grainSize = 0.15; // 150ms grains (shorter than global for punchier partials)
    this.timeStretchFactor = 1.0; // 1x = normal, 4x = extreme stretch
    this.grainTimeout = null;

    console.log(`BandProcessor ${bandIndex} created: ${bandInfo.name} (${bandInfo.min}-${bandInfo.max}Hz)`);
  }

  /**
   * Connect this processor to the audio chain
   * @param {AudioNode} sourceNode - Input source (e.g., mic gain node)
   * @param {AudioNode} destinationNode - Output destination (e.g., master gain)
   */
  connect(sourceNode, destinationNode) {
    // Chain: source → filter → scriptNode → (capture audio)
    sourceNode.connect(this.filter);
    this.filter.connect(this.scriptNode);

    // ScriptProcessor needs to be connected to destination to process
    // (even though we're only using it for capture)
    this.scriptNode.connect(this.ctx.destination);

    // Synthesis output: outputGain → destination
    this.outputGain.connect(destinationNode);

    console.log(`BandProcessor ${this.bandIndex} connected to audio chain`);
  }

  /**
   * Capture filtered audio into circular buffer
   */
  captureAudio(event) {
    const inputData = event.inputBuffer.getChannelData(0);

    for (let i = 0; i < inputData.length; i++) {
      this.audioBuffer[this.writeIndex] = inputData[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
  }

  /**
   * Start generating grains from this band's buffer
   * @param {number} timeStretchFactor - Time stretch amount (1-4)
   */
  startGrainSynthesis(timeStretchFactor = 1.0) {
    if (this.isGenerating) {
      // Already generating, just update stretch factor
      this.timeStretchFactor = Math.max(1, Math.min(8, timeStretchFactor));
      return;
    }

    this.isGenerating = true;
    this.timeStretchFactor = Math.max(1, Math.min(8, timeStretchFactor));

    // PHASE 4: Reduced gain for headroom when multiple bands play
    // Fade in output gain
    const now = this.ctx.currentTime;
    this.outputGain.gain.cancelScheduledValues(now);
    this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, now);
    this.outputGain.gain.linearRampToValueAtTime(0.12, now + 0.05); // Fade in over 50ms (reduced from 0.2)

    console.log(`Band ${this.bandIndex} grain synthesis START (stretch: ${timeStretchFactor.toFixed(2)}x)`);

    this.generateGrain();
  }

  /**
   * Generate a single grain and schedule the next one
   */
  generateGrain() {
    if (!this.isGenerating) return;

    const grainDuration = this.grainSize;
    const grainSamples = Math.floor(grainDuration * this.ctx.sampleRate);

    // Create buffer for this grain
    const grainBuffer = this.ctx.createBuffer(
      1,
      grainSamples,
      this.ctx.sampleRate
    );

    const grainData = grainBuffer.getChannelData(0);

    // Read from circular buffer (recent audio from this frequency band)
    let readIndex = (this.writeIndex - grainSamples + this.bufferSize) % this.bufferSize;

    for (let i = 0; i < grainSamples; i++) {
      // Apply Hann window for smooth grain edges
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / grainSamples));
      grainData[i] = this.audioBuffer[readIndex] * windowValue;
      readIndex = (readIndex + 1) % this.bufferSize;
    }

    // Create buffer source
    const source = this.ctx.createBufferSource();
    source.buffer = grainBuffer;

    // No pitch shift for per-band synthesis (preserve frequency character)
    // The paulstretch effect comes from time-stretch alone

    // Connect: source → outputGain (already connected to destination)
    source.connect(this.outputGain);

    // Play grain
    const now = this.ctx.currentTime;
    source.start(now);
    source.stop(now + grainDuration);

    // Schedule next grain based on time stretch
    // Higher stretch = slower grain rate = more overlap = more ethereal
    const nextGrainDelay = (grainDuration / this.timeStretchFactor) * 1000;

    this.grainTimeout = setTimeout(() => this.generateGrain(), nextGrainDelay);
  }

  /**
   * Update time-stretch factor in real-time
   * @param {number} factor - New time-stretch factor (1-8)
   */
  updateTimeStretch(factor) {
    this.timeStretchFactor = Math.max(1, Math.min(8, factor));
  }

  /**
   * Stop grain synthesis with fade-out
   */
  stopGrainSynthesis() {
    if (!this.isGenerating) return;

    this.isGenerating = false;

    // Clear scheduled grain
    if (this.grainTimeout) {
      clearTimeout(this.grainTimeout);
      this.grainTimeout = null;
    }

    // Fade out output gain
    const now = this.ctx.currentTime;
    this.outputGain.gain.cancelScheduledValues(now);
    this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, now);
    this.outputGain.gain.linearRampToValueAtTime(0, now + 0.2); // Fade out over 200ms

    console.log(`Band ${this.bandIndex} grain synthesis STOP`);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopGrainSynthesis();

    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }

    if (this.filter) {
      this.filter.disconnect();
    }

    if (this.outputGain) {
      this.outputGain.disconnect();
    }
  }
}

export default BandProcessor;
