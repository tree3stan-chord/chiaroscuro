/**
 * AudioEngine - Handles all Web Audio API interactions
 * Manages microphone input, audio analysis, granular synthesis, and effects
 */

import { FREQUENCY_BANDS, frequencyToBin, calculateBandEnergy, smoothValue } from './FrequencyBands.js';
import BandProcessor from './BandProcessor.js';
import AdvancedAudioProcessor from './AdvancedAudioProcessor.js';

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.micGainNode = null;
    this.masterGainNode = null;
    this.masterCompressor = null; // PHASE 4: Prevent clipping with multiple bands
    this.reverbNode = null;
    this.dryGainNode = null;
    this.wetGainNode = null;

    // Advanced audio processor for mind-bending effects
    this.advancedProcessor = null;

    // Per-band processors for partial-paulstretch (NEW)
    this.bandProcessors = [];

    // Circular buffer for audio capture (legacy global grain synthesis)
    this.bufferSize = 48000 * 10; // 10 seconds at 48kHz
    this.audioBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    // Granular synthesis parameters (legacy global)
    this.isGenerating = false;
    this.timeStretchFactor = 1.0;
    this.pitchShift = 0;
    this.grainSize = 0.1; // 100ms

    // Audio analysis
    this.dataArray = null;
    this.frequencyData = null;

    // Multi-band analysis
    this.bandBins = []; // FFT bin ranges for each frequency band
    this.bandEnergies = new Array(FREQUENCY_BANDS.length).fill(0); // Current energy per band
    this.smoothedEnergies = new Array(FREQUENCY_BANDS.length).fill(0); // Smoothed energy per band
  }

  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create analyser for visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096; // Increased for better frequency resolution
      this.analyser.smoothingTimeConstant = 0.7;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.frequencyData = new Uint8Array(bufferLength);

      // Calculate FFT bin ranges for each frequency band
      this.initializeBandBins();

      // Create gain nodes
      this.micGainNode = this.audioContext.createGain();
      this.micGainNode.gain.value = 1.0;

      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = 0.7;

      // PHASE 4: Create compressor to prevent clipping
      this.masterCompressor = this.audioContext.createDynamicsCompressor();
      this.masterCompressor.threshold.value = -24; // Start compressing at -24dB
      this.masterCompressor.knee.value = 12; // Soft knee
      this.masterCompressor.ratio.value = 6; // 6:1 compression ratio
      this.masterCompressor.attack.value = 0.003; // 3ms attack
      this.masterCompressor.release.value = 0.15; // 150ms release

      this.dryGainNode = this.audioContext.createGain();
      this.wetGainNode = this.audioContext.createGain();

      // Create simple reverb using delay
      await this.createReverb();

      // Get microphone stream
      const stream = window.chiaroscuroMicStream;
      if (!stream) {
        throw new Error('No microphone stream available');
      }

      this.microphone = this.audioContext.createMediaStreamSource(stream);

      // Connect audio graph: mic -> gain -> analyser
      this.microphone.connect(this.micGainNode);
      this.micGainNode.connect(this.analyser);

      // Set up audio buffer capture (legacy global grain synthesis)
      this.setupBufferCapture();

      // NEW: Create and connect 24 band processors for per-band synthesis
      this.initializeBandProcessors();

      // Initialize Advanced Audio Processor for mind-bending effects
      try {
        this.advancedProcessor = new AdvancedAudioProcessor(this.audioContext);
        this.advancedProcessor.connectInput(this.micGainNode);
        this.advancedProcessor.connectOutput(this.masterGainNode);
      } catch (processorError) {
        console.error('Failed to initialize AdvancedAudioProcessor:', processorError);
        // Continue without advanced processor
        this.advancedProcessor = null;
      }

      console.log('AudioEngine initialized successfully with AdvancedAudioProcessor');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      throw error;
    }
  }

  async createReverb() {
    // Create a simple reverb using multiple delays
    // For MVP, we'll use a basic delay-based reverb
    this.reverbNode = this.audioContext.createDelay(2.0);
    this.reverbNode.delayTime.value = 0.5;

    const feedback = this.audioContext.createGain();
    feedback.gain.value = 0.4;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    this.reverbNode.connect(feedback);
    feedback.connect(filter);
    filter.connect(this.reverbNode);
    filter.connect(this.wetGainNode);

    // Set initial wet/dry mix (30% reverb)
    this.dryGainNode.gain.value = 0.7;
    this.wetGainNode.gain.value = 0.3;

    // Connect to master (PHASE 4: through compressor)
    this.dryGainNode.connect(this.masterGainNode);
    this.wetGainNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.masterCompressor);
    this.masterCompressor.connect(this.audioContext.destination);
  }

  setupBufferCapture() {
    // Use ScriptProcessorNode for MVP (will upgrade to AudioWorklet later)
    const bufferNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    bufferNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);

      // Write to circular buffer
      for (let i = 0; i < input.length; i++) {
        this.audioBuffer[this.writeIndex] = input[i];
        this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      }
    };

    this.analyser.connect(bufferNode);
    bufferNode.connect(this.audioContext.destination);
  }

  initializeBandBins() {
    if (!this.audioContext || !this.analyser) return;

    const sampleRate = this.audioContext.sampleRate;
    const fftSize = this.analyser.fftSize;

    this.bandBins = FREQUENCY_BANDS.map(band => {
      return frequencyToBin(band.min, band.max, sampleRate, fftSize);
    });

    console.log('Initialized', this.bandBins.length, 'frequency bands');
  }

  /**
   * Initialize 24 BandProcessors for per-band synthesis (NEW)
   */
  initializeBandProcessors() {
    if (!this.audioContext || !this.micGainNode || !this.masterGainNode) {
      console.error('Cannot initialize band processors: missing audio nodes');
      return;
    }

    this.bandProcessors = FREQUENCY_BANDS.map((bandInfo, index) => {
      const processor = new BandProcessor(this.audioContext, bandInfo, index);

      // Connect: micGain → processor → masterGain
      processor.connect(this.micGainNode, this.masterGainNode);

      return processor;
    });

    console.log(`Initialized ${this.bandProcessors.length} band processors for per-band synthesis`);
  }

  /**
   * Start per-band grain synthesis (NEW)
   * @param {number} bandIndex - Which frequency band (0-23)
   * @param {number} timeStretchFactor - Time stretch amount (1-8)
   */
  startBandSynthesis(bandIndex, timeStretchFactor = 1.0) {
    if (bandIndex < 0 || bandIndex >= this.bandProcessors.length) {
      console.error(`Invalid band index: ${bandIndex}`);
      return;
    }

    this.bandProcessors[bandIndex].startGrainSynthesis(timeStretchFactor);
  }

  /**
   * Update time-stretch factor for active band synthesis (NEW)
   * @param {number} bandIndex - Which frequency band (0-23)
   * @param {number} timeStretchFactor - New time stretch amount (1-8)
   */
  updateBandStretch(bandIndex, timeStretchFactor) {
    if (bandIndex < 0 || bandIndex >= this.bandProcessors.length) {
      return;
    }

    this.bandProcessors[bandIndex].updateTimeStretch(timeStretchFactor);
  }

  /**
   * Stop per-band grain synthesis (NEW)
   * @param {number} bandIndex - Which frequency band (0-23)
   */
  stopBandSynthesis(bandIndex) {
    if (bandIndex < 0 || bandIndex >= this.bandProcessors.length) {
      console.error(`Invalid band index: ${bandIndex}`);
      return;
    }

    this.bandProcessors[bandIndex].stopGrainSynthesis();
  }

  getAudioLevel() {
    if (!this.analyser) return 0;

    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / this.dataArray.length);
    return rms;
  }

  /**
   * Get energy levels for all frequency bands
   * @returns {Array<number>} Array of 24 smoothed energy values (0-1)
   */
  getBandEnergies() {
    if (!this.analyser || this.bandBins.length === 0) {
      return this.smoothedEnergies;
    }

    // Get current frequency data
    this.analyser.getByteFrequencyData(this.frequencyData);

    // Calculate energy for each band
    for (let i = 0; i < this.bandBins.length; i++) {
      const { startBin, endBin } = this.bandBins[i];
      const rawEnergy = calculateBandEnergy(this.frequencyData, startBin, endBin);

      // Normalize to 0-1 range
      this.bandEnergies[i] = rawEnergy / 255;

      // Apply smoothing to avoid jitter
      this.smoothedEnergies[i] = smoothValue(
        this.smoothedEnergies[i],
        this.bandEnergies[i],
        0.7
      );
    }

    return this.smoothedEnergies;
  }

  getDominantFrequency() {
    if (!this.analyser) return 0;

    this.analyser.getByteFrequencyData(this.frequencyData);

    // Find peak frequency
    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 0; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxValue) {
        maxValue = this.frequencyData[i];
        maxIndex = i;
      }
    }

    // Convert bin index to frequency
    const nyquist = this.audioContext.sampleRate / 2;
    const frequency = (maxIndex * nyquist) / this.frequencyData.length;

    return frequency;
  }

  startGrainSynthesis() {
    if (this.isGenerating) return;
    this.isGenerating = true;

    console.log('Starting grain synthesis');
    this.generateGrain();
  }

  stopGrainSynthesis() {
    this.isGenerating = false;
    console.log('Stopping grain synthesis');
  }

  /**
   * Trigger an explosion audio effect
   * @param {number} pitchShift - Pitch shift in semitones (-12 to +12)
   * @param {number} reverbAmount - Reverb amount (0-1)
   */
  triggerExplosion(pitchShift = 0, reverbAmount = 0.5) {
    if (!this.audioContext) return;

    const burstCount = 8; // Number of grains in the burst
    const grainDuration = 0.08; // Shorter grains for punchier effect
    const spreadTime = 0.15; // Time spread for grain burst (150ms)

    for (let i = 0; i < burstCount; i++) {
      const delay = (i / burstCount) * spreadTime;
      const pitchVariation = (Math.random() - 0.5) * 3; // ±1.5 semitones variation
      const finalPitch = pitchShift + pitchVariation;

      setTimeout(() => {
        this.playExplosionGrain(grainDuration, finalPitch, reverbAmount);
      }, delay * 1000);
    }

    // Temporarily spike reverb
    if (this.wetGainNode) {
      const originalWet = this.wetGainNode.gain.value;
      const now = this.audioContext.currentTime;

      this.wetGainNode.gain.setValueAtTime(originalWet, now);
      this.wetGainNode.gain.linearRampToValueAtTime(reverbAmount, now + 0.05);
      this.wetGainNode.gain.linearRampToValueAtTime(originalWet, now + 0.3);
    }
  }

  playExplosionGrain(duration, pitchShift, reverbAmount) {
    if (!this.audioContext) return;

    const grainSamples = Math.floor(duration * this.audioContext.sampleRate);

    // Create buffer for grain
    const grainBuffer = this.audioContext.createBuffer(
      1,
      grainSamples,
      this.audioContext.sampleRate
    );

    const grainData = grainBuffer.getChannelData(0);

    // Read from circular buffer (recent audio)
    let readIndex = (this.writeIndex - grainSamples + this.bufferSize) % this.bufferSize;

    for (let i = 0; i < grainSamples; i++) {
      // Apply Hann window
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / grainSamples));
      grainData[i] = this.audioBuffer[readIndex] * windowValue;
      readIndex = (readIndex + 1) % this.bufferSize;
    }

    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = grainBuffer;

    // Apply pitch shift
    const playbackRate = Math.pow(2, pitchShift / 12);
    source.playbackRate.value = playbackRate;

    // Create gain for this grain
    const grainGain = this.audioContext.createGain();
    grainGain.gain.value = 0.4; // Slightly quieter to avoid clipping with multiple grains

    // Connect: source -> gain -> dry/wet
    source.connect(grainGain);
    grainGain.connect(this.dryGainNode);
    grainGain.connect(this.reverbNode);

    // Play grain
    const now = this.audioContext.currentTime;
    source.start(now);
    source.stop(now + duration);
  }

  generateGrain() {
    if (!this.isGenerating) return;

    const grainDuration = this.grainSize;
    const grainSamples = Math.floor(grainDuration * this.audioContext.sampleRate);

    // Create buffer for grain
    const grainBuffer = this.audioContext.createBuffer(
      1,
      grainSamples,
      this.audioContext.sampleRate
    );

    const grainData = grainBuffer.getChannelData(0);

    // Read from circular buffer
    let readIndex = (this.writeIndex - grainSamples + this.bufferSize) % this.bufferSize;

    for (let i = 0; i < grainSamples; i++) {
      // Apply Hann window
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / grainSamples));
      grainData[i] = this.audioBuffer[readIndex] * windowValue;
      readIndex = (readIndex + 1) % this.bufferSize;
    }

    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = grainBuffer;

    // Apply pitch shift (via playback rate)
    const playbackRate = Math.pow(2, this.pitchShift / 12);
    source.playbackRate.value = playbackRate;

    // Connect to both dry and reverb
    source.connect(this.dryGainNode);
    source.connect(this.reverbNode);

    // Play grain
    const now = this.audioContext.currentTime;
    source.start(now);
    source.stop(now + grainDuration);

    // Schedule next grain based on time stretch
    const nextGrainDelay = (grainDuration / this.timeStretchFactor) * 1000;
    setTimeout(() => this.generateGrain(), nextGrainDelay);
  }

  setTimeStretch(factor) {
    this.timeStretchFactor = Math.max(0.5, Math.min(4, factor));
  }

  setPitchShift(semitones) {
    this.pitchShift = Math.max(-12, Math.min(12, semitones));
  }

  setMasterVolume(value) {
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = value;
    }
  }

  setReverbAmount(value) {
    if (this.dryGainNode && this.wetGainNode) {
      this.dryGainNode.gain.value = 1 - value;
      this.wetGainNode.gain.value = value;
    }
  }

  setInputGain(value) {
    if (this.micGainNode) {
      this.micGainNode.gain.value = value;
    }
  }

  clearAllMemoryBlobs() {
    // Future: implement memory blob clearing
    console.log('Clearing all memory blobs');
  }

  // Advanced Audio Processor Control Methods
  updateProcessorFromDrag(x, y, dx, dy, modifiers) {
    if (this.advancedProcessor) {
      this.advancedProcessor.updateFromMouseDrag(x, y, dx, dy, modifiers);
    }
  }

  updateProcessorFromFieldValue(fieldValue, x, y) {
    if (this.advancedProcessor) {
      this.advancedProcessor.updateFromFieldValue(fieldValue, x, y);
    }
  }

  applyPreset(presetNumber) {
    if (this.advancedProcessor) {
      this.advancedProcessor.applyPreset(presetNumber);
    }
  }

  getProcessorVisualizationData() {
    if (this.advancedProcessor) {
      return this.advancedProcessor.getVisualizationData();
    }
    return null;
  }

  // Get frequency data from processed output instead of input
  getProcessedBandEnergies() {
    if (this.advancedProcessor) {
      const freqData = this.advancedProcessor.getOutputFrequencyData();
      // Convert to band energies
      const bandEnergies = new Array(FREQUENCY_BANDS.length).fill(0);

      for (let i = 0; i < FREQUENCY_BANDS.length; i++) {
        const band = FREQUENCY_BANDS[i];
        const startBin = this.bandBins[i].startBin;
        const endBin = this.bandBins[i].endBin;

        let energy = 0;
        for (let bin = startBin; bin <= endBin; bin++) {
          // Convert from dB to linear energy
          const dbValue = freqData[bin];
          const linearValue = Math.pow(10, dbValue / 20);
          energy += linearValue;
        }

        // Normalize and smooth
        energy = energy / (endBin - startBin + 1);
        bandEnergies[i] = Math.min(1, energy * 10); // Scale for visibility
      }

      return bandEnergies;
    }

    // Fall back to regular band energies if processor not available
    return this.getBandEnergies();
  }

  start() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  stop() {
    this.stopGrainSynthesis();
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  cleanup() {
    this.stopGrainSynthesis();

    // Clean up advanced processor
    if (this.advancedProcessor) {
      this.advancedProcessor.stop();
    }

    // Clean up band processors (NEW)
    if (this.bandProcessors) {
      this.bandProcessors.forEach(processor => processor.cleanup());
      this.bandProcessors = [];
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    if (window.chiaroscuroMicStream) {
      window.chiaroscuroMicStream.getTracks().forEach(track => track.stop());
      delete window.chiaroscuroMicStream;
    }
  }
}

export default AudioEngine;
