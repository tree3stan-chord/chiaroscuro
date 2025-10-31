# Chiaroscuro Interaction Design
## Complete Interaction Possibility Map

> **Philosophy**: Every interaction should feel intuitive and generate immediate audio-visual feedback. The interface is the instrument.

---

## 1. Mouse/Touch Interactions

### 1.1 Blob Selection & Manipulation

#### **Hover Over Blob**
- **Visual**: Blob pulses gently, increases glow intensity
- **Info Display**: Show frequency range label (e.g., "250-500 Hz")
- **Cursor**: Changes to indicate interactivity
- **Audio**: Optional subtle preview tone for that frequency band

#### **Click (Single Tap)**
- **Action**: Select blob
- **Visual**: Blob highlights with outline/ring
- **Audio**: Trigger single grain from that frequency band
- **State**: Selected blob becomes target for keyboard shortcuts

#### **Double-Click**
- **Action**: Solo that frequency band
- **Visual**: All other blobs dim/desaturate
- **Audio**: Mute all other bands, only play this one
- **Toggle**: Double-click again to un-solo

#### **Triple-Click** (Advanced)
- **Action**: Freeze/Memory Blob
- **Visual**: Blob becomes translucent white with pulsing core
- **Audio**: Continuously loop captured grains from that band
- **State**: Frozen blob persists, can be unfrozen with another triple-click

#### **Long Press (Hold >500ms)**
- **Action**: Context menu or quick action wheel
- **Options**:
  - Freeze this band
  - Solo this band
  - Mute this band
  - Reset to default
  - Copy/paste band settings

---

### 1.2 Drag Interactions

#### **Normal Drag (No Modifier)**
- **Action**: Move blob in 2D space
- **X-Axis**: Stereo panning (left → center → right)
- **Y-Axis**: Reverb amount / wet-dry mix
- **Visual**: Blob leaves fading trail showing path
- **Audio**: Real-time panning and reverb adjustment
- **Constraint**: Optional snap-to-grid mode

#### **Shift + Drag**
- **Action**: Time-stretch and pitch manipulation (blob stays locked in place)
- **X-Axis**: Time-stretch factor (1x to 8x)
- **Y-Axis**: Pitch shift (-24 to +24 semitones)
- **Visual**:
  - Blob remains stationary
  - Cursor changes to crosshair
  - Ripple/wave effect radiates from blob
  - Parameter values displayed as overlay
- **Audio**: Granular time-stretching and pitch-shifting for that band
- **Feedback**: Visual indicator showing stretch amount (e.g., concentric circles expanding/contracting)

#### **Ctrl + Drag** (or Cmd + Drag on Mac)
- **Action**: Filter manipulation
- **X-Axis**: Filter cutoff frequency
- **Y-Axis**: Filter resonance (Q factor)
- **Visual**: Blob shape morphs (sharper = higher Q, softer = lower Q)
- **Audio**: Band-pass filter with adjustable cutoff and resonance
- **Type**: Default to band-pass, could toggle to low-pass/high-pass

#### **Alt + Drag**
- **Action**: Grain size and density
- **X-Axis**: Grain size (10ms to 500ms)
- **Y-Axis**: Grain density/overlap (sparse to dense)
- **Visual**: Particle effects around blob (more particles = denser grains)
- **Audio**: Changes grain synthesis parameters

#### **Shift + Ctrl + Drag** (Combined Modifiers)
- **Action**: Spectral morphing
- **X-Axis**: Morph between different spectral shapes
- **Y-Axis**: Harmonicity/inharmonicity
- **Visual**: Blob splits/merges showing spectral transformation
- **Audio**: FFT manipulation, phase randomization

#### **Two-Finger Drag / Middle Mouse Drag**
- **Action**: Blob size manipulation
- **Pinch/Zoom**: Changes amplitude/gain for that band
- **Visual**: Blob grows/shrinks
- **Audio**: Volume/gain adjustment for frequency band

#### **Circular Drag (Swirl Gesture)**
- **Action**: Add modulation/LFO
- **Direction**: Clockwise = positive modulation, counter-clockwise = negative
- **Speed**: Determines LFO rate
- **Visual**: Swirling particles around blob
- **Audio**: Apply tremolo, vibrato, or phaser effect to that band

---

### 1.3 Multi-Blob Interactions

#### **Lasso Select (Click + Drag in Empty Space)**
- **Action**: Select multiple blobs with rectangular selection
- **Visual**: Selection box appears, selected blobs highlight
- **Result**: Grouped selection for batch operations

#### **Drag Between Blobs (Draw Connection)**
- **Action**: Link two blobs together
- **Visual**: Line/beam connecting blobs
- **Audio**: Frequency mixing, cross-modulation between bands
- **Types**:
  - Simple mix
  - Ring modulation
  - Frequency modulation (one modulates the other)

#### **Merge Blobs (Drag One Onto Another)**
- **Action**: Combine two frequency bands
- **Visual**: Blobs merge into larger blob with blended color
- **Audio**: Sum the two bands, create hybrid frequency range
- **Reversible**: Can split again with Alt+Click

