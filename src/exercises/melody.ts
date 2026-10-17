import { centsFrom } from '../audio/notes';
import { median } from '../audio/smoothing';
import type { PitchSample } from './holdNote';
import { classifyCents, mean, starsForScore, type Stars } from './scoring';

/** One note of a phrase, relative to the root note. */
export interface PhraseNote {
  /** Semitones above the root (may be negative). */
  offset: number;
  beats: number;
}

export interface TimedNote {
  midi: number;
  /** Milliseconds from the start of the phrase. */
  startMs: number;
  durationMs: number;
}

export function beatMs(bpm: number): number {
  return 60000 / bpm;
}

export function timePhrase(notes: readonly PhraseNote[], rootMidi: number, bpm: number): TimedNote[] {
  const beat = beatMs(bpm);
  let position = 0;
  return notes.map((note) => {
    const timed = { midi: rootMidi + note.offset, startMs: position * beat, durationMs: note.beats * beat };
    position += note.beats;
    return timed;
  });
}

export function phraseDurationMs(notes: readonly TimedNote[]): number {
  const last = notes.at(-1);
  return last ? last.startMs + last.durationMs : 0;
}

// Only the pitch gets a score, not the rhythm: each note accepts a sung pitch a bit
// before its start and clearly after its end (see PLAN.md).
export const NOTE_LEAD_MS = 150;
export const NOTE_LAG_MS = 300;
/** A note counts as hit if the voice was inside the tolerance for at least this part of its length. */
export const HIT_RATIO = 0.5;

/**
 * hit = hit, low/high = mostly too low/high, unsteady = right on average but too short or too unstable,
 * missed = no voice detected.
 */
export type NoteStatus = 'hit' | 'low' | 'high' | 'unsteady' | 'missed';

export interface NoteResult {
  /** In-tolerance time relative to the note length, 0..1. */
  hitRatio: number;
  /** Median deviation in the main part of the note, null when nothing was sung. */
  medianCents: number | null;
  status: NoteStatus;
}

export interface MelodyResult {
  notes: NoteResult[];
  hitCount: number;
  score: number;
  stars: Stars;
}

export function evaluateNote(samples: readonly PitchSample[], note: TimedNote, toleranceCents: number): NoteResult {
  const end = note.startMs + note.durationMs;
  const inRange = (from: number, to: number) => samples.filter((s) => s.time >= from && s.time <= to);

  const nominalCount = inRange(note.startMs, end).length;
  const window = inRange(note.startMs - NOTE_LEAD_MS, end + NOTE_LAG_MS);
  const hits = window.filter(
    (s) => s.midi !== null && classifyCents(centsFrom(s.midi, note.midi), toleranceCents) === 'hit',
  ).length;
  const hitRatio = Math.min(1, hits / Math.max(1, nominalCount));

  // Direction: skip the first quarter (the voice moves from the last note) and the lag (it already
  // contains the next note when the user sings in time).
  const main = inRange(note.startMs + note.durationMs * 0.25, end)
    .filter((s) => s.midi !== null)
    .map((s) => centsFrom(s.midi as number, note.midi));
  const medianCents = main.length > 0 ? median(main) : null;

  let status: NoteStatus;
  if (hitRatio >= HIT_RATIO) status = 'hit';
  else if (medianCents === null) status = 'missed';
  else {
    const direction = classifyCents(medianCents, toleranceCents);
    status = direction === 'hit' ? 'unsteady' : direction;
  }
  return { hitRatio, medianCents, status };
}

export function evaluateMelody(
  samples: readonly PitchSample[],
  notes: readonly TimedNote[],
  toleranceCents: number,
): MelodyResult {
  const results = notes.map((note) => evaluateNote(samples, note, toleranceCents));
  const score = results.length > 0 ? mean(results.map((r) => r.hitRatio)) : 0;
  return {
    notes: results,
    hitCount: results.filter((r) => r.status === 'hit').length,
    score,
    stars: starsForScore(score),
  };
}
