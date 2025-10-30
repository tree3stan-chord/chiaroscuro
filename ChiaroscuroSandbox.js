'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Button, Alert } from 'react-bootstrap';
import { FaMicrophone, FaPlay, FaPause } from 'react-icons/fa';
import PermissionGate from './components/PermissionGate';
import ChiaroscuroCanvas from './components/ChiaroscuroCanvas';
import ControlPanel from './components/ControlPanel';
import AudioEngine from './lib/AudioEngine';

const ChiaroscuroSandbox = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioEngineRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize audio engine when permission is granted
  useEffect(() => {
    if (hasPermission && !audioEngineRef.current) {
      try {
        audioEngineRef.current = new AudioEngine();
        audioEngineRef.current.initialize()
          .then(() => {
            console.log('Audio engine initialized');
          })
          .catch(err => {
            console.error('Failed to initialize audio engine:', err);
            setError('Failed to initialize audio system. Please check your microphone.');
          });
      } catch (err) {
        console.error('Error creating audio engine:', err);
        setError('Failed to create audio system.');
      }
    }

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.cleanup();
      }
    };
  }, [hasPermission]);

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

  const handlePermissionGranted = () => {
    setHasPermission(true);
    setError(null);
  };

  const handlePermissionDenied = (errorMessage) => {
    setError(errorMessage);
    setHasPermission(false);
  };

  const toggleActive = () => {
    if (!audioEngineRef.current) return;

    if (isActive) {
      audioEngineRef.current.stop();
    } else {
      audioEngineRef.current.start();
    }
    setIsActive(!isActive);
  };

  return (
    <Container fluid className="chiaroscuro-container p-0" style={{ height: '100vh', overflow: 'hidden' }}>
      {!hasPermission ? (
        <PermissionGate
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
        />
      ) : (
        <>
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
              className="d-flex align-items-center gap-2"
              style={{
                borderRadius: '50px',
                padding: '1rem 2rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}
            >
              {isActive ? (
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
        </>
      )}
    </Container>
  );
};

export default ChiaroscuroSandbox;
