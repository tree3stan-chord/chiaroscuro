'use client';

import { useEffect, useRef, useState } from 'react';
import BlobPhysics from '../lib/BlobPhysics';

const ChiaroscuroCanvas = ({ isActive, audioLevel, audioEngine }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const blobPhysicsRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, draggedBlob: null, shiftHeld: false, dragStartPos: null });

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

    // Track shift key
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        mouseRef.current.shiftHeld = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        mouseRef.current.shiftHeld = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
    mouseRef.current.shiftHeld = e.shiftKey;

    // Check if clicking on a blob
    const blob = blobPhysicsRef.current.getBlobAtPosition(x, y);
    if (blob) {
      mouseRef.current.draggedBlob = blob;
      mouseRef.current.dragStartPos = { x: blob.x, y: blob.y };
      blob.isDragging = true;

      // Start audio synthesis on drag when shift is held
      if (mouseRef.current.shiftHeld && audioEngine && isActive) {
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
      const isShiftHeld = e.shiftKey || mouseRef.current.shiftHeld;

      if (isShiftHeld) {
        // Shift held: keep blob at original position, manipulate audio
        if (mouseRef.current.dragStartPos) {
          blob.x = mouseRef.current.dragStartPos.x;
          blob.y = mouseRef.current.dragStartPos.y;
        }

        // Calculate drag distance from start for audio parameters
        const dx = x - mouseRef.current.dragStartPos.x;
        const dy = y - mouseRef.current.dragStartPos.y;

        // Map drag distance to audio parameters
        if (audioEngine && isActive) {
          // Horizontal drag = time stretch (1x to 4x)
          const stretchFactor = 1 + Math.abs(dx) * 0.01;
          audioEngine.setTimeStretch(Math.min(stretchFactor, 4));

          // Vertical drag = pitch shift (-12 to +12 semitones)
          const pitchShift = -dy * 0.05;
          audioEngine.setPitchShift(Math.max(-12, Math.min(12, pitchShift)));
        }
      } else {
        // No shift: normal drag to move blob
        blob.x = x;
        blob.y = y;
      }
    }

    // Update cursor style
    const blob = blobPhysicsRef.current.getBlobAtPosition(x, y);
    if (blob) {
      const isShiftHeld = e.shiftKey || mouseRef.current.shiftHeld;
      canvasRef.current.style.cursor = isShiftHeld ? 'crosshair' : 'grab';
    } else {
      canvasRef.current.style.cursor = 'default';
    }
  };

  const handleMouseUp = () => {
    if (mouseRef.current.draggedBlob) {
      mouseRef.current.draggedBlob.isDragging = false;

      // Stop audio synthesis if it was started
      if (audioEngine && isActive) {
        audioEngine.stopGrainSynthesis();
      }
    }

    mouseRef.current.isDown = false;
    mouseRef.current.draggedBlob = null;
    mouseRef.current.dragStartPos = null;
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
