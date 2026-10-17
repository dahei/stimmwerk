import { noteName } from '../audio/notes';
import type { PitchReading } from '../audio/tracker';
import { t } from '../i18n/de';
import { settings } from '../settings';
import { Button } from './ui';

interface NoteSelectorProps {
  label: string;
  midi: number;
  min: number;
  max: number;
  /** Live reading, for "take the sung note". */
  reading: PitchReading | null;
  onChange(midi: number): void;
}

/** Choose a note with −/+ or by singing it. */
export function NoteSelector({ label, midi, min, max, reading, onChange }: NoteSelectorProps) {
  const sung = reading?.displayMidi != null ? Math.round(reading.displayMidi) : null;
  const canTake = sung !== null && sung >= min && sung <= max;

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted">{label}</div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" aria-label={t.note.lower} disabled={midi <= min} onClick={() => onChange(midi - 1)}>
          −
        </Button>
        <div className="text-6xl font-bold">{noteName(midi, settings.noteNaming)}</div>
        <Button variant="secondary" aria-label={t.note.higher} disabled={midi >= max} onClick={() => onChange(midi + 1)}>
          +
        </Button>
      </div>
      <Button variant="secondary" className="w-full" disabled={!canTake} onClick={() => canTake && onChange(sung)}>
        {t.note.takeCurrent}
        {canTake && ` (${noteName(sung, settings.noteNaming)})`}
      </Button>
    </div>
  );
}
