# Chiaroscuro Implementation Targets
## Roadmap to Full Feature Set

> **Goal**: Transform Chiaroscuro from a single-blob toy into a powerful spectral audio manipulation instrument

**Last Updated**: 2025-10-31
**Current Version**: 0.1.0-alpha
**Target Version**: 1.0.0

---

## Quick Status Overview

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 0: Foundation | ✅ Complete | 100% |
| Phase 1: Multi-Blob Spectral | 🏗️ In Progress | 15% |
| Phase 2: Core Interactions | 📋 Planned | 0% |
| Phase 3: Advanced Features | 📋 Planned | 0% |
| Phase 4: Polish & Optimization | 📋 Planned | 0% |
| Phase 5: Experimental | 💭 Conceptual | 0% |

---

## Phase 0: Foundation (COMPLETE ✅)

### Audio Engine
- [x] Web Audio API integration
- [x] Microphone input capture
- [x] Circular buffer for audio recording (10 seconds)
- [x] Basic granular synthesis
- [x] Time-stretching (1x to 4x)
- [x] Pitch-shifting (-12 to +12 semitones)
- [x] Reverb effect (delay-based)
- [x] Master gain control

### Visual System
- [x] Canvas rendering (60fps)
- [x] Single blob with glow effect
- [x] Audio-reactive blob sizing
- [x] Color mapping (hue rotation)
- [x] Blob physics simulation
- [x] Boundary collision detection

### Interaction
- [x] Normal drag to move blob
- [x] Shift+drag for audio manipulation
- [x] Hover feedback
- [x] Cursor changes
- [x] Browser mic permission (no modal)

### UI/UX
- [x] Start/Pause button
- [x] Control panel (volume, reverb, input gain)
- [x] Error handling and display
- [x] Full-screen seamless interface
- [x] Back to Studio navigation

---

## Phase 1: Multi-Blob Spectral System 🏗️

**Target**: Replace single blob with 24 frequency-mapped blobs

### 1.1 FFT Analysis & Frequency Mapping
**Priority**: CRITICAL | **Estimated Time**: 4-6 hours

- [ ] Implement FFT analysis with proper bin mapping
- [ ] Define 24 frequency bands (see breakdown below)
- [ ] Calculate band energy/amplitude per frame
- [ ] Map frequency to color (warm → cool spectrum)
- [ ] Smooth amplitude changes to avoid jitter

**Frequency Band Breakdown** (24 bands):
```javascript
const FREQUENCY_BANDS = [
  // Sub-bass (1 blob)
  { min: 20, max: 60, color: 0 },      // Deep red

  // Bass (3 blobs)
  { min: 60, max: 120, color: 10 },    // Red
  { min: 120, max: 180, color: 15 },   // Red-orange
  { min: 180, max: 250, color: 20 },   // Orange

  // Low-mids (3 blobs)
  { min: 250, max: 350, color: 30 },   // Orange
  { min: 350, max: 450, color: 35 },   // Orange-yellow
  { min: 450, max: 500, color: 40 },   // Yellow

  // Mids (6 blobs)
  { min: 500, max: 750, color: 50 },   // Yellow
  { min: 750, max: 1000, color: 60 },  // Yellow-green
  { min: 1000, max: 1250, color: 80 }, // Green
  { min: 1250, max: 1500, color: 100 }, // Green
  { min: 1500, max: 1750, color: 120 }, // Green-cyan
  { min: 1750, max: 2000, color: 140 }, // Cyan

  // High-mids (4 blobs)
  { min: 2000, max: 2500, color: 160 }, // Cyan
  { min: 2500, max: 3000, color: 180 }, // Cyan-blue
  { min: 3000, max: 3500, color: 200 }, // Blue
  { min: 3500, max: 4000, color: 210 }, // Blue

  // Presence (4 blobs)
  { min: 4000, max: 5000, color: 220 }, // Blue
  { min: 5000, max: 6000, color: 230 }, // Blue
  { min: 6000, max: 7000, color: 240 }, // Blue-indigo
  { min: 7000, max: 8000, color: 250 }, // Indigo

  // Air (3 blobs)
  { min: 8000, max: 12000, color: 270 }, // Purple
  { min: 12000, max: 16000, color: 290 }, // Purple-violet
  { min: 16000, max: 20000, color: 310 }, // Violet
];
```

