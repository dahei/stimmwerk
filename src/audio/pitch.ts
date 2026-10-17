import { PitchDetector } from 'pitchy';

export interface DetectorOptions {
  /** Minimum MPM clarity (0..1) to accept a frame as voiced. */
  minClarity: number;
  /** Frames below this RMS level (dBFS) count as silence. */
  minVolumeDecibels: number;
  /** Accepted frequency range of the human singing voice. */
  minFrequency: number;
  maxFrequency: number;
}

export const DEFAULT_DETECTOR_OPTIONS: DetectorOptions = {
  minClarity: 0.9,
  minVolumeDecibels: -45,
  minFrequency: 60,
  maxFrequency: 1400,
};

export interface PitchFrame {
  /** Detected frequency in Hz, or null if the frame is silent or unclear. */
  frequency: number | null;
  clarity: number;
  /** RMS level in dBFS. */
  volumeDecibels: number;
}

export function rmsDecibels(input: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
  const rms = Math.sqrt(sum / input.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

export type PitchAnalyzer = (input: Float32Array, sampleRate: number) => PitchFrame;

export function createPitchAnalyzer(
  frameSize: number,
  options: DetectorOptions = DEFAULT_DETECTOR_OPTIONS,
): PitchAnalyzer {
  const detector = PitchDetector.forFloat32Array(frameSize);
  detector.minVolumeDecibels = options.minVolumeDecibels;

  return (input, sampleRate) => {
    const volumeDecibels = rmsDecibels(input);
    const [frequency, clarity] = detector.findPitch(input, sampleRate);
    const voiced =
      volumeDecibels >= options.minVolumeDecibels &&
      clarity >= options.minClarity &&
      frequency >= options.minFrequency &&
      frequency <= options.maxFrequency;
    return { frequency: voiced ? frequency : null, clarity, volumeDecibels };
  };
}
