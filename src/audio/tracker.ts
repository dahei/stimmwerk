import { frequencyToMidi } from './notes';
import type { PitchFrame } from './pitch';
import { TimedMedian } from './smoothing';

/** Live display: small smoothing, the curve stays close to the real voice. */
export const DISPLAY_WINDOW_MS = 80;
/** Scoring: approximately 200 ms, so that natural vibrato is not an error. */
export const SCORE_WINDOW_MS = 200;
/** After a silence longer than this, smoothing starts fresh. */
const GAP_RESET_MS = 150;

export interface PitchReading {
  /** Milliseconds, same clock as the input frames. */
  time: number;
  frequency: number | null;
  /** Smoothed fractional MIDI note for the live display, null when unvoiced. */
  displayMidi: number | null;
  /** Smoothed fractional MIDI note for scoring, null when unvoiced. */
  scoreMidi: number | null;
  clarity: number;
  volumeDecibels: number;
}

/** Turns raw detector frames into smoothed readings. */
export class PitchTracker {
  private display = new TimedMedian(DISPLAY_WINDOW_MS);
  private score = new TimedMedian(SCORE_WINDOW_MS);
  private lastVoicedTime = -Infinity;

  push(time: number, frame: PitchFrame): PitchReading {
    const base = { time, frequency: frame.frequency, clarity: frame.clarity, volumeDecibels: frame.volumeDecibels };
    if (frame.frequency === null) {
      return { ...base, displayMidi: null, scoreMidi: null };
    }
    if (time - this.lastVoicedTime > GAP_RESET_MS) this.reset();
    this.lastVoicedTime = time;
    const midi = frequencyToMidi(frame.frequency);
    return { ...base, displayMidi: this.display.push(time, midi), scoreMidi: this.score.push(time, midi) };
  }

  reset(): void {
    this.display.reset();
    this.score.reset();
  }
}
