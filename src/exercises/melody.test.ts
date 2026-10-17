import { describe, expect, it } from 'vitest';
import type { PitchSample } from './holdNote';
import { evaluateMelody, phraseDurationMs, timePhrase, type TimedNote } from './melody';
import { PHRASES, randomPhrase } from './phrases';

const ROOT = 55; // G3
const BPM = 60; // 1 beat = 1000 ms

/** Samples every 16 ms; `centsAt` returns the sung pitch relative to `note`, or null. */
function sing(notes: TimedNote[], pitchAt: (time: number) => number | null, until = phraseDurationMs(notes) + 500) {
  const samples: PitchSample[] = [];
  for (let time = 0; time <= until; time += 16) samples.push({ time, midi: pitchAt(time) });
  return samples;
}

/** The target note at a time, shifted by `delayMs`. */
function perfect(notes: TimedNote[], delayMs = 0, centsOff: (index: number) => number = () => 0) {
  return (time: number) => {
    const index = notes.findIndex((n) => time - delayMs >= n.startMs && time - delayMs < n.startMs + n.durationMs);
    return index === -1 ? null : notes[index].midi + centsOff(index) / 100;
  };
}

describe('timePhrase', () => {
  it('places notes one after the other', () => {
    const notes = timePhrase(
      [
        { offset: 0, beats: 1 },
        { offset: 4, beats: 2 },
      ],
      ROOT,
      120,
    );
    expect(notes).toEqual([
      { midi: 55, startMs: 0, durationMs: 500 },
      { midi: 59, startMs: 500, durationMs: 1000 },
    ]);
    expect(phraseDurationMs(notes)).toBe(1500);
  });
});

describe('evaluateMelody', () => {
  const notes = timePhrase(PHRASES.find((p) => p.id === '12321')!.notes, ROOT, BPM);

  it('gives 3 stars for an exact phrase', () => {
    const result = evaluateMelody(sing(notes, perfect(notes)), notes, 50);
    expect(result.hitCount).toBe(5);
    expect(result.stars).toBe(3);
  });

  it('accepts singing a little late (pitch only, no rhythm score)', () => {
    const result = evaluateMelody(sing(notes, perfect(notes, 250)), notes, 50);
    expect(result.hitCount).toBe(5);
    expect(result.stars).toBeGreaterThanOrEqual(2);
  });

  it('finds the note that was too low', () => {
    const result = evaluateMelody(sing(notes, perfect(notes, 0, (i) => (i === 2 ? -120 : 0))), notes, 50);
    expect(result.notes.map((n) => n.status)).toEqual(['hit', 'hit', 'low', 'hit', 'hit']);
    expect(result.notes[2].medianCents).toBeCloseTo(-120);
  });

  it('reports too high and missed notes', () => {
    const pitch = perfect(notes, 0, (i) => (i === 1 ? 90 : 0));
    const result = evaluateMelody(
      sing(notes, (t) => (t >= 3000 ? null : pitch(t))),
      notes,
      50,
    );
    expect(result.notes[1].status).toBe('high');
    expect(result.notes[3].status).toBe('missed');
    expect(result.notes[4].status).toBe('missed');
  });

  it('marks a note as unsteady when it is right on average but mostly outside the tolerance', () => {
    // Wobbles ±80 cents around note 0: median near 0, but inside ±50 only about 43 % of the time.
    const pitch = perfect(notes);
    const result = evaluateMelody(
      sing(notes, (t) => (t < 1000 ? notes[0].midi + 0.8 * Math.sin((2 * Math.PI * t) / 300) : pitch(t))),
      notes,
      50,
    );
    expect(result.notes[0].status).toBe('unsteady');
  });

  it('gives 0 stars for silence', () => {
    const result = evaluateMelody(sing(notes, () => null), notes, 50);
    expect(result).toMatchObject({ hitCount: 0, stars: 0, score: 0 });
  });
});

describe('phrases', () => {
  it('stay inside one octave above the root', () => {
    for (const phrase of PHRASES) {
      for (const note of phrase.notes) {
        expect(note.offset).toBeGreaterThanOrEqual(0);
        expect(note.offset).toBeLessThanOrEqual(12);
      }
    }
  });

  it('have unique ids', () => {
    expect(new Set(PHRASES.map((p) => p.id)).size).toBe(PHRASES.length);
  });
});

describe('randomPhrase', () => {
  function seeded(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  it('starts and ends on the root and moves in small scale steps', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const notes = randomPhrase(5, seeded(seed));
      expect(notes).toHaveLength(5);
      expect(notes[0].offset).toBe(0);
      expect(notes.at(-1)!.offset).toBe(0);
      for (let i = 1; i < notes.length; i++) {
        expect(Math.abs(notes[i].offset - notes[i - 1].offset)).toBeLessThanOrEqual(4);
      }
      for (const note of notes) expect([0, 2, 4, 5, 7, 9]).toContain(note.offset);
    }
  });
});
