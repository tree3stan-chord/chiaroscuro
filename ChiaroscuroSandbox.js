'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Button, Alert } from 'react-bootstrap';
import { FaPlay, FaPause } from 'react-icons/fa';
import ChiaroscuroCanvas from './components/ChiaroscuroCanvas';
import ControlPanel from './components/ControlPanel';
import AudioEngine from './lib/AudioEngine';

const ChiaroscuroSandbox = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  const audioEngineRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.cleanup();
      }
    };
  }, []);

  // Audio level monitoring
  useEffect(() => {
    if (!isActive || !audioEngineRef.current) return;

    const updateAudioLevel = () => {
      const level = audioEngineRef.current.getAudioLevel();
      setAudioLevel(level);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive]);

  const toggleActive = async () => {
    if (isActive) {
      // Stop audio
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      setIsActive(false);
      return;
    }

    // Start - request mic and initialize if needed
    if (!audioEngineRef.current) {
      setIsInitializing(true);
      setError(null);

      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false
          }
        });

        // Store stream globally for AudioEngine
        window.chiaroscuroMicStream = stream;

        // Initialize audio engine
        audioEngineRef.current = new AudioEngine();
        await audioEngineRef.current.initialize();

        console.log('Audio engine initialized');
        setIsActive(true);
      } catch (err) {
        console.error('Failed to initialize:', err);

        let errorMessage = 'Failed to access microphone. ';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage += 'Please allow microphone access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage += 'No microphone found.';
        } else {
          errorMessage += err.message || 'Unknown error.';
        }

        setError(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    } else {
      // Already initialized, just start
      audioEngineRef.current.start();
      setIsActive(true);
    }
  };

  return (
    <Container fluid className="chiaroscuro-container p-0" style={{ height: '100vh', overflow: 'hidden' }}>
      {error && (
        <Alert variant="danger" className="m-3" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Canvas */}
      <ChiaroscuroCanvas
        isActive={isActive}
        audioLevel={audioLevel}
        audioEngine={audioEngineRef.current}
      />

      {/* Control Panel */}
      <ControlPanel
        isActive={isActive}
        onToggleActive={toggleActive}
        audioEngine={audioEngineRef.current}
      />

      {/* Start/Stop Button */}
      <div
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000
        }}
      >
        <Button
          variant={isActive ? 'danger' : 'success'}
          size="lg"
          onClick={toggleActive}
          disabled={isInitializing}
          className="d-flex align-items-center gap-2"
          style={{
            borderRadius: '50px',
            padding: '1rem 2rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
        >
          {isInitializing ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Initializing...
            </>
          ) : isActive ? (
            <>
              <FaPause /> Pause
            </>
          ) : (
            <>
              <FaPlay /> Start
            </>
          )}
        </Button>
      </div>
    </Container>
  );
};

export default ChiaroscuroSandbox;
