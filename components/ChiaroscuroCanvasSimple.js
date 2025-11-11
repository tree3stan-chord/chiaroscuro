'use client';

import { useEffect, useRef } from 'react';
import GenerativeAudioVisualizer from '../lib/GenerativeAudioVisualizer';
import SimplePaulstretch from '../lib/SimplePaulstretch';
import SuperSynth from '../lib/SuperSynth';
import DrawModeSynth from '../lib/DrawModeSynth';

const ChiaroscuroCanvasSimple = ({ isActive, audioLevel, audioEngine }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const visualizerRef = useRef(null);
  const paulstretchRef = useRef(null);
  const synthRef = useRef(null);
  const drawSynthRef = useRef(null);
  const mouseRef = useRef({ isDown: false, lastX: 0, lastY: 0, mode: 'none' });
  const modifiersRef = useRef({ shift: false, alt: false, ctrl: false });
  const activeNotesRef = useRef(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (visualizerRef.current) {
        visualizerRef.current.resize(canvas.width, canvas.height);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize visualizer
    if (!visualizerRef.current) {
      visualizerRef.current = new GenerativeAudioVisualizer(canvas.width, canvas.height);
    }

    // Initialize paulstretch
    if (!paulstretchRef.current && audioEngine && audioEngine.audioContext) {
      paulstretchRef.current = new SimplePaulstretch(audioEngine.audioContext);

      // Connect to audio chain
      if (audioEngine.micGainNode) {
        paulstretchRef.current.startCapture(audioEngine.micGainNode);
        paulstretchRef.current.connect(audioEngine.masterGainNode);
      }
    }

    // Initialize synth (SuperSynth auto-connects to audioEngine.masterGainNode)
    if (!synthRef.current && audioEngine) {
      synthRef.current = new SuperSynth(audioEngine);
    }

    // Initialize draw mode synth
    if (!drawSynthRef.current && audioEngine && audioEngine.audioContext) {
      drawSynthRef.current = new DrawModeSynth(audioEngine.audioContext);
      drawSynthRef.current.connect(audioEngine.masterGainNode);
    }

    // Keyboard to note mapping (chromatic scale starting from C3)
    const keyToNote = {
      'a': 'C3', 'w': 'C#3', 's': 'D3', 'e': 'D#3', 'd': 'E3',
      'f': 'F3', 't': 'F#3', 'g': 'G3', 'y': 'G#3', 'h': 'A3',
      'u': 'A#3', 'j': 'B3', 'k': 'C4', 'o': 'C#4', 'l': 'D4',
      'p': 'D#4', ';': 'E4'
    };

    // Note to frequency mapping
    const noteToFreq = (note) => {
      const notes = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
                     'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
      const match = note.match(/^([A-G]#?)(\d+)$/);
      if (!match) return 0;
      const [, noteName, octave] = match;
      const noteIndex = notes[noteName];
      const octaveNum = parseInt(octave);
      return 440 * Math.pow(2, (octaveNum - 4) + (noteIndex - 9) / 12);
    };

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      // Number keys control stretch factor
      if (e.key >= '1' && e.key <= '9' && paulstretchRef.current) {
        const stretch = parseInt(e.key);
        paulstretchRef.current.setStretchFactor(stretch);
        console.log(`Stretch factor: ${stretch}x`);
        return;
      }

      // Space toggles paulstretch
      if (e.key === ' ') {
        e.preventDefault();
        if (paulstretchRef.current) {
          if (paulstretchRef.current.isPlaying) {
            paulstretchRef.current.stop();
            console.log('Paulstretch stopped');
          } else {
            paulstretchRef.current.start();
            console.log('Paulstretch started');
          }
        }
        return;
      }

      // G adjusts grain size
      if ((e.key === 'g' || e.key === 'G') && paulstretchRef.current) {
        const size = e.shiftKey ? 0.05 : 0.2;
        paulstretchRef.current.setGrainSize(size);
        console.log(`Grain size: ${size}s`);
        return;
      }

      // Musical keyboard
      const note = keyToNote[e.key.toLowerCase()];
      if (note && synthRef.current && !activeNotesRef.current.has(e.key)) {
        const freq = noteToFreq(note);
        synthRef.current.noteOn(freq);
        activeNotesRef.current.add(e.key);

        // Create visual burst for synth note
        if (visualizerRef.current) {
          // Map frequency to position around circle
          const normalizedFreq = (Math.log2(freq / 261.63)) / 3; // C4 = 261.63 Hz, 3 octaves range
          const angle = normalizedFreq * Math.PI * 2;
          const radius = Math.min(canvas.width, canvas.height) * 0.3;
          const x = canvas.width / 2 + Math.cos(angle) * radius;
          const y = canvas.height / 2 + Math.sin(angle) * radius;

          const hue = (normalizedFreq * 300) % 360;
          visualizerRef.current.handleMouseDown(x, y, {});
        }

        console.log(`Note: ${note} (${freq.toFixed(1)} Hz)`);
      }
    };

    // Track modifier keys and release synth notes
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') modifiersRef.current.shift = false;
      if (e.key === 'Alt') modifiersRef.current.alt = false;
      if (e.key === 'Control') modifiersRef.current.ctrl = false;

      // Release synth note
      const note = keyToNote[e.key.toLowerCase()];
      if (note && synthRef.current && activeNotesRef.current.has(e.key)) {
        synthRef.current.noteOff();
        activeNotesRef.current.delete(e.key);
      }
    };

    const updateModifiers = (e) => {
      modifiersRef.current.shift = e.shiftKey;
      modifiersRef.current.alt = e.altKey;
      modifiersRef.current.ctrl = e.ctrlKey;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get audio data
      let bandEnergies;
      if (isActive && audioEngine) {
        bandEnergies = audioEngine.getBandEnergies();
      } else {
        // Generate some ambient energy for testing
        bandEnergies = new Array(24).fill(0).map((_, i) => {
          return Math.sin(Date.now() * 0.001 + i * 0.5) * 0.1 + 0.05;
        });
      }

      // Update and render visualizer
      if (visualizerRef.current) {
        visualizerRef.current.update(bandEnergies);
        visualizerRef.current.render(ctx);
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

      if (paulstretchRef.current) {
        paulstretchRef.current.stop();
        paulstretchRef.current.disconnect();
      }

      if (synthRef.current) {
        synthRef.current.disconnect();
      }

      if (drawSynthRef.current) {
        drawSynthRef.current.disconnect();
      }
    };
  }, [isActive, audioLevel, audioEngine]);

  // Mouse handlers - Two-mode system
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current.isDown = true;
    mouseRef.current.lastX = x;
    mouseRef.current.lastY = y;

    // Update modifiers from event
    modifiersRef.current = {
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey
    };

    // Determine mode based on modifiers
    if (modifiersRef.current.shift) {
      // MODIFY MODE: Shape vortex + paulstretch
      mouseRef.current.mode = 'modify';

      // Start paulstretch for modify mode
      if (paulstretchRef.current && !paulstretchRef.current.isPlaying) {
        paulstretchRef.current.start();
        console.log('Modify mode: Paulstretch started');
      }

      if (visualizerRef.current) {
        visualizerRef.current.handleMouseDown(x, y, { shift: true });
      }
    } else if (modifiersRef.current.alt) {
      // ALT MODE: Third effect (explosion burst)
      mouseRef.current.mode = 'alt';

      if (visualizerRef.current) {
        visualizerRef.current.handleMouseDown(x, y, { alt: true });
      }
    } else {
      // DRAW MODE: Generate ethereal tones
      mouseRef.current.mode = 'draw';
      // Draw mode doesn't need visualizer interaction, just draws
    }
  };

  const handleMouseMove = (e) => {
    if (!mouseRef.current.isDown) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate delta
    const dx = x - mouseRef.current.lastX;
    const dy = y - mouseRef.current.lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);

    // Update modifiers from event
    modifiersRef.current = {
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey
    };

    const normalizedX = x / canvas.width;
    const normalizedY = y / canvas.height;
    const velocity = Math.min(1, speed / 10);

    // Handle based on mode
    if (mouseRef.current.mode === 'draw') {
      // DRAW MODE: Generate ethereal tones
      if (drawSynthRef.current && speed > 1) {
        drawSynthRef.current.drawTone(x, y, velocity, normalizedX, normalizedY);
      }

      // Subtle visual trail (no vortex manipulation)
      if (visualizerRef.current && speed > 2) {
        const hue = normalizedX * 360;
        for (let i = 0; i < Math.min(3, speed * 0.2); i++) {
          visualizerRef.current.particles.push({
            x: x + (Math.random() - 0.5) * 5,
            y: y + (Math.random() - 0.5) * 5,
            vx: dx * 0.1,
            vy: dy * 0.1,
            hue,
            saturation: 60,
            lightness: 70,
            size: 1 + Math.random() * 2,
            life: 1.0,
            decay: 0.98
          });
        }
      }
    } else if (mouseRef.current.mode === 'modify') {
      // MODIFY MODE: Shape vortex + control paulstretch
      if (visualizerRef.current) {
        visualizerRef.current.handleMouseMove(x, y, dx, dy, { shift: true });
      }

      // Control paulstretch parameters
      if (paulstretchRef.current) {
        const stretch = 1 + normalizedX * 15; // 1x to 16x
        const grainSize = 0.02 + normalizedY * 0.4; // 20ms to 420ms
        paulstretchRef.current.setStretchFactor(stretch);
        paulstretchRef.current.setGrainSize(grainSize);
        paulstretchRef.current.setVolume(0.5 + velocity * 0.3);
      }
    } else if (mouseRef.current.mode === 'alt') {
      // ALT MODE: Push particles away
      if (visualizerRef.current) {
        visualizerRef.current.handleMouseMove(x, y, dx, dy, { alt: true });
      }
    }

    // Update last position
    mouseRef.current.lastX = x;
    mouseRef.current.lastY = y;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
    mouseRef.current.mode = 'none';

    if (visualizerRef.current) {
      visualizerRef.current.handleMouseUp();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
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
          cursor: mouseRef.current.isDown ? 'grabbing' : 'grab'
        }}
      />

      {/* Simple help overlay */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: 'rgba(255, 255, 255, 0.3)',
        fontFamily: 'monospace',
        fontSize: '11px',
        pointerEvents: 'none',
        textShadow: '0 0 5px rgba(0, 0, 0, 0.8)',
        lineHeight: '1.5'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.5)' }}>
          Two Modes: Draw & Modify
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: 'rgba(150, 255, 200, 0.5)' }}>Drag (Draw):</span> Paint ethereal tones from vortex
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: 'rgba(200, 150, 255, 0.5)' }}>Shift + Drag (Modify):</span> Shape vortex, paulstretch mic input
        </div>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255, 200, 150, 0.5)' }}>Alt + Drag:</span> Explosive particle burst
        </div>
        <div>Keyboard Synth: AWSEDFTGYHUJKOLP; (piano layout)</div>
        <div>Space: Toggle stretch | 1-9: Stretch amount | G: Grain size</div>
      </div>
    </div>
  );
};

export default ChiaroscuroCanvasSimple;