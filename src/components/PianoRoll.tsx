import { centsFrom } from '../audio/notes';
import type { PitchSample } from '../exercises/holdNote';
import { phraseDurationMs, type NoteStatus, type TimedNote } from '../exercises/melody';
import { classifyCents } from '../exercises/scoring';
import { STATUS_COLOR_VAR } from './colors';
import { drawNoteGrid, NOTE_LABEL_WIDTH } from './noteGrid';
import { cssColor, useCanvas } from './useCanvas';

interface PianoRollProps {
  notes: readonly TimedNote[];
  toleranceCents: number;
  /** Position of the playhead in ms from the start of the phrase, null to hide it. */
  playheadMs: number | null;
  /** Sung pitch, time in ms from the start of the phrase. */
  trail?: readonly PitchSample[];
  /** After the evaluation: one status per note. */
  statuses?: readonly NoteStatus[];
}

const BEFORE_MS = 300;
const AFTER_MS = 500;
/** Semitones of space above the highest and below the lowest note. */
const MARGIN_SEMITONES = 2;
const MIN_SPAN_SEMITONES = 8;
const MAX_GAP_MS = 120;

const STATUS_FILL: Record<NoteStatus, string> = {
  ...STATUS_COLOR_VAR,
  unsteady: '--high',
  missed: '--muted',
};

/** The whole phrase at once: target notes as bars, the voice as a line, a playhead. */
export function PianoRoll({ notes, toleranceCents, playheadMs, trail = [], statuses }: PianoRollProps) {
  const ref = useCanvas((ctx, width, height) => {
    const midis = notes.map((n) => n.midi);
    let low = Math.min(...midis) - MARGIN_SEMITONES;
    let high = Math.max(...midis) + MARGIN_SEMITONES;
    const missing = MIN_SPAN_SEMITONES - (high - low);
    if (missing > 0) {
      low -= Math.floor(missing / 2);
      high += Math.ceil(missing / 2);
    }

    const total = phraseDurationMs(notes);
    const rowHeight = height / (high - low + 1);
    const toY = (midi: number) => height - (midi - low + 0.5) * rowHeight;
    const plotRight = width - 8;
    const toX = (time: number) =>
      NOTE_LABEL_WIDTH + ((time + BEFORE_MS) / (total + BEFORE_MS + AFTER_MS)) * (plotRight - NOTE_LABEL_WIDTH);

    drawNoteGrid(ctx, { minMidi: low, maxMidi: high, toY, width, highlight: new Set(midis) });

    // Target bars: as high as the tolerance band, at least a third of a row
    const activeIndex =
      playheadMs === null ? -1 : notes.findIndex((n) => playheadMs >= n.startMs && playheadMs < n.startMs + n.durationMs);
    const barHeight = Math.max(rowHeight / 3, ((2 * toleranceCents) / 100) * rowHeight);
    notes.forEach((note, i) => {
      const x = toX(note.startMs) + 1;
      const w = toX(note.startMs + note.durationMs) - x - 2;
      const status = statuses?.[i];
      ctx.fillStyle = cssColor(status ? STATUS_FILL[status] : '--accent');
      ctx.globalAlpha = status ? 0.35 : i === activeIndex ? 0.6 : 0.25;
      ctx.beginPath();
      ctx.roundRect(x, toY(note.midi) - barHeight / 2, w, barHeight, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Voice, colored relative to the note at that time
    const clamp = (midi: number) => Math.max(low - 0.5, Math.min(high + 0.5, midi));
    const noteAt = (time: number) =>
      notes.find((n) => time >= n.startMs && time < n.startMs + n.durationMs) ?? null;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (a.midi === null || b.midi === null || b.time - a.time > MAX_GAP_MS) continue;
      const target = noteAt(b.time);
      ctx.strokeStyle = cssColor(
        target ? STATUS_COLOR_VAR[classifyCents(centsFrom(b.midi, target.midi), toleranceCents)] : '--muted',
      );
      ctx.beginPath();
      ctx.moveTo(toX(a.time), toY(clamp(a.midi)));
      ctx.lineTo(toX(b.time), toY(clamp(b.midi)));
      ctx.stroke();
    }

    if (playheadMs !== null && playheadMs >= -BEFORE_MS && playheadMs <= total + AFTER_MS) {
      ctx.strokeStyle = cssColor('--text');
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(playheadMs), 0);
      ctx.lineTo(toX(playheadMs), height);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  return <canvas ref={ref} className="h-64 w-full rounded-xl bg-bg" aria-hidden="true" />;
}
