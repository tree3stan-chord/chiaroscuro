# Chiaroscuro

**Interactive Audio-Visual Playground**

Chiaroscuro is a meditative, intuitive sound playground where users manipulate lava lamp-like visuals to generate ethereal, paulstretch-inspired soundscapes through real-time audio processing and granular synthesis.

## Features

- **Fluid Visual Interactions**: Lava lamp-style blobs that respond to audio input
- **Granular Synthesis**: Real-time audio stretching and manipulation
- **Intuitive Controls**: Drag to shape sound - no technical knowledge required
- **Memory Blobs**: Freeze moments in time and layer ethereal soundscapes
- **Effects Processing**: Built-in reverb and delay for atmospheric textures

## Installation

This package is designed to be used as a submodule in the Studio application.

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Usage

```javascript
import ChiaroscuroSandbox from './ChiaroscuroSandbox';

function App() {
  return <ChiaroscuroSandbox />;
}
```
