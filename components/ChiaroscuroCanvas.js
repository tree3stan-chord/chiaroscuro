'use client';

import { useEffect, useRef, useState } from 'react';
import BlobPhysics from '../lib/BlobPhysics';
import Explosion from '../lib/Explosion';
import KeyboardSynth from '../lib/KeyboardSynth';
import SynthBlob from '../lib/SynthBlob';

const ChiaroscuroCanvas = ({ isActive, audioLevel, audioEngine }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const blobPhysicsRef = useRef(null);
  const explosionsRef = useRef([]); // Track active explosions
  const currentBandEnergiesRef = useRef(null); // Store current band energies for explosion color
  const keyboardSynthRef = useRef(null); // Keyboard synth instance
  const synthBlobsRef = useRef([]); // Track synth-generated blobs
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, draggedBlob: null, draggedSynthBlob: null, shiftHeld: false, dragStartPos: null });
  const [layout, setLayout] = useState('arc'); // 'arc', 'bar', or 'organic'

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

    // Initialize keyboard synth
    if (!keyboardSynthRef.current && audioEngine) {
      keyboardSynthRef.current = new KeyboardSynth(audioEngine);

      // Callback when note starts: create synth blob
      keyboardSynthRef.current.onNoteStart = (noteInfo, key) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Spawn with slight random offset
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 100;

        const blob = new SynthBlob(
          centerX + offsetX,
          centerY + offsetY,
          noteInfo,
          key
        );

        synthBlobsRef.current.push(blob);
        return blob.id;
      };

      // Callback when note ends: fade out synth blob
      keyboardSynthRef.current.onNoteEnd = (blobId, key, noteInfo) => {
        const blob = synthBlobsRef.current.find(b => b.id === blobId);
        if (blob) {
          blob.fadeOut();
        }
      };
    }

    // Track shift key and handle keyboard shortcuts
    const handleKeyDown = (e) => {
      // Don't process if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Shift') {
        mouseRef.current.shiftHeld = true;
      }

      // Ctrl+L: Toggle layout
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setLayout(prev => {
          const layouts = ['arc', 'bar', 'organic'];
          const currentIndex = layouts.indexOf(prev);
          const nextIndex = (currentIndex + 1) % layouts.length;
          const nextLayout = layouts[nextIndex];
          console.log(`Layout: ${prev} → ${nextLayout}`);
          return nextLayout;
        });
        return;
      }

      // Keyboard synth: play note on key press
      if (keyboardSynthRef.current && !e.repeat) {
        const key = e.key.toLowerCase();
        keyboardSynthRef.current.startNote(key);
      }
    };

    const handleKeyUp = (e) => {
      // Don't process if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Shift') {
        mouseRef.current.shiftHeld = false;
      }

      // Keyboard synth: stop note on key release
      if (keyboardSynthRef.current) {
        const key = e.key.toLowerCase();
        keyboardSynthRef.current.stopNote(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initialize blob physics
    if (!blobPhysicsRef.current) {
      blobPhysicsRef.current = new BlobPhysics(canvas.width, canvas.height, layout);
    }

    // Update layout when it changes
    if (blobPhysicsRef.current && blobPhysicsRef.current.layout !== layout) {
      blobPhysicsRef.current.setLayout(layout);
    }

    // Animation loop
    const animate = () => {
      // Clear canvas with dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (blobPhysicsRef.current) {
        // Get band energies from audio engine
        let bandEnergies;
        if (isActive && audioEngine) {
          bandEnergies = audioEngine.getBandEnergies();
        } else {
          // Idle state: use zero energies
          bandEnergies = new Array(24).fill(0);
        }

        // Store current band energies for explosion color
        currentBandEnergiesRef.current = bandEnergies;

        // Update blob physics
        blobPhysicsRef.current.update(bandEnergies);

        // Render blobs
        blobPhysicsRef.current.blobs.forEach(blob => {
          renderBlob(ctx, blob);
        });
      }

      // Update and render explosions
      explosionsRef.current.forEach(explosion => explosion.update());
      explosionsRef.current = explosionsRef.current.filter(e => !e.isDead());
      explosionsRef.current.forEach(explosion => explosion.render(ctx));

      // Update and render synth blobs
      synthBlobsRef.current.forEach(blob => {
        blob.update(canvas.width, canvas.height);

        // Update synth modulation if blob is being dragged
        if (blob.isDragging && keyboardSynthRef.current) {
          const modulationParams = blob.getModulationParams();
          keyboardSynthRef.current.modulateNote(blob.key, modulationParams);
        }
      });

      // Remove dead synth blobs
      synthBlobsRef.current = synthBlobsRef.current.filter(b => !b.isDead());

      // Render synth blobs (on top of analysis blobs)
      synthBlobsRef.current.forEach(blob => blob.render(ctx));

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
      if (keyboardSynthRef.current) {
        keyboardSynthRef.current.cleanup();
      }
    };
  }, [isActive, audioLevel, audioEngine, layout]);

  const renderBlob = (ctx, blob) => {
    ctx.save();

    // Apply transformation for organic shape
    ctx.translate(blob.x, blob.y);
    ctx.rotate(blob.rotation || 0);
    ctx.scale(blob.scaleX || 1, blob.scaleY || 1);

    // Create radial gradient for glow effect (centered at origin after transform)
    const gradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, blob.radius
    );

    // Color based on frequency (hue rotation)
    const hue = blob.hue || 0;

    // Vary opacity based on energy for more life
    const energyOpacity = Math.max(0.5, blob.energy);
    gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, ${energyOpacity * 0.9})`);
    gradient.addColorStop(0.5, `hsla(${hue}, 70%, 50%, ${energyOpacity * 0.6})`);
    gradient.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, blob.radius, 0, Math.PI * 2);
    ctx.fill();

    // Add inner glow
    const innerGradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, blob.radius * 0.5
    );
    innerGradient.addColorStop(0, `hsla(${hue}, 90%, 80%, ${energyOpacity * 0.4})`);
    innerGradient.addColorStop(1, `hsla(${hue}, 80%, 60%, 0)`);

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, blob.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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

    // Check if clicking on a synth blob first (they render on top)
    let clickedSynthBlob = null;
    for (let i = synthBlobsRef.current.length - 1; i >= 0; i--) {
      if (synthBlobsRef.current[i].contains(x, y)) {
        clickedSynthBlob = synthBlobsRef.current[i];
        break;
      }
    }

    if (clickedSynthBlob) {
      // Dragging a synth blob
      mouseRef.current.draggedSynthBlob = clickedSynthBlob;
      clickedSynthBlob.startDrag();
      return;
    }

    // Check if clicking on an analysis blob
    const blob = blobPhysicsRef.current.getBlobAtPosition(x, y);
    if (blob) {
      mouseRef.current.draggedBlob = blob;
      mouseRef.current.dragStartPos = { x: blob.x, y: blob.y };
      blob.isDragging = true;

      // Start audio synthesis on drag when shift is held
      if (mouseRef.current.shiftHeld && audioEngine && isActive) {
        audioEngine.startGrainSynthesis();
      }
    } else {
      // Clicking on empty space - create explosion!
      const explosion = new Explosion(
        x,
        y,
        isActive ? audioEngine : null,
        currentBandEnergiesRef.current
      );
      explosionsRef.current.push(explosion);
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

    // Handle synth blob dragging
    if (mouseRef.current.isDown && mouseRef.current.draggedSynthBlob) {
      const synthBlob = mouseRef.current.draggedSynthBlob;
      synthBlob.x = x;
      synthBlob.y = y;
      // Modulation happens in animation loop
      return;
    }

    // Handle analysis blob dragging
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
    // Check synth blobs first
    let hoveredSynthBlob = false;
    for (let i = synthBlobsRef.current.length - 1; i >= 0; i--) {
      if (synthBlobsRef.current[i].contains(x, y)) {
        hoveredSynthBlob = true;
        break;
      }
    }

    if (hoveredSynthBlob) {
      canvasRef.current.style.cursor = 'grab';
    } else {
      const blob = blobPhysicsRef.current.getBlobAtPosition(x, y);
      if (blob) {
        const isShiftHeld = e.shiftKey || mouseRef.current.shiftHeld;
        canvasRef.current.style.cursor = isShiftHeld ? 'crosshair' : 'grab';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }
  };

  const handleMouseUp = () => {
    // Stop synth blob dragging
    if (mouseRef.current.draggedSynthBlob) {
      mouseRef.current.draggedSynthBlob.stopDrag();
      mouseRef.current.draggedSynthBlob = null;
    }

    // Stop analysis blob dragging
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
