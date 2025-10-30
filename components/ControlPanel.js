'use client';

import { useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { FaVolumeUp, FaCog, FaTimes, FaEraser } from 'react-icons/fa';

const ControlPanel = ({ isActive, onToggleActive, audioEngine }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [reverbAmount, setReverbAmount] = useState(0.3);
  const [inputGain, setInputGain] = useState(1.0);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioEngine) {
      audioEngine.setMasterVolume(val);
    }
  };

  const handleReverbChange = (e) => {
    const val = parseFloat(e.target.value);
    setReverbAmount(val);
    if (audioEngine) {
      audioEngine.setReverbAmount(val);
    }
  };

  const handleInputGainChange = (e) => {
    const val = parseFloat(e.target.value);
    setInputGain(val);
    if (audioEngine) {
      audioEngine.setInputGain(val);
    }
  };

  const handleClearAll = () => {
    if (audioEngine) {
      audioEngine.clearAllMemoryBlobs();
    }
  };

  return (
    <>
      {/* Settings Button */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 1000
        }}
      >
        <Button
          variant="dark"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-circle"
          style={{
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            background: 'rgba(20, 20, 30, 0.8)',
            backdropFilter: 'blur(10px)',
            border: 'none'
          }}
        >
          {isExpanded ? <FaTimes size={20} /> : <FaCog size={20} />}
        </Button>
      </div>

      {/* Control Panel */}
      {isExpanded && (
        <Card
          style={{
            position: 'absolute',
            top: '5rem',
            right: '1rem',
            width: '300px',
            zIndex: 999,
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        >
          <Card.Body className="p-4">
            <h5 className="text-white mb-4">
              <FaCog className="me-2" />
              Controls
            </h5>

            {/* Master Volume */}
            <Form.Group className="mb-4">
              <Form.Label className="text-white d-flex align-items-center gap-2">
                <FaVolumeUp />
                Master Volume
              </Form.Label>
              <Form.Range
                value={volume}
                min={0}
                max={1}
                step={0.01}
                onChange={handleVolumeChange}
              />
              <small className="text-muted">{Math.round(volume * 100)}%</small>
            </Form.Group>

            {/* Reverb Amount */}
            <Form.Group className="mb-4">
              <Form.Label className="text-white">
                Reverb Amount
              </Form.Label>
              <Form.Range
                value={reverbAmount}
                min={0}
                max={1}
                step={0.01}
                onChange={handleReverbChange}
              />
              <small className="text-muted">{Math.round(reverbAmount * 100)}%</small>
            </Form.Group>

            {/* Input Gain */}
            <Form.Group className="mb-4">
              <Form.Label className="text-white">
                Input Gain
              </Form.Label>
              <Form.Range
                value={inputGain}
                min={0.1}
                max={3}
                step={0.1}
                onChange={handleInputGainChange}
              />
              <small className="text-muted">{inputGain.toFixed(1)}x</small>
            </Form.Group>

            {/* Clear All Button */}
            <Button
              variant="outline-danger"
              className="w-100"
              onClick={handleClearAll}
              style={{
                borderRadius: '50px'
              }}
            >
              <FaEraser className="me-2" />
              Clear All
            </Button>

            <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.8rem' }}>
              Drag blobs to shape sound
            </p>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default ControlPanel;
