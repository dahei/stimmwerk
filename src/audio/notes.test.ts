import { describe, expect, it } from 'vitest';
import { centsFrom, frequencyToMidi, midiToFrequency, nearestNote, noteName } from './notes';

describe('frequency and MIDI conversion', () => {
  it('maps A4 to 440 Hz and back', () => {
    expect(frequencyToMidi(440)).toBe(69);
    expect(midiToFrequency(69)).toBe(440);
  });

  it('maps one octave to 12 semitones', () => {
    expect(frequencyToMidi(220)).toBeCloseTo(57);
    expect(midiToFrequency(81)).toBeCloseTo(880);
  });

  it('round-trips arbitrary values', () => {
    for (const midi of [36.2, 48, 60.5, 72.75, 84]) {
      expect(frequencyToMidi(midiToFrequency(midi))).toBeCloseTo(midi, 10);
    }
  });
});

describe('cents', () => {
  it('is positive when the pitch is too high', () => {
    expect(centsFrom(69.25, 69)).toBeCloseTo(25);
    expect(centsFrom(68.9, 69)).toBeCloseTo(-10);
  });

  it('finds the nearest note', () => {
    expect(nearestNote(60.3)).toEqual({ midi: 60, cents: expect.closeTo(30) });
    expect(nearestNote(60.6)).toEqual({ midi: 61, cents: expect.closeTo(-40) });
  });
});

describe('note names', () => {
  it('uses German names with H and B', () => {
    expect(noteName(69)).toBe('A4');
    expect(noteName(59)).toBe('H3');
    expect(noteName(70)).toBe('B4');
    expect(noteName(66)).toBe('Fis4');
    expect(noteName(60)).toBe('C4');
  });

  it('uses English names on request', () => {
    expect(noteName(59, 'en')).toBe('B3');
    expect(noteName(70, 'en')).toBe('A#4');
  });

  it('rounds fractional notes', () => {
    expect(noteName(68.6)).toBe('A4');
  });
});
