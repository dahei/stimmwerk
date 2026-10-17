import { centsFrom } from '../audio/notes';
import { classifyCents, mean, standardDeviation, starsForScore, type Stars } from './scoring';

export interface PitchSample {
  /** Milliseconds since the start of the singing phase. */
  time: number;
  /** Smoothed (score) MIDI note, null when unvoiced. */
  midi: number | null;
}

export interface HoldNoteSettings {
  targetMidi: number;
  durationMs: number;
  toleranceCents: number;
}

/** The first part of the singing phase does not count: time to start the note. */
export const ONSET_GRACE_MS = 500;

export interface HoldNoteResult {
  /** Part of the scored time (after the grace period) inside the tolerance, 0..1. */
  inToleranceRatio: number;
  /** Part of the scored time with a detected pitch, 0..1. */
  voicedRatio: number;
  /** Mean deviation of all voiced samples in cents, null if nothing was sung. */
  meanCents: number | null;
  /** Standard deviation of the voiced samples in cents. */
  spreadCents: number | null;
  /** Time from the start of the singing phase to the first sample inside the tolerance. */
  onsetMs: number | null;
  stars: Stars;
}

export function evaluateHoldNote(samples: readonly PitchSample[], settings: HoldNoteSettings): HoldNoteResult {
  const { targetMidi, durationMs, toleranceCents } = settings;
  const inWindow = samples.filter((s) => s.time >= 0 && s.time <= durationMs);
  const scored = inWindow.filter((s) => s.time >= ONSET_GRACE_MS);

  const centsOf = (s: PitchSample) => centsFrom(s.midi as number, targetMidi);
  const isHit = (s: PitchSample) => s.midi !== null && classifyCents(centsOf(s), toleranceCents) === 'hit';

  const voiced = scored.filter((s) => s.midi !== null);
  const voicedCents = voiced.map(centsOf);
  const hits = scored.filter(isHit).length;
  const firstHit = inWindow.find(isHit);

  const inToleranceRatio = scored.length > 0 ? hits / scored.length : 0;
  return {
    inToleranceRatio,
    voicedRatio: scored.length > 0 ? voiced.length / scored.length : 0,
    meanCents: voicedCents.length > 0 ? mean(voicedCents) : null,
    spreadCents: voicedCents.length > 0 ? standardDeviation(voicedCents) : null,
    onsetMs: firstHit ? firstHit.time : null,
    stars: starsForScore(inToleranceRatio),
  };
}
