/**
 * BlobPhysics - Handles blob simulation and physics
 * Manages blob movement, collision, and audio-reactive behavior for 24 frequency bands
 */

import { FREQUENCY_BANDS } from './FrequencyBands.js';

class Blob {
  constructor(x, y, radius, hue, bandIndex, bandInfo) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.baseRadius = radius;
    this.hue = hue;
    this.bandIndex = bandIndex;
    this.bandInfo = bandInfo; // { min, max, color, name }

    // Home position (for organic layout)
    this.homeX = x;
    this.homeY = y;

    // Physics properties
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.isDragging = false;

    // Audio reactive properties
    this.targetRadius = radius;
    this.smoothRadius = radius;
    this.energy = 0; // Current frequency band energy (0-1)
  }

  update(energy, width, height, layout = 'arc') {
    this.energy = energy;

    // Update position based on layout mode (skip if dragging)
    if (!this.isDragging) {
      if (layout === 'organic') {
        // Organic: gentle drift but gravitate toward home position
        const pullX = (this.homeX - this.x) * 0.01;
        const pullY = (this.homeY - this.y) * 0.01;

        this.vx += pullX;
        this.vy += pullY;

        // Random drift
        this.vx += (Math.random() - 0.5) * 0.05;
        this.vy += (Math.random() - 0.5) * 0.05;

        // Apply velocity damping
        this.vx *= 0.95;
        this.vy *= 0.95;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Boundary collision
        const margin = this.radius;
        if (this.x - margin < 0) {
          this.x = margin;
          this.vx *= -0.5;
        }
        if (this.x + margin > width) {
          this.x = width - margin;
          this.vx *= -0.5;
        }
        if (this.y - margin < 0) {
          this.y = margin;
          this.vy *= -0.5;
        }
        if (this.y + margin > height) {
          this.y = height - margin;
          this.vy *= -0.5;
        }
      }
      // Arc and Bar layouts: blobs can be freely positioned by user
      // Don't force them back to home position
    }

    // Audio reactive size (always update, even while dragging)
    this.targetRadius = this.baseRadius + energy * 60;
    this.smoothRadius += (this.targetRadius - this.smoothRadius) * 0.15;
    this.radius = this.smoothRadius;
  }

  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }
}

class BlobPhysics {
  constructor(width, height, layout = 'arc') {
    this.width = width;
    this.height = height;
    this.layout = layout; // 'arc', 'bar', or 'organic'
    this.blobs = [];

    // Create 24 blobs (one per frequency band)
    this.createBlobs();
  }

  createBlobs() {
    this.blobs = [];

    FREQUENCY_BANDS.forEach((band, index) => {
      const position = this.calculateBlobPosition(index, FREQUENCY_BANDS.length);
      const baseRadius = 40; // Smaller base radius for 24 blobs
      const hue = band.color;

      const blob = new Blob(
        position.x,
        position.y,
        baseRadius,
        hue,
        index,
        band
      );

      this.blobs.push(blob);
    });

    console.log(`Created ${this.blobs.length} blobs in ${this.layout} layout`);
  }

  calculateBlobPosition(index, total) {
    switch (this.layout) {
      case 'arc':
        return this.calculateArcPosition(index, total);
      case 'bar':
        return this.calculateBarPosition(index, total);
      case 'organic':
        return this.calculateOrganicPosition(index, total);
      default:
        return this.calculateArcPosition(index, total);
    }
  }

  calculateArcPosition(index, total) {
    // Arc layout: semicircle from bottom-left to bottom-right
    // Low frequencies on left, high frequencies on right
    const centerX = this.width / 2;
    const centerY = this.height * 0.75; // Lower on screen
    const radius = Math.min(this.width, this.height) * 0.4; // Smaller radius to fit on screen

    // Angle from 180° (left) to 0° (right)
    const startAngle = Math.PI; // 180°
    const endAngle = 0; // 0°
    const angle = startAngle + (endAngle - startAngle) * (index / (total - 1));

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    return { x, y };
  }

  calculateBarPosition(index, total) {
    // Horizontal bar: linear arrangement at bottom
    // Low frequencies on left, high frequencies on right
    const padding = 80;
    const usableWidth = this.width - (padding * 2);
    const spacing = usableWidth / (total - 1);

    const x = padding + (spacing * index);
    const y = this.height * 0.75; // Move up from bottom to stay visible

    return { x, y };
  }

  calculateOrganicPosition(index, total) {
    // Organic layout: natural lava lamp positions
    // Still roughly arranged by frequency but with more randomness
    const rows = 4;
    const cols = Math.ceil(total / rows);
    const row = Math.floor(index / cols);
    const col = index % cols;

    const cellWidth = this.width / cols;
    const cellHeight = this.height / rows;

    // Base position in grid
    const baseX = cellWidth * (col + 0.5);
    const baseY = cellHeight * (row + 0.5);

    // Add randomness
    const randomX = (Math.random() - 0.5) * cellWidth * 0.6;
    const randomY = (Math.random() - 0.5) * cellHeight * 0.6;

    const x = baseX + randomX;
    const y = baseY + randomY;

    return { x, y };
  }

  update(bandEnergies) {
    if (bandEnergies.length !== this.blobs.length) {
      console.warn('Band energy count mismatch');
      return;
    }

    // Update each blob with its corresponding frequency band energy
    this.blobs.forEach((blob, index) => {
      const energy = bandEnergies[index] || 0;
      blob.update(energy, this.width, this.height, this.layout);
    });
  }

  getBlobAtPosition(x, y) {
    // Return topmost blob at position (iterate in reverse)
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      if (this.blobs[i].contains(x, y)) {
        return this.blobs[i];
      }
    }
    return null;
  }

  setLayout(newLayout) {
    if (this.layout === newLayout) return;

    console.log(`Switching layout from ${this.layout} to ${newLayout}`);
    this.layout = newLayout;

    // Recalculate positions for all blobs
    this.blobs.forEach((blob, index) => {
      const position = this.calculateBlobPosition(index, this.blobs.length);
      blob.homeX = position.x;
      blob.homeY = position.y;

      // Reset all blobs to new home positions when switching layouts
      blob.x = position.x;
      blob.y = position.y;
      blob.vx = 0;
      blob.vy = 0;
    });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    // Recalculate all positions
    this.blobs.forEach((blob, index) => {
      const position = this.calculateBlobPosition(index, this.blobs.length);
      blob.homeX = position.x;
      blob.homeY = position.y;

      if (this.layout !== 'organic') {
        blob.x = position.x;
        blob.y = position.y;
      }
    });
  }
}

export default BlobPhysics;
