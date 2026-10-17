import { frequencyToMidi } from './notes';
import type { PitchFrame } from './pitch';
import { TimedMedian } from './smoothing';

/** Live display: small smoothing, the curve stays close to the real voice. */
export const DISPLAY_WINDOW_MS = 80;
/** Scoring: approximately 200 ms, so that natural vibrato is not an error. */
export const SCORE_WINDOW_MS = 200;
/** Short dropouts (consonants, breath noise, an unclear frame) keep the last pitch. */
export const HOLD_MS = 200;
/** After a silence longer than this, smoothing starts fresh. */
const GAP_RESET_MS = 300;

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
  private last: { time: number; displayMidi: number; scoreMidi: number } | null = null;

  push(time: number, frame: PitchFrame): PitchReading {
    const base = { time, frequency: frame.frequency, clarity: frame.clarity, volumeDecibels: frame.volumeDecibels };
    if (frame.frequency === null) {
      if (this.last && time - this.last.time <= HOLD_MS) {
        return { ...base, displayMidi: this.last.displayMidi, scoreMidi: this.last.scoreMidi };
      }
      return { ...base, displayMidi: null, scoreMidi: null };
    }
    if (this.last && time - this.last.time > GAP_RESET_MS) this.reset();
    const midi = frequencyToMidi(frame.frequency);
    const displayMidi = this.display.push(time, midi);
    const scoreMidi = this.score.push(time, midi);
    this.last = { time, displayMidi, scoreMidi };
    return { ...base, displayMidi, scoreMidi };
  }

  reset(): void {
    this.display.reset();
    this.score.reset();
    this.last = null;
  }
}
