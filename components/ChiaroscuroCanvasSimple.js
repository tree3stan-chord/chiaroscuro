'use client';

import { useEffect, useRef } from 'react';
import KaleidoscopeVisualizer from '../lib/KaleidoscopeVisualizer';
import SimplePaulstretch from '../lib/SimplePaulstretch';

const ChiaroscuroCanvasSimple = ({ isActive, audioLevel, audioEngine }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const visualizerRef = useRef(null);
  const paulstretchRef = useRef(null);
  const mouseRef = useRef({ isDown: false, lastX: 0, lastY: 0 });

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
      visualizerRef.current = new KaleidoscopeVisualizer(canvas.width, canvas.height);
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

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if (!paulstretchRef.current) return;

      // Number keys control stretch factor
      if (e.key >= '1' && e.key <= '9') {
        const stretch = parseInt(e.key);
        paulstretchRef.current.setStretchFactor(stretch);
        console.log(`Stretch factor: ${stretch}x`);
      }

      // Space toggles paulstretch
      if (e.key === ' ') {
        e.preventDefault();
        if (paulstretchRef.current.isPlaying) {
          paulstretchRef.current.stop();
          console.log('Paulstretch stopped');
        } else {
          paulstretchRef.current.start();
          console.log('Paulstretch started');
        }
      }

      // G adjusts grain size
      if (e.key === 'g' || e.key === 'G') {
        const size = e.shiftKey ? 0.05 : 0.2;
        paulstretchRef.current.setGrainSize(size);
        console.log(`Grain size: ${size}s`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

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

      // Update stretch based on overall energy
      if (paulstretchRef.current && isActive) {
        const avgEnergy = bandEnergies.reduce((a, b) => a + b, 0) / bandEnergies.length;

        // Auto-adjust stretch when dragging
        if (mouseRef.current.isDown) {
          const autoStretch = 1 + avgEnergy * 5;
          paulstretchRef.current.setStretchFactor(autoStretch);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (paulstretchRef.current) {
        paulstretchRef.current.stop();
        paulstretchRef.current.disconnect();
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

    if (visualizerRef.current && e.shiftKey) {
      // Shift+click creates energy burst at frequency band
      visualizerRef.current.handleClick(x, y);
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

    // Calculate delta for kaleidoscope drag
    const dx = x - mouseRef.current.lastX;
    const dy = y - mouseRef.current.lastY;

    visualizerRef.current.handleDrag(x, y, dx, dy);

    // Update last position
    mouseRef.current.lastX = x;
    mouseRef.current.lastY = y;

    // Adjust paulstretch parameters based on position
    if (paulstretchRef.current) {
      const stretch = 1 + (x / canvasRef.current.width) * 9; // 1x to 10x
      const grainSize = 0.05 + (y / canvasRef.current.height) * 0.3; // 50ms to 350ms

      paulstretchRef.current.setStretchFactor(stretch);
      paulstretchRef.current.setGrainSize(grainSize);
    }
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
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
        fontSize: '12px',
        pointerEvents: 'none',
        textShadow: '0 0 5px rgba(0, 0, 0, 0.8)'
      }}>
        <div>Click + Drag: Control kaleidoscope & stretch</div>
        <div>Shift + Click: Energy burst at frequency</div>
        <div>Space: Toggle paulstretch</div>
        <div>1-9: Set stretch factor</div>
        <div>G: Toggle grain size</div>
      </div>
    </div>
  );
};

export default ChiaroscuroCanvasSimple;