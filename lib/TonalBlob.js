/**
 * TonalBlob - Click-spawned persistent tonal blob
 * Plays a continuous oscillator tone that can be modulated by dragging
 */

let nextTonalBlobId = 0;

class TonalBlob {
  constructor(x, y, audioEngine, canvasWidth, canvasHeight) {
    this.id = `tonal-blob-${nextTonalBlobId++}`;
    this.x = x;
    this.y = y;
    this.audioEngine = audioEngine;

    // Map Y position to frequency (top = high, bottom = low)
    // Using logarithmic scale for musical feel: 100Hz - 1000Hz
    this.baseFrequency = this.yToFrequency(y, canvasHeight);
    this.currentFrequency = this.baseFrequency;

    // Visual properties
    this.radius = 50;
    this.baseRadius = 50;
    this.targetRadius = 50;
    this.smoothRadius = 50;

    // Color based on frequency (hue from pitch)
    this.hue = this.frequencyToHue(this.baseFrequency);
    this.brightness = 70;
    this.saturation = 90;

    // Physics
    this.vx = 0;
    this.vy = 0;
    this.isDragging = false;
    this.dragStartX = x;
    this.dragStartY = y;

    // State
    this.opacity = 0; // Fade in from 0
    this.targetOpacity = 1;
    this.isRemoving = false;

    // Pulsing effect
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.03;

    // Shape variation
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;

    // Audio nodes
    this.oscillator = null;
    this.gainNode = null;
    this.filterNode = null;

    // Start audio
    this.initAudio();
  }

  /**
   * Map Y position to frequency (logarithmic)
   * @param {number} y - Y position on canvas
   * @param {number} height - Canvas height
   * @returns {number} Frequency in Hz
   */
  yToFrequency(y, height) {
    const minFreq = 100; // Low note
    const maxFreq = 1000; // High note

    // Invert Y (top = high frequency)
    const normalized = 1 - (y / height);

    // Logarithmic scaling for musical feel
    const logMin = Math.log(minFreq);
    const logMax = Math.log(maxFreq);
    const frequency = Math.exp(logMin + normalized * (logMax - logMin));

    return frequency;
  }

  /**
   * Map frequency to hue (color)
   */
  frequencyToHue(freq) {
    // Map 100Hz-1000Hz to hue 200-340 (blue to purple)
    const normalized = (freq - 100) / (1000 - 100);
    return 200 + normalized * 140;
  }

  /**
   * Initialize audio nodes
   */
  initAudio() {
    if (!this.audioEngine || !this.audioEngine.audioContext) return;

    const ctx = this.audioEngine.audioContext;
    const now = ctx.currentTime;

    // Create oscillator
    this.oscillator = ctx.createOscillator();
    this.oscillator.type = 'sine'; // Can be changed to saw, square, triangle
    this.oscillator.frequency.value = this.baseFrequency;

    // Create filter for modulation
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 2000;
    this.filterNode.Q.value = 1;

    // Create gain node
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;

    // Connect: oscillator → filter → gain → masterGain
    this.oscillator.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.audioEngine.masterGainNode);

