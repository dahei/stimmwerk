import { describe, expect, it } from 'vitest';
import { de } from './de';

describe('distance text', () => {
  it('uses cents below one semitone', () => {
    expect(de.feedback.distance(-30)).toBe('−30 Cent');
    expect(de.feedback.distance(12.4)).toBe('+12 Cent');
    expect(de.feedback.distance(0)).toBe('±0 Cent');
  });

  it('uses semitones from one semitone on', () => {
    expect(de.feedback.distance(-230)).toBe('2,3 Halbtöne');
    expect(de.feedback.distance(100)).toBe('1,0 Halbton');
    expect(de.feedback.distance(1204)).toBe('12,0 Halbtöne');
  });
});
