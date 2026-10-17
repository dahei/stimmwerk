import { useEffect, useRef, useState } from 'react';
import { useMicrophone } from '../audio/microphoneContext';
import { centsFrom, noteName } from '../audio/notes';
import { playReferenceTone } from '../audio/referenceTone';
import { MicrophoneGate } from '../components/MicrophoneGate';
import { PitchCurve } from '../components/PitchCurve';
import { PitchFeedback } from '../components/PitchFeedback';
import { TunerGauge } from '../components/TunerGauge';
import { Button, Card, OptionGroup } from '../components/ui';
import { evaluateHoldNote, type HoldNoteResult, type HoldNoteSettings, type PitchSample } from '../exercises/holdNote';
import { t } from '../i18n/de';
import { settings } from '../settings';

const DURATIONS_S = [3, 5, 8, 10] as const;
const TOLERANCES_CENTS = [50, 30, 20, 10] as const;
const MIN_TARGET = 36; // C2
const MAX_TARGET = 84; // C6
const REFERENCE_MS = 1500;
const COUNT_IN_STEPS = 3;
const COUNT_IN_STEP_MS = 700;
/** Same limit as the "too low / too high" tip rule in PLAN.md. */
const ON_TARGET_CENTS = 15;

type Phase =
  | { kind: 'setup' }
  | { kind: 'listen' }
  | { kind: 'countIn'; count: number }
  | { kind: 'singing'; startTime: number; exercise: HoldNoteSettings }
  | { kind: 'result'; result: HoldNoteResult; curve: PitchSample[] };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function HoldNoteScreen() {
  return (
    <MicrophoneGate>
      <HoldNote />
    </MicrophoneGate>
  );
}