### 1.2 Multi-Blob Physics & Rendering
**Priority**: CRITICAL | **Estimated Time**: 3-4 hours

- [ ] Update `BlobPhysics.js` to support 24 blobs
- [ ] Initialize blobs based on frequency band positions
- [ ] Per-blob audio-reactive sizing (independent amplitudes)
- [ ] Collision detection between blobs (optional bounce)
- [ ] Render all 24 blobs per frame efficiently
- [ ] Optimize canvas drawing (consider offscreen canvas)

### 1.3 Layout System
**Priority**: HIGH | **Estimated Time**: 2-3 hours

- [ ] **Arc Layout**: Arrange blobs in semicircle (low-left to high-right)
  - Calculate positions using polar coordinates
  - Spacing based on frequency distribution

- [ ] **Horizontal Bar Layout**: Linear arrangement like EQ
  - Equal spacing across bottom third of screen
  - Low frequencies left, high frequencies right

- [ ] **Organic Layout**: Natural lava lamp positions
  - Blobs gravitate toward frequency zones but float freely
  - Physics-based attraction to "home" position
  - Allow natural clustering/separation

- [ ] **Layout Toggle System**:
  - Keyboard shortcut: `Ctrl+L`
  - Smooth animation between layout transitions (500ms ease)
  - Persist layout preference in localStorage

### 1.4 Visual Mode Toggle
**Priority**: MEDIUM | **Estimated Time**: 2 hours

- [ ] **Soft Glow Mode** (current style)
  - Radial gradients, smooth edges
  - Lava lamp aesthetic

- [ ] **Abstract Geometric Mode**
  - Sharper edges, polygonal shapes
  - Hexagons, circles, or frequency-bar style
  - More technical/analytical look

- [ ] **Toggle System**:
  - Keyboard shortcut: `Ctrl+V`
  - Crossfade between styles (300ms)
  - Persist preference

### 1.5 Per-Band Audio Processing
**Priority**: CRITICAL | **Estimated Time**: 6-8 hours

- [ ] Refactor `AudioEngine.js` for multi-band processing
- [ ] Create 24 independent grain synthesizers
- [ ] Band-pass filters for each frequency range
- [ ] Per-blob circular buffers (or shared with indexed access)
- [ ] Independent time-stretch per band
- [ ] Independent pitch-shift per band
- [ ] Mix all bands to master output
- [ ] CPU optimization (use AudioWorklet if possible)

**Architecture**:
```javascript
class MultiBandAudioEngine {
  bands: Array<{
    filter: BiquadFilterNode,
    analyser: AnalyserNode,
    grainSynth: GranularSynthesizer,
    buffer: CircularBuffer,
    gain: GainNode,
    pan: StereoPannerNode
  }>;

  processBand(bandIndex) {
    // Extract frequency band
    // Analyze energy
    // Generate grains
    // Apply effects
    // Mix to output
  }
}
```

---

## Phase 2: Core Interactions 📋

**Target**: Implement essential mouse/keyboard interactions

### 2.1 Selection System
**Priority**: HIGH | **Estimated Time**: 3-4 hours

- [ ] Click to select single blob
- [ ] Visual selection indicator (outline/ring)
- [ ] Display frequency range on hover/select
- [ ] Tab/Shift+Tab to cycle selection
- [ ] Lasso select (drag rectangle in empty space)
- [ ] Multi-select visual feedback
- [ ] Escape to deselect all

### 2.2 Enhanced Drag Interactions
**Priority**: HIGH | **Estimated Time**: 4-5 hours

- [ ] **Normal Drag** (already partially implemented)
  - X-axis = stereo panning per blob
  - Y-axis = reverb send amount
  - Add per-blob StereoPannerNode
  - Add per-blob reverb send

- [ ] **Ctrl+Drag**: Filter manipulation
  - X-axis = filter cutoff
  - Y-axis = filter Q/resonance
  - Visual: blob shape morphs based on Q

