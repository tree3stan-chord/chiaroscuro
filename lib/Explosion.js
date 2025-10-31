/**
 * Explosion - Visual and audio explosion effect system
 * Triggered by clicking anywhere on the canvas
 */

class Particle {
  constructor(x, y, vx, vy, hue, brightness) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.hue = hue;
    this.brightness = brightness;
    this.life = 1.0; // 1.0 = full life, 0.0 = dead
    this.decay = 0.02; // How fast it fades
    this.radius = Math.random() * 3 + 2; // 2-5px
    this.gravity = 0.05; // Slight downward pull
  }

  update() {
    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Apply gravity
    this.vy += this.gravity;

    // Apply air resistance
    this.vx *= 0.98;
    this.vy *= 0.98;

    // Decay life
    this.life -= this.decay;
    this.life = Math.max(0, this.life);
  }

  isDead() {
    return this.life <= 0;
  }

  render(ctx) {
    if (this.isDead()) return;

    ctx.save();

    // Create radial gradient for glow
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 2
    );

    const alpha = this.life;
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, ${this.brightness}%, ${alpha})`);
    gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, ${this.brightness - 10}%, ${alpha * 0.6})`);
    gradient.addColorStop(1, `hsla(${this.hue}, 60%, ${this.brightness - 20}%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Explosion {
  constructor(x, y, audioEngine, bandEnergies = null) {
    this.x = x;
    this.y = y;
    this.particles = [];
    this.shockwave = {
      radius: 0,
      maxRadius: 150,
      opacity: 1.0
    };

    // Determine color from dominant frequency or random
    let hue = Math.random() * 360;
    let brightness = 60;

    if (bandEnergies && bandEnergies.length > 0) {
      // Find band with highest energy
      let maxEnergy = 0;
      let maxIndex = 0;
      bandEnergies.forEach((energy, i) => {
        if (energy > maxEnergy) {
          maxEnergy = energy;
          maxIndex = i;
        }
      });

      // Map band index to hue (0-360)
      hue = (maxIndex / bandEnergies.length) * 360;
      brightness = 50 + maxEnergy * 30; // 50-80% brightness based on energy
    }

    // Create particles
    const particleCount = 25 + Math.floor(Math.random() * 15); // 25-40 particles
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 4; // 2-6 px/frame

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      // Slight hue variation per particle
      const particleHue = hue + (Math.random() - 0.5) * 40;
      const particleBrightness = brightness + (Math.random() - 0.5) * 20;

      this.particles.push(new Particle(x, y, vx, vy, particleHue, particleBrightness));
    }

    // Trigger audio effect if audio engine available
    if (audioEngine) {
      this.triggerAudioEffect(audioEngine, x, y);
    }

    console.log(`Explosion created at (${Math.floor(x)}, ${Math.floor(y)}) with ${particleCount} particles`);
  }

  triggerAudioEffect(audioEngine, x, y) {
    // Map X position to pitch shift (-12 to +12 semitones)
    const canvasWidth = audioEngine.audioContext ? window.innerWidth : 1920;
    const normalizedX = x / canvasWidth; // 0-1
    const pitchShift = (normalizedX - 0.5) * 24; // -12 to +12

    // Map Y position to reverb amount (0-0.8)
    const canvasHeight = audioEngine.audioContext ? window.innerHeight : 1080;
    const normalizedY = 1 - (y / canvasHeight); // Invert: top = high, bottom = low
    const reverbAmount = normalizedY * 0.8;

    // Trigger burst effect
    audioEngine.triggerExplosion(pitchShift, reverbAmount);
  }

  update() {
    // Update all particles
    this.particles.forEach(p => p.update());

    // Remove dead particles
    this.particles = this.particles.filter(p => !p.isDead());

    // Update shockwave
    this.shockwave.radius += 8;
    this.shockwave.opacity = Math.max(0, 1 - (this.shockwave.radius / this.shockwave.maxRadius));
  }

  isDead() {
    return this.particles.length === 0 && this.shockwave.opacity <= 0;
  }

  render(ctx) {
    // Render shockwave
    if (this.shockwave.opacity > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.shockwave.opacity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.shockwave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Render all particles
    this.particles.forEach(p => p.render(ctx));
  }
}

export default Explosion;
