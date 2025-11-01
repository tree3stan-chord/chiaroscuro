/**
 * KeyboardSynth - Keyboard-based synthesizer with piano key mapping
 * Maps computer keyboard to musical notes and manages note playback
 */

// Standard piano key mapping
// Lower octave (C4-B4): z/x/c/v/b/n/m (white) + s/d/f/g/h/j (black)
// Upper octave (C5-B5): q/w/e/r/t/y/u/i (white) + 2/3/5/6/7/9/0 (black)

export const NOTE_MAP = {
  // Lower octave white keys (C4-B4)
  'z': { note: 'C4', freq: 261.63, isBlack: false, octave: 4 },
  'x': { note: 'D4', freq: 293.66, isBlack: false, octave: 4 },
  'c': { note: 'E4', freq: 329.63, isBlack: false, octave: 4 },
  'v': { note: 'F4', freq: 349.23, isBlack: false, octave: 4 },
  'b': { note: 'G4', freq: 392.00, isBlack: false, octave: 4 },
  'n': { note: 'A4', freq: 440.00, isBlack: false, octave: 4 },
  'm': { note: 'B4', freq: 493.88, isBlack: false, octave: 4 },

  // Lower octave black keys
  's': { note: 'C#4', freq: 277.18, isBlack: true, octave: 4 },
  'd': { note: 'D#4', freq: 311.13, isBlack: true, octave: 4 },
  'g': { note: 'F#4', freq: 369.99, isBlack: true, octave: 4 },
  'h': { note: 'G#4', freq: 415.30, isBlack: true, octave: 4 },
  'j': { note: 'A#4', freq: 466.16, isBlack: true, octave: 4 },

  // Upper octave white keys (C5-B5)
  'q': { note: 'C5', freq: 523.25, isBlack: false, octave: 5 },
  'w': { note: 'D5', freq: 587.33, isBlack: false, octave: 5 },
  'e': { note: 'E5', freq: 659.25, isBlack: false, octave: 5 },
  'r': { note: 'F5', freq: 698.46, isBlack: false, octave: 5 },
  't': { note: 'G5', freq: 783.99, isBlack: false, octave: 5 },
  'y': { note: 'A5', freq: 880.00, isBlack: false, octave: 5 },
  'u': { note: 'B5', freq: 987.77, isBlack: false, octave: 5 },
  'i': { note: 'C6', freq: 1046.50, isBlack: false, octave: 6 },

  // Upper octave black keys
  '2': { note: 'C#5', freq: 554.37, isBlack: true, octave: 5 },
  '3': { note: 'D#5', freq: 622.25, isBlack: true, octave: 5 },
  '5': { note: 'F#5', freq: 739.99, isBlack: true, octave: 5 },
  '6': { note: 'G#5', freq: 830.61, isBlack: true, octave: 5 },
  '7': { note: 'A#5', freq: 932.33, isBlack: true, octave: 5 },
  '9': { note: 'C#6', freq: 1108.73, isBlack: true, octave: 6 },
};

