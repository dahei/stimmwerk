import { noteName } from '../audio/notes';
import { settings } from '../settings';
import { cssColor } from './useCanvas';

export const NOTE_LABEL_WIDTH = 44;
// Pitch classes of the black piano keys; their lines and labels are lighter.
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

interface NoteGridOptions {
  minMidi: number;
  maxMidi: number;
  toY: (midi: number) => number;
  width: number;
  /** Notes drawn in the accent color (targets). */
  highlight?: ReadonlySet<number>;
}

/** Horizontal note lines with note names on the left, shared by the ladder and the piano roll. */
export function drawNoteGrid(ctx: CanvasRenderingContext2D, { minMidi, maxMidi, toY, width, highlight }: NoteGridOptions) {
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let midi = Math.ceil(minMidi); midi <= Math.floor(maxMidi); midi++) {
    const black = BLACK_KEYS.has(((midi % 12) + 12) % 12);
    const isTarget = highlight?.has(midi) ?? false;
    ctx.strokeStyle = cssColor(isTarget ? '--accent' : '--track');
    ctx.lineWidth = isTarget ? 2 : black ? 0.5 : 1;
    ctx.beginPath();
    ctx.moveTo(NOTE_LABEL_WIDTH, toY(midi));
    ctx.lineTo(width, toY(midi));
    ctx.stroke();
    ctx.fillStyle = cssColor(isTarget ? '--accent' : '--muted');
    ctx.globalAlpha = black && !isTarget ? 0.55 : 1;
    ctx.fillText(noteName(midi, settings.noteNaming), NOTE_LABEL_WIDTH - 8, toY(midi));
    ctx.globalAlpha = 1;
  }
}
