import { describe, expect, it } from 'vitest';
import { nearestSampleMidi, PIANO_SAMPLE_MIDIS, playbackRate, sampleFileName } from './piano';

describe('piano samples', () => {
  it('names sample files like the Salamander set', () => {
    expect(sampleFileName(36)).toBe('C2.mp3');
    expect(sampleFileName(57)).toBe('A3.mp3');
    expect(sampleFileName(63)).toBe('Ds4.mp3');
    expect(sampleFileName(66)).toBe('Fs4.mp3');
    expect(sampleFileName(84)).toBe('C6.mp3');
  });

  it('has a file in public/ for every sample', () => {
    // Lists the files without loading them.
    const files = Object.keys(import.meta.glob('/public/samples/piano/*.mp3'));
    for (const midi of PIANO_SAMPLE_MIDIS) {
      expect(files).toContain(`/public/samples/piano/${sampleFileName(midi)}`);
    }
  });

  it('picks the nearest sample, at most 1.5 semitones away', () => {
    expect(nearestSampleMidi(57)).toBe(57);
    expect(nearestSampleMidi(58)).toBe(57);
    expect(nearestSampleMidi(59)).toBe(60);
    for (let midi = 36; midi <= 84; midi++) {
      expect(Math.abs(midi - nearestSampleMidi(midi))).toBeLessThanOrEqual(1.5);
    }
  });

  it('clamps notes outside the sample range', () => {
    expect(nearestSampleMidi(30)).toBe(36);
    expect(nearestSampleMidi(90)).toBe(84);
  });

  it('shifts the pitch with the playback rate', () => {
    expect(playbackRate(57, 57)).toBe(1);
    expect(playbackRate(69, 57)).toBeCloseTo(2);
    expect(playbackRate(56, 57)).toBeCloseTo(0.9439, 4);
  });
});