class KeyboardSynth {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.activeNotes = new Map(); // key -> { oscillator, gainNode, noteInfo, synthBlobId }
    this.pressedKeys = new Set(); // Track which keys are currently pressed
    this.onNoteStart = null; // Callback for note start (creates blob)
    this.onNoteEnd = null; // Callback for note end
  }

  /**
   * Start playing a note
   * @param {string} key - The keyboard key pressed
   * @returns {object|null} Note info if started, null if already playing
   */
  startNote(key) {
    if (!this.audioEngine || !this.audioEngine.audioContext) return null;
    if (this.pressedKeys.has(key)) return null; // Already playing

    const noteInfo = NOTE_MAP[key];
    if (!noteInfo) return null; // Not a valid note key

    this.pressedKeys.add(key);

    const ctx = this.audioEngine.audioContext;
    const now = ctx.currentTime;

    // Create oscillator
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine'; // Can be 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.value = noteInfo.freq;

    // Create gain node for ADSR envelope
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;

    // FIX: Removed aggressive lowpass filter that was muffling notes
    // The 2kHz filter was cutting off harmonics, especially on lower notes
    // Direct connection for clean synth sound

    // Connect: oscillator -> gain -> masterGain (bypass dry/reverb for cleaner sound)
    oscillator.connect(gainNode);
    gainNode.connect(this.audioEngine.masterGainNode);

    // ADSR: Attack
    const attackTime = 0.05;
    const sustainLevel = 0.5; // Increased from 0.3 for more audible notes

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime);

    // Start oscillator
    oscillator.start(now);

    // Store active note
    const noteData = {
      oscillator,
      gainNode,
      noteInfo,
      startTime: now,
      synthBlobId: null // Will be set by callback
    };

    this.activeNotes.set(key, noteData);

    // Trigger callback to create synth blob
    if (this.onNoteStart) {
      const blobId = this.onNoteStart(noteInfo, key);
      noteData.synthBlobId = blobId;
    }

    console.log(`Started note: ${noteInfo.note} (${noteInfo.freq}Hz)`);

    return noteInfo;
  }

  /**
   * Stop playing a note
   * @param {string} key - The keyboard key released
   */
  stopNote(key) {
    if (!this.pressedKeys.has(key)) return;

    this.pressedKeys.delete(key);

    const noteData = this.activeNotes.get(key);
    if (!noteData) return;

    const ctx = this.audioEngine.audioContext;
    const now = ctx.currentTime;

    // ADSR: Release
    const releaseTime = 0.3;

    noteData.gainNode.gain.cancelScheduledValues(now);
    noteData.gainNode.gain.setValueAtTime(noteData.gainNode.gain.value, now);
    noteData.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

    // Stop oscillator after release
    noteData.oscillator.stop(now + releaseTime);

    // Trigger callback to fade out synth blob
    if (this.onNoteEnd) {
      this.onNoteEnd(noteData.synthBlobId, key, noteData.noteInfo);
    }

    // Clean up
    setTimeout(() => {
      this.activeNotes.delete(key);
    }, releaseTime * 1000 + 100);

    console.log(`Stopped note: ${noteData.noteInfo.note}`);
  }

  /**
   * Modulate active note parameters based on blob manipulation
   * @param {string} key - The keyboard key
   * @param {object} params - { pitch, volume }
   */
  modulateNote(key, params = {}) {
    const noteData = this.activeNotes.get(key);
    if (!noteData) return;

    const ctx = this.audioEngine.audioContext;
    const now = ctx.currentTime;

    // Pitch modulation (vibrato/bend)
    if (params.pitch !== undefined) {
      const bendAmount = params.pitch; // -1 to 1
      const bendedFreq = noteData.noteInfo.freq * Math.pow(2, bendAmount / 12); // ±1 semitone
      noteData.oscillator.frequency.setTargetAtTime(bendedFreq, now, 0.01);
    }

    // Volume modulation
    if (params.volume !== undefined) {
      const vol = Math.max(0, Math.min(0.6, params.volume)); // Increased max from 0.5
      noteData.gainNode.gain.setTargetAtTime(vol, now, 0.01);
    }
  }

  /**
   * Get currently active notes
   * @returns {Array} Array of { key, noteInfo, synthBlobId }
   */
  getActiveNotes() {
    return Array.from(this.activeNotes.entries()).map(([key, data]) => ({
      key,
      noteInfo: data.noteInfo,
      synthBlobId: data.synthBlobId
    }));
  }

  /**
   * Stop all notes (panic button)
   */
  stopAll() {
    const keys = Array.from(this.pressedKeys);
    keys.forEach(key => this.stopNote(key));
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    this.stopAll();
    this.activeNotes.clear();
    this.pressedKeys.clear();
  }
}

export default KeyboardSynth;
