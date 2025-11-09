/**
 * AdvancedAudioProcessor - The brain of the audio-visual feedback loop
 * Handles multi-layer paulstretch, effects, and controlled feedback routing
 */

class GranularProcessor {
  constructor(ctx, bufferSize = 4096) {
    this.ctx = ctx;
    this.bufferSize = bufferSize;
    this.grainSize = 0.15; // seconds
    this.stretchFactor = 1.0;
    this.grainOverlap = 0.5;
    this.randomization = 0.0;

    // Circular buffer for audio capture
    this.captureBuffer = new Float32Array(ctx.sampleRate * 4); // 4 seconds
    this.writeIndex = 0;
    this.isCapturing = false;

    // Grain scheduling
    this.grains = [];
    this.nextGrainTime = 0;
  }

  startCapture(sourceNode) {
    if (this.isCapturing) return;

    this.scriptProcessor = this.ctx.createScriptProcessor(this.bufferSize, 1, 1);
    this.scriptProcessor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);

      // Write to circular buffer
      for (let i = 0; i < input.length; i++) {
        this.captureBuffer[this.writeIndex] = input[i];
        this.writeIndex = (this.writeIndex + 1) % this.captureBuffer.length;
      }

      // Silent output (we generate grains separately)
      const output = e.outputBuffer.getChannelData(0);
      output.fill(0);
    };

    sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.ctx.destination);
    this.isCapturing = true;
  }

  scheduleGrain(outputNode, time) {
    const grainSamples = Math.floor(this.grainSize * this.ctx.sampleRate);
    const grainBuffer = this.ctx.createBuffer(1, grainSamples, this.ctx.sampleRate);
    const channelData = grainBuffer.getChannelData(0);

    // Random position in buffer (with some variance)
    const randomOffset = Math.random() * this.randomization * this.ctx.sampleRate;
    let readIndex = (this.writeIndex - grainSamples - randomOffset + this.captureBuffer.length) % this.captureBuffer.length;

    // Fill grain buffer with windowed audio
    for (let i = 0; i < grainSamples; i++) {
      // Hann window
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / grainSamples));
      channelData[i] = this.captureBuffer[Math.floor(readIndex) % this.captureBuffer.length] * window;
      readIndex += 1 / this.stretchFactor; // Read speed based on stretch
    }

    // Create and play grain
    const grainSource = this.ctx.createBufferSource();
    grainSource.buffer = grainBuffer;

    const grainGain = this.ctx.createGain();
    grainGain.gain.value = 0.7;

    grainSource.connect(grainGain);
    grainGain.connect(outputNode);

    grainSource.start(time);

    return grainSource;
  }

  setStretchFactor(factor) {
    this.stretchFactor = Math.max(0.1, Math.min(100, factor));
  }

  setGrainSize(size) {
    this.grainSize = Math.max(0.01, Math.min(1.0, size));
  }

  setRandomization(amount) {
    this.randomization = Math.max(0, Math.min(1, amount));
  }
}

class SpectralProcessor {
  constructor(ctx) {
    this.ctx = ctx;
    this.fftSize = 2048;

    // Phase vocoder components
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0;

    // Spectral manipulation parameters
    this.spectralShift = 0; // Frequency shift in bins
    this.spectralStretch = 1.0; // Frequency stretch factor
    this.spectralBlur = 0; // Spectral smearing
    this.harmonicEmphasis = 0; // Boost harmonics
  }

  process(inputNode, outputNode) {
    // Get frequency data
    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    const phaseData = new Float32Array(this.analyser.frequencyBinCount);

    // This would need Web Audio API extensions or AudioWorklet for real-time processing
    // For now, we'll use filters to approximate spectral effects

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = 1000 + this.spectralShift * 10;
    filter.Q.value = 1 / (1 + this.spectralBlur);
    filter.gain.value = this.harmonicEmphasis * 12;

    inputNode.connect(filter);
    filter.connect(outputNode);

    return filter;
  }
}

