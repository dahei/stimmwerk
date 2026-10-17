import type { PhraseNote } from './melody';

export interface Phrase {
  id: string;
  name: string;
  /** 1 = easy … 3 = difficult. */
  difficulty: 1 | 2 | 3;
  notes: PhraseNote[];
}

/** Equal beats, the last note twice as long. */
function steps(offsets: number[]): PhraseNote[] {
  return offsets.map((offset, i) => ({ offset, beats: i === offsets.length - 1 ? 2 : 1 }));
}

// Offsets are semitones above the root. Songs are public domain German children's songs.
export const PHRASES: readonly Phrase[] = [
  { id: 'second', name: 'Schritt auf und ab', difficulty: 1, notes: steps([0, 2, 0]) },
  { id: 'three-up', name: 'Drei Töne aufwärts', difficulty: 1, notes: steps([0, 2, 4]) },
  { id: 'cuckoo', name: 'Kuckuck (Terz)', difficulty: 1, notes: steps([7, 4, 7, 4]) },
  { id: '12321', name: '1-2-3-2-1', difficulty: 2, notes: steps([0, 2, 4, 2, 0]) },
  { id: 'triad', name: 'Dreiklang', difficulty: 2, notes: steps([0, 4, 7, 4, 0]) },
  {
    id: 'entchen',
    name: 'Alle meine Entchen',
    difficulty: 2,
    notes: [0, 2, 4, 5].map((offset) => ({ offset, beats: 1 })).concat([
      { offset: 7, beats: 2 },
      { offset: 7, beats: 2 },
    ]),
  },
  {
    id: 'haenschen',
    name: 'Hänschen klein',
    difficulty: 3,
    notes: [
      { offset: 7, beats: 1 },
      { offset: 4, beats: 1 },
      { offset: 4, beats: 2 },
      { offset: 5, beats: 1 },
      { offset: 2, beats: 1 },
      { offset: 2, beats: 2 },
    ],
  },
  { id: 'five-scale', name: 'Fünf Töne auf und ab', difficulty: 3, notes: steps([0, 2, 4, 5, 7, 5, 4, 2, 0]) },
];

/** Major scale degrees in semitones, one octave. */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12];

/**
 * A random walk on the major scale: steps of one or two degrees, never above the octave,
 * starting and ending on the root.
 */
export function randomPhrase(length: number, random: () => number = Math.random): PhraseNote[] {
  const degrees = [0];
  for (let i = 1; i < length - 1; i++) {
    const previous = degrees[i - 1];
    // Stay low enough to get back to the root in steps of at most two degrees.
    const reachable = 2 * (length - 1 - i);
    const options = [-2, -1, 1, 2].map((d) => previous + d).filter((d) => d >= 0 && d <= Math.min(5, reachable));
    degrees.push(options[Math.floor(random() * options.length)]);
  }
  if (length > 1) degrees.push(0);
  return steps(degrees.map((d) => MAJOR_SCALE[d]));
}

export const RANDOM_PHRASE_ID = 'random';
export const RANDOM_PHRASE_LENGTH = 4;
