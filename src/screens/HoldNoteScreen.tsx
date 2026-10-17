import { useEffect, useState } from 'react';
import { useMicrophone } from '../audio/microphoneContext';
import { centsFrom, noteName } from '../audio/notes';
import { playReferenceTone, preloadNotes } from '../audio/playback';
import { LevelMeter } from '../components/LevelMeter';
import { MicrophoneGate } from '../components/MicrophoneGate';
import { NoteSelector } from '../components/NoteSelector';
import { PitchCurve } from '../components/PitchCurve';
import { PitchFeedback } from '../components/PitchFeedback';
import { PitchLadder } from '../components/PitchLadder';
import { Stars, Stat } from '../components/result';
import { Button, Card, OptionGroup } from '../components/ui';
import { evaluateHoldNote, type HoldNoteResult, type HoldNoteSettings, type PitchSample } from '../exercises/holdNote';
import { useExerciseRun } from '../exercises/useExerciseRun';
import { t } from '../i18n/de';
import { settings } from '../settings';

const DURATIONS_S = [3, 5, 8, 10] as const;
const TOLERANCES_CENTS = [50, 30, 20, 10] as const;
const MIN_TARGET = 36; // C2
const MAX_TARGET = 84; // C6
const REFERENCE_MS = 1500;
const COUNT_IN_BEATS = 3;
const BEAT_MS = 700;
/** Same limit as the "too low / too high" tip rule in PLAN.md. */
const ON_TARGET_CENTS = 15;

interface HoldRun {
  result: HoldNoteResult;
  curve: PitchSample[];
  exercise: HoldNoteSettings;
}

export function HoldNoteScreen() {
  return (
    <MicrophoneGate>
      <HoldNote />
    </MicrophoneGate>
  );
}

function HoldNote() {
  const { reading } = useMicrophone();
  const [targetMidi, setTargetMidi] = useState(57); // A3: comfortable for most voices
  const [durationS, setDurationS] = useState<number>(5);
  const [toleranceCents, setToleranceCents] = useState<number>(50);
  const { phase, start, cancel, toSetup } = useExerciseRun<HoldRun>();

  const liveCents = reading?.displayMidi != null ? centsFrom(reading.displayMidi, targetMidi) : null;

  useEffect(() => preloadNotes([targetMidi]), [targetMidi]);

  function begin() {
    const exercise: HoldNoteSettings = { targetMidi, durationMs: durationS * 1000, toleranceCents };
    void start({
      notes: [{ midi: targetMidi, startMs: 0, durationMs: REFERENCE_MS }],
      beatMs: BEAT_MS,
      countInBeats: COUNT_IN_BEATS,
      singDurationMs: exercise.durationMs,
      evaluate: (score, display) => ({ result: evaluateHoldNote(score, exercise), curve: display, exercise }),
    });
  }

  if (phase.kind === 'result') {
    return <ResultView {...phase.result} onAgain={begin} onSettings={toSetup} />;
  }

  if (phase.kind !== 'setup') {
    // The reading time is the clock (one update per animation frame) while the microphone runs.
    const now = reading?.time ?? 0;
    const singing = phase.kind === 'singing';
    return (
      <Card className="space-y-4">
        <div className="text-center">
          <div className="text-sm text-muted">{t.hold.targetNote}</div>
          <div className="text-6xl font-bold">{noteName(targetMidi, settings.noteNaming)}</div>
        </div>
        <div className="flex h-10 items-center justify-center text-xl font-semibold" aria-live="assertive">
          {phase.kind === 'listen' && t.run.listenPhase}
          {phase.kind === 'countIn' && (
            <span>
              {t.run.countIn}{' '}
              <span className="tabular-nums text-accent">
                {Math.max(1, Math.min(COUNT_IN_BEATS, Math.ceil((phase.singStart - now) / phase.beatMs)))}
              </span>
            </span>
          )}
          {singing && (
            <span>
              {t.run.now}
              <span className="ml-2 text-base font-normal text-muted">
                {t.hold.remaining(Math.max(0, Math.ceil((durationS * 1000 - (now - phase.startTime)) / 1000)))}
              </span>
            </span>
          )}
        </div>
        <PitchLadder
          reading={singing ? reading : null}
          targetMidi={targetMidi}
          toleranceCents={toleranceCents}
          resetKey={singing ? phase.startTime : phase.kind}
        />
        <PitchFeedback cents={singing ? liveCents : null} toleranceCents={toleranceCents} />
        <LevelMeter reading={reading} />
        <Button variant="secondary" className="w-full" onClick={cancel}>
          {t.run.cancel}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <NoteSelector
          label={t.hold.targetNote}
          midi={targetMidi}
          min={MIN_TARGET}
          max={MAX_TARGET}
          reading={reading}
          onChange={setTargetMidi}
        />
        <PitchLadder reading={reading} targetMidi={targetMidi} toleranceCents={toleranceCents} span={3} heightClass="h-48" />
        <PitchFeedback cents={liveCents} toleranceCents={toleranceCents} />
        <LevelMeter reading={reading} />
      </Card>

      <Card className="space-y-4">
        <OptionGroup label={t.hold.duration} options={DURATIONS_S} value={durationS} format={t.hold.seconds} onChange={setDurationS} />
        <OptionGroup
          label={t.hold.tolerance}
          options={TOLERANCES_CENTS}
          value={toleranceCents}
          format={t.hold.toleranceValue}
          onChange={setToleranceCents}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => void playReferenceTone(targetMidi, REFERENCE_MS)}>
          {t.hold.listen}
        </Button>
        <Button onClick={begin}>{t.hold.start}</Button>
      </div>
    </div>
  );
}

interface ResultViewProps extends HoldRun {
  onAgain(): void;
  onSettings(): void;
}

function ResultView({ result, curve, exercise, onAgain, onSettings }: ResultViewProps) {
  const nothingSung = result.meanCents === null;
  const direction =
    result.meanCents === null || Math.abs(result.meanCents) < ON_TARGET_CENTS
      ? t.result.onTarget
      : result.meanCents > 0
        ? t.result.tooHigh
        : t.result.tooLow;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 text-center">
        <h2 className="text-sm font-medium text-muted">
          {t.result.title} · {noteName(exercise.targetMidi, settings.noteNaming)}
        </h2>
        <Stars stars={result.stars} />
        {nothingSung ? (
          <p className="text-muted">{t.result.nothingSung}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-left">
            <Stat label={t.result.hitRate} value={`${Math.round(result.inToleranceRatio * 100)} %`} />
            <Stat label={t.result.meanDeviation} value={t.feedback.cents(result.meanCents as number)} detail={direction} />
            <Stat label={t.result.spread} value={`±${Math.round(result.spreadCents as number)} Cent`} />
            <Stat
              label={t.result.onset}
              value={result.onsetMs === null ? t.result.notReached : `${(result.onsetMs / 1000).toFixed(1).replace('.', ',')} s`}
            />
          </dl>
        )}
        <PitchCurve
          samples={curve}
          targetMidi={exercise.targetMidi}
          toleranceCents={exercise.toleranceCents}
          durationMs={exercise.durationMs}
        />
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onSettings}>
          {t.result.settings}
        </Button>
        <Button onClick={onAgain}>{t.result.again}</Button>
      </div>
    </div>
  );
}
