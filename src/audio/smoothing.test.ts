import { describe, expect, it } from 'vitest';
import { median, TimedMedian } from './smoothing';

describe('median', () => {
  it('handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
});

describe('TimedMedian', () => {
  it('removes a single outlier such as an octave jump', () => {
    const m = new TimedMedian(200);
    m.push(0, 60);
    m.push(16, 60);
    expect(m.push(32, 72)).toBe(60);
  });

  it('drops values older than the window', () => {
    const m = new TimedMedian(100);
    m.push(0, 50);
    m.push(10, 50);
    m.push(120, 60);
    expect(m.push(130, 60)).toBe(60);
  });
});
