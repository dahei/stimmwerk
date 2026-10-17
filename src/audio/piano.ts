// Salamander Grand Piano samples (CC BY 3.0), one every minor third from C2 to C6.
// See public/samples/piano/LICENSE.txt.

const SAMPLE_NAMES = ['C', 'Ds', 'Fs', 'A'] as const;
const FIRST_SAMPLE_MIDI = 36; // C2
const LAST_SAMPLE_MIDI = 84; // C6

export const PIANO_SAMPLE_MIDIS: readonly number[] = Array.from(
  { length: (LAST_SAMPLE_MIDI - FIRST_SAMPLE_MIDI) / 3 + 1 },
  (_, i) => FIRST_SAMPLE_MIDI + i * 3,
);

/** The sample closest to `midi`; playback rate shifts it by at most ±1.5 semitones inside the range. */
export function nearestSampleMidi(midi: number): number {
  const clamped = Math.max(FIRST_SAMPLE_MIDI, Math.min(LAST_SAMPLE_MIDI, midi));
  return FIRST_SAMPLE_MIDI + Math.round((clamped - FIRST_SAMPLE_MIDI) / 3) * 3;
}

export function sampleFileName(sampleMidi: number): string {
  const name = SAMPLE_NAMES[((sampleMidi % 12) / 3) | 0];
  return `${name}${Math.floor(sampleMidi / 12) - 1}.mp3`;
}

export function playbackRate(midi: number, sampleMidi: number): number {
  return 2 ** ((midi - sampleMidi) / 12);
}

const files = new Map<number, Promise<ArrayBuffer>>();
const decoded = new Map<number, Promise<AudioBuffer>>();

/** Downloads (once) the sample file for `midi`. Needs no AudioContext, so it can run before a user gesture. */
export function fetchPianoSample(midi: number): Promise<ArrayBuffer> {
  const sampleMidi = nearestSampleMidi(midi);
  let file = files.get(sampleMidi);
  if (!file) {
    file = fetch(`${import.meta.env.BASE_URL}samples/piano/${sampleFileName(sampleMidi)}`).then((response) => {
      if (!response.ok) throw new Error(`Piano sample ${sampleMidi}: HTTP ${response.status}`);
      return response.arrayBuffer();
    });
    // A failed download can be tried again later.
    file.catch(() => files.delete(sampleMidi));
    files.set(sampleMidi, file);
  }
  return file;
}

export function decodePianoSample(ctx: BaseAudioContext, midi: number): Promise<AudioBuffer> {
  const sampleMidi = nearestSampleMidi(midi);
  let buffer = decoded.get(sampleMidi);
  if (!buffer) {
    // decodeAudioData detaches its input: decode a copy, so that the file cache stays valid.
    buffer = fetchPianoSample(midi).then((data) => ctx.decodeAudioData(data.slice(0)));
    buffer.catch(() => decoded.delete(sampleMidi));
    decoded.set(sampleMidi, buffer);
  }
  return buffer;
}

export const PIANO_RELEASE_S = 0.25;

/** Schedules one piano note at audio time `when`; it fades out after `durationS`. */
export function schedulePianoNote(
  ctx: AudioContext,
  buffer: AudioBuffer,
  midi: number,
  when: number,
  durationS: number,
): AudioScheduledSourceNode {
  const end = when + durationS;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate(midi, nearestSampleMidi(midi));

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, when);
  gain.gain.setValueAtTime(0.8, end);
  gain.gain.linearRampToValueAtTime(0, end + PIANO_RELEASE_S);

  source.connect(gain).connect(ctx.destination);
  source.start(when);
  source.stop(end + PIANO_RELEASE_S);
  return source;
}
