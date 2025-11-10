/**
 * FluidField - Dynamic fluid visualization for frequency spectrum
 * Creates a living, breathing visual organism from audio data
 */

class FluidField {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    // Grid resolution for fluid simulation
    this.cols = 64;
    this.rows = 48;
    this.cellWidth = width / this.cols;
    this.cellHeight = height / this.rows;

    // Fluid field arrays
    this.field = [];
    this.velocityX = [];
    this.velocityY = [];
    this.pressure = [];
    this.color = [];

    // Initialize arrays
    for (let i = 0; i < this.cols * this.rows; i++) {
      this.field[i] = 0;
      this.velocityX[i] = 0;
      this.velocityY[i] = 0;
      this.pressure[i] = 0;
      this.color[i] = { h: 0, s: 0, l: 0 };
    }

    // Frequency mapping (24 bands to grid positions)
    this.frequencyAnchors = [];
    this.setupFrequencyAnchors();

    // Interaction points
    this.wells = []; // Gravitational wells that affect the field
    this.ripples = []; // Active ripples from interactions

    // Animation parameters
    this.time = 0;
    this.turbulence = 0.02;
    this.viscosity = 0.98;
    this.diffusion = 0.95;

    // Visual modes
    this.visualMode = 'liquid'; // liquid, crystal, particle, neural, fractal
    this.particles = [];
    this.initParticles();
  }

  setupFrequencyAnchors() {
    // Map 24 frequency bands to anchor points in the field
    const bandsPerRow = 6;
    const rows = 4;

    for (let band = 0; band < 24; band++) {
      const row = Math.floor(band / bandsPerRow);
      const col = band % bandsPerRow;

      const x = (col + 0.5) * (this.cols / bandsPerRow);
      const y = (row + 0.5) * (this.rows / rows);

      this.frequencyAnchors.push({
        x,
        y,
        band,
        energy: 0,
        hue: (band * 15) % 360,
        influence: 8 // Radius of influence
      });
    }
  }

  initParticles() {
    // Create particle system for particle mode
    for (let i = 0; i < 2000; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0,
        vy: 0,
        size: Math.random() * 2 + 0.5,
        hue: 0,
        life: 1.0
      });
    }
  }

  update(bandEnergies) {
    this.time += 0.016; // ~60fps

    // Update frequency anchors with new energy
    bandEnergies.forEach((energy, i) => {
      if (this.frequencyAnchors[i]) {
        this.frequencyAnchors[i].energy = energy;
      }
    });

    // Add some ambient energy if everything is silent (for testing/visibility)
    const totalEnergy = bandEnergies.reduce((sum, e) => sum + e, 0);
    if (totalEnergy < 0.01) {
      // Add subtle ambient waves
      const waveX = Math.sin(this.time * 0.5) * this.cols * 0.3 + this.cols * 0.5;
      const waveY = Math.cos(this.time * 0.3) * this.rows * 0.3 + this.rows * 0.5;
      const index = Math.floor(waveY) * this.cols + Math.floor(waveX);
      if (index >= 0 && index < this.field.length) {
        this.field[index] = 0.3;
        this.color[index] = { h: (this.time * 20) % 360, s: 70, l: 50 };
      }
    }

    // Update field based on frequency anchors
    this.applyFrequencyForces();

    // Apply fluid dynamics
    this.advect();
    this.diffuse();
    this.applyPressure();

    // Update interactive elements
    this.updateWells();
    this.updateRipples();

    // Update particles if in particle mode
    if (this.visualMode === 'particle') {
      this.updateParticles();
    }

    // Apply turbulence for organic movement
    this.applyTurbulence();

    // Decay field gradually
    this.decay();
  }

  applyFrequencyForces() {
    // Clear field
    for (let i = 0; i < this.field.length; i++) {
      this.field[i] *= 0.95;
    }

    // Apply energy from frequency anchors
    this.frequencyAnchors.forEach(anchor => {
      const energy = anchor.energy;
      if (energy < 0.01) return;

      const gridX = Math.floor(anchor.x);
      const gridY = Math.floor(anchor.y);
      const influence = anchor.influence;

      for (let dy = -influence; dy <= influence; dy++) {
        for (let dx = -influence; dx <= influence; dx++) {
          const x = gridX + dx;
          const y = gridY + dy;

          if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) continue;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > influence) continue;

          const falloff = 1 - (dist / influence);
          const index = y * this.cols + x;

          // Add energy to field
          this.field[index] += energy * falloff * 5;
          this.field[index] = Math.min(this.field[index], 1);

          // Add velocity based on energy
          const angle = Math.atan2(dy, dx) + Math.sin(this.time * 2 + anchor.band) * 0.5;
          this.velocityX[index] += Math.cos(angle) * energy * falloff * 0.5;
          this.velocityY[index] += Math.sin(angle) * energy * falloff * 0.5;

          // Update color based on frequency band
          const color = this.color[index];
          color.h = (color.h * 0.9 + anchor.hue * 0.1);
          color.s = Math.min(100, color.s + energy * 30);
          color.l = Math.min(80, 30 + this.field[index] * 50);
        }
      }
    });
  }

  advect() {
    // Advection: move field values along velocity field
    const newField = new Array(this.field.length);
    const newVelX = new Array(this.velocityX.length);
    const newVelY = new Array(this.velocityY.length);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const index = y * this.cols + x;

        // Trace backward along velocity
        const vx = this.velocityX[index];
        const vy = this.velocityY[index];

        let srcX = x - vx;
        let srcY = y - vy;

        // Clamp to bounds
        srcX = Math.max(0, Math.min(this.cols - 1, srcX));
        srcY = Math.max(0, Math.min(this.rows - 1, srcY));

        // Bilinear interpolation
        const x0 = Math.floor(srcX);
        const x1 = Math.min(x0 + 1, this.cols - 1);
        const y0 = Math.floor(srcY);
        const y1 = Math.min(y0 + 1, this.rows - 1);

        const fx = srcX - x0;
        const fy = srcY - y0;

        const i00 = y0 * this.cols + x0;
        const i01 = y0 * this.cols + x1;
        const i10 = y1 * this.cols + x0;
        const i11 = y1 * this.cols + x1;

        // Interpolate field value
        newField[index] =
          this.field[i00] * (1 - fx) * (1 - fy) +
          this.field[i01] * fx * (1 - fy) +
          this.field[i10] * (1 - fx) * fy +
          this.field[i11] * fx * fy;

        // Interpolate velocities
        newVelX[index] =
          this.velocityX[i00] * (1 - fx) * (1 - fy) +
          this.velocityX[i01] * fx * (1 - fy) +
          this.velocityX[i10] * (1 - fx) * fy +
          this.velocityX[i11] * fx * fy;

        newVelY[index] =
          this.velocityY[i00] * (1 - fx) * (1 - fy) +
          this.velocityY[i01] * fx * (1 - fy) +
          this.velocityY[i10] * (1 - fx) * fy +
          this.velocityY[i11] * fx * fy;
      }
    }

    this.field = newField;
    this.velocityX = newVelX;
    this.velocityY = newVelY;
  }

  diffuse() {
    // Diffusion: spread values to neighbors
    const newField = [...this.field];

    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const index = y * this.cols + x;

        const neighbors =
          this.field[index - this.cols] + // top
          this.field[index + this.cols] + // bottom
          this.field[index - 1] + // left
          this.field[index + 1]; // right

        newField[index] = this.field[index] * this.diffusion +
                          neighbors * (1 - this.diffusion) * 0.25;
      }
    }

    this.field = newField;
  }

  applyPressure() {
    // Simple pressure solver to maintain incompressibility
    for (let i = 0; i < 5; i++) { // Iterate for convergence
      for (let y = 1; y < this.rows - 1; y++) {
        for (let x = 1; x < this.cols - 1; x++) {
          const index = y * this.cols + x;

          // Calculate divergence
          const divX = this.velocityX[index + 1] - this.velocityX[index - 1];
          const divY = this.velocityY[index + this.cols] - this.velocityY[index - this.cols];
          const divergence = (divX + divY) * 0.5;

          // Update pressure
          this.pressure[index] = divergence * 0.25;
        }
      }
    }

    // Apply pressure gradient to velocity
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const index = y * this.cols + x;

        const gradX = this.pressure[index + 1] - this.pressure[index - 1];
        const gradY = this.pressure[index + this.cols] - this.pressure[index - this.cols];

        this.velocityX[index] -= gradX * 0.5;
        this.velocityY[index] -= gradY * 0.5;
      }
    }
  }

  applyTurbulence() {
    // Add subtle turbulence for organic movement
    for (let i = 0; i < this.field.length; i++) {
      if (this.field[i] > 0.1) {
        this.velocityX[i] += (Math.random() - 0.5) * this.turbulence;
        this.velocityY[i] += (Math.random() - 0.5) * this.turbulence;
      }
    }
  }

  decay() {
    // Apply viscosity and decay
    for (let i = 0; i < this.field.length; i++) {
      this.velocityX[i] *= this.viscosity;
      this.velocityY[i] *= this.viscosity;
      this.field[i] *= 0.99;
    }
  }

  updateWells() {
    // Update gravitational wells
    this.wells = this.wells.filter(well => {
      well.life -= 0.01;

      if (well.life <= 0) return false;

      // Apply gravitational force
      const gridX = Math.floor(well.x / this.cellWidth);
      const gridY = Math.floor(well.y / this.cellHeight);
      const influence = 12;

      for (let dy = -influence; dy <= influence; dy++) {
        for (let dx = -influence; dx <= influence; dx++) {
          const x = gridX + dx;
          const y = gridY + dy;

          if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) continue;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1 || dist > influence) continue;

          const force = well.strength * well.life / (dist * dist);
          const angle = Math.atan2(dy, dx);

          const index = y * this.cols + x;
          this.velocityX[index] -= Math.cos(angle) * force;
          this.velocityY[index] -= Math.sin(angle) * force;
        }
      }

      return true;
    });
  }

  updateRipples() {
    // Update ripple effects
    this.ripples = this.ripples.filter(ripple => {
      ripple.radius += ripple.speed;
      ripple.amplitude *= 0.95;

      if (ripple.amplitude < 0.01) return false;

      // Apply ripple to field
      const gridX = Math.floor(ripple.x / this.cellWidth);
      const gridY = Math.floor(ripple.y / this.cellHeight);
      const gridRadius = Math.ceil(ripple.radius / this.cellWidth);

      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
          const x = gridX + dx;
          const y = gridY + dy;

          if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) continue;

          const dist = Math.sqrt(dx * dx + dy * dy) * this.cellWidth;
          const ringDist = Math.abs(dist - ripple.radius);

          if (ringDist < this.cellWidth * 2) {
            const index = y * this.cols + x;
            const wave = Math.sin(ringDist * 0.5) * ripple.amplitude;
            this.field[index] = Math.min(1, this.field[index] + wave);
          }
        }
      }

      return true;
    });
  }

  updateParticles() {
    // Update particle positions based on field
    this.particles.forEach(p => {
      const gridX = Math.floor(p.x / this.cellWidth);
      const gridY = Math.floor(p.y / this.cellHeight);

      if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
        const index = gridY * this.cols + gridX;

        // Follow velocity field
        p.vx += this.velocityX[index] * 0.5;
        p.vy += this.velocityY[index] * 0.5;

        // Add some randomness
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;

        // Damping
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;

        // Update color from field
        const color = this.color[index];
        p.hue = color.h;
        p.life = this.field[index];
      }
    });
  }

  // Interaction methods
  addWell(x, y, strength = 1) {
    this.wells.push({
      x,
      y,
      strength,
      life: 1.0
    });
  }

  addRipple(x, y, amplitude = 0.5) {
    this.ripples.push({
      x,
      y,
      radius: 0,
      amplitude,
      speed: 2
    });
  }

  applyForce(x, y, fx, fy) {
    const gridX = Math.floor(x / this.cellWidth);
    const gridY = Math.floor(y / this.cellHeight);

    if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
      const index = gridY * this.cols + gridX;
      this.velocityX[index] += fx;
      this.velocityY[index] += fy;
    }
  }

  // Rendering
  render(ctx) {
    switch (this.visualMode) {
      case 'liquid':
        this.renderLiquid(ctx);
        break;
      case 'crystal':
        this.renderCrystal(ctx);
        break;
      case 'particle':
        this.renderParticles(ctx);
        break;
      case 'neural':
        this.renderNeural(ctx);
        break;
      case 'fractal':
        this.renderFractal(ctx);
        break;
      default:
        this.renderLiquid(ctx);
    }
  }

  renderLiquid(ctx) {
    // Draw a subtle background grid so users know the field is there
    ctx.strokeStyle = 'rgba(50, 50, 80, 0.2)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < this.rows; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellHeight);
      ctx.lineTo(this.width, y * this.cellHeight);
      ctx.stroke();
    }
    for (let x = 0; x < this.cols; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellWidth, 0);
      ctx.lineTo(x * this.cellWidth, this.height);
      ctx.stroke();
    }

    // Render as smooth liquid field
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const index = y * this.cols + x;
        const value = this.field[index];

        if (value < 0.01) continue;

        const color = this.color[index];
        const opacity = Math.min(1, value * 2);

        ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity})`;

        // Draw with slight overlap for smoothness
        ctx.fillRect(
          x * this.cellWidth - 0.5,
          y * this.cellHeight - 0.5,
          this.cellWidth + 1,
          this.cellHeight + 1
        );
      }
    }

    // Overlay velocity field as subtle streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let y = 0; y < this.rows; y += 4) {
      for (let x = 0; x < this.cols; x += 4) {
        const index = y * this.cols + x;
        const vx = this.velocityX[index];
        const vy = this.velocityY[index];

        if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) continue;

        const px = (x + 0.5) * this.cellWidth;
        const py = (y + 0.5) * this.cellHeight;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + vx * 20, py + vy * 20);
        ctx.stroke();
      }
    }
  }

  renderCrystal(ctx) {
    // Render as geometric crystal structures
    for (let y = 0; y < this.rows - 1; y++) {
      for (let x = 0; x < this.cols - 1; x++) {
        const index = y * this.cols + x;
        const value = this.field[index];

        if (value < 0.1) continue;

        const color = this.color[index];
        const size = value * this.cellWidth * 1.5;

        ctx.save();
        ctx.translate(
          (x + 0.5) * this.cellWidth,
          (y + 0.5) * this.cellHeight
        );
        ctx.rotate(this.time + index * 0.01);

        ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${value})`;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  }

  renderParticles(ctx) {
    // Render particle system
    this.particles.forEach(p => {
      if (p.life < 0.01) return;

      const opacity = p.life;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  renderNeural(ctx) {
    // Render as connected neural network
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 1;

    // Draw connections between active nodes
    for (let y = 0; y < this.rows; y += 3) {
      for (let x = 0; x < this.cols; x += 3) {
        const index = y * this.cols + x;
        const value = this.field[index];

        if (value < 0.2) continue;

        const px = (x + 0.5) * this.cellWidth;
        const py = (y + 0.5) * this.cellHeight;

        // Connect to nearby active nodes
        for (let dy = -3; dy <= 3; dy += 3) {
          for (let dx = -3; dx <= 3; dx += 3) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;

            const nindex = ny * this.cols + nx;
            const nvalue = this.field[nindex];

            if (nvalue > 0.2) {
              const npx = (nx + 0.5) * this.cellWidth;
              const npy = (ny + 0.5) * this.cellHeight;

              ctx.globalAlpha = Math.min(value, nvalue);
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(npx, npy);
              ctx.stroke();
            }
          }
        }

        // Draw node
        const color = this.color[index];
        ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${value})`;
        ctx.beginPath();
        ctx.arc(px, py, value * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  renderFractal(ctx) {
    // Render as recursive fractal patterns
    const drawFractal = (x, y, size, depth, value, color) => {
      if (depth <= 0 || size < 2) return;

      ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${value * 0.5})`;
      ctx.fillRect(x - size/2, y - size/2, size, size);

      if (value > 0.3) {
        const newSize = size * 0.5;
        const offset = size * 0.3;

        drawFractal(x - offset, y - offset, newSize, depth - 1, value * 0.8, color);
        drawFractal(x + offset, y - offset, newSize, depth - 1, value * 0.8, color);
        drawFractal(x - offset, y + offset, newSize, depth - 1, value * 0.8, color);
        drawFractal(x + offset, y + offset, newSize, depth - 1, value * 0.8, color);
      }
    };

    for (let y = 0; y < this.rows; y += 4) {
      for (let x = 0; x < this.cols; x += 4) {
        const index = y * this.cols + x;
        const value = this.field[index];

        if (value < 0.2) continue;

        const px = (x + 0.5) * this.cellWidth;
        const py = (y + 0.5) * this.cellHeight;
        const color = this.color[index];

        drawFractal(px, py, value * 30, 3, value, color);
      }
    }
  }

  // Utility methods
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.cellWidth = width / this.cols;
    this.cellHeight = height / this.rows;
  }

  setVisualMode(mode) {
    this.visualMode = mode;
  }

  getFieldValueAt(x, y) {
    const gridX = Math.floor(x / this.cellWidth);
    const gridY = Math.floor(y / this.cellHeight);

    if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
      const index = gridY * this.cols + gridX;
      return this.field[index];
    }

    return 0;
  }
}

export default FluidField;