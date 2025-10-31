/**
 * FrequencyBands - Defines frequency band configuration for spectral analysis
 */

export const FREQUENCY_BANDS = [
  // Sub-bass (1 blob)
  { min: 20, max: 60, color: 0, name: 'Sub-bass' },

  // Bass (3 blobs)
  { min: 60, max: 120, color: 10, name: 'Bass 1' },
  { min: 120, max: 180, color: 15, name: 'Bass 2' },
  { min: 180, max: 250, color: 20, name: 'Bass 3' },

  // Low-mids (3 blobs)
  { min: 250, max: 350, color: 30, name: 'Low-mid 1' },
  { min: 350, max: 450, color: 35, name: 'Low-mid 2' },
  { min: 450, max: 500, color: 40, name: 'Low-mid 3' },

  // Mids (6 blobs)
  { min: 500, max: 750, color: 50, name: 'Mid 1' },
  { min: 750, max: 1000, color: 60, name: 'Mid 2' },
  { min: 1000, max: 1250, color: 80, name: 'Mid 3' },
  { min: 1250, max: 1500, color: 100, name: 'Mid 4' },
  { min: 1500, max: 1750, color: 120, name: 'Mid 5' },
  { min: 1750, max: 2000, color: 140, name: 'Mid 6' },

  // High-mids (4 blobs)
  { min: 2000, max: 2500, color: 160, name: 'High-mid 1' },
  { min: 2500, max: 3000, color: 180, name: 'High-mid 2' },
  { min: 3000, max: 3500, color: 200, name: 'High-mid 3' },
  { min: 3500, max: 4000, color: 210, name: 'High-mid 4' },

  // Presence (4 blobs)
  { min: 4000, max: 5000, color: 220, name: 'Presence 1' },
  { min: 5000, max: 6000, color: 230, name: 'Presence 2' },
  { min: 6000, max: 7000, color: 240, name: 'Presence 3' },
  { min: 7000, max: 8000, color: 250, name: 'Presence 4' },

  // Air (3 blobs)
  { min: 8000, max: 12000, color: 270, name: 'Air 1' },
  { min: 12000, max: 16000, color: 290, name: 'Air 2' },
  { min: 16000, max: 20000, color: 310, name: 'Air 3' },
];

/**
 * Calculate which FFT bins correspond to a frequency range
 * @param {number} minFreq - Minimum frequency in Hz
 * @param {number} maxFreq - Maximum frequency in Hz
 * @param {number} sampleRate - Audio context sample rate
 * @param {number} fftSize - FFT size (analyser.fftSize)
 * @returns {object} { startBin, endBin }
 */
export function frequencyToBin(minFreq, maxFreq, sampleRate, fftSize) {
  const nyquist = sampleRate / 2;
  const binCount = fftSize / 2;

  const startBin = Math.floor((minFreq / nyquist) * binCount);
  const endBin = Math.ceil((maxFreq / nyquist) * binCount);

  return {
    startBin: Math.max(0, startBin),
    endBin: Math.min(binCount - 1, endBin)
  };
}

/**
 * Calculate average energy in a frequency band
 * @param {Uint8Array} frequencyData - FFT frequency data
 * @param {number} startBin - Start bin index
 * @param {number} endBin - End bin index
 * @returns {number} Average energy (0-255)
 */
export function calculateBandEnergy(frequencyData, startBin, endBin) {
  if (startBin >= endBin) return 0;

  let sum = 0;
  let count = 0;

  for (let i = startBin; i <= endBin; i++) {
    sum += frequencyData[i];
    count++;
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Smooth energy value to avoid jitter
 * @param {number} currentValue - Current smoothed value
 * @param {number} targetValue - New target value
 * @param {number} smoothing - Smoothing factor (0-1, higher = more smoothing)
 * @returns {number} Smoothed value
 */
export function smoothValue(currentValue, targetValue, smoothing = 0.7) {
  return currentValue + (targetValue - currentValue) * (1 - smoothing);
}

export default FREQUENCY_BANDS;
