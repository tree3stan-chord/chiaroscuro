'use client';

import { useEffect, useRef } from 'react';
import GenerativeAudioVisualizer from '../lib/GenerativeAudioVisualizer';
import SimplePaulstretch from '../lib/SimplePaulstretch';
import SuperSynth from '../lib/SuperSynth';

const ChiaroscuroCanvasSimple = ({ isActive, audioLevel, audioEngine }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const visualizerRef = useRef(null);
  const paulstretchRef = useRef(null);
  const synthRef = useRef(null);
  const mouseRef = useRef({ isDown: false, lastX: 0, lastY: 0 });
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

    // Initialize synth
    if (!synthRef.current && audioEngine && audioEngine.audioContext) {
      synthRef.current = new SuperSynth(audioEngine.audioContext);
      synthRef.current.connect(audioEngine.masterGainNode);
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

        // Get audio feedback from visual state
        if (paulstretchRef.current && isActive) {
          const feedback = visualizerRef.current.getAudioFeedback();

          // Map interaction to stretch parameters
          if (mouseRef.current.isDown) {
            // X position controls stretch factor
            const stretch = 1 + feedback.interactionX * 15; // 1x to 16x

            // Y position controls grain size
            const grainSize = 0.02 + feedback.interactionY * 0.4; // 20ms to 420ms

            // Interaction mode affects volume
            let volume = 0.3 + feedback.interactionEnergy * 0.5;

            if (feedback.interactionMode === 'pull') {
              // Pull mode: higher stretch, smaller grains
              paulstretchRef.current.setStretchFactor(stretch * 1.5);
              paulstretchRef.current.setGrainSize(grainSize * 0.5);
              volume *= 0.8; // Softer
            } else if (feedback.interactionMode === 'push') {
              // Push mode: moderate stretch, larger grains
              paulstretchRef.current.setStretchFactor(stretch * 0.8);
              paulstretchRef.current.setGrainSize(grainSize * 1.5);
              volume *= 1.2; // Louder
            } else if (feedback.interactionMode === 'twist') {
              // Twist mode: variable stretch based on flow disturbance
              paulstretchRef.current.setStretchFactor(1 + feedback.flowDisturbance * 10);
              paulstretchRef.current.setGrainSize(grainSize);
              volume *= 1.1;
            } else {
              // Normal drag
              paulstretchRef.current.setStretchFactor(stretch);
              paulstretchRef.current.setGrainSize(grainSize);
            }

            paulstretchRef.current.setVolume(volume);
          } else {
            // Not dragging: use particle density for ambient effects
            const ambientStretch = 1 + feedback.particleDensity * 3;
            paulstretchRef.current.setStretchFactor(ambientStretch);
            paulstretchRef.current.setVolume(0.3);
          }
        }
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
    };
  }, [isActive, audioLevel, audioEngine]);

  // Mouse handlers
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

    if (visualizerRef.current) {
      visualizerRef.current.handleMouseDown(x, y, modifiersRef.current);
    }

    // Start paulstretch on interaction
    if (paulstretchRef.current && !paulstretchRef.current.isPlaying) {
      paulstretchRef.current.start();
    }
  };

  const handleMouseMove = (e) => {
    if (!mouseRef.current.isDown || !visualizerRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate delta
    const dx = x - mouseRef.current.lastX;
    const dy = y - mouseRef.current.lastY;

    // Update modifiers from event
    modifiersRef.current = {
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey
    };

    visualizerRef.current.handleMouseMove(x, y, dx, dy, modifiersRef.current);

    // Update last position
    mouseRef.current.lastX = x;
    mouseRef.current.lastY = y;

    // Note: Paulstretch parameters are now controlled by feedback loop in animate()
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;

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
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Sound → Visuals → Sound (feedback loop)</div>
        <div>Drag: Push vortex, paint energy, bend sound</div>
        <div>Shift + Drag: Pull particles (ethereal) | Alt + Drag: Push (explosive) | Ctrl + Drag: Twist (chaotic)</div>
        <div style={{ marginTop: '6px' }}>Keyboard Synth: AWSEDFTGYHUJKOLP; (piano layout)</div>
        <div>Space: Toggle stretch | 1-9: Stretch amount | G: Grain size</div>
      </div>
    </div>
  );
};

export default ChiaroscuroCanvasSimple;