/**
 * ChiaroscuroVisualizer - A single, beautiful visualization
 * Creates actual chiaroscuro (light/dark contrast) effects
 * Ethereal, dream-like, and actually works
 */

class ChiaroscuroVisualizer {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    // Light sources that create the chiaroscuro effect
    this.lights = [];
    this.maxLights = 12;

    // Shadows and gradients
    this.shadowIntensity = 0.8;
    this.time = 0;

    // Audio-reactive parameters
    this.globalEnergy = 0;
    this.bassEnergy = 0;
    this.midEnergy = 0;
    this.highEnergy = 0;

    // Interaction state
    this.mouseLight = null;
    this.attractors = [];

    // Initialize with some ambient lights
    this.initializeLights();
  }

  initializeLights() {
    // Create initial lights in a pleasing arrangement
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = Math.min(this.width, this.height) * 0.3;

      this.lights.push({
        x: this.width / 2 + Math.cos(angle) * radius,
        y: this.height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 80 + Math.random() * 40,
        intensity: 0.3 + Math.random() * 0.3,
        hue: 200 + Math.random() * 160, // Blues to purples
        age: 0,
        maxAge: 1000 + Math.random() * 1000
      });
    }
  }

  update(bandEnergies) {
    this.time += 0.016;

    // Calculate energy levels from different frequency ranges
    if (bandEnergies && bandEnergies.length >= 24) {
      // Bass (0-4), Mid (5-16), High (17-23)
      this.bassEnergy = bandEnergies.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
      this.midEnergy = bandEnergies.slice(5, 17).reduce((a, b) => a + b, 0) / 12;
      this.highEnergy = bandEnergies.slice(17, 24).reduce((a, b) => a + b, 0) / 7;
      this.globalEnergy = (this.bassEnergy + this.midEnergy + this.highEnergy) / 3;
    }

    // Update existing lights
    this.lights.forEach(light => {
      // Age and fade
      light.age++;
      if (light.age > light.maxAge) {
        light.intensity *= 0.95;
      }

      // Movement based on frequency
      const wander = 0.5;
      const flow = Math.sin(this.time * 0.5 + light.x * 0.01) * 0.3;

      light.vx += (Math.random() - 0.5) * wander + flow;
      light.vy += (Math.random() - 0.5) * wander - this.bassEnergy * 0.5;

      // Attraction to center when high energy
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const dx = centerX - light.x;
      const dy = centerY - light.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (this.globalEnergy > 0.3) {
        light.vx += (dx / dist) * this.globalEnergy * 0.2;
        light.vy += (dy / dist) * this.globalEnergy * 0.2;
      }

      // Apply attractors (from mouse interactions)
      this.attractors.forEach(attractor => {
        const adx = attractor.x - light.x;
        const ady = attractor.y - light.y;
        const adist = Math.sqrt(adx * adx + ady * ady);
        if (adist < 200 && adist > 10) {
          const force = attractor.strength / (adist * 0.5);
          light.vx += (adx / adist) * force;
          light.vy += (ady / adist) * force;
        }
      });

      // Damping
      light.vx *= 0.95;
      light.vy *= 0.95;

      // Update position
      light.x += light.vx;
      light.y += light.vy;

      // Wrap around edges softly
      if (light.x < -100) light.x = this.width + 100;
      if (light.x > this.width + 100) light.x = -100;
      if (light.y < -100) light.y = this.height + 100;
      if (light.y > this.height + 100) light.y = -100;

      // Pulse with energy
      light.radius = light.radius * 0.95 + (80 + this.bassEnergy * 200) * 0.05;
      light.intensity = light.intensity * 0.9 + (0.3 + this.midEnergy) * 0.1;

      // Color shift with high frequencies
      light.hue += this.highEnergy * 5;
      if (light.hue > 360) light.hue -= 360;
    });

    // Remove dead lights
    this.lights = this.lights.filter(l => l.intensity > 0.01);

    // Spawn new lights from bass hits
    if (this.bassEnergy > 0.6 && this.lights.length < this.maxLights) {
      this.spawnLight(
        this.width / 2 + (Math.random() - 0.5) * 200,
        this.height / 2 + (Math.random() - 0.5) * 200
      );
    }

    // Update attractors (fade them out)
    this.attractors = this.attractors.filter(a => {
      a.strength *= 0.95;
      return a.strength > 0.01;
    });

    // Update mouse light if dragging
    if (this.mouseLight) {
      this.mouseLight.intensity = 0.5 + this.globalEnergy * 0.5;
    }
  }

  render(ctx) {
    // Create the chiaroscuro effect with multiple render passes

    // Pass 1: Dark background with subtle gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGradient.addColorStop(0, '#000000');
    bgGradient.addColorStop(0.5, '#050510');
    bgGradient.addColorStop(1, '#0a0a15');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Pass 2: Shadow layer (the "oscuro" - dark)
    ctx.globalCompositeOperation = 'multiply';
    const shadowGradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Pass 3: Light sources (the "chiaro" - light)
    ctx.globalCompositeOperation = 'screen';

    this.lights.forEach(light => {
      // Multiple layers for ethereal glow
      for (let layer = 3; layer > 0; layer--) {
        const layerRadius = light.radius * (1 + layer * 0.5);
        const layerIntensity = light.intensity / (layer * 1.5);

        const gradient = ctx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, layerRadius
        );

        const alpha = layerIntensity * (1 - this.shadowIntensity);
        const hue = light.hue;
        const saturation = 40 + this.globalEnergy * 40; // More vibrant with energy
        const lightness = 50 + layer * 10;

        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
        gradient.addColorStop(0.3, `hsla(${hue}, ${saturation}%, ${lightness - 10}%, ${alpha * 0.7})`);
        gradient.addColorStop(0.6, `hsla(${hue}, ${saturation - 10}%, ${lightness - 20}%, ${alpha * 0.3})`);
        gradient.addColorStop(1, `hsla(${hue}, ${saturation - 20}%, ${lightness - 30}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, layerRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Pass 4: Highlights and rim lighting
    ctx.globalCompositeOperation = 'overlay';

    this.lights.forEach(light => {
      if (light.intensity > 0.5) {
        // Bright core for strong lights
        const coreGradient = ctx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, light.radius * 0.3
        );

        const coreAlpha = light.intensity * 0.8;
        coreGradient.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);
        coreGradient.addColorStop(0.5, `rgba(255, 240, 200, ${coreAlpha * 0.5})`);
        coreGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Pass 5: Ethereal mist effect
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.1 + this.globalEnergy * 0.1;

    const mistGradient = ctx.createRadialGradient(
      this.width / 2 + Math.sin(this.time) * 100,
      this.height / 2 + Math.cos(this.time * 0.7) * 100,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.5
    );

    mistGradient.addColorStop(0, `hsla(220, 60%, 60%, 0.2)`);
    mistGradient.addColorStop(0.5, `hsla(280, 50%, 50%, 0.1)`);
    mistGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = mistGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Mouse light if active
    if (this.mouseLight) {
      ctx.globalCompositeOperation = 'screen';
      const mouseGradient = ctx.createRadialGradient(
        this.mouseLight.x, this.mouseLight.y, 0,
        this.mouseLight.x, this.mouseLight.y, 150
      );
      mouseGradient.addColorStop(0, `hsla(60, 80%, 70%, ${this.mouseLight.intensity})`);
      mouseGradient.addColorStop(0.5, `hsla(40, 60%, 50%, ${this.mouseLight.intensity * 0.5})`);
      mouseGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = mouseGradient;
      ctx.beginPath();
      ctx.arc(this.mouseLight.x, this.mouseLight.y, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // Interaction methods
  spawnLight(x, y, intensity = 0.5) {
    if (this.lights.length >= this.maxLights) {
      // Remove oldest/weakest light
      this.lights.sort((a, b) => a.intensity - b.intensity);
      this.lights.shift();
    }

    this.lights.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      radius: 60 + Math.random() * 60,
      intensity,
      hue: 180 + Math.random() * 180,
      age: 0,
      maxAge: 500 + Math.random() * 1000
    });
  }

  startDrag(x, y) {
    this.mouseLight = { x, y, intensity: 0.6 };
  }

  updateDrag(x, y) {
    if (this.mouseLight) {
      this.mouseLight.x = x;
      this.mouseLight.y = y;
    }
  }

  endDrag() {
    if (this.mouseLight) {
      // Create an attractor that will affect other lights
      this.attractors.push({
        x: this.mouseLight.x,
        y: this.mouseLight.y,
        strength: 5
      });
      this.mouseLight = null;
    }
  }

  handleClick(x, y) {
    // Spawn a new light source
    this.spawnLight(x, y, 0.8);

    // Create a ripple effect
    this.attractors.push({
      x,
      y,
      strength: -3 // Repulsor
    });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }
}

export default ChiaroscuroVisualizer;