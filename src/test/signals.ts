export const SAMPLE_RATE = 48000;
export const FRAME_SIZE = 2048;

export interface ToneOptions {
  frequency: number;
  /** Relative amplitudes of harmonics 1, 2, 3, … (default: pure sine). */
  harmonics?: number[];
  amplitude?: number;
  /** Vibrato depth in cents (peak) and rate in Hz. */
  vibratoCents?: number;
  vibratoRate?: number;
  /** Amplitude of white noise added to the signal. */
  noise?: number;
  /** Start offset in samples, to sample different vibrato phases. */
  offset?: number;
  length?: number;
}

/** Deterministic pseudo-random numbers, so that tests are stable. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function tone(options: ToneOptions): Float32Array {
  const {
    frequency,
    harmonics = [1],
    amplitude = 0.3,
    vibratoCents = 0,
    vibratoRate = 5.5,
    noise = 0,
    offset = 0,
    length = FRAME_SIZE,
  } = options;
  const rand = random(42 + offset);
  const output = new Float32Array(length);
  const norm = harmonics.reduce((a, b) => a + b, 0);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = (i + offset) / SAMPLE_RATE;
    const cents = vibratoCents * Math.sin(2 * Math.PI * vibratoRate * t);
    phase += (2 * Math.PI * frequency * 2 ** (cents / 1200)) / SAMPLE_RATE;
    let value = 0;
    harmonics.forEach((h, k) => {
      value += h * Math.sin((k + 1) * phase);
    });
    output[i] = (amplitude * value) / norm + noise * (rand() * 2 - 1);
  }
  return output;
}
