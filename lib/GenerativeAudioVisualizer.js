/**
 * GenerativeAudioVisualizer - True generative audio-to-visual engine
 *
 * Not a preset pattern - each visual element is spawned and driven by sound.
 * Frequency content determines color, position, and movement.
 * Amplitude determines brightness and size.
 * Transients create bursts and explosions.
 * Silence creates darkness.
 */

class GenerativeAudioVisualizer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;

    // Visual elements spawned from sound
    this.particles = [];
    this.streaks = [];
    this.blooms = [];

    // Audio analysis state
    this.frequencyBands = new Array(24).fill(0);
    this.previousBands = new Array(24).fill(0);
    this.transients = new Array(24).fill(0); // Sudden increases
    this.envelopes = new Array(24).fill(0); // Smoothed energy

    // Spectral features
    this.spectralCentroid = 0.5; // Brightness of sound
    this.spectralSpread = 0.5; // Width of sound
    this.totalEnergy = 0;

    // Flow field for organic movement
    this.flowField = [];
    this.flowResolution = 30;
    this.initFlowField();

    // Spawn parameters
    this.spawnThreshold = 0.15; // Minimum energy to spawn
    this.time = 0;

    // Visual decay
    this.trailAmount = 0.92; // How much to fade previous frame

    // Interaction state for audio feedback
    this.interactionEnergy = 0;
    this.interactionPosition = { x: this.centerX, y: this.centerY };
    this.interactionMode = 'none'; // 'drag', 'push', 'pull', 'twist'
    this.flowDisturbance = 0;
  }

  initFlowField() {
    const cols = Math.ceil(this.width / this.flowResolution);
    const rows = Math.ceil(this.height / this.flowResolution);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.flowField.push({
          x: x * this.flowResolution,
          y: y * this.flowResolution,
          angle: 0,
          magnitude: 0
        });
      }
    }
  }

  update(bandEnergies) {
    if (!bandEnergies || bandEnergies.length < 24) {
      bandEnergies = new Array(24).fill(0);
    }

    this.time += 0.016;

    // Store previous for transient detection
    this.previousBands = [...this.frequencyBands];
    this.frequencyBands = bandEnergies;

    // Detect transients (sudden increases in energy)
    for (let i = 0; i < 24; i++) {
      const delta = this.frequencyBands[i] - this.previousBands[i];
      this.transients[i] = Math.max(0, delta * 5); // Amplify sudden changes

      // Smooth envelope follower
      const attack = 0.3;
      const release = 0.1;
      if (this.frequencyBands[i] > this.envelopes[i]) {
        this.envelopes[i] += (this.frequencyBands[i] - this.envelopes[i]) * attack;
      } else {
        this.envelopes[i] += (this.frequencyBands[i] - this.envelopes[i]) * release;
      }
    }

    // Calculate spectral features
    this.calculateSpectralFeatures();

    // Update flow field based on audio
    this.updateFlowField();

    // Spawn visual elements from sound
    this.spawnFromAudio();

    // Update existing elements
    this.updateParticles();
    this.updateStreaks();
    this.updateBlooms();
  }

  calculateSpectralFeatures() {
    let totalEnergy = 0;
    let weightedSum = 0;
    let weightedSpread = 0;

    for (let i = 0; i < this.frequencyBands.length; i++) {
      const energy = this.frequencyBands[i];
      totalEnergy += energy;
      weightedSum += energy * i;
    }

    this.totalEnergy = totalEnergy / this.frequencyBands.length;
    this.spectralCentroid = totalEnergy > 0 ? weightedSum / (totalEnergy * this.frequencyBands.length) : 0.5;

    // Calculate spread
    for (let i = 0; i < this.frequencyBands.length; i++) {
      const deviation = (i / this.frequencyBands.length) - this.spectralCentroid;
      weightedSpread += this.frequencyBands[i] * deviation * deviation;
    }
    this.spectralSpread = Math.sqrt(weightedSpread / Math.max(totalEnergy, 0.001));
  }

  updateFlowField() {
    const cols = Math.ceil(this.width / this.flowResolution);

    for (let i = 0; i < this.flowField.length; i++) {
      const field = this.flowField[i];
      const x = field.x;
      const y = field.y;

      // Distance from center
      const dx = x - this.centerX;
      const dy = y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Map position to frequency band
      const bandIndex = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * this.frequencyBands.length);
      const energy = this.frequencyBands[bandIndex] || 0;

      // Flow influenced by audio energy and position
      const radialFlow = energy * 2;
      const tangentialFlow = this.totalEnergy * 3;

      field.angle = angle + Math.PI / 2 + energy * Math.PI;
      field.magnitude = radialFlow + tangentialFlow + Math.sin(this.time + dist * 0.01) * 0.5;
    }
  }

  spawnFromAudio() {
    // Spawn particles from frequency bands (more subtle)
    for (let i = 0; i < this.frequencyBands.length; i++) {
      const energy = this.frequencyBands[i];
      const transient = this.transients[i];

      // Skip if below threshold
      if (energy < this.spawnThreshold && transient < 0.15) continue;

      // Map frequency to position
      const t = i / this.frequencyBands.length;
      const angle = t * Math.PI * 2;

      // Low frequencies = center, high frequencies = edge
      const radius = 50 + t * (Math.min(this.width, this.height) * 0.4);

      const spawnX = this.centerX + Math.cos(angle) * radius;
      const spawnY = this.centerY + Math.sin(angle) * radius;

      // Frequency determines color
      const hue = t * 300 + 200; // Map to spectrum (red to blue)
      const saturation = 60 + energy * 40;
      const lightness = 40 + energy * 60;

      // Transients spawn bursts (more subtle)
      if (transient > 0.3) {
        this.spawnBurst(spawnX, spawnY, hue, saturation, lightness, transient * 0.6);
      }

      // Sustained energy spawns particles (reduced spawn rate)
      if (energy > this.spawnThreshold && Math.random() < energy * 0.15) {
        this.spawnParticle(spawnX, spawnY, hue, saturation, lightness, energy, angle);
      }

      // High energy spawns blooms (much rarer)
      if (energy > 0.7 && Math.random() < 0.02) {
        this.spawnBloom(spawnX, spawnY, hue, saturation, lightness, energy);
      }
    }
  }

  spawnParticle(x, y, hue, saturation, lightness, energy, angle) {
    // Velocity based on energy
    const speed = 1 + energy * 4;
    const spreadAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5;

    this.particles.push({
      x,
      y,
      vx: Math.cos(spreadAngle) * speed,
      vy: Math.sin(spreadAngle) * speed,
      hue,
      saturation,
      lightness,
      size: 2 + energy * 6,
      life: 1.0,
      decay: 0.98 - energy * 0.01
    });

    // Limit particle count
    if (this.particles.length > 2000) {
      this.particles.splice(0, 500);
    }
  }

  spawnBurst(x, y, hue, saturation, lightness, intensity) {
    // Spawn multiple particles in explosion
    const count = Math.floor(5 + intensity * 20);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + intensity * 8;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue: hue + (Math.random() - 0.5) * 60,
        saturation: saturation + 20,
        lightness: lightness + 20,
        size: 1 + intensity * 4,
        life: 1.0,
        decay: 0.96
      });
    }
  }

  spawnBloom(x, y, hue, saturation, lightness, energy) {
    this.blooms.push({
      x,
      y,
      radius: 20,
      maxRadius: 100 + energy * 200,
      hue,
      saturation,
      lightness,
      alpha: energy * 0.8,
      growthRate: 2 + energy * 3,
      life: 1.0,
      decay: 0.98
    });

    // Limit bloom count
    if (this.blooms.length > 50) {
      this.blooms.splice(0, 10);
    }
  }

  updateParticles() {
    // Particle-to-particle gravitational attraction (hive mind behavior)
    const attractionRadius = 80;
    const attractionStrength = 0.03;

    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];

      // Gravity to nearby particles (creates swarm behavior)
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < attractionRadius * attractionRadius && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = attractionStrength / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          p1.vx += fx;
          p1.vy += fy;
          p2.vx -= fx;
          p2.vy -= fy;
        }
      }
    }

    // Update each particle
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Apply flow field
      const flowIndex = Math.floor(p.x / this.flowResolution) +
                       Math.floor(p.y / this.flowResolution) * Math.ceil(this.width / this.flowResolution);
      const flow = this.flowField[flowIndex];

      if (flow) {
        p.vx += Math.cos(flow.angle) * flow.magnitude * 0.08;
        p.vy += Math.sin(flow.angle) * flow.magnitude * 0.08;
      }

      // Central vortex attraction (stronger than before)
      const dx = this.centerX - p.x;
      const dy = this.centerY - p.y;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      const centralForce = 0.0003;
      if (distToCenter > 1) {
        p.vx += (dx / distToCenter) * centralForce;
        p.vy += (dy / distToCenter) * centralForce;
      }

      // Apply velocity
      p.x += p.vx;
      p.y += p.vy;

      // Friction
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Age
      p.life *= p.decay;

      // Remove dead particles
      if (p.life < 0.01 || p.x < -100 || p.x > this.width + 100 ||
          p.y < -100 || p.y > this.height + 100) {
        this.particles.splice(i, 1);
      }
    }
  }

  updateStreaks() {
    // Streaks fade naturally
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.life *= 0.95;

      if (s.life < 0.05) {
        this.streaks.splice(i, 1);
      }
    }
  }

  updateBlooms() {
    for (let i = this.blooms.length - 1; i >= 0; i--) {
      const b = this.blooms[i];

      // Grow
      b.radius += b.growthRate;
      b.life *= b.decay;

      // Remove when dead
      if (b.life < 0.05 || b.radius > b.maxRadius) {
        this.blooms.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // Don't fully clear - create trails
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.trailAmount})`;
    ctx.fillRect(0, 0, this.width, this.height);

    // Additive blending for light
    ctx.globalCompositeOperation = 'lighter';

    // Render blooms (background)
    this.blooms.forEach(bloom => {
      const gradient = ctx.createRadialGradient(
        bloom.x, bloom.y, 0,
        bloom.x, bloom.y, bloom.radius
      );

      const alpha = bloom.alpha * bloom.life;
      gradient.addColorStop(0, `hsla(${bloom.hue}, ${bloom.saturation}%, ${bloom.lightness}%, ${alpha * 0.6})`);
      gradient.addColorStop(0.5, `hsla(${bloom.hue}, ${bloom.saturation}%, ${bloom.lightness}%, ${alpha * 0.3})`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bloom.x, bloom.y, bloom.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Render particles
    this.particles.forEach(p => {
      const alpha = p.life;

      // Glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness * 0.8}%, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${Math.min(p.lightness + 30, 100)}%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  }


  resize(width, height) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;

    this.flowField = [];
    this.initFlowField();
  }

  // Get audio feedback parameters from visual state
  getAudioFeedback() {
    // Calculate particle density in different regions
    const regions = { low: 0, mid: 0, high: 0 };
    const regionThreshold = Math.min(this.width, this.height) * 0.33;

    this.particles.forEach(p => {
      const dist = Math.sqrt((p.x - this.centerX) ** 2 + (p.y - this.centerY) ** 2);
      if (dist < regionThreshold) regions.low++;
      else if (dist < regionThreshold * 2) regions.mid++;
      else regions.high++;
    });

    // Calculate average particle velocity
    let avgVelocity = 0;
    this.particles.forEach(p => {
      avgVelocity += Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    });
    avgVelocity = this.particles.length > 0 ? avgVelocity / this.particles.length : 0;

    // Calculate color diversity (hue spread)
    const hues = this.particles.map(p => p.hue);
    const avgHue = hues.reduce((a, b) => a + b, 0) / Math.max(hues.length, 1);

    return {
      // Visual density affects reverb/delay
      particleCount: this.particles.length,
      particleDensity: this.particles.length / 2000, // normalized

      // Spatial distribution affects frequency filtering
      lowDensity: regions.low / Math.max(this.particles.length, 1),
      midDensity: regions.mid / Math.max(this.particles.length, 1),
      highDensity: regions.high / Math.max(this.particles.length, 1),

      // Motion affects modulation
      avgVelocity: avgVelocity / 10, // normalized

      // Color affects pitch/timbre
      avgHue: avgHue / 360, // normalized

      // Interaction state affects real-time effects
      interactionEnergy: this.interactionEnergy,
      interactionX: (this.interactionPosition.x / this.width), // normalized
      interactionY: (this.interactionPosition.y / this.height), // normalized
      interactionMode: this.interactionMode,
      flowDisturbance: this.flowDisturbance,

      // Overall energy
      totalEnergy: this.totalEnergy,
      spectralCentroid: this.spectralCentroid
    };
  }

  // Enhanced interaction with flow field disturbance
  handleMouseDown(x, y, modifiers = {}) {
    if (modifiers.shift) {
      // Shift: Pull mode - attract particles
      this.interactionMode = 'pull';
    } else if (modifiers.alt) {
      // Alt: Push mode - repel particles
      this.interactionMode = 'push';
    } else if (modifiers.ctrl) {
      // Ctrl: Twist mode - add vorticity
      this.interactionMode = 'twist';
    } else {
      // Normal: Explosion
      this.interactionMode = 'burst';
      const distance = Math.sqrt((x - this.centerX) ** 2 + (y - this.centerY) ** 2);
      const angle = Math.atan2(y - this.centerY, x - this.centerX);
      const t = (angle + Math.PI) / (Math.PI * 2);
      const hue = t * 300 + 200;
      this.spawnBurst(x, y, hue, 70, 60, 1.0);
    }

    this.interactionPosition = { x, y };
    this.interactionEnergy = 1.0;
  }

  handleMouseMove(x, y, dx, dy, modifiers = {}) {
    this.interactionPosition = { x, y };
    const speed = Math.sqrt(dx * dx + dy * dy);
    this.interactionEnergy = Math.min(1.0, speed / 20);
    this.flowDisturbance = this.interactionEnergy;

    // Disturb flow field based on mouse position and mode
    this.disturbFlowField(x, y, dx, dy, modifiers);

    // Create visual trail
    if (speed > 2) {
      const angle = Math.atan2(dy, dx);
      const t = Math.random();
      const hue = t * 360;

      for (let i = 0; i < speed * 0.3; i++) {
        const lerpX = x - dx * (i / (speed * 0.3));
        const lerpY = y - dy * (i / (speed * 0.3));

        this.particles.push({
          x: lerpX + (Math.random() - 0.5) * 10,
          y: lerpY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          hue: hue + (Math.random() - 0.5) * 60,
          saturation: 70,
          lightness: 60,
          size: 2 + Math.random() * 4,
          life: 1.0,
          decay: 0.97
        });
      }
    }
  }

  handleMouseUp() {
    this.interactionMode = 'none';
    this.interactionEnergy *= 0.5;
  }

  disturbFlowField(x, y, dx, dy, modifiers = {}) {
    const radius = 150; // Disturbance radius

    for (let i = 0; i < this.flowField.length; i++) {
      const field = this.flowField[i];
      const distToMouse = Math.sqrt((field.x - x) ** 2 + (field.y - y) ** 2);

      if (distToMouse < radius) {
        const influence = 1 - (distToMouse / radius);
        const angleToMouse = Math.atan2(field.y - y, field.x - x);

        if (modifiers.shift) {
          // Pull mode: attract towards mouse
          field.angle = angleToMouse + Math.PI;
          field.magnitude += influence * 5;
        } else if (modifiers.alt) {
          // Push mode: repel from mouse
          field.angle = angleToMouse;
          field.magnitude += influence * 5;
        } else if (modifiers.ctrl) {
          // Twist mode: add rotation
          field.angle += influence * Math.PI * 0.5;
          field.magnitude += influence * 3;
        } else {
          // Normal drag: push along drag direction
          const dragAngle = Math.atan2(dy, dx);
          field.angle = dragAngle;
          field.magnitude += influence * 4;
        }
      }
    }

    // Affect nearby particles directly based on mode
    if (modifiers.shift) {
      // Pull particles towards mouse
      this.particles.forEach(p => {
        const distToMouse = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
        if (distToMouse < radius) {
          const influence = 1 - (distToMouse / radius);
          const angleToMouse = Math.atan2(y - p.y, x - p.x);
          p.vx += Math.cos(angleToMouse) * influence * 2;
          p.vy += Math.sin(angleToMouse) * influence * 2;
        }
      });
    } else if (modifiers.alt) {
      // Push particles away from mouse
      this.particles.forEach(p => {
        const distToMouse = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
        if (distToMouse < radius) {
          const influence = 1 - (distToMouse / radius);
          const angleFromMouse = Math.atan2(p.y - y, p.x - x);
          p.vx += Math.cos(angleFromMouse) * influence * 3;
          p.vy += Math.sin(angleFromMouse) * influence * 3;
        }
      });
    }
  }
}

export default GenerativeAudioVisualizer;
