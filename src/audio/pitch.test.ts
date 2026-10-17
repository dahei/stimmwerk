import { describe, expect, it } from 'vitest';
import { FRAME_SIZE, SAMPLE_RATE, tone } from '../test/signals';
import { frequencyToMidi } from './notes';
import { createPitchAnalyzer, rmsDecibels } from './pitch';
import { PitchTracker } from './tracker';

const analyze = createPitchAnalyzer(FRAME_SIZE);

/** Deviation of the detected pitch from `expected` in cents. */
function errorCents(detected: number | null, expected: number): number {
  expect(detected).not.toBeNull();
  return Math.abs(1200 * Math.log2((detected as number) / expected));
}

// A voice-like timbre: strong low harmonics, as in a sung "aa".
const VOICE = [1, 0.8, 0.6, 0.4, 0.25, 0.15];

describe('pitch detection with synthetic signals', () => {
  it.each([82.41, 110, 196, 261.63, 440, 659.26, 1046.5])('detects a pure sine at %f Hz within 3 cents', (frequency) => {
    const frame = analyze(tone({ frequency }), SAMPLE_RATE);
    expect(errorCents(frame.frequency, frequency)).toBeLessThan(3);
  });

  it.each([98, 146.83, 220, 392, 587.33])('detects a harmonic voice-like tone at %f Hz without octave errors', (frequency) => {
    const frame = analyze(tone({ frequency, harmonics: VOICE }), SAMPLE_RATE);
    expect(errorCents(frame.frequency, frequency)).toBeLessThan(5);
  });

  it('detects the fundamental when the second harmonic is stronger', () => {
    const frame = analyze(tone({ frequency: 150, harmonics: [0.5, 1, 0.6, 0.3] }), SAMPLE_RATE);
    expect(errorCents(frame.frequency, 150)).toBeLessThan(5);
  });

  it('detects a tone with moderate noise', () => {
    const frame = analyze(tone({ frequency: 220, harmonics: VOICE, noise: 0.03 }), SAMPLE_RATE);
    expect(errorCents(frame.frequency, 220)).toBeLessThan(5);
  });

  it('reports silence as unvoiced', () => {
    const frame = analyze(new Float32Array(FRAME_SIZE), SAMPLE_RATE);
    expect(frame.frequency).toBeNull();
  });

  it('reports a very quiet signal as unvoiced', () => {
    const frame = analyze(tone({ frequency: 220, amplitude: 0.001 }), SAMPLE_RATE);
    expect(frame.frequency).toBeNull();
  });

  it('reports pure noise as unvoiced', () => {
    const frame = analyze(tone({ frequency: 220, amplitude: 0, noise: 0.3 }), SAMPLE_RATE);
    expect(frame.frequency).toBeNull();
  });

  it('measures the RMS level in dBFS', () => {
    // A sine with amplitude 1 has an RMS of 1/√2 ≈ -3 dBFS.
    expect(rmsDecibels(tone({ frequency: 440, amplitude: 1 }))).toBeCloseTo(-3, 0);
  });
});

describe('PitchTracker with vibrato', () => {
  it('keeps the scored pitch near the center of a ±40 cent vibrato', () => {
    const tracker = new PitchTracker();
    const hop = 800; // ≈ 16.7 ms at 48 kHz, one animation frame
    const deviations: number[] = [];
    for (let i = 0; i < 60; i++) {
      const offset = i * hop;
      const frame = analyze(
        tone({ frequency: 220, harmonics: VOICE, vibratoCents: 40, vibratoRate: 5.5, offset }),
        SAMPLE_RATE,
      );
      const reading = tracker.push((offset / SAMPLE_RATE) * 1000, frame);
      if (i >= 15 && reading.scoreMidi !== null) {
        deviations.push(Math.abs(reading.scoreMidi - frequencyToMidi(220)) * 100);
      }
    }
    expect(deviations.length).toBeGreaterThan(40);
    // The raw signal moves up to 40 cents; the 200 ms median keeps most readings much closer.
    const average = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    expect(average).toBeLessThan(20);
  });

  it('returns null readings for unvoiced frames', () => {
    const tracker = new PitchTracker();
    const reading = tracker.push(0, { frequency: null, clarity: 0, volumeDecibels: -80 });
    expect(reading.displayMidi).toBeNull();
    expect(reading.scoreMidi).toBeNull();
  });
});
