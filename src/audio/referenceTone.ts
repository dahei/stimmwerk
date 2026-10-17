import { midiToFrequency } from './notes';

// Temporary synthesized reference tone for M1. M2 replaces it with piano samples.

let context: AudioContext | null = null;

function getContext(): AudioContext {
  context ??= new AudioContext();
  return context;
}

/** Plays a soft tone and resolves when it has finished. */
export async function playReferenceTone(midi: number, durationMs = 1500): Promise<void> {
  const ctx = getContext();
  await ctx.resume();
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