function HoldNote() {
  const { reading, subscribe } = useMicrophone();
  const [targetMidi, setTargetMidi] = useState(57); // A3: comfortable for most voices
  const [durationS, setDurationS] = useState<number>(5);
  const [toleranceCents, setToleranceCents] = useState<number>(50);
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  // Each run gets an id; a cancel or unmount makes older runs stop.
  const runId = useRef(0);
  const scoreSamples = useRef<PitchSample[]>([]);
  const [liveCurve, setLiveCurve] = useState<PitchSample[]>([]);

  const exercise: HoldNoteSettings = { targetMidi, durationMs: durationS * 1000, toleranceCents };
  const liveCents = reading?.displayMidi != null ? centsFrom(reading.displayMidi, targetMidi) : null;

  useEffect(() => () => void runId.current++, []);

  async function begin() {
    const run = ++runId.current;
    setPhase({ kind: 'listen' });
    await playReferenceTone(targetMidi, REFERENCE_MS);
    for (let count = COUNT_IN_STEPS; count >= 1; count--) {
      if (runId.current !== run) return;
      setPhase({ kind: 'countIn', count });
      await wait(COUNT_IN_STEP_MS);
    }
    if (runId.current !== run) return;
    scoreSamples.current = [];
    setLiveCurve([]);
    setPhase({ kind: 'singing', startTime: performance.now(), exercise });
  }

  function cancel() {
    runId.current++;
    setPhase({ kind: 'setup' });
  }

  useEffect(() => {
    if (phase.kind !== 'singing') return;
    const { startTime, exercise } = phase;
    let finished = false;
    const displayCurve: PitchSample[] = [];
    const unsubscribe = subscribe((r) => {
      const time = r.time - startTime;
      if (finished || time < 0) return;
      if (time > exercise.durationMs) {
        finished = true;
        setPhase({
          kind: 'result',
          result: evaluateHoldNote(scoreSamples.current, exercise),
          curve: [...displayCurve],
        });
        return;
      }
      scoreSamples.current.push({ time, midi: r.scoreMidi });
      displayCurve.push({ time, midi: r.displayMidi });
      setLiveCurve([...displayCurve]);
    });
    return unsubscribe;
  }, [phase, subscribe]);

  const targetName = noteName(targetMidi, settings.noteNaming);

  if (phase.kind === 'result') {
    return (
      <ResultView
        result={phase.result}
        curve={phase.curve}
        exercise={exercise}
        onAgain={() => void begin()}
        onSettings={() => setPhase({ kind: 'setup' })}
      />
    );
  }

  if (phase.kind !== 'setup') {
    const remaining =
      phase.kind === 'singing' && reading
        ? Math.max(0, Math.ceil((exercise.durationMs - (reading.time - phase.startTime)) / 1000))
        : durationS;
    return (
      <Card className="space-y-4">
        <div className="text-center">
          <div className="text-sm text-muted">{t.hold.targetNote}</div>
          <div className="text-6xl font-bold">{targetName}</div>
        </div>
        <div className="flex h-10 items-center justify-center text-xl font-semibold" aria-live="assertive">
          {phase.kind === 'listen' && t.hold.listenPhase}
          {phase.kind === 'countIn' && (
            <span>
              {t.hold.countIn} <span className="tabular-nums text-accent">{phase.count}</span>
            </span>
          )}
          {phase.kind === 'singing' && (
            <span>
              {t.hold.now} <span className="ml-2 text-base font-normal text-muted">{t.hold.remaining(remaining)}</span>
            </span>
          )}
        </div>
        <TunerGauge cents={phase.kind === 'singing' ? liveCents : null} toleranceCents={toleranceCents} />
        <PitchFeedback cents={phase.kind === 'singing' ? liveCents : null} toleranceCents={toleranceCents} />
        <PitchCurve
          samples={phase.kind === 'singing' ? liveCurve : []}
          targetMidi={targetMidi}
          toleranceCents={toleranceCents}
          durationMs={exercise.durationMs}
        />
        <Button variant="secondary" className="w-full" onClick={cancel}>
          {t.hold.cancel}
        </Button>
      </Card>
    );
  }

  const singingMidi = reading?.displayMidi != null ? Math.round(reading.displayMidi) : null;
  const canTake = singingMidi !== null && singingMidi >= MIN_TARGET && singingMidi <= MAX_TARGET;

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="text-center text-sm text-muted">{t.hold.targetNote}</div>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            aria-label={t.hold.lower}
            disabled={targetMidi <= MIN_TARGET}
            onClick={() => setTargetMidi((m) => m - 1)}
          >
            −
          </Button>
          <div className="text-6xl font-bold">{targetName}</div>
          <Button
            variant="secondary"
            aria-label={t.hold.higher}
            disabled={targetMidi >= MAX_TARGET}
            onClick={() => setTargetMidi((m) => m + 1)}
          >
            +
          </Button>
        </div>
        <Button
          variant="secondary"
          className="w-full"
          disabled={!canTake}
          onClick={() => singingMidi !== null && setTargetMidi(singingMidi)}
        >
          {t.hold.takeCurrent}
          {canTake && ` (${noteName(singingMidi, settings.noteNaming)})`}
        </Button>
        <TunerGauge cents={liveCents} toleranceCents={toleranceCents} />
        <PitchFeedback cents={liveCents} toleranceCents={toleranceCents} />
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
        <Button onClick={() => void begin()}>{t.hold.start}</Button>
      </div>
    </div>
  );
}

interface ResultViewProps {
  result: HoldNoteResult;
  curve: PitchSample[];
  exercise: HoldNoteSettings;
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
        <div className="text-5xl tracking-widest" role="img" aria-label={t.result.starsLabel(result.stars)}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= result.stars ? 'text-star' : 'text-track'}>
              ★
            </span>
          ))}
        </div>
        {nothingSung ? (
          <p className="text-muted">{t.result.nothingSung}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-left">
            <Stat label={t.result.hitRate} value={`${Math.round(result.inToleranceRatio * 100)} %`} />
            <Stat
              label={t.result.meanDeviation}
              value={`${t.feedback.cents(result.meanCents as number)}`}
              detail={direction}
            />
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

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {value}
        {detail && <span className="block text-sm font-normal text-muted">{detail}</span>}
      </dd>
    </div>
  );
}