#### **Throw/Flick Gesture**
- **Action**: Quick swipe on blob
- **Visual**: Blob flies off with momentum, bounces off edges
- **Audio**: Doppler effect, pitch bends based on velocity
- **Physics**: Blob eventually settles back to original position

---

## 2. Keyboard Interactions

### 2.1 Global Controls

| Key | Action | Description |
|-----|--------|-------------|
| **Space** | Play/Pause | Toggle audio processing on/off |
| **Ctrl+L** | Layout Toggle | Cycle between Arc, Horizontal Bar, Organic layouts |
| **Ctrl+V** | Visual Mode Toggle | Switch between Soft Glow and Abstract Geometric styles |
| **Ctrl+C** | Clear All | Reset all blobs to default state |
| **Ctrl+Z** | Undo | Undo last manipulation |
| **Ctrl+Y** | Redo | Redo last undone action |
| **Ctrl+S** | Save Preset | Save current blob configuration |
| **Ctrl+O** | Load Preset | Load saved configuration |
| **Tab** | Cycle Selection | Move selection to next blob |
| **Shift+Tab** | Reverse Cycle | Move selection to previous blob |
| **Escape** | Deselect All | Clear all selections |
| **F** | Freeze Selected | Freeze currently selected blob(s) |
| **S** | Solo Selected | Solo currently selected blob(s) |
| **M** | Mute Selected | Mute currently selected blob(s) |
| **R** | Reset Selected | Reset selected blob(s) to default |

### 2.2 Number Keys (1-9, 0)

| Key | Action | Description |
|-----|--------|-------------|
| **1-9** | Quick Select | Select blob by frequency band (1=lowest, 9=highest) |
| **0** | Select All | Select all blobs |
| **Shift+1-9** | Preset Recall | Load preset slot 1-9 |
| **Ctrl+1-9** | Preset Save | Save to preset slot 1-9 |

### 2.3 Arrow Keys

| Key | Action | Description |
|-----|--------|-------------|
| **↑↓←→** | Fine Position | Move selected blob(s) with precision |
| **Shift+Arrows** | Coarse Position | Move selected blob(s) faster |
| **Ctrl+↑↓** | Gain Adjust | Increase/decrease blob volume |
| **Ctrl+←→** | Pan Adjust | Pan selected blob(s) left/right |

### 2.4 Letter Keys (Quick Actions)

| Key | Action | Description |
|-----|--------|-------------|
| **A** | Select All | Select all blobs |
| **D** | Duplicate | Duplicate selected blob (create memory blob copy) |
| **X** | Cut | Remove blob from mix (temporarily) |
| **C** | Copy | Copy blob settings to clipboard |
| **V** | Paste | Paste blob settings to selected blob |
| **I** | Invert | Invert phase of selected blob(s) |
| **N** | Normalize | Normalize gain across all blobs |
| **G** | Grid Snap Toggle | Toggle snap-to-grid for positioning |
| **H** | Hide/Show HUD | Toggle UI overlay visibility |
| **?** | Help Overlay | Show keyboard shortcuts reference |

### 2.5 Special Modifiers + Mouse

| Combination | Action | Description |
|-------------|--------|-------------|
| **Shift+Scroll** | Time Stretch | Scroll wheel to adjust time-stretch on selected blob |
| **Ctrl+Scroll** | Pitch Shift | Scroll wheel to adjust pitch on selected blob |
| **Alt+Scroll** | Grain Size | Scroll wheel to adjust grain size |

---

## 3. Advanced Interaction Concepts

### 3.1 Gesture Recognition

**Drawing Gestures in Empty Space:**
- **Horizontal Line**: Create automation lane
- **Vertical Line**: Create filter sweep
- **Circle**: Create LFO pattern
- **Zigzag**: Create random modulation
- **Spiral**: Create reverb tail

### 3.2 Multi-Touch (Tablet/Touch Screen)

**Two-Finger Gestures:**
- **Pinch**: Zoom in/out on blob field
- **Rotate**: Rotate entire blob constellation
- **Swipe (2 fingers)**: Change global reverb/delay amount
- **Spread**: Expand blob spacing

**Three-Finger Gestures:**
- **Tap**: Trigger global effect (freeze all, randomize, etc.)
- **Swipe Up**: Increase master volume
- **Swipe Down**: Decrease master volume
- **Swipe Left/Right**: Navigate presets

### 3.3 Proximity/Spatial Interactions

**Blob-to-Blob Distance:**
- Blobs closer together = increased frequency bleed/interaction
- Blobs farther apart = more isolated processing
- Optional "gravitational pull" between related frequencies

**Blob-to-Edge Distance:**
- Near edges = harder panning, more extreme effects
- Center = neutral, balanced processing

### 3.4 Time-Based Interactions

**Automation Recording:**
- Press 'A' to start recording movements
- All blob manipulations recorded as automation
- Press 'A' again to stop and loop playback
- Visual: Red recording indicator, playback shows ghost trails