- [ ] **Alt+Drag**: Grain parameters
  - X-axis = grain size (10-500ms)
  - Y-axis = grain density
  - Visual: particle effects around blob

### 2.3 Multi-Blob Actions
**Priority**: MEDIUM | **Estimated Time**: 3-4 hours

- [ ] Double-click to solo blob
- [ ] Triple-click to freeze blob (memory blob)
- [ ] Frozen blob state:
  - Translucent white appearance
  - Continuous grain loop playback
  - Can be dragged independently
  - Unfreeze with another triple-click
- [ ] Visual differentiation for frozen vs active blobs

### 2.4 Keyboard Shortcuts
**Priority**: MEDIUM | **Estimated Time**: 2-3 hours

- [ ] Spacebar: Play/Pause (already implemented)
- [ ] Ctrl+L: Layout toggle (in Phase 1)
- [ ] Ctrl+V: Visual mode toggle (in Phase 1)
- [ ] Ctrl+C: Clear all (reset all blobs)
- [ ] F: Freeze selected blob(s)
- [ ] S: Solo selected blob(s)
- [ ] M: Mute selected blob(s)
- [ ] R: Reset selected blob(s)
- [ ] H: Hide/show HUD overlay
- [ ] Arrow keys: Fine positioning of selected blob
- [ ] ?: Show help overlay with keyboard shortcuts

### 2.5 Visual Feedback Enhancements
**Priority**: MEDIUM | **Estimated Time**: 2-3 hours

- [ ] Hover state improvements
  - Frequency label appears
  - Brightness increase
  - Gentle pulse animation

- [ ] Drag trail effect
  - Fading path showing blob movement
  - Different colors for different drag modes

- [ ] Parameter overlays
  - Show current values when manipulating
  - Floating text near blob
  - Mini-graph for waveform preview

- [ ] HUD display (toggleable with 'H')
  - Current mode indicator
  - Selected blob info
  - Master levels
  - Interaction hints

---

## Phase 3: Advanced Features 📋

**Target**: Power user features and deep control

### 3.1 Preset System
**Priority**: HIGH | **Estimated Time**: 4-5 hours

- [ ] Save current blob configuration
  - All blob positions, states, parameters
  - Layout mode, visual mode
  - Effect settings

- [ ] Load preset from file/localStorage
- [ ] Preset slots (1-9) with keyboard shortcuts
  - Shift+1-9: Recall preset
  - Ctrl+1-9: Save to slot

- [ ] Preset browser UI
- [ ] Export/import presets as JSON
- [ ] Factory presets included

### 3.2 Undo/Redo System
**Priority**: MEDIUM | **Estimated Time**: 3-4 hours

- [ ] Action history stack
- [ ] Ctrl+Z: Undo last action
- [ ] Ctrl+Y: Redo
- [ ] History limit (50 actions)
- [ ] Serialize state changes efficiently

### 3.3 Automation Recording
**Priority**: MEDIUM | **Estimated Time**: 5-6 hours

- [ ] Record blob movements and manipulations
- [ ] Playback automation as loop
- [ ] Visual: ghost trails during playback
- [ ] Edit automation points
- [ ] Save/load automation with presets
- [ ] Keyboard shortcut to arm/disarm recording

### 3.4 Blob Linking & Relationships
**Priority**: LOW | **Estimated Time**: 4-5 hours

- [ ] Draw connections between blobs
- [ ] Link types:
  - Simple mix
  - Ring modulation
  - Frequency modulation
  - Cross-synthesis

- [ ] Visual: beam/line connecting linked blobs
- [ ] Break links with Alt+Click

### 3.5 Advanced Audio Features
**Priority**: MEDIUM | **Estimated Time**: 6-8 hours

- [ ] Spectral freezing (proper FFT-based)
- [ ] Phase randomization for paulstretch effect
- [ ] Formant preservation during pitch shifting
- [ ] Convolution reverb (load impulse responses)
- [ ] Additional effects:
  - Chorus
  - Flanger
  - Phaser
  - Delay (separate from reverb)
  - Distortion/saturation

