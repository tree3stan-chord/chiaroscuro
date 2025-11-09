'use client';

import { useEffect, useRef, useState } from 'react';
import BlobPhysics from '../lib/BlobPhysics';
import FluidField from '../lib/FluidField';
import TonalBlob from '../lib/TonalBlob';
import SuperSynth from '../lib/SuperSynth';
import SynthBlob from '../lib/SynthBlob';

const ChiaroscuroCanvas = ({ isActive, audioLevel, audioEngine }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const blobPhysicsRef = useRef(null);
  const fluidFieldRef = useRef(null); // Fluid field visualization
  const tonalBlobsRef = useRef([]); // Track click-spawned tonal blobs
  const currentBandEnergiesRef = useRef(null); // Store current band energies
  const superSynthRef = useRef(null); // SuperSynth instance
  const synthBlobsRef = useRef([]); // Track synth-generated blobs
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, draggedBlob: null, draggedSynthBlob: null, draggedTonalBlob: null, shiftHeld: false, altHeld: false, ctrlHeld: false, dragStartPos: null });
  const [layout, setLayout] = useState('arc'); // 'arc', 'bar', or 'organic'
  const [visualMode, setVisualMode] = useState('fluid'); // fluid, blobs

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

    // Initialize SuperSynth
    if (!superSynthRef.current && audioEngine) {
      superSynthRef.current = new SuperSynth(audioEngine);

      // Callback when note starts: create synth blob
      superSynthRef.current.onNoteStart = (noteInfo, key) => {
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
      superSynthRef.current.onNoteEnd = (blobId, key, noteInfo) => {
        const blob = synthBlobsRef.current.find(b => b.id === blobId);
        if (blob) {
          blob.fadeOut();
        }
      };
    }

    // Track modifier keys and handle keyboard shortcuts
    const handleKeyDown = (e) => {
      // Don't process if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Track modifier keys
      if (e.key === 'Shift') mouseRef.current.shiftHeld = true;
      if (e.key === 'Alt') mouseRef.current.altHeld = true;
      if (e.key === 'Control') mouseRef.current.ctrlHeld = true;

      // Tab: Cycle visual modes
      if (e.key === 'Tab') {
        e.preventDefault();
        if (fluidFieldRef.current) {
          const modes = ['liquid', 'crystal', 'particle', 'neural', 'fractal'];
          const currentMode = fluidFieldRef.current.visualMode;
          const nextIndex = (modes.indexOf(currentMode) + 1) % modes.length;
          fluidFieldRef.current.setVisualMode(modes[nextIndex]);
          console.log(`Visual mode: ${currentMode} → ${modes[nextIndex]}`);
        }
        return;
      }

      // V: Toggle between fluid and blob visualization
      if (e.key === 'v' || e.key === 'V') {
        setVisualMode(prev => prev === 'fluid' ? 'blobs' : 'fluid');
        return;
      }

      // Ctrl+L: Toggle layout (for blob mode)
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

      // Space (hold): Freeze mode
      if (e.key === ' ') {
        e.preventDefault();
        // TODO: Implement freeze mode
      }

      // Number keys for presets
      if (e.key >= '1' && e.key <= '9') {
        const preset = parseInt(e.key);
        // TODO: Apply preset
        console.log(`Preset ${preset} selected`);
      }

      // SuperSynth: play note on key press
      if (superSynthRef.current && !e.repeat) {
        const key = e.key.toLowerCase();
        superSynthRef.current.startNote(key);
      }
    };

    const handleKeyUp = (e) => {
      // Don't process if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Track modifier key releases
      if (e.key === 'Shift') mouseRef.current.shiftHeld = false;
      if (e.key === 'Alt') mouseRef.current.altHeld = false;
      if (e.key === 'Control') mouseRef.current.ctrlHeld = false;

      // SuperSynth: stop note on key release
      if (superSynthRef.current) {
        const key = e.key.toLowerCase();
        superSynthRef.current.stopNote(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initialize visualization systems
    if (!blobPhysicsRef.current) {
      blobPhysicsRef.current = new BlobPhysics(canvas.width, canvas.height, layout);
    }

    if (!fluidFieldRef.current) {
      fluidFieldRef.current = new FluidField(canvas.width, canvas.height);
    }

    // Update layout when it changes (for blob mode)
    if (blobPhysicsRef.current && blobPhysicsRef.current.layout !== layout) {
      blobPhysicsRef.current.setLayout(layout);
    }

    // Animation loop
    const animate = () => {
      // Clear canvas with dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get band energies from audio engine
      let bandEnergies;
      if (isActive && audioEngine) {
        bandEnergies = audioEngine.getBandEnergies();
      } else {
        // Idle state: use zero energies
        bandEnergies = new Array(24).fill(0);
      }

      // Store current band energies
      currentBandEnergiesRef.current = bandEnergies;

      // Render based on visual mode
      if (visualMode === 'fluid' && fluidFieldRef.current) {
        // Update and render fluid field
        fluidFieldRef.current.update(bandEnergies);
        fluidFieldRef.current.render(ctx);
      } else if (visualMode === 'blobs' && blobPhysicsRef.current) {
        // Update and render blob physics
        blobPhysicsRef.current.update(bandEnergies);
        blobPhysicsRef.current.blobs.forEach(blob => {
          renderBlob(ctx, blob);
        });
      }

      // Update and render tonal blobs
      tonalBlobsRef.current.forEach(blob => blob.update(canvas.width, canvas.height));
      tonalBlobsRef.current = tonalBlobsRef.current.filter(b => !b.isDead());
      tonalBlobsRef.current.forEach(blob => blob.render(ctx));

      // Update and render synth blobs
      synthBlobsRef.current.forEach(blob => {
        blob.update(canvas.width, canvas.height);

        // Update synth modulation if blob is being dragged
        if (blob.isDragging && superSynthRef.current) {
          const modulationParams = blob.getModulationParams();
          superSynthRef.current.modulateNote(blob.key, modulationParams);
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
      if (superSynthRef.current) {
        superSynthRef.current.cleanup();
      }
    };
  }, [isActive, audioLevel, audioEngine, layout, visualMode]);

  const renderBlob = (ctx, blob) => {
    ctx.save();

    // Apply spatial offset for energy-reactive position
    const renderX = blob.x + (blob.spatialOffsetX || 0);
    const renderY = blob.y + (blob.spatialOffsetY || 0);

    // Apply transformation for organic shape
    ctx.translate(renderX, renderY);
    ctx.rotate(blob.rotation || 0);
    ctx.scale(blob.scaleX || 1, blob.scaleY || 1);

    // Get dynamic visual properties
    const hue = blob.hue || 0;
    let brightness = blob.brightness || 60;
    let saturation = blob.saturation || 80;
    const energyOpacity = Math.max(0.5, blob.energy);

    // PHASE 4: Visual boost when synthesizing
    if (blob.isSynthesizing) {
      brightness = Math.min(95, brightness + 20); // Brighter
      saturation = Math.min(100, saturation + 15); // More saturated
    }

    // Outer glow (more dramatic, extends beyond blob)
    const outerGlow = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, blob.radius * 1.5
    );
    outerGlow.addColorStop(0, `hsla(${hue}, ${saturation}%, ${brightness}%, ${energyOpacity * 0.6})`);
    outerGlow.addColorStop(0.6, `hsla(${hue}, ${saturation - 10}%, ${brightness - 10}%, ${energyOpacity * 0.3})`);
    outerGlow.addColorStop(1, `hsla(${hue}, ${saturation - 20}%, ${brightness - 20}%, 0)`);

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, blob.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Main body gradient
    const gradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, blob.radius
    );
    gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${brightness + 10}%, ${energyOpacity * 0.9})`);
    gradient.addColorStop(0.5, `hsla(${hue}, ${saturation - 10}%, ${brightness}%, ${energyOpacity * 0.7})`);
    gradient.addColorStop(1, `hsla(${hue}, ${saturation - 20}%, ${brightness - 10}%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, blob.radius, 0, Math.PI * 2);
    ctx.fill();

    // Bright inner core
    const innerGradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, blob.radius * 0.4
    );
    innerGradient.addColorStop(0, `hsla(${hue}, ${saturation + 10}%, ${Math.min(95, brightness + 30)}%, ${energyOpacity * 0.8})`);
    innerGradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${brightness + 20}%, 0)`);

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, blob.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // PHASE 4: Pulsing ring indicator when synthesizing
    if (blob.isSynthesizing) {
      const pulsePhase = Date.now() * 0.003; // Pulse speed
      const pulseOpacity = 0.3 + Math.sin(pulsePhase) * 0.2; // 0.1 - 0.5
      const ringRadius = blob.radius * 1.8;

      ctx.strokeStyle = `hsla(${hue}, 100%, 90%, ${pulseOpacity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ring for double effect
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${pulseOpacity * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current.x = x;
    mouseRef.current.y = y;
    mouseRef.current.isDown = true;
    mouseRef.current.shiftHeld = e.shiftKey;
    mouseRef.current.altHeld = e.altKey;
    mouseRef.current.ctrlHeld = e.ctrlKey;

    // Fluid field interactions
    if (visualMode === 'fluid' && fluidFieldRef.current) {
      if (e.button === 0) { // Left click
        if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
          // Normal click: spawn sonic well
          fluidFieldRef.current.addWell(x, y, 1);
          fluidFieldRef.current.addRipple(x, y, 0.8);
        } else if (e.shiftKey && !e.altKey) {
          // Shift+click: start time stretching
          mouseRef.current.dragStartPos = { x, y };
        } else if (e.altKey && !e.shiftKey) {
          // Alt+click: harmonic generation
          // Will be handled in drag
        } else if (e.ctrlKey) {
          // Ctrl+click: spectral filtering
          // Will be handled in drag
        }
      } else if (e.button === 2) { // Right click
        e.preventDefault();
        // Temporal anchor
        // TODO: Implement temporal anchor
        console.log('Temporal anchor at', x, y);
      }
      return;
    }

    // Original blob mode interactions
    if (!blobPhysicsRef.current) return;

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

      // Store drag start position for this blob (for distance calculation)
      blob.dragStartX = blob.x;
      blob.dragStartY = blob.y;

      // NEW: Start per-band synthesis immediately on drag
      if (audioEngine && isActive) {
        // Start with 1x stretch (will be updated in handleMouseMove)
        audioEngine.startBandSynthesis(blob.bandIndex, 1.0);
        blob.isSynthesizing = true;
        console.log(`Started synthesis for band ${blob.bandIndex}: ${blob.bandInfo.name}`);
      }

      // Legacy: Start global synthesis on drag when shift is held
      if (mouseRef.current.shiftHeld && audioEngine && isActive) {
        audioEngine.startGrainSynthesis();
      }
    } else {
      // Check if clicking on an existing tonal blob (to drag or remove)
      let clickedTonalBlob = null;
      for (let i = tonalBlobsRef.current.length - 1; i >= 0; i--) {
        if (tonalBlobsRef.current[i].contains(x, y)) {
          clickedTonalBlob = tonalBlobsRef.current[i];
          break;
        }
      }

      if (clickedTonalBlob) {
        // Start dragging tonal blob
        mouseRef.current.draggedTonalBlob = clickedTonalBlob;
        mouseRef.current.tonalBlobClickTime = Date.now(); // Track click time for click vs drag
        clickedTonalBlob.startDrag();
      } else {
        // Clicking on empty space - create tonal blob!
        const tonalBlob = new TonalBlob(
          x,
          y,
          audioEngine,
          canvasRef.current.width,
          canvasRef.current.height
        );
        tonalBlobsRef.current.push(tonalBlob);
      }
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prevX = mouseRef.current.x;
    const prevY = mouseRef.current.y;

    mouseRef.current.x = x;
    mouseRef.current.y = y;

    // Fluid field drag interactions
    if (visualMode === 'fluid' && fluidFieldRef.current && mouseRef.current.isDown) {
      const dx = x - prevX;
      const dy = y - prevY;

      if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
        // Normal drag: frequency painting - smear the field
        fluidFieldRef.current.applyForce(x, y, dx * 0.5, dy * 0.5);
        fluidFieldRef.current.addRipple(x, y, 0.3);
      } else if (e.shiftKey && !e.altKey) {
        // Shift+drag: time stretching
        if (mouseRef.current.dragStartPos) {
          const dragDx = x - mouseRef.current.dragStartPos.x;
          const dragDy = y - mouseRef.current.dragStartPos.y;
          const stretchFactor = 1 + Math.abs(dragDx) * 0.01; // Horizontal = stretch
          const grainSize = Math.max(0.05, 0.15 + dragDy * 0.001); // Vertical = grain size
          // TODO: Apply to paulstretch engine
          console.log(`Stretch: ${stretchFactor.toFixed(2)}x, Grain: ${grainSize.toFixed(3)}`);
        }
      } else if (e.altKey && !e.shiftKey) {
        // Alt+drag: harmonic generation
        // TODO: Create overtones
        console.log('Harmonic generation at', x, y);
      } else if (e.ctrlKey) {
        // Ctrl+drag: spectral filtering - carve out frequencies
        // TODO: Apply filtering
        console.log('Spectral filter at', x, y);
      } else if (e.shiftKey && e.altKey) {
        // Shift+Alt+drag: phase vocoding
        // TODO: Separate phase from amplitude
        console.log('Phase vocoding');
      }
      return;
    }

    if (!blobPhysicsRef.current) return;

    // Handle synth blob dragging
    if (mouseRef.current.isDown && mouseRef.current.draggedSynthBlob) {
      const synthBlob = mouseRef.current.draggedSynthBlob;
      synthBlob.x = x;
      synthBlob.y = y;
      // Modulation happens in animation loop
      return;
    }

    // Handle tonal blob dragging
    if (mouseRef.current.isDown && mouseRef.current.draggedTonalBlob) {
      const tonalBlob = mouseRef.current.draggedTonalBlob;
      tonalBlob.x = x;
      tonalBlob.y = y;
      // Audio modulation happens in blob's update method
      return;
    }

    // Handle analysis blob dragging
    if (mouseRef.current.isDown && mouseRef.current.draggedBlob) {
      const blob = mouseRef.current.draggedBlob;
      const isShiftHeld = e.shiftKey || mouseRef.current.shiftHeld;

      // NEW: Update per-band synthesis based on drag distance
      if (blob.isSynthesizing && audioEngine && isActive) {
        // Calculate drag distance from blob's home position
        const dx = blob.x - blob.dragStartX;
        const dy = blob.y - blob.dragStartY;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);

        // PHASE 4: Exponential stretch curve for better feel
        // Short drags (0-100px) → gentle stretch (1x-2x) - more control
        // Medium drags (100-200px) → noticeable stretch (2x-4x)
        // Long drags (200px+) → extreme stretch (4x-8x)
        const maxDragDistance = 250; // Increased from 200
        const normalizedDistance = Math.min(dragDistance / maxDragDistance, 1.0);

        // Exponential curve: stretch = 1 + 7 * (normalized^2)
        // This gives: 0px→1x, 125px→2x, 177px→4x, 250px→8x
        const timeStretchFactor = 1.0 + 7.0 * Math.pow(normalizedDistance, 2);

        // Update the stretch factor in real-time
        audioEngine.updateBandStretch(blob.bandIndex, timeStretchFactor);

        // Store for visual display (optional future feature)
        blob.currentStretch = timeStretchFactor;
      }

      if (isShiftHeld) {
        // Shift held: keep blob at original position, manipulate audio
        if (mouseRef.current.dragStartPos) {
          blob.x = mouseRef.current.dragStartPos.x;
          blob.y = mouseRef.current.dragStartPos.y;
        }

        // Calculate drag distance from start for audio parameters (legacy global synth)
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
      // Check tonal blobs
      let hoveredTonalBlob = false;
      for (let i = tonalBlobsRef.current.length - 1; i >= 0; i--) {
        if (tonalBlobsRef.current[i].contains(x, y)) {
          hoveredTonalBlob = true;
          break;
        }
      }

      if (hoveredTonalBlob) {
        canvasRef.current.style.cursor = 'pointer'; // Different cursor for tonal blobs
      } else {
        const blob = blobPhysicsRef.current.getBlobAtPosition(x, y);
        if (blob) {
          const isShiftHeld = e.shiftKey || mouseRef.current.shiftHeld;
          canvasRef.current.style.cursor = isShiftHeld ? 'crosshair' : 'grab';
        } else {
          canvasRef.current.style.cursor = 'default';
        }
      }
    }
  };

  const handleMouseUp = () => {
    // Stop synth blob dragging
    if (mouseRef.current.draggedSynthBlob) {
      mouseRef.current.draggedSynthBlob.stopDrag();
      mouseRef.current.draggedSynthBlob = null;
    }

    // Handle tonal blob click vs drag
    if (mouseRef.current.draggedTonalBlob) {
      const blob = mouseRef.current.draggedTonalBlob;
      const dragTime = Date.now() - (mouseRef.current.tonalBlobClickTime || 0);

      if (dragTime < 200) {
        // Quick click = remove the blob
        blob.remove();
        console.log(`Removing tonal blob: ${blob.baseFrequency.toFixed(1)}Hz`);
      } else {
        // Was a drag = stop modulating, reset audio to base state
        blob.stopDrag();
      }

      mouseRef.current.draggedTonalBlob = null;
      mouseRef.current.tonalBlobClickTime = null;
    }

    // Stop analysis blob dragging
    if (mouseRef.current.draggedBlob) {
      const blob = mouseRef.current.draggedBlob;
      blob.isDragging = false;

      // NEW: Stop per-band synthesis
      if (blob.isSynthesizing && audioEngine && isActive) {
        audioEngine.stopBandSynthesis(blob.bandIndex);
        blob.isSynthesizing = false;
        console.log(`Stopped synthesis for band ${blob.bandIndex}: ${blob.bandInfo.name}`);
      }

      // Legacy: Stop global audio synthesis if it was started
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