class FeedbackNetwork {
  constructor(ctx) {
    this.ctx = ctx;

    // Feedback loop components
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.value = 0; // Start with no feedback

    this.feedbackDelay = ctx.createDelay(2.0);
    this.feedbackDelay.delayTime.value = 0.1;

    // Safety limiter to prevent runaway feedback
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.05;

    // Feedback filters for shaping
    this.feedbackHighpass = ctx.createBiquadFilter();
    this.feedbackHighpass.type = 'highpass';
    this.feedbackHighpass.frequency.value = 100;

    this.feedbackLowpass = ctx.createBiquadFilter();
    this.feedbackLowpass.type = 'lowpass';
    this.feedbackLowpass.frequency.value = 8000;

    // Connect feedback chain
    this.feedbackGain.connect(this.feedbackDelay);
    this.feedbackDelay.connect(this.feedbackHighpass);
    this.feedbackHighpass.connect(this.feedbackLowpass);
    this.feedbackLowpass.connect(this.limiter);
  }

  setFeedbackAmount(amount) {
    // Carefully control feedback to prevent runaway
    const safeAmount = Math.max(0, Math.min(0.95, amount));
    this.feedbackGain.gain.setTargetAtTime(safeAmount, this.ctx.currentTime, 0.01);
  }

  setDelayTime(time) {
    this.feedbackDelay.delayTime.setTargetAtTime(time, this.ctx.currentTime, 0.01);
  }

  setFilterFrequencies(highpass, lowpass) {
    this.feedbackHighpass.frequency.setTargetAtTime(highpass, this.ctx.currentTime, 0.01);
    this.feedbackLowpass.frequency.setTargetAtTime(lowpass, this.ctx.currentTime, 0.01);
  }
}

class EffectsChain {
  constructor(ctx) {
    this.ctx = ctx;

    // Reverb via convolution
    this.convolver = ctx.createConvolver();
    this.convolverGain = ctx.createGain();
    this.convolverGain.gain.value = 0;
    this.createReverbImpulse();

    // Delay
    this.delay = ctx.createDelay(2.0);
    this.delay.delayTime.value = 0.25;
    this.delayGain = ctx.createGain();
    this.delayGain.gain.value = 0;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.3;

    // Distortion via waveshaper
    this.distortion = ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(0);
    this.distortionGain = ctx.createGain();
    this.distortionGain.gain.value = 0;

    // Ring modulator
    this.ringModOsc = ctx.createOscillator();
    this.ringModOsc.frequency.value = 440;
    this.ringModGain = ctx.createGain();
    this.ringModGain.gain.value = 0;
    this.ringModOsc.start();

    // Chorus (simplified via delay modulation)
    this.chorus = ctx.createDelay(0.1);
    this.chorusLFO = ctx.createOscillator();
    this.chorusLFO.frequency.value = 0.5;
    this.chorusDepth = ctx.createGain();
    this.chorusDepth.gain.value = 0.003;
    this.chorusGain = ctx.createGain();
    this.chorusGain.gain.value = 0;

    this.chorusLFO.connect(this.chorusDepth);
    this.chorusDepth.connect(this.chorus.delayTime);
    this.chorusLFO.start();

    // Setup delay feedback loop
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
  }

  createReverbImpulse() {
    const length = this.ctx.sampleRate * 3; // 3 second reverb
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponentially decaying noise
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    this.convolver.buffer = impulse;
  }

  makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    return curve;
  }

  setReverbAmount(amount) {
    this.convolverGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
  }

  setDelayParams(time, feedback, mix) {
    this.delay.delayTime.setTargetAtTime(time, this.ctx.currentTime, 0.01);
    this.delayFeedback.gain.setTargetAtTime(feedback, this.ctx.currentTime, 0.01);
    this.delayGain.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.01);
  }

  setDistortionAmount(amount) {
    this.distortion.curve = this.makeDistortionCurve(amount * 100);
    this.distortionGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
  }

  setRingModulation(frequency, amount) {
    this.ringModOsc.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.01);
    this.ringModGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.01);
  }

  setChorusParams(rate, depth, mix) {
    this.chorusLFO.frequency.setTargetAtTime(rate, this.ctx.currentTime, 0.01);
    this.chorusDepth.gain.setTargetAtTime(depth, this.ctx.currentTime, 0.01);
    this.chorusGain.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.01);
  }

  connect(input, output) {
    // Dry signal
    const dry = this.ctx.createGain();
    dry.gain.value = 0.5;
    input.connect(dry);
    dry.connect(output);

    // Reverb
    input.connect(this.convolver);
    this.convolver.connect(this.convolverGain);
    this.convolverGain.connect(output);

    // Delay
    input.connect(this.delay);
    this.delay.connect(this.delayGain);
    this.delayGain.connect(output);

    // Distortion
    input.connect(this.distortion);
    this.distortion.connect(this.distortionGain);
    this.distortionGain.connect(output);

    // Ring mod (multiply input with oscillator)
    const ringModMultiplier = this.ctx.createGain();
    ringModMultiplier.gain.value = 0;
    input.connect(ringModMultiplier.gain);
    this.ringModOsc.connect(ringModMultiplier);
    ringModMultiplier.connect(this.ringModGain);
    this.ringModGain.connect(output);

    // Chorus
    input.connect(this.chorus);
    this.chorus.connect(this.chorusGain);
    this.chorusGain.connect(output);
  }
}

class AdvancedAudioProcessor {
  constructor(audioContext) {
    this.ctx = audioContext;

    // Processing layers
    this.granularProcessors = [];
    for (let i = 0; i < 4; i++) {
      this.granularProcessors.push(new GranularProcessor(this.ctx));
    }

    this.spectralProcessor = new SpectralProcessor(this.ctx);
    this.feedbackNetwork = new FeedbackNetwork(this.ctx);
    this.effectsChain = new EffectsChain(this.ctx);

    // Mixing stages
    this.inputGain = this.ctx.createGain();
    this.inputGain.gain.value = 1.0;

    this.granularMixer = this.ctx.createGain();
    this.granularMixer.gain.value = 0.5;

    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 0.8;

    // Analysis for visualization feedback
    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 2048;

    // State
    this.isProcessing = false;
    this.currentPreset = null;

    // Visual interaction parameters (will be controlled by mouse/keyboard)
    this.visualParams = {
      stretchFactor: 1.0,
      grainSize: 0.15,
      spectralShift: 0,
      spectralBlur: 0,
      feedbackAmount: 0,
      reverbAmount: 0,
      delayTime: 0.25,
      distortionAmount: 0,
      filterCutoff: 8000,
      harmonicGeneration: 0
    };
  }

  connectInput(sourceNode) {
    sourceNode.connect(this.inputGain);

    // Start granular capture on all processors
    this.granularProcessors.forEach(proc => {
      proc.startCapture(this.inputGain);
    });

    // Connect to spectral processor
    this.inputGain.connect(this.spectralProcessor.analyser);

    // Setup main routing
    this.setupRouting();

    this.isProcessing = true;
  }

  setupRouting() {
    // Input → Effects → Granular → Feedback → Output

    // Effects processing
    this.effectsChain.connect(this.inputGain, this.granularMixer);

    // Spectral processing (simplified for now)
    const spectralFilter = this.spectralProcessor.process(this.granularMixer, this.feedbackNetwork.feedbackGain);

    // Feedback loop
    this.feedbackNetwork.limiter.connect(this.outputGain);

    // Also send some feedback back to input
    const feedbackToInput = this.ctx.createGain();
    feedbackToInput.gain.value = 0.2;
    this.feedbackNetwork.limiter.connect(feedbackToInput);
    feedbackToInput.connect(this.inputGain);

    // Output analysis for visualization
    this.outputGain.connect(this.outputAnalyser);

    // Schedule grain generation
    this.scheduleGrains();
  }

  scheduleGrains() {
    if (!this.isProcessing) return;

    const now = this.ctx.currentTime;

    // Schedule grains from each processor with different parameters
    this.granularProcessors.forEach((proc, i) => {
      // Vary parameters per layer
      const layerOffset = i * 0.25;
      proc.setStretchFactor(this.visualParams.stretchFactor * (1 + layerOffset));
      proc.setGrainSize(this.visualParams.grainSize * (1 + i * 0.1));
      proc.setRandomization(0.1 * i);

      // Schedule next grain
      if (Math.random() < 0.7) { // Probability of grain firing
        proc.scheduleGrain(this.granularMixer, now + Math.random() * 0.05);
      }
    });

    // Schedule next round
    setTimeout(() => this.scheduleGrains(), 50);
  }

