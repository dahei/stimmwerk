export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;

export type NoteNaming = 'de' | 'en';

// German uses H for B natural and B for B flat.
const NOTE_NAMES: Record<NoteNaming, readonly string[]> = {
  de: ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H'],
  en: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
};

/** Fractional MIDI note number for a frequency (A4 = 69). */
export function frequencyToMidi(frequency: number): number {
  return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
}

export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12);
}

/** Deviation of `midi` from `targetMidi` in cents. Positive means too high. */
export function centsFrom(midi: number, targetMidi: number): number {
  return (midi - targetMidi) * 100;
}

/** Nearest semitone and the deviation from it in cents (-50 .. +50). */
export function nearestNote(midi: number): { midi: number; cents: number } {
  const rounded = Math.round(midi);
  return { midi: rounded, cents: centsFrom(midi, rounded) };
}

/** Note name with scientific octave number, e.g. "A4", "H3", "Fis5". */
export function noteName(midi: number, naming: NoteNaming = 'de'): string {
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[naming][pitchClass]}${octave}`;
}
