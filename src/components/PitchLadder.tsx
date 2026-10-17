import { useRef } from 'react';
import type { PitchReading } from '../audio/tracker';
import { classifyCents } from '../exercises/scoring';
import { STATUS_COLOR_VAR } from './colors';
import { drawNoteGrid, NOTE_LABEL_WIDTH } from './noteGrid';
import { cssColor, useCanvas } from './useCanvas';

interface PitchLadderProps {
  reading: PitchReading | null;
  /** Target note. Without a target the view follows the voice. */
  targetMidi?: number;
  toleranceCents: number;
  /** Visible semitones above and below the center. */
  span?: number;
  historyMs?: number;
  /** Clears the trail when this value changes (e.g. a new attempt). */
  resetKey?: unknown;
  /** Tailwind height class. */
  heightClass?: string;
}

/** Without a target, the view moves only when the voice leaves this band (in semitones). */
const RECENTER_SEMITONES = 3;
const MAX_GAP_MS = 120;

/**
 * Vertical note scale with the voice as a trail that scrolls to the left.
 * It shows how far away the voice is, in note names, not only in cents.
 */
export function PitchLadder({
  reading,
  targetMidi,
  toleranceCents,
  span = 5,
  historyMs = 4000,
  resetKey,
  heightClass = 'h-72',
}: PitchLadderProps) {
  const history = useRef<{ time: number; midi: number | null }[]>([]);
  const center = useRef<number | null>(null);
  const lastResetKey = useRef<unknown>(resetKey);

  const ref = useCanvas((ctx, width, height) => {
    if (lastResetKey.current !== resetKey) {
      lastResetKey.current = resetKey;
      history.current = [];
    }
    const now = reading?.time ?? performance.now();
    const trail = history.current;
    if (reading && trail.at(-1)?.time !== reading.time) {
      trail.push({ time: reading.time, midi: reading.displayMidi });
    }
    while (trail.length > 0 && now - trail[0].time > historyMs) trail.shift();

    const current = reading?.displayMidi ?? null;
    if (targetMidi !== undefined) {
      center.current = targetMidi;
    } else if (current !== null && (center.current === null || Math.abs(current - center.current) > RECENTER_SEMITONES)) {
      center.current = Math.round(current);
    }
    const mid = center.current ?? 57;

    const rowHeight = height / (2 * span + 1);
    const toY = (midi: number) => height / 2 - (midi - mid) * rowHeight;
    const plotLeft = NOTE_LABEL_WIDTH;
    const plotRight = width - 14;
    const toX = (time: number) => plotRight - ((now - time) / historyMs) * (plotRight - plotLeft);

    drawNoteGrid(ctx, {
      minMidi: mid - span,
      maxMidi: mid + span,
      toY,
      width,
      highlight: targetMidi === undefined ? undefined : new Set([targetMidi]),
    });

    // Target band
    if (targetMidi !== undefined) {
      ctx.fillStyle = cssColor('--hit-soft');
      const top = toY(targetMidi + toleranceCents / 100);
      ctx.fillRect(plotLeft, top, width - plotLeft, toY(targetMidi - toleranceCents / 100) - top);
    }

    const limit = (midi: number) => Math.max(mid - span - 0.5, Math.min(mid + span + 0.5, midi));
    const colorFor = (midi: number) =>
      targetMidi === undefined
        ? cssColor('--accent')
        : cssColor(STATUS_COLOR_VAR[classifyCents((midi - targetMidi) * 100, toleranceCents)]);

    // Trail
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (a.midi === null || b.midi === null || b.time - a.time > MAX_GAP_MS) continue;
      ctx.strokeStyle = colorFor(b.midi);
      ctx.beginPath();
      ctx.moveTo(toX(a.time), toY(limit(a.midi)));
      ctx.lineTo(toX(b.time), toY(limit(b.midi)));
      ctx.stroke();
    }

    // Current position; outside the visible range an arrow at the edge
    if (current === null) return;
    ctx.fillStyle = colorFor(current);
    const y = toY(limit(current));
    ctx.beginPath();
    if (limit(current) !== current) {
      const dir = current > mid ? -1 : 1; // canvas y grows downwards
      ctx.moveTo(plotRight, y + dir * 12);
      ctx.lineTo(plotRight - 10, y - dir * 4);
      ctx.lineTo(plotRight + 10, y - dir * 4);
      ctx.closePath();
    } else {
      ctx.arc(plotRight, y, 8, 0, 2 * Math.PI);
    }
    ctx.fill();
  });

  return <canvas ref={ref} className={`${heightClass} w-full rounded-xl bg-bg`} aria-hidden="true" />;
}