### 3.6 Sandbox Mode (No Mic Input)
**Priority**: HIGH | **Estimated Time**: 5-7 hours

- [ ] Generate tones from blob properties
  - Position = pitch
  - Size = amplitude
  - Color = timbre/filter

- [ ] Oscillator bank (24 oscillators, one per blob)
- [ ] Drag blob = create/shape sound from scratch
- [ ] No microphone required
- [ ] Toggle between "Mic Input" and "Sandbox" modes
- [ ] Pure synthesis playground

---

## Phase 4: Polish & Optimization 📋

**Target**: Production-ready performance and UX

### 4.1 Performance Optimization
**Priority**: CRITICAL | **Estimated Time**: 4-6 hours

- [ ] Benchmark current performance
- [ ] Migrate to AudioWorklet for grain synthesis
- [ ] Optimize canvas rendering:
  - Dirty region tracking
  - Offscreen canvas for static elements
  - WebGL rendering (optional, if needed)

- [ ] Reduce garbage collection:
  - Object pooling for grains
  - Reuse typed arrays

- [ ] Throttle/debounce expensive operations
- [ ] Profile and eliminate bottlenecks
- [ ] Target: 60fps with <10% CPU usage

### 4.2 Visual Polish
**Priority**: HIGH | **Estimated Time**: 3-4 hours

- [ ] Motion blur on fast blob movements
- [ ] Particle systems for interactions
- [ ] Smoother animations (easing functions)
- [ ] Better color gradients and blending
- [ ] Optional bloom/glow post-processing
- [ ] Responsive design for different screen sizes

### 4.3 UX Improvements
**Priority**: HIGH | **Estimated Time**: 3-4 hours

- [ ] Onboarding tutorial/tour (first-time users)
- [ ] Contextual hints based on user actions
- [ ] Better error messages
- [ ] Loading states and progress indicators
- [ ] Accessibility improvements:
  - Keyboard-only navigation
  - Screen reader support
  - High contrast mode

- [ ] Mobile/tablet optimization:
  - Touch gestures
  - Responsive layout
  - Performance on mobile devices

### 4.4 Audio Quality
**Priority**: HIGH | **Estimated Time**: 3-4 hours

- [ ] Higher quality grain windowing (multiple window types)
- [ ] Anti-aliasing for pitch shifting
- [ ] Better filter design (higher order)
- [ ] Dithering for output
- [ ] Analyze and reduce audio artifacts
- [ ] Master limiter to prevent clipping

### 4.5 Settings & Configuration
**Priority**: MEDIUM | **Estimated Time**: 2-3 hours

- [ ] Settings panel
- [ ] Adjustable parameters:
  - Number of frequency bands (12/24/48)
  - FFT size
  - Audio buffer size
  - Visual quality (high/medium/low)

- [ ] Persist settings in localStorage
- [ ] Reset to defaults option

---

## Phase 5: Experimental Features 💭

**Target**: Cutting-edge, optional features

### 5.1 MIDI Support
**Priority**: LOW | **Estimated Time**: 4-5 hours

- [ ] Web MIDI API integration
- [ ] Map MIDI controllers to blob parameters
- [ ] MIDI note input triggers blobs
- [ ] MIDI learn functionality
- [ ] Save MIDI mappings with presets

### 5.2 Export & Recording
**Priority**: MEDIUM | **Estimated Time**: 3-4 hours

- [ ] Record audio output to WAV/MP3
- [ ] Export to DAWn_EE (parent Studio app)
- [ ] Render automation to audio file
- [ ] Export settings:
  - Duration
  - Format
  - Sample rate
  - Bit depth

### 5.3 Collaborative Mode
**Priority**: VERY LOW | **Estimated Time**: 10-15 hours

- [ ] Multi-user support (WebRTC or WebSockets)
- [ ] Each user controls different blobs
- [ ] Color-coded users
- [ ] Real-time synchronization
- [ ] Session sharing via URL

### 5.4 AI/ML Features
**Priority**: VERY LOW | **Estimated Time**: 8-12 hours

- [ ] Auto-generate interesting configurations
- [ ] Learn from user preferences
- [ ] Suggest blob manipulations
- [ ] Beat detection and rhythm sync
- [ ] Genre-based preset generation

