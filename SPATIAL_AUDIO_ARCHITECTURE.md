# Spatial Audio Architecture

## Current Issues

### Visual
1. **Arc layout positioning**: Blobs too close together, clumped at bottom of screen
2. **Static blobs**: Blobs only pulse in size, don't move spatially in response to audio
3. **Weak pulse effect**: Pulse is subtle, needs to be bigger and brighter

### Audio Interaction
1. **Dragging produces no effect**: Current drag manipulation doesn't affect sound meaningfully
2. **Global synthesis only**: Single grain synthesis engine affects all audio, not per-band
3. **No per-band isolation**: Can't isolate and manipulate individual frequency bands

## Vision: Living Sound Sculptures

Transform Chiaroscuro into a true spatial audio playground where:
- Each blob is a **living sound object** representing its frequency band
- Blobs **move through space** in response to audio energy (not just pulse)
- **Dragging a blob** = sculpting that frequency band's sound
- Create **partial-paulstretch** effects by stretching individual bands

### The Goal
"I want to grab the bass frequencies, stretch them into a drone, while the mids float around untouched, and the highs are being shaped by another drag"

## Technical Architecture

### 1. Spatial Movement System

Each blob should have **position behavior** driven by audio energy:

```javascript
class Blob {
  update(energy) {
    // Current: Only pulse radius
    this.radius = baseRadius + energy * 80;

    // NEW: Spatial movement
    // Energy creates outward force from home position
    const energyForce = energy * 5; // Pixels per frame
    const angle = this.spatialPhase; // Unique per blob

    this.spatialOffsetX += cos(angle) * energyForce;
    this.spatialOffsetY += sin(angle) * energyForce;

    // Drift back to home with spring physics
    this.spatialOffsetX *= 0.95; // Damping
    this.spatialOffsetY *= 0.95;

    // Final position = home + spatial offset
    this.renderX = this.homeX + this.spatialOffsetX;
    this.renderY = this.homeY + this.spatialOffsetY;
  }
}
```

**Key behaviors:**
- Energy spike → blob "jumps" away from home position
- Low energy → blob drifts back to home
- Each blob has unique `spatialPhase` angle (based on bandIndex)
- Creates organic, breathing movement across the canvas

### 2. Enhanced Pulse System

Make pulse more dramatic:

```javascript
// Increase size variation
this.targetRadius = this.baseRadius + energy * 150; // Was 80

// Brightness modulation
this.brightness = 50 + energy * 40; // 50-90% brightness

// Saturation boost on energy
this.saturation = 70 + energy * 30; // 70-100% saturation

// Glow intensity
this.glowRadius = this.radius * (1 + energy * 0.5); // Bigger outer glow
```

### 3. Per-Band Grain Synthesis (The Big One)

**Current Architecture:**
```
Microphone → AudioEngine (single grain buffer) → Single grain synth → Output
```

**New Architecture:**
```
Microphone → AudioEngine → 24 BandProcessors → Each blob has independent synthesis
                              ↓
                        [Band 0: 20-60Hz]   → Grain Buffer 0 → Grain Synth 0
                        [Band 1: 60-120Hz]  → Grain Buffer 1 → Grain Synth 1
                        [Band 2: 120-200Hz] → Grain Buffer 2 → Grain Synth 2
                        ...
                        [Band 23: 16k-20kHz] → Grain Buffer 23 → Grain Synth 23
```

#### BandProcessor Class

```javascript
class BandProcessor {
  constructor(audioContext, bandInfo, bandIndex) {
    this.ctx = audioContext;
    this.bandInfo = bandInfo; // { min: 20, max: 60 }
    this.bandIndex = bandIndex;

    // Band-pass filter for this frequency range
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = (bandInfo.min + bandInfo.max) / 2;
    this.filter.Q.value = 1.0;

    // Circular buffer for this band's audio (2 seconds)
    this.bufferSize = this.ctx.sampleRate * 2;
    this.audioBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    // ScriptProcessor to capture filtered audio
    this.scriptNode = this.ctx.createScriptProcessor(4096, 1, 1);
    this.scriptNode.onaudioprocess = (e) => this.captureAudio(e);

    // Grain synthesis state
    this.isGenerating = false;
    this.grainSize = 0.2; // 200ms grains
    this.timeStretchFactor = 1.0; // 1x = normal, 4x = extreme stretch
  }

  captureAudio(event) {
    const inputData = event.inputBuffer.getChannelData(0);
    for (let i = 0; i < inputData.length; i++) {
      this.audioBuffer[this.writeIndex] = inputData[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
  }

  startGrainSynthesis(timeStretchFactor) {
    this.timeStretchFactor = timeStretchFactor;
    this.isGenerating = true;
    this.generateGrain();
  }

  generateGrain() {
    // Similar to current AudioEngine.generateGrain()
    // but operates on this.audioBuffer (band-filtered audio)
    // and uses this.timeStretchFactor for stretch
  }

  stopGrainSynthesis() {
    this.isGenerating = false;
  }
}
```

#### AudioEngine Integration