  // Methods to update parameters from visual interactions
  updateFromMouseDrag(x, y, dx, dy, modifiers) {
    if (modifiers.shift && !modifiers.alt) {
      // Shift+drag: Time stretching
      this.visualParams.stretchFactor = 1 + Math.abs(dx) * 0.02;
      this.visualParams.grainSize = Math.max(0.05, 0.15 + dy * 0.001);

      // Update all granular processors
      this.granularProcessors.forEach(proc => {
        proc.setStretchFactor(this.visualParams.stretchFactor);
        proc.setGrainSize(this.visualParams.grainSize);
      });
    } else if (modifiers.alt && !modifiers.shift) {
      // Alt+drag: Harmonic generation
      this.visualParams.harmonicGeneration = Math.abs(dx) * 0.01;
      this.visualParams.spectralShift = dy;

      this.spectralProcessor.spectralShift = this.visualParams.spectralShift;
      this.spectralProcessor.harmonicEmphasis = this.visualParams.harmonicGeneration;
    } else if (modifiers.ctrl) {
      // Ctrl+drag: Spectral filtering
      this.visualParams.filterCutoff = Math.max(100, Math.min(15000, 8000 + dy * 10));
      this.feedbackNetwork.setFilterFrequencies(100, this.visualParams.filterCutoff);
    } else if (modifiers.shift && modifiers.alt) {
      // Shift+Alt+drag: Phase vocoding
      this.visualParams.spectralBlur = Math.abs(dx) * 0.01;
      this.spectralProcessor.spectralBlur = this.visualParams.spectralBlur;
    } else {
      // Normal drag: Frequency painting with feedback
      this.visualParams.feedbackAmount = Math.min(0.9, Math.abs(dx + dy) * 0.001);
      this.feedbackNetwork.setFeedbackAmount(this.visualParams.feedbackAmount);
    }
  }

  updateFromFieldValue(fieldValue, x, y) {
    // Map fluid field values to audio parameters
    // Higher field values = more effects

    if (fieldValue > 0.5) {
      // Strong field = more reverb and delay
      this.visualParams.reverbAmount = (fieldValue - 0.5) * 2;
      this.effectsChain.setReverbAmount(this.visualParams.reverbAmount * 0.5);

      this.visualParams.delayTime = 0.1 + fieldValue * 0.5;
      this.effectsChain.setDelayParams(
        this.visualParams.delayTime,
        fieldValue * 0.6, // feedback
        fieldValue * 0.3  // mix
      );
    }

    if (fieldValue > 0.7) {
      // Very strong field = distortion and ring mod
      this.visualParams.distortionAmount = (fieldValue - 0.7) * 3;
      this.effectsChain.setDistortionAmount(this.visualParams.distortionAmount);

      // Ring mod frequency based on position
      const ringFreq = 100 + (x / this.ctx.sampleRate) * 2000;
      this.effectsChain.setRingModulation(ringFreq, fieldValue * 0.2);
    }

    // Feedback based on overall field energy
    if (fieldValue > 0.3) {
      this.visualParams.feedbackAmount = fieldValue * 0.6;
      this.feedbackNetwork.setFeedbackAmount(this.visualParams.feedbackAmount);
      this.feedbackNetwork.setDelayTime(0.05 + fieldValue * 0.2);
    }
  }

