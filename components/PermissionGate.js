'use client';

import { useState } from 'react';
import { Container, Button, Card, Alert } from 'react-bootstrap';
import { FaMicrophone, FaExclamationTriangle } from 'react-icons/fa';

const PermissionGate = ({ onPermissionGranted, onPermissionDenied }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);

  const requestMicrophonePermission = async () => {
    setIsRequesting(true);
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

      // Successfully got permission
      console.log('Microphone permission granted');

      // Store the stream for later use
      window.chiaroscuroMicStream = stream;

      onPermissionGranted();
    } catch (err) {
      console.error('Microphone permission denied:', err);

      let errorMessage = 'Failed to access microphone. ';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Microphone is already in use by another application.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }

      setError(errorMessage);
      onPermissionDenied(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}
    >
      <Card
        className="text-center shadow-lg"
        style={{
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px'
        }}
      >
        <Card.Body className="p-5">
          <div className="mb-4">
            <FaMicrophone
              size={80}
              style={{ color: '#e74c3c' }}
            />
          </div>

          <h2 className="mb-3">Welcome to Chiaroscuro</h2>

          <p className="text-muted mb-4">
            An interactive audio-visual playground where you shape sound through fluid,
            lava lamp-like visuals. To begin, we need access to your microphone.
          </p>

          {error && (
            <Alert variant="danger" className="mb-4">
              <FaExclamationTriangle className="me-2" />
              {error}
            </Alert>
          )}

          <div className="mb-4">
            <h5 className="mb-3">How it works:</h5>
            <ul className="text-start text-muted" style={{ fontSize: '0.9rem' }}>
              <li className="mb-2">Speak, sing, or play sounds into your microphone</li>
              <li className="mb-2">Watch the lava lamp blobs respond to your audio</li>
              <li className="mb-2">Drag the blobs to stretch and manipulate the sound</li>
              <li className="mb-2">Create ethereal soundscapes in real-time</li>
            </ul>
          </div>

          <Button
            variant="danger"
            size="lg"
            onClick={requestMicrophonePermission}
            disabled={isRequesting}
            className="w-100"
            style={{
              borderRadius: '50px',
              padding: '1rem',
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              border: 'none'
            }}
          >
            {isRequesting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Requesting Access...
              </>
            ) : (
              <>
                <FaMicrophone className="me-2" />
                Grant Microphone Access
              </>
            )}
          </Button>

          <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.85rem' }}>
            Your audio is processed locally and never recorded or transmitted.
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PermissionGate;
