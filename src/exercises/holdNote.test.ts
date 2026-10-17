import { describe, expect, it } from 'vitest';
import { evaluateHoldNote, ONSET_GRACE_MS, type PitchSample } from './holdNote';
import { classifyCents, starsForScore } from './scoring';

const TARGET = 57; // A3
const SETTINGS = { targetMidi: TARGET, durationMs: 3000, toleranceCents: 50 };

/** One sample every 16 ms, with the pitch given as cents from the target. */
function samples(centsAt: (time: number) => number | null, durationMs = 3000): PitchSample[] {
  const result: PitchSample[] = [];
  for (let time = 0; time <= durationMs; time += 16) {
    const cents = centsAt(time);
    result.push({ time, midi: cents === null ? null : TARGET + cents / 100 });
  }
  return result;
}

describe('classifyCents', () => {
  it('classifies by tolerance', () => {
    expect(classifyCents(-60, 50)).toBe('low');
    expect(classifyCents(49, 50)).toBe('hit');
    expect(classifyCents(51, 50)).toBe('high');
  });
});

describe('starsForScore', () => {
  it('maps scores to stars', () => {
    expect(starsForScore(0.9)).toBe(3);
    expect(starsForScore(0.7)).toBe(2);
    expect(starsForScore(0.5)).toBe(1);
    expect(starsForScore(0.1)).toBe(0);
  });
});

describe('evaluateHoldNote', () => {
  it('gives 3 stars for a stable note on target', () => {
    const result = evaluateHoldNote(samples(() => 5), SETTINGS);
    expect(result.inToleranceRatio).toBe(1);
    expect(result.stars).toBe(3);
    expect(result.meanCents).toBeCloseTo(5);
    expect(result.spreadCents).toBeCloseTo(0);
    expect(result.onsetMs).toBe(0);
  });

  it('reports a systematic deviation', () => {
    const result = evaluateHoldNote(samples(() => -80), SETTINGS);
    expect(result.inToleranceRatio).toBe(0);
    expect(result.stars).toBe(0);
    expect(result.meanCents).toBeCloseTo(-80);
  });

  it('ignores a slow start inside the grace period', () => {
    const result = evaluateHoldNote(samples((t) => (t < ONSET_GRACE_MS ? -150 : 0)), SETTINGS);
    expect(result.inToleranceRatio).toBe(1);
    expect(result.onsetMs).toBeGreaterThanOrEqual(ONSET_GRACE_MS - 16);
  });

  it('counts silence as a miss', () => {
    // Scored window is 500..3000 ms; singing until 2000 ms covers 60 % of it.
    const result = evaluateHoldNote(samples((t) => (t < 2000 ? 0 : null)), SETTINGS);
    expect(result.voicedRatio).toBeCloseTo(0.6, 1);
    expect(result.inToleranceRatio).toBeCloseTo(0.6, 1);
    expect(result.stars).toBe(1);
  });

  it('measures the spread of an unstable note', () => {
    const result = evaluateHoldNote(samples((t) => (Math.floor(t / 200) % 2 === 0 ? 40 : -40)), SETTINGS);
    expect(result.spreadCents).toBeCloseTo(40, 0);
    expect(result.inToleranceRatio).toBe(1);
  });

  it('handles no input at all', () => {
    const result = evaluateHoldNote(samples(() => null), SETTINGS);
    expect(result).toMatchObject({ inToleranceRatio: 0, meanCents: null, spreadCents: null, onsetMs: null, stars: 0 });
  });
});