    // Fade in
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);

    // Start oscillator
    this.oscillator.start(now);

    console.log(`TonalBlob ${this.id} started: ${this.baseFrequency.toFixed(1)}Hz`);
  }

  /**
   * Update blob state
   */
  update(width, height) {
    // Fade in/out
    const fadeSpeed = this.isRemoving ? 0.05 : 0.1;
    this.opacity += (this.targetOpacity - this.opacity) * fadeSpeed;

    // Gentle drift
    if (!this.isDragging) {
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.x += this.vx;
      this.y += this.vy;

      // Boundary collision
      const margin = this.radius;
      if (this.x < margin) { this.x = margin; this.vx *= -0.5; }
      if (this.x > width - margin) { this.x = width - margin; this.vx *= -0.5; }
      if (this.y < margin) { this.y = margin; this.vy *= -0.5; }
      if (this.y > height - margin) { this.y = height - margin; this.vy *= -0.5; }
    }

    // Pulsing effect
    this.pulsePhase += this.pulseSpeed;
    const pulseAmount = Math.sin(this.pulsePhase) * 0.1;
    this.targetRadius = this.baseRadius * (1 + pulseAmount);
    this.smoothRadius += (this.targetRadius - this.smoothRadius) * 0.2;
    this.radius = this.smoothRadius;

    // Shape variation
    const shapePhase = Date.now() * 0.001;
    this.scaleX = 1.0 + Math.sin(shapePhase + this.pulsePhase) * 0.08;
    this.scaleY = 1.0 + Math.cos(shapePhase + this.pulsePhase * 1.1) * 0.08;
    this.rotation += this.rotationSpeed;

    // Update audio modulation if dragging
    if (this.isDragging && this.audioEngine && this.audioEngine.audioContext) {
      this.updateAudioModulation();
    }
  }

  /**
   * Update audio based on drag position
   */
  updateAudioModulation() {
    if (!this.oscillator || !this.gainNode || !this.filterNode) return;

    const ctx = this.audioEngine.audioContext;
    const now = ctx.currentTime;

    // Horizontal drag = detune (±2 semitones)
    const dx = this.x - this.dragStartX;
    const detune = (dx / 200) * 200; // ±200 cents = ±2 semitones
    this.oscillator.detune.setTargetAtTime(detune, now, 0.01);

    // Vertical drag = filter cutoff
    const dy = this.y - this.dragStartY;
    const filterFreq = Math.max(200, Math.min(5000, 2000 - dy * 5));
    this.filterNode.frequency.setTargetAtTime(filterFreq, now, 0.01);

    // Distance = volume boost
    const distance = Math.sqrt(dx * dx + dy * dy);
    const volume = Math.min(0.4, 0.2 + distance / 500);
    this.gainNode.gain.setTargetAtTime(volume, now, 0.01);
  }

  /**
   * Start dragging
   */
  startDrag() {
    this.isDragging = true;
    this.dragStartX = this.x;
    this.dragStartY = this.y;
  }

  /**
   * Stop dragging
   */
  stopDrag() {
    this.isDragging = false;

    // Reset audio modulation
    if (this.oscillator && this.gainNode && this.filterNode) {
      const ctx = this.audioEngine.audioContext;
      const now = ctx.currentTime;

      this.oscillator.detune.setTargetAtTime(0, now, 0.2);
      this.filterNode.frequency.setTargetAtTime(2000, now, 0.2);
      this.gainNode.gain.setTargetAtTime(0.2, now, 0.2);
    }
  }

  /**
   * Start removal (fade out)
   */
  remove() {
    if (this.isRemoving) return;

    this.isRemoving = true;
    this.targetOpacity = 0;

    // Fade out audio
    if (this.gainNode && this.audioEngine && this.audioEngine.audioContext) {
      const ctx = this.audioEngine.audioContext;
      const now = ctx.currentTime;

      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
    }

    // Stop oscillator after fade
    if (this.oscillator) {
      const ctx = this.audioEngine.audioContext;
      const now = ctx.currentTime;
      this.oscillator.stop(now + 0.3);
    }

    console.log(`TonalBlob ${this.id} removing`);
  }

  /**
   * Check if point is inside blob
   */
  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }

  /**
   * Check if blob is dead (fully faded)
   */
  isDead() {
    return this.isRemoving && this.opacity <= 0.01;
  }

  /**
   * Render blob to canvas
   */
  render(ctx) {
    if (this.opacity <= 0.01) return;

    ctx.save();

    // Apply global opacity
    ctx.globalAlpha = this.opacity;

    // Apply transformation
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);

    // Outer glow
    const outerGlow = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, this.radius * 1.5
    );
    outerGlow.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, ${this.brightness}%, 0.6)`);
    outerGlow.addColorStop(0.6, `hsla(${this.hue}, ${this.saturation - 10}%, ${this.brightness - 10}%, 0.3)`);
    outerGlow.addColorStop(1, `hsla(${this.hue}, ${this.saturation - 20}%, ${this.brightness - 20}%, 0)`);

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Main body
    const gradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, this.radius
    );
    gradient.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, ${this.brightness + 10}%, 0.9)`);
    gradient.addColorStop(0.5, `hsla(${this.hue}, ${this.saturation - 10}%, ${this.brightness}%, 0.7)`);
    gradient.addColorStop(1, `hsla(${this.hue}, ${this.saturation - 20}%, ${this.brightness - 10}%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    const core = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, this.radius * 0.4
    );
    core.addColorStop(0, `hsla(${this.hue}, 95%, ${this.brightness + 25}%, 0.8)`);
    core.addColorStop(1, `hsla(${this.hue}, 85%, ${this.brightness + 15}%, 0)`);

    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Frequency label
    if (this.opacity > 0.7) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(this.baseFrequency)}Hz`, 0, 0);
    }

    ctx.restore();
  }

  /**
   * Cleanup audio resources
   */
  cleanup() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {
        // Already stopped
      }
    }
    if (this.gainNode) this.gainNode.disconnect();
    if (this.filterNode) this.filterNode.disconnect();
  }
}

export default TonalBlob;