**Rhythmic Patterns:**
- Click blob in rhythm to set gate/trigger pattern
- Creates rhythmic grain triggers synced to tapped tempo

---

## 4. Audio-Reactive Interactions

### 4.1 Dynamic Response Modes

**Mode 1: Passive (Default)**
- Blobs visualize incoming audio
- User manipulations affect output
- Audio drives blob size/intensity

**Mode 2: Reactive**
- Audio transients trigger blob "jumps" or "pops"
- Loud sounds = blobs scatter
- Quiet sounds = blobs cluster

**Mode 3: Autonomous**
- Blobs move on their own based on audio content
- User can "guide" rather than control
- AI/algorithm-driven movement influenced by spectral energy

**Mode 4: Sandbox (No Mic Input)**
- No audio input required
- Blobs generate tones based on size/position
- Pure synthesis mode
- Drag blob = create sound from scratch

### 4.2 Feedback Loops

**Self-Modulation:**
- Route output back into input
- Creates feedback/resonance
- Visual: Blobs pulsate in sync with feedback frequency

**Cross-Modulation:**
- Link blob A to affect blob B's parameters
- Creates complex interplay between frequency bands

---

## 5. Visual Feedback System

### 5.1 State Indicators

| State | Visual |
|-------|--------|
| **Idle** | Soft glow, gentle floating animation |
| **Hovered** | Increased brightness, pulse effect |
| **Selected** | Outline/ring, brighter glow |
| **Dragging** | Trail effect, cursor feedback |
| **Frozen** | Translucent white, pulsing core |
| **Muted** | Desaturated, dimmed |
| **Soloed** | Extra bright, others dimmed |
| **Processing** | Particle emanations, ripples |

### 5.2 Parameter Overlays

**When Manipulating:**
- Show current values as floating text near blob
- Mini-graph showing waveform/spectrum for that band
- Visual meter for gain/stretch/pitch parameters

**HUD Display (Toggleable with 'H'):**
- Top-left: Current mode, selected blob info
- Top-right: Master levels, CPU usage
- Bottom: Interaction hints based on context
- Center: Parameter values when manipulating

---

## 6. Context-Aware Interactions

### 6.1 Smart Actions Based on Context

**When No Blob Selected:**
- Click empty space = deselect all
- Drag = lasso select
- Right-click = global context menu

**When One Blob Selected:**
- Spacebar = solo/unsolo toggle
- Delete = mute toggle
- Enter = freeze toggle

**When Multiple Blobs Selected:**
- Arrow keys = move group
- Ctrl+G = group (create sub-mix)
- Ctrl+U = ungroup

### 6.2 Adaptive UI

**Beginner Mode:**
- Show hints and labels
- Simplified interactions
- Tooltips on hover

**Expert Mode:**
- Minimal UI
- All shortcuts enabled
- Advanced modifiers active

---

## 7. Experimental/Future Interactions

### 7.1 Voice Control
- "Freeze all" - freezes all blobs
- "Solo bass" - solos low-frequency blobs
- "Randomize" - randomizes blob positions/parameters

### 7.2 MIDI Control
- Map MIDI controllers to blob parameters
- MIDI notes trigger specific blobs
- MIDI CC controls grain parameters

### 7.3 Motion/Gyroscope (Mobile/VR)
- Tilt device to affect global parameters
- Shake to randomize
- Rotate to change master filter

### 7.4 Eye Tracking
- Look at blob to select
- Blink to freeze
- Gaze duration affects parameter

### 7.5 Collaborative Mode
- Multiple users control different blobs simultaneously
- Real-time sync over network
- Each user has different color/identity

---

## Implementation Priority

### **Phase 1: Essential (MVP)**
- ✓ Hover feedback
- ✓ Normal drag (pan/reverb)
- ✓ Shift+drag (stretch/pitch)
- ✓ Click to select
- ✓ Basic visual states
- ✓ Ctrl+L layout toggle
- ✓ Ctrl+V visual mode toggle

### **Phase 2: Core Interactions**
- Double-click solo
- Triple-click freeze
- Keyboard shortcuts (Space, Tab, Arrow keys)
- Multi-select (lasso)
- Ctrl+drag filter manipulation
- Visual parameter overlays

### **Phase 3: Advanced**
- Alt+drag grain manipulation
- Gesture recognition
- Automation recording
- Preset system
- Undo/redo

### **Phase 4: Experimental**
- Sandbox mode (no mic)
- Blob linking/merging
- Voice control
- MIDI support
- Collaborative mode

---

## Design Principles

1. **Immediate Feedback**: Every action produces instant audio-visual response
2. **Discoverability**: Interactions should be intuitive enough to explore without manual
3. **Depth**: Simple to start, complex mastery potential
4. **Reversibility**: All actions can be undone or reset
5. **Consistency**: Similar actions across different contexts behave predictably
6. **Accessibility**: Multiple ways to achieve the same result (mouse, keyboard, touch)

---

**Last Updated**: 2025-10-31
**Status**: Design Document - Implementation In Progress
