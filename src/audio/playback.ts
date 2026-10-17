import { midiToFrequency } from './notes';
import { decodePianoSample, fetchPianoSample, schedulePianoNote } from './piano';

let context: AudioContext | null = null;

function getContext(): AudioContext {
  context ??= new AudioContext();
  return context;
}

/** Small lead time, so that the first note is not cut off while the audio thread starts. */
const SCHEDULE_AHEAD_S = 0.05;

export interface NoteEvent {
  midi: number;
  /** Milliseconds from the start of the sequence. */
  startMs: number;
  durationMs: number;
}

/** Times are on the `performance.now()` clock, like the microphone readings. */
export interface Playback {
  /** When the first note sounds. */
  startTime: number;
  /** When the last note ends (without its fade-out). */
  endTime: number;
  /** Resolves when everything has stopped sounding. */
  done: Promise<void>;
  /** Stops all notes at once (e.g. on cancel). */
  stop(): void;
}

/** Converts audio clock time to `performance.now()` time, including the output latency. */
function toPerformanceTime(ctx: AudioContext, audioTime: number): number {
  return performance.now() + (audioTime - ctx.currentTime + (ctx.outputLatency || 0)) * 1000;
}

function stopAll(nodes: readonly AudioScheduledSourceNode[]): void {
  for (const node of nodes) {
    try {
      node.stop();
    } catch {
      // Already stopped.
    }
  }
}

function ended(node: AudioScheduledSourceNode): Promise<void> {
  return new Promise((resolve) => {
    node.onended = () => resolve();
  });
}

/** Downloads the piano sample in the background, so that the first play starts without delay. */
export function preloadNotes(midis: readonly number[]): void {
  for (const midi of midis) fetchPianoSample(midi).catch(() => {});
}

/** Plays a sequence of notes as piano tones. Falls back to a simple tone when the samples are not available. */
export async function playNotes(notes: readonly NoteEvent[], delayMs = 0): Promise<Playback> {
  const ctx = getContext();
  await ctx.resume();

  let buffers: Map<number, AudioBuffer> | null = null;
  try {
    const midis = [...new Set(notes.map((n) => n.midi))];
    const decoded = await Promise.all(midis.map((midi) => decodePianoSample(ctx, midi)));
    buffers = new Map(midis.map((midi, i) => [midi, decoded[i]]));
  } catch {
    // Offline before the first load, or a decode error: use the synthesized tone.
  }

  const origin = ctx.currentTime + SCHEDULE_AHEAD_S + delayMs / 1000;
  const nodes = notes.map((note) => {
    const when = origin + note.startMs / 1000;
    const duration = note.durationMs / 1000;
    const buffer = buffers?.get(note.midi);
    return buffer ? schedulePianoNote(ctx, buffer, note.midi, when, duration) : scheduleSynthNote(ctx, note.midi, when, duration);
  });

  const last = Math.max(0, ...notes.map((n) => n.startMs + n.durationMs));
  return {
    startTime: toPerformanceTime(ctx, origin),
    endTime: toPerformanceTime(ctx, origin + last / 1000),
    done: Promise.all(nodes.map(ended)).then(() => {}),
    stop: () => stopAll(nodes),
  };
}

/** Plays one target note and resolves when it has finished. */
export async function playReferenceTone(midi: number, durationMs = 1500): Promise<void> {
  const playback = await playNotes([{ midi, startMs: 0, durationMs }]);
  await playback.done;
}

/**
 * Plays `beats` clicks, the first one after `delayMs`. `endTime` is the beat after the
 * last click: the moment to start singing.
 */
export async function playCountIn(beats: number, beatMs: number, delayMs = 0): Promise<Playback> {
  const ctx = getContext();
  await ctx.resume();
  const origin = ctx.currentTime + SCHEDULE_AHEAD_S + delayMs / 1000;
  const nodes = Array.from({ length: beats }, (_, i) => scheduleClick(ctx, origin + (i * beatMs) / 1000, i === 0));
  return {
    startTime: toPerformanceTime(ctx, origin),
    endTime: toPerformanceTime(ctx, origin + (beats * beatMs) / 1000),
    done: Promise.all(nodes.map(ended)).then(() => {}),
    stop: () => stopAll(nodes),
  };
}

function scheduleClick(ctx: AudioContext, when: number, accent: boolean): AudioScheduledSourceNode {
  const oscillator = ctx.createOscillator();
  oscillator.frequency.value = accent ? 1600 : 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(when + 0.07);
  return oscillator;
}

function scheduleSynthNote(ctx: AudioContext, midi: number, when: number, durationS: number): AudioScheduledSourceNode {
  const end = when + durationS;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.value = midiToFrequency(midi);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.25, when + 0.03);
  gain.gain.setTargetAtTime(0.15, when + 0.03, 0.3);
  gain.gain.setTargetAtTime(0, end - 0.15, 0.05);

  oscillator.connect(filter).connect(gain).connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(end + 0.1);
  return oscillator;
}