### 5.5 VR/AR Support
**Priority**: VERY LOW | **Estimated Time**: 15-20 hours

- [ ] WebXR API integration
- [ ] 3D blob visualization
- [ ] Hand tracking for blob manipulation
- [ ] Spatial audio (binaural)
- [ ] Immersive environment

---

## Technical Debt & Bug Fixes

### Current Known Issues
- [ ] Audio glitches when CPU is high
- [ ] Blob physics can get "stuck" in corners
- [ ] ScriptProcessorNode deprecated (migrate to AudioWorklet)
- [ ] No proper cleanup on component unmount
- [ ] Memory leak in circular buffer (verify)

### Code Quality
- [ ] Add TypeScript definitions
- [ ] Write unit tests for audio engine
- [ ] Integration tests for interactions
- [ ] Document all functions with JSDoc
- [ ] Refactor long functions (>100 lines)
- [ ] Consistent naming conventions
- [ ] Error boundary improvements

---

## Dependencies & Infrastructure

### Required Libraries (Potential Additions)
- [ ] `tone.js` - Consider for advanced audio features
- [ ] `d3.js` - For complex animations/transitions
- [ ] `gl-matrix` - If moving to WebGL
- [ ] `workbox` - For PWA/offline support

### Build & Deploy
- [ ] Optimize bundle size
- [ ] Code splitting for lazy loading
- [ ] Service worker for offline mode
- [ ] CDN for static assets
- [ ] Automated testing in CI/CD

---

## Metrics & Success Criteria

### Performance Targets
- **Frame Rate**: 60 FPS (constant)
- **CPU Usage**: <10% on modern hardware
- **Memory**: <150MB for 10-minute session
- **Audio Latency**: <50ms (interaction to sound)
- **Load Time**: <2 seconds

### User Experience Targets
- **Time to First Sound**: <10 seconds (including mic permission)
- **Learning Curve**: Basic use within 2 minutes
- **Feature Discoverability**: 80% of features found without manual
- **Error Rate**: <1% user actions result in errors

### Code Quality Targets
- **Test Coverage**: >70%
- **Documentation**: 100% of public APIs
- **Linting**: Zero warnings
- **Bundle Size**: <500KB (gzipped)

---

## Timeline Estimates

| Phase | Estimated Time | Target Completion |
|-------|---------------|-------------------|
| Phase 1: Multi-Blob | 2-3 weeks | Week of Nov 18, 2025 |
| Phase 2: Core Interactions | 1-2 weeks | Week of Dec 2, 2025 |
| Phase 3: Advanced | 3-4 weeks | Week of Dec 30, 2025 |
| Phase 4: Polish | 1-2 weeks | Week of Jan 13, 2026 |
| Phase 5: Experimental | Ongoing | TBD |

**Total to v1.0**: ~2-3 months of focused development

---

## Priority Matrix

### Must Have (v1.0)
- Multi-blob spectral system
- Layout toggle system
- Visual mode toggle
- Per-band audio processing
- Core interactions (drag, select, keyboard)
- Preset system
- Performance optimization

### Should Have (v1.1)
- Freeze/memory blobs
- Sandbox mode
- Automation recording
- Export/recording
- Advanced keyboard shortcuts

### Could Have (v1.2)
- MIDI support
- Blob linking
- Advanced effects
- Mobile optimization

### Won't Have (v1.x)
- Collaborative mode
- AI/ML features
- VR/AR support

---

## Next Immediate Steps

### This Session
1. ✅ Create INTERACTION.md
2. ✅ Create TARGETS.md
3. ⏭️ Begin Phase 1.1: FFT Analysis implementation
4. ⏭️ Implement 24-blob initialization

### Next Session
1. Complete Phase 1.1 & 1.2 (multi-blob system)
2. Implement layout toggle (Arc, Bar, Organic)
3. Start Phase 1.5 (per-band audio processing)

---

**Philosophy**: Build incrementally, test continuously, prioritize user experience over feature count.

**Motto**: "Every blob tells a story, every drag shapes the soundscape."