  applyPreset(presetNumber) {
    const presets = [
      { // 1. Ambient Wash
        stretchFactor: 10,
        grainSize: 0.5,
        feedbackAmount: 0.6,
        reverbAmount: 0.8,
        delayTime: 0.5,
        filterCutoff: 4000
      },
      { // 2. Glitch Storm
        stretchFactor: 0.5,
        grainSize: 0.02,
        feedbackAmount: 0.4,
        distortionAmount: 0.7,
        spectralShift: 50,
        filterCutoff: 12000
      },
      { // 3. Harmonic Cathedral
        stretchFactor: 4,
        grainSize: 0.3,
        harmonicGeneration: 0.8,
        reverbAmount: 0.9,
        feedbackAmount: 0.5,
        filterCutoff: 6000
      },
      { // 4. Rhythmic Chopper
        stretchFactor: 1,
        grainSize: 0.1,
        feedbackAmount: 0.3,
        delayTime: 0.125, // 1/8 note at 120bpm
        filterCutoff: 10000
      },
      { // 5. Spectral Freeze
        stretchFactor: 100,
        grainSize: 0.8,
        spectralBlur: 0.9,
        feedbackAmount: 0.7,
        filterCutoff: 3000
      },
      { // 6. Underwater Dreams
        stretchFactor: 3,
        grainSize: 0.4,
        filterCutoff: 2000,
        reverbAmount: 0.6,
        feedbackAmount: 0.5,
        delayTime: 0.3
      },
      { // 7. Crystal Caves
        stretchFactor: 2,
        grainSize: 0.05,
        harmonicGeneration: 0.6,
        reverbAmount: 0.7,
        distortionAmount: 0.2,
        filterCutoff: 8000
      },
      { // 8. Cosmic Drift
        stretchFactor: 20,
        grainSize: 0.6,
        spectralShift: 20,
        reverbAmount: 0.95,
        feedbackAmount: 0.8,
        filterCutoff: 5000
      },
      { // 9. Chaos Mode
        stretchFactor: Math.random() * 50,
        grainSize: Math.random(),
        feedbackAmount: Math.random() * 0.9,
        reverbAmount: Math.random(),
        distortionAmount: Math.random() * 0.5,
        spectralShift: Math.random() * 100 - 50,
        filterCutoff: Math.random() * 14000 + 1000
      }
    ];

    if (presetNumber >= 1 && presetNumber <= 9) {
      const preset = presets[presetNumber - 1];

      // Apply all preset parameters
      Object.assign(this.visualParams, preset);

      // Update processors
      this.granularProcessors.forEach(proc => {
        proc.setStretchFactor(this.visualParams.stretchFactor);
        proc.setGrainSize(this.visualParams.grainSize);
      });

      this.spectralProcessor.spectralShift = this.visualParams.spectralShift || 0;
      this.spectralProcessor.harmonicEmphasis = this.visualParams.harmonicGeneration || 0;
      this.spectralProcessor.spectralBlur = this.visualParams.spectralBlur || 0;

      this.feedbackNetwork.setFeedbackAmount(this.visualParams.feedbackAmount || 0);
      this.feedbackNetwork.setFilterFrequencies(100, this.visualParams.filterCutoff || 8000);

      this.effectsChain.setReverbAmount(this.visualParams.reverbAmount || 0);
      this.effectsChain.setDelayParams(
        this.visualParams.delayTime || 0.25,
        (this.visualParams.feedbackAmount || 0) * 0.5,
        0.3
      );
      this.effectsChain.setDistortionAmount(this.visualParams.distortionAmount || 0);

      this.currentPreset = presetNumber;
      console.log(`Applied preset ${presetNumber}: ${Object.keys(presets[presetNumber - 1]).join(', ')}`);
    }
  }

  getOutputFrequencyData() {
    const data = new Float32Array(this.outputAnalyser.frequencyBinCount);
    this.outputAnalyser.getFloatFrequencyData(data);
    return data;
  }

  getVisualizationData() {
    // Return current parameters for visual feedback
    return {
      params: {...this.visualParams},
      preset: this.currentPreset,
      outputLevel: this.outputGain.gain.value,
      feedbackLevel: this.feedbackNetwork.feedbackGain.gain.value
    };
  }

  connectOutput(destinationNode) {
    this.outputGain.connect(destinationNode);
  }

  stop() {
    this.isProcessing = false;
    // Cleanup
    this.granularProcessors.forEach(proc => {
      if (proc.scriptProcessor) {
        proc.scriptProcessor.disconnect();
      }
    });
  }
}

export default AdvancedAudioProcessor;