```javascript
class AudioEngine {
  initialize() {
    // Create 24 BandProcessors
    this.bandProcessors = FREQUENCY_BANDS.map((bandInfo, i) => {
      const processor = new BandProcessor(this.audioContext, bandInfo, i);

      // Connect: mic → filter → scriptNode
      this.micGainNode.connect(processor.filter);
      processor.filter.connect(processor.scriptNode);
      processor.scriptNode.connect(this.audioContext.destination);

      return processor;
    });
  }

  // New method: trigger per-band synthesis
  startBandSynthesis(bandIndex, timeStretchFactor) {
    this.bandProcessors[bandIndex].startGrainSynthesis(timeStretchFactor);
  }

  stopBandSynthesis(bandIndex) {
    this.bandProcessors[bandIndex].stopGrainSynthesis();
  }
}
```

### 4. Blob Drag → Sound Mapping

When user drags a blob:

```javascript
handleMouseMove(e) {
  if (draggedBlob) {
    const blob = draggedBlob;
    const dragDistance = distance(blob.homeX, blob.homeY, mouseX, mouseY);

    // Map drag distance to time stretch
    // 0px = 1x (no stretch)
    // 200px = 4x (extreme paulstretch)
    const maxDragDistance = 200;
    const normalizedDistance = Math.min(dragDistance / maxDragDistance, 1.0);
    const timeStretchFactor = 1.0 + (normalizedDistance * 3.0); // 1x to 4x

    // Start synthesizing this blob's frequency band
    if (!blob.isSynthesizing) {
      audioEngine.startBandSynthesis(blob.bandIndex, timeStretchFactor);
      blob.isSynthesizing = true;
    } else {
      // Update stretch factor in real-time
      audioEngine.updateBandStretch(blob.bandIndex, timeStretchFactor);
    }
  }
}

handleMouseUp() {
  if (draggedBlob && draggedBlob.isSynthesizing) {
    audioEngine.stopBandSynthesis(draggedBlob.bandIndex);
    draggedBlob.isSynthesizing = false;
  }
}
```

### 5. Arc Layout Improvements

```javascript
calculateArcPosition(index, total) {
  const centerX = this.width / 2;
  const centerY = this.height * 0.6; // Was 0.75, move up more

  // Wider arc
  const radius = Math.min(this.width, this.height) * 0.5; // Was 0.4

  // More spread (fuller semicircle)
  const startAngle = Math.PI * 0.1; // Start angle
  const endAngle = Math.PI * 0.9;   // End angle (was 0-PI, now 0.1-0.9 for margins)
  const angleRange = endAngle - startAngle;

  const angle = startAngle + (index / (total - 1)) * angleRange;

  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY - Math.sin(angle) * radius // Negative for upward arc
  };
}
```

## Implementation Plan

### Phase 1: Visual Improvements (Quick Wins)
1. ✅ Fix arc layout positioning
2. ✅ Add spatial offset to blob movement
3. ✅ Enhance pulse intensity (size, brightness, glow)

### Phase 2: Per-Band Synthesis Core
1. Create `BandProcessor` class
2. Integrate into `AudioEngine` (create 24 processors)
3. Test basic per-band capture and playback

### Phase 3: Drag-to-Stretch Integration
1. Add drag distance tracking to `BlobPhysics`
2. Map drag distance to time-stretch factor
3. Connect drag events to `startBandSynthesis()`
4. Visual feedback (glowing blob, stretch indicator?)

### Phase 4: Polish & Refinement
1. Tune time-stretch mapping curve (linear vs exponential)
2. Add fade in/out for grain synthesis start/stop
3. Volume balancing (prevent clipping with multiple bands)
4. Visual indicators (show which blobs are being synthesized)

## Technical Challenges & Solutions

### Challenge 1: CPU Load
Running 24 grain synthesizers simultaneously could be heavy.

**Solution:**
- Only generate grains for dragged blobs
- Use longer grain intervals for less CPU usage
- Implement max simultaneous synthesis limit (e.g., 4 blobs at once)

### Challenge 2: Bandpass Filter Artifacts
Narrow bandpass filters can ring/distort.

**Solution:**
- Use moderate Q values (0.5-1.5)
- Consider using FFT bin isolation instead of filters
- Apply gentle windowing to grain edges

### Challenge 3: Audio Routing Complexity
24 separate audio chains need careful routing.

**Solution:**
- Each BandProcessor connects to master output via gain nodes
- Individual volume control per band
- Consider using AudioWorklet for better performance (future)

### Challenge 4: Real-time Stretch Factor Updates
Changing time-stretch while synthesizing can cause clicks.

**Solution:**
- Smooth interpolation of stretch factor
- Crossfade between grains when stretch changes
- Use exponential ramping for parameter changes

## Success Criteria

When this is complete, users should be able to:
- ✅ See blobs moving and pulsing organically in response to audio
- ✅ Drag a bass blob → hear deep, stretched bass drone
- ✅ Drag multiple blobs simultaneously → hear layered partial-paulstretch
- ✅ Release blob → smooth fade-out of stretched sound
- ✅ Arc layout feels spacious and natural

The experience should feel like **painting with frequency bands**, where each blob is a brush that can be pulled into ethereal textures.

## Future Enhancements

- **Blob momentum**: Keep synthesizing briefly after release (with decay)
- **Freeze mode**: Click blob to lock synthesis without dragging
- **Reverb per band**: Individual reverb amounts for each frequency band
- **Visual connections**: Draw lines between blobs being synthesized together
- **Preset save/load**: Save blob positions + stretch factors as "compositions"
