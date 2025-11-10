/**
 * KaleidoscopeVisualizer - Nebulous, flowing kaleidoscope driven by sound
 * Creates continuous morphing patterns with symmetry, not discrete objects
 */

class KaleidoscopeVisualizer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;

    // Kaleidoscope parameters
    this.symmetry = 8; // Number of mirror segments
    this.rotation = 0;
    this.rotationSpeed = 0.001;

    // Nebula parameters
    this.time = 0;
    this.noiseScale = 0.003;
    this.flowSpeed = 0.5;

    // Audio-reactive state
    this.frequencyBands = new Array(24).fill(0);
    this.energyHistory = [];
    this.maxHistory = 60; // 1 second at 60fps

    // Color palette (will shift based on audio)
    this.hueBase = 220; // Start with blues
    this.hueShift = 0;
    this.saturation = 70;

    // Flow field for nebulous movement
    this.flowField = [];
    this.flowResolution = 20;
    this.initFlowField();

    // Offscreen canvas for single segment
    this.segmentCanvas = document.createElement('canvas');
    this.segmentCanvas.width = width / 2;
    this.segmentCanvas.height = height / 2;
    this.segmentCtx = this.segmentCanvas.getContext('2d');
  }

  initFlowField() {
    const cols = Math.ceil(this.width / this.flowResolution);
    const rows = Math.ceil(this.height / this.flowResolution);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.flowField.push({
          angle: 0,
          magnitude: 0
        });
      }
    }
  }

  // Simple 2D perlin-like noise
  noise(x, y, time) {
    // Simple pseudo-random noise based on coordinates
    const nx = x * 0.01;
    const ny = y * 0.01;
    const nt = time * 0.1;

    return (
      Math.sin(nx * 2.1 + nt) * Math.cos(ny * 1.7 + nt) +
      Math.sin(nx * 3.3 - nt * 0.5) * Math.cos(ny * 2.9 - nt * 0.5) * 0.5 +
      Math.sin(nx * 5.7 + nt * 0.3) * Math.cos(ny * 4.1 + nt * 0.3) * 0.25
    ) / 1.75;
  }

  update(bandEnergies) {
    this.time += 0.016;

    // Store frequency data
    if (bandEnergies && bandEnergies.length >= 24) {
      this.frequencyBands = bandEnergies;

      // Calculate overall energy
      const totalEnergy = bandEnergies.reduce((sum, e) => sum + e, 0) / bandEnergies.length;

      this.energyHistory.push(totalEnergy);
      if (this.energyHistory.length > this.maxHistory) {
        this.energyHistory.shift();
      }

      // Derive parameters from audio
      const bass = bandEnergies.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
      const mid = bandEnergies.slice(8, 16).reduce((a, b) => a + b, 0) / 8;
      const high = bandEnergies.slice(20, 24).reduce((a, b) => a + b, 0) / 4;

      // Bass affects rotation
      this.rotationSpeed = 0.001 + bass * 0.01;

      // Mids affect hue
      this.hueShift += mid * 2;

      // Highs affect saturation
      this.saturation = 50 + high * 50;

      // Vary symmetry based on energy patterns
      if (totalEnergy > 0.7 && Math.random() < 0.01) {
        this.symmetry = [6, 8, 12, 16][Math.floor(Math.random() * 4)];
      }
    }

    // Update rotation
    this.rotation += this.rotationSpeed;

    // Update flow field with audio influence
    this.updateFlowField();
  }

  updateFlowField() {
    const cols = Math.ceil(this.width / this.flowResolution);

    let index = 0;
    for (let y = 0; y < this.height; y += this.flowResolution) {
      for (let x = 0; x < this.width; x += this.flowResolution) {
        // Distance from center
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Noise-based flow
        const noiseVal = this.noise(x, y, this.time);

        // Combine circular flow with noise and audio
        const audioInfluence = this.frequencyBands[Math.floor((angle + Math.PI) / (Math.PI * 2) * 24)] || 0;

        const flowAngle = angle + noiseVal * Math.PI + audioInfluence * Math.PI * 0.5;
        const flowMag = 0.5 + noiseVal * 0.5 + audioInfluence;

        if (this.flowField[index]) {
          this.flowField[index].angle = flowAngle;
          this.flowField[index].magnitude = flowMag;
        }

        index++;
      }
    }
  }

  render(ctx) {
    // Clear with very dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw the kaleidoscope by rendering one segment multiple times with symmetry
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation);

    // Draw each mirrored segment
    for (let i = 0; i < this.symmetry; i++) {
      ctx.save();

      // Rotate for this segment
      const segmentAngle = (Math.PI * 2 / this.symmetry) * i;
      ctx.rotate(segmentAngle);

      // Flip every other segment for kaleidoscope effect
      if (i % 2 === 1) {
        ctx.scale(-1, 1);
      }

      // Draw the nebulous segment
      this.renderSegment(ctx);

      ctx.restore();
    }

    ctx.restore();

    // Add a subtle vignette for depth
    this.renderVignette(ctx);
  }

  renderSegment(ctx) {
    // Render one segment of the kaleidoscope
    // This will be mirrored/rotated to create the full pattern

    const segmentAngle = Math.PI * 2 / this.symmetry;
    const radius = Math.max(this.width, this.height) * 0.7;

    // Create flowing gradients based on frequency bands
    for (let band = 0; band < this.frequencyBands.length; band++) {
      const energy = this.frequencyBands[band];
      if (energy < 0.05) continue;

      // Map band to position within segment
      const t = band / this.frequencyBands.length;
      const r = radius * (0.3 + t * 0.7);
      const a = segmentAngle * 0.5;

      const x = Math.cos(a) * r * (0.5 + energy * 0.5);
      const y = Math.sin(a) * r * (0.5 + energy * 0.5);

      // Flow field influence
      const flowIndex = Math.floor((x + this.width / 2) / this.flowResolution) +
                       Math.floor((y + this.height / 2) / this.flowResolution) * Math.ceil(this.width / this.flowResolution);
      const flow = this.flowField[Math.min(flowIndex, this.flowField.length - 1)] || { angle: 0, magnitude: 0 };

      // Apply flow
      const fx = x + Math.cos(flow.angle) * flow.magnitude * 20;
      const fy = y + Math.sin(flow.angle) * flow.magnitude * 20;

      // Nebulous blob at this position
      const blobSize = 100 + energy * 200;
      const hue = (this.hueBase + this.hueShift + band * 15) % 360;
      const saturation = this.saturation;
      const lightness = 40 + energy * 40;

      // Multiple layers for nebulous effect
      ctx.globalCompositeOperation = 'screen';

      // Outer glow
      const gradient1 = ctx.createRadialGradient(fx, fy, 0, fx, fy, blobSize);
      gradient1.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${energy * 0.3})`);
      gradient1.addColorStop(0.3, `hsla(${hue}, ${saturation - 10}%, ${lightness - 10}%, ${energy * 0.2})`);
      gradient1.addColorStop(0.6, `hsla(${hue}, ${saturation - 20}%, ${lightness - 20}%, ${energy * 0.1})`);
      gradient1.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient1;
      ctx.beginPath();
      ctx.arc(fx, fy, blobSize, 0, Math.PI * 2);
      ctx.fill();

      // Inner core
      if (energy > 0.3) {
        const gradient2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, blobSize * 0.4);
        gradient2.addColorStop(0, `hsla(${hue + 30}, ${saturation + 20}%, ${lightness + 20}%, ${energy * 0.6})`);
        gradient2.addColorStop(0.5, `hsla(${hue + 15}, ${saturation + 10}%, ${lightness + 10}%, ${energy * 0.3})`);
        gradient2.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.arc(fx, fy, blobSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connecting flows between blobs
      if (band > 0) {
        const prevBand = band - 1;
        const prevT = prevBand / this.frequencyBands.length;
        const prevR = radius * (0.3 + prevT * 0.7);
        const prevX = Math.cos(a) * prevR * (0.5 + this.frequencyBands[prevBand] * 0.5);
        const prevY = Math.sin(a) * prevR * (0.5 + this.frequencyBands[prevBand] * 0.5);

        // Flow gradient between points
        const flowGradient = ctx.createLinearGradient(prevX, prevY, fx, fy);
        flowGradient.addColorStop(0, `hsla(${hue - 15}, ${saturation}%, ${lightness}%, ${energy * 0.1})`);
        flowGradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${energy * 0.15})`);
        flowGradient.addColorStop(1, `hsla(${hue + 15}, ${saturation}%, ${lightness}%, ${energy * 0.1})`);

        ctx.strokeStyle = flowGradient;
        ctx.lineWidth = 20 + energy * 30;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.3;

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(fx, fy);
        ctx.stroke();

        ctx.globalAlpha = 1;
      }
    }

    ctx.globalCompositeOperation = 'source-over';

    // Add some fractal-like detail with overlays
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.2;

    const noiseDetail = this.noise(this.time * 100, 0, this.time);
    const detailGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    detailGradient.addColorStop(0, `hsla(${this.hueBase}, 80%, 60%, 0.3)`);
    detailGradient.addColorStop(0.5, `hsla(${this.hueBase + 60}, 70%, 50%, 0.2)`);
    detailGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = detailGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.8 + noiseDetail * 0.2), 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  renderVignette(ctx) {
    // Subtle vignette for depth
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  // Interaction methods
  handleClick(x, y) {
    // Create a burst of energy at this frequency band
    const angle = Math.atan2(y - this.centerY, x - this.centerX);
    const bandIndex = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 24);

    if (bandIndex >= 0 && bandIndex < 24) {
      this.frequencyBands[bandIndex] = Math.min(1, this.frequencyBands[bandIndex] + 0.5);
    }
  }

  handleDrag(x, y, dx, dy) {
    // Dragging affects the base hue and rotation
    this.hueBase += dx * 0.5;
    this.rotation += dx * 0.001;
    this.rotationSpeed = 0.001 + Math.abs(dy) * 0.0001;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;

    // Reinit flow field
    this.flowField = [];
    this.initFlowField();
  }
}

export default KaleidoscopeVisualizer;