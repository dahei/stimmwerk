import { centsFrom } from '../audio/notes';
import type { PitchSample } from '../exercises/holdNote';
import { classifyCents } from '../exercises/scoring';
import { STATUS_COLOR_VAR } from './colors';
import { cssColor, useCanvas } from './useCanvas';

interface PitchCurveProps {
  samples: readonly PitchSample[];
  targetMidi: number;
  toleranceCents: number;
  /** Length of the x axis in milliseconds. */
  durationMs: number;
}

/** Gaps longer than this break the line (silence or a dropped frame burst). */
const MAX_GAP_MS = 120;

/** Pitch over time relative to the target, with the tolerance band. */
export function PitchCurve({ samples, targetMidi, toleranceCents, durationMs }: PitchCurveProps) {
  const ref = useCanvas((ctx, width, height) => {
    const voicedCents = samples.filter((s) => s.midi !== null).map((s) => Math.abs(centsFrom(s.midi as number, targetMidi)));
    // Show at least ±150 cents; grow up to ±400 so that large misses stay visible.
    const range = Math.min(400, Math.max(150, ...voicedCents.map((c) => c * 1.1)));
    const toX = (time: number) => (time / durationMs) * width;
    const toY = (cents: number) => height / 2 - (cents / range) * (height / 2 - 4);

    ctx.fillStyle = cssColor('--hit-soft');
    ctx.fillRect(0, toY(toleranceCents), width, toY(-toleranceCents) - toY(toleranceCents));

    ctx.strokeStyle = cssColor('--muted');
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(width, toY(0));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1];
      const b = samples[i];
      if (a.midi === null || b.midi === null || b.time - a.time > MAX_GAP_MS) continue;
      const centsA = centsFrom(a.midi, targetMidi);
      const centsB = centsFrom(b.midi, targetMidi);
      ctx.strokeStyle = cssColor(STATUS_COLOR_VAR[classifyCents(centsB, toleranceCents)]);
      ctx.beginPath();
      ctx.moveTo(toX(a.time), toY(Math.max(-range, Math.min(range, centsA))));
      ctx.lineTo(toX(b.time), toY(Math.max(-range, Math.min(range, centsB))));
      ctx.stroke();
    }
  });

  return <canvas ref={ref} className="h-40 w-full rounded-xl bg-bg" aria-hidden="true" />;
}
