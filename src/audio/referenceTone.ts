import { midiToFrequency } from './notes';
import { fetchPianoSample, playPianoNote } from './piano';

let context: AudioContext | null = null;

function getContext(): AudioContext {
  context ??= new AudioContext();
  return context;
}

/** Downloads the piano sample in the background, so that the first play starts without delay. */
export function preloadReferenceTone(midi: number): void {
  fetchPianoSample(midi).catch(() => {});
}

/** Plays the target note as a piano tone and resolves when it has finished. */
export async function playReferenceTone(midi: number, durationMs = 1500): Promise<void> {
  const ctx = getContext();
  await ctx.resume();
  try {
    await playPianoNote(ctx, midi, durationMs);
  } catch {
    // Samples not available (offline before the first load, decode error): use a simple tone.
    await playSynthTone(ctx, midi, durationMs);
  }
}

async function playSynthTone(ctx: AudioContext, midi: number, durationMs: number): Promise<void> {
  const start = ctx.currentTime;
  const end = start + durationMs / 1000;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.value = midiToFrequency(midi);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
  gain.gain.setTargetAtTime(0.15, start + 0.03, 0.3);
  gain.gain.setTargetAtTime(0, end - 0.15, 0.05);

  oscillator.connect(filter).connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.1);

  await new Promise<void>((resolve) => {
    oscillator.onended = () => resolve();
  });
}
