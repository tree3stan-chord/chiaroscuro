/**
 * BlobPhysics - Handles blob simulation and physics
 * Manages blob movement, collision, and audio-reactive behavior
 */

class Blob {
  constructor(x, y, radius, hue) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.baseRadius = radius;
    this.hue = hue;

    // Physics properties
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.isDragging = false;

    // Audio reactive properties
    this.targetRadius = radius;
    this.smoothRadius = radius;
  }

  update(audioLevel, width, height) {
    if (this.isDragging) {
      // Don't update physics while dragging
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Boundary collision
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -0.8; // Bounce with damping
    }
    if (this.x + this.radius > width) {
      this.x = width - this.radius;
      this.vx *= -0.8;
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy *= -0.8;
    }
    if (this.y + this.radius > height) {
      this.y = height - this.radius;
      this.vy *= -0.8;
    }

    // Apply velocity damping (smooth drift)
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Audio reactive size
    this.targetRadius = this.baseRadius + audioLevel * 50;
    this.smoothRadius += (this.targetRadius - this.smoothRadius) * 0.1;
    this.radius = this.smoothRadius;

    // Random drift
    this.vx += (Math.random() - 0.5) * 0.1;
    this.vy += (Math.random() - 0.5) * 0.1;

    // Limit velocity
    const maxSpeed = 3;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
  }

  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }
}

class BlobPhysics {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.blobs = [];

    // Create initial blob
    this.createBlob();
  }

  createBlob() {
    const x = this.width / 2;
    const y = this.height / 2;
    const radius = 80;
    const hue = 0; // Red-orange (lava color)

    const blob = new Blob(x, y, radius, hue);
    this.blobs.push(blob);
  }

  update(audioLevel) {
    // Update all blobs
    this.blobs.forEach(blob => {
      blob.update(audioLevel, this.width, this.height);
    });

    // Update blob color based on audio level
    // Shift hue from red (0) to orange (30) based on activity
    this.blobs.forEach(blob => {
      if (!blob.isDragging) {
        blob.hue = audioLevel * 100 * 30; // 0-30 hue range (red to orange)
      }
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

  resize(width, height) {
    this.width = width;
    this.height = height;
  }
}

export default BlobPhysics;
