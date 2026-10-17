import { DEFAULT_DETECTOR_OPTIONS } from '../audio/pitch';
import type { PitchReading } from '../audio/tracker';
import { t } from '../i18n/de';

const MIN_DB = -80;
const MAX_DB = 0;
const DEBUG = new URLSearchParams(window.location.search).has('debug');

const toPercent = (db: number) => ((Math.max(MIN_DB, Math.min(MAX_DB, db)) - MIN_DB) / (MAX_DB - MIN_DB)) * 100;

/** Input level with a mark at the detection threshold: shows if the microphone hears you. */
export function LevelMeter({ reading }: { reading: PitchReading | null }) {
  const db = reading?.volumeDecibels ?? -Infinity;
  const threshold = DEFAULT_DETECTOR_OPTIONS.minVolumeDecibels;
  const loudEnough = db >= threshold;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="w-12 text-xs text-muted">{t.level.label}</span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-track">
          <div
            className={`h-full rounded-full ${loudEnough ? 'bg-accent' : 'bg-muted'}`}
            style={{ width: `${toPercent(db)}%` }}
          />
          <div className="absolute inset-y-0 w-0.5 bg-text/50" style={{ left: `${toPercent(threshold)}%` }} />
        </div>
        <span className="w-16 text-right text-xs text-muted">{loudEnough ? '' : t.level.tooQuiet}</span>
      </div>
      {DEBUG && reading && (
        <p className="text-right font-mono text-xs text-muted">
          {db.toFixed(0)} dB · clarity {reading.clarity.toFixed(2)} · {reading.frequency?.toFixed(1) ?? '–'} Hz
        </p>
      )}
    </div>
  );
}
