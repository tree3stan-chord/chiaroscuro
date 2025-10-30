'use client';

import { useEffect, useRef, useState } from 'react';
import BlobPhysics from '../lib/BlobPhysics';

const ChiaroscuroCanvas = ({ isActive, audioLevel, audioEngine }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const blobPhysicsRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, draggedBlob: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize blob physics
    if (!blobPhysicsRef.current) {
      blobPhysicsRef.current = new BlobPhysics(canvas.width, canvas.height);
    }

    // Animation loop
    const animate = () => {
      // Clear canvas with dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isActive && blobPhysicsRef.current) {
        // Update blob physics
        blobPhysicsRef.current.update(audioLevel);

        // Render blobs
        blobPhysicsRef.current.blobs.forEach(blob => {
          renderBlob(ctx, blob);
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

  const renderBlob = (ctx, blob) => {
    // Create radial gradient for glow effect
    const gradient = ctx.createRadialGradient(
      blob.x, blob.y, 0,
      blob.x, blob.y, blob.radius
    );

    // Color based on frequency (hue rotation)
    const hue = blob.hue || 0;
    gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.9)`);
    gradient.addColorStop(0.5, `hsla(${hue}, 70%, 50%, 0.6)`);
    gradient.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    ctx.fill();

    // Add inner glow
    const innerGradient = ctx.createRadialGradient(
      blob.x, blob.y, 0,
      blob.x, blob.y, blob.radius * 0.5
    );
    innerGradient.addColorStop(0, `hsla(${hue}, 90%, 80%, 0.4)`);
    innerGradient.addColorStop(1, `hsla(${hue}, 80%, 60%, 0)`);

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    if (!blobPhysicsRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current.x = x;
    mouseRef.current.y = y;
    mouseRef.current.isDown = true;

    // Check if clicking on a blob
    const blob = blobPhysicsRef.current.getBlobAtPosition(x, y);
    if (blob) {
      mouseRef.current.draggedBlob = blob;
      blob.isDragging = true;

      // Start audio synthesis on drag
      if (audioEngine && isActive) {
        audioEngine.startGrainSynthesis();
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!blobPhysicsRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prevX = mouseRef.current.x;
    const prevY = mouseRef.current.y;

    mouseRef.current.x = x;
    mouseRef.current.y = y;

    if (mouseRef.current.isDown && mouseRef.current.draggedBlob) {
      const blob = mouseRef.current.draggedBlob;

      // Update blob position
      blob.x = x;
      blob.y = y;

      // Calculate drag velocity for audio parameters
      const dx = x - prevX;
      const dy = y - prevY;

      // Map drag to audio parameters
      if (audioEngine && isActive) {
        // Horizontal drag = time stretch (1x to 4x)
        const stretchFactor = 1 + Math.abs(dx) * 0.1;
        audioEngine.setTimeStretch(Math.min(stretchFactor, 4));

        // Vertical drag = pitch shift (-12 to +12 semitones)
        const pitchShift = -dy * 0.1;
        audioEngine.setPitchShift(Math.max(-12, Math.min(12, pitchShift)));
      }
    }

    // Update cursor style
    const blob = blobPhysicsRef.current.getBlobAtPosition(x, y);
    canvasRef.current.style.cursor = blob ? 'grab' : 'default';
  };

  const handleMouseUp = () => {
    if (mouseRef.current.draggedBlob) {
      mouseRef.current.draggedBlob.isDragging = false;

      // Stop audio synthesis
      if (audioEngine && isActive) {
        audioEngine.stopGrainSynthesis();
      }
    }

    mouseRef.current.isDown = false;
    mouseRef.current.draggedBlob = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#0a0a0a'
      }}
    />
  );
};

export default ChiaroscuroCanvas;
