/**
 * SynthBlob - Interactive blob spawned by keyboard synth notes
 * Each blob represents a playing note and can be manipulated to affect sound
 */

let nextBlobId = 0;

class SynthBlob {
  constructor(x, y, noteInfo, key) {
    this.id = `synth-blob-${nextBlobId++}`;
    this.x = x;
    this.y = y;
    this.noteInfo = noteInfo; // { note, freq, isBlack, octave }
    this.key = key; // Keyboard key

    // Visual properties
    this.radius = 60; // Larger than analysis blobs
    this.baseRadius = 60;
    this.targetRadius = 60;
    this.smoothRadius = 60;

    // Color based on note (hue from frequency)
    this.hue = this.frequencyToHue(noteInfo.freq);
    this.brightness = noteInfo.isBlack ? 50 : 70; // Black keys dimmer
    this.saturation = 90;

    // Physics
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // State
    this.isActive = true; // Note is playing
    this.isFading = false;
    this.opacity = 0; // Fade in from 0
    this.targetOpacity = 1;

    // Pulsing effect
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.05;

    // Shape variation
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.03;
  }

  /**
   * Map frequency to hue (color)
   * Lower frequencies = red/orange, higher = blue/purple
   */
  frequencyToHue(freq) {
    // Map musical range (C4=261Hz to C6=1046Hz) to hue (0-280)
    const minFreq = 261;
    const maxFreq = 1046;
    const normalizedFreq = (freq - minFreq) / (maxFreq - minFreq);
    const hue = normalizedFreq * 280; // Red to purple spectrum
    return Math.max(0, Math.min(360, hue));
  }

  /**
   * Start fading out (note released)
   */
  fadeOut() {
    this.isFading = true;
    this.targetOpacity = 0;
    this.isActive = false;
  }

  /**
   * Update blob state
   */
  update(width, height) {
    // Fade in/out
    const fadeSpeed = this.isFading ? 0.05 : 0.1;
    this.opacity += (this.targetOpacity - this.opacity) * fadeSpeed;

    // Organic movement (only when not dragging)
    if (!this.isDragging) {
      // Random drift
      this.vx += (Math.random() - 0.5) * 0.3;
      this.vy += (Math.random() - 0.5) * 0.3;

      // Damping
      this.vx *= 0.95;
      this.vy *= 0.95;

      // Update position
      this.x += this.vx;
      this.y += this.vy;

      // Boundary wrapping (wrap around screen edges)
      const margin = this.radius * 2;
      if (this.x < -margin) this.x = width + margin;
      if (this.x > width + margin) this.x = -margin;
      if (this.y < -margin) this.y = height + margin;
      if (this.y > height + margin) this.y = -margin;

      // Limit speed
      const maxSpeed = 3;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }
    }

    // Pulsing effect
    this.pulsePhase += this.pulseSpeed;
    const pulseAmount = Math.sin(this.pulsePhase) * 0.15;
    this.targetRadius = this.baseRadius * (1 + pulseAmount);
    this.smoothRadius += (this.targetRadius - this.smoothRadius) * 0.2;
    this.radius = this.smoothRadius;

    // Shape variation
    const shapePhase = Date.now() * 0.001;
    this.scaleX = 1.0 + Math.sin(shapePhase + this.pulsePhase) * 0.1;
    this.scaleY = 1.0 + Math.cos(shapePhase + this.pulsePhase * 1.1) * 0.1;
    this.rotation += this.rotationSpeed;
  }

  /**
   * Get modulation parameters based on blob position/state
   * Used to affect the synth sound
   * @returns {object} { pitch, volume }
   */
  getModulationParams() {
    if (!this.isDragging) {
      return { pitch: 0, volume: 0.4 }; // Increased base volume from 0.3
    }

    // Calculate drag distance from start
    const dx = this.x - this.dragStartX;
    const dy = this.y - this.dragStartY;

    // Map drag to sound parameters
    // Horizontal = pitch bend (±2 semitones)
    const pitch = (dx / 200) * 2;

    // Vertical = volume modulation (down = louder, up = quieter)
    // Volume based on vertical position and distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseVolume = 0.4;
    const distanceBoost = distance / 400; // More drag = louder
    const verticalMod = -dy / 300; // Down = positive = louder
    const volume = Math.max(0.1, Math.min(0.6, baseVolume + distanceBoost + verticalMod));

    return { pitch, volume };
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
   * Check if blob is dead (fully faded out)
   */
  isDead() {
    return this.isFading && this.opacity <= 0.01;
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

    // Create radial gradient
    const gradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, this.radius
    );

    const hue = this.hue;
    const sat = this.saturation;
    const bri = this.brightness;

    gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${bri + 20}%, 1)`);
    gradient.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${bri}%, 0.8)`);
    gradient.addColorStop(1, `hsla(${hue}, ${sat - 20}%, ${bri - 20}%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow (brighter core)
    const innerGradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, this.radius * 0.4
    );
    innerGradient.addColorStop(0, `hsla(${hue}, 95%, ${bri + 30}%, 0.6)`);
    innerGradient.addColorStop(1, `hsla(${hue}, 85%, ${bri + 10}%, 0)`);

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Draw note label when active
    if (this.isActive && this.opacity > 0.7) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.noteInfo.note, 0, 0);
    }

    ctx.restore();
  }
}

export default SynthBlob;
