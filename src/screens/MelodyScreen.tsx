import { useEffect, useState } from 'react';
import { useMicrophone } from '../audio/microphoneContext';
import { centsFrom, noteName } from '../audio/notes';
import { playNotes, preloadNotes } from '../audio/playback';
import { LevelMeter } from '../components/LevelMeter';
import { MicrophoneGate } from '../components/MicrophoneGate';
import { NoteSelector } from '../components/NoteSelector';
import { PianoRoll } from '../components/PianoRoll';
import { PitchFeedback } from '../components/PitchFeedback';
import { Stars } from '../components/result';
import { Button, Card, OptionGroup } from '../components/ui';
import type { PitchSample } from '../exercises/holdNote';
import {
  beatMs,
  evaluateMelody,
  NOTE_LAG_MS,
  phraseDurationMs,
  timePhrase,
  type MelodyResult,
  type NoteStatus,
  type PhraseNote,
  type TimedNote,
} from '../exercises/melody';
import { PHRASES, RANDOM_PHRASE_ID, RANDOM_PHRASE_LENGTH, randomPhrase } from '../exercises/phrases';
import { useExerciseRun } from '../exercises/useExerciseRun';
import { t } from '../i18n/de';
import { settings } from '../settings';

const TEMPOS_BPM = [60, 80, 100] as const;
const TOLERANCES_CENTS = [50, 30, 20] as const;
const COUNT_IN_BEATS = 3;
const MIN_ROOT = 36; // C2
const MAX_NOTE = 84; // C6

interface MelodyRun {
  result: MelodyResult;
  trail: PitchSample[];
  notes: TimedNote[];
  toleranceCents: number;
}

export function MelodyScreen() {
  return (
    <MicrophoneGate>
      <Melody />
    </MicrophoneGate>
  );
}

function Melody() {
  const { reading } = useMicrophone();
  const [phraseId, setPhraseId] = useState<string>(PHRASES[0].id);
  const [randomNotes, setRandomNotes] = useState<PhraseNote[]>(() => randomPhrase(RANDOM_PHRASE_LENGTH));
  const [rootMidi, setRootMidi] = useState(55); // G3: the phrases go up to a fifth above
  const [bpm, setBpm] = useState<number>(80);
  const [toleranceCents, setToleranceCents] = useState<number>(50);
  const { phase, liveTrail, start, cancel, toSetup } = useExerciseRun<MelodyRun>();

  const phraseNotes = phraseId === RANDOM_PHRASE_ID ? randomNotes : PHRASES.find((p) => p.id === phraseId)!.notes;
  const maxOffset = Math.max(...phraseNotes.map((n) => n.offset));
  const root = Math.min(rootMidi, MAX_NOTE - maxOffset);
  const notes = timePhrase(phraseNotes, root, bpm);

  const midisKey = notes.map((n) => n.midi).join(',');
  useEffect(() => preloadNotes(midisKey.split(',').map(Number)), [midisKey]);

  function begin(runNotes: TimedNote[] = notes) {
    void start({
      notes: runNotes,
      beatMs: beatMs(bpm),
      countInBeats: COUNT_IN_BEATS,
      singDurationMs: phraseDurationMs(runNotes) + NOTE_LAG_MS,
      evaluate: (score, display) => ({
        result: evaluateMelody(score, runNotes, toleranceCents),
        trail: display,
        notes: runNotes,
        toleranceCents,
      }),
    });
  }

  function newRandom() {
    const next = randomPhrase(RANDOM_PHRASE_LENGTH);
    setRandomNotes(next);
    begin(timePhrase(next, root, bpm));
  }

  if (phase.kind === 'result') {
    return (
      <ResultView
        {...phase.result}
        onAgain={() => begin(phase.result.notes)}
        onNewRandom={phraseId === RANDOM_PHRASE_ID ? newRandom : undefined}
        onSettings={toSetup}
      />
    );
  }

  if (phase.kind !== 'setup') {
    // The reading time is the clock (one update per animation frame) while the microphone runs.
    const now = reading?.time ?? 0;
    const playheadMs = phase.kind === 'listen' || phase.kind === 'singing' ? now - phase.startTime : null;
    const active =
      phase.kind === 'singing' && playheadMs !== null
        ? notes.findIndex((n) => playheadMs >= n.startMs && playheadMs < n.startMs + n.durationMs)
        : -1;
    const liveCents =
      active >= 0 && reading?.displayMidi != null ? centsFrom(reading.displayMidi, notes[active].midi) : null;

    return (
      <Card className="space-y-4">
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
          {phase.kind === 'singing' && (
            <span>
              {t.run.now}
              {active >= 0 && (
                <span className="ml-2 text-base font-normal text-muted">
                  {t.melody.noteOf(active + 1, notes.length)} · {noteName(notes[active].midi, settings.noteNaming)}
                </span>
              )}
            </span>
          )}
        </div>
        <PianoRoll
          notes={notes}
          toleranceCents={toleranceCents}
          playheadMs={playheadMs}
          trail={phase.kind === 'singing' ? liveTrail : []}
        />
        <PitchFeedback cents={liveCents} toleranceCents={toleranceCents} />
        <LevelMeter reading={reading} />
        <Button variant="secondary" className="w-full" onClick={cancel}>
          {t.run.cancel}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-sm font-medium text-muted">{t.melody.phrase}</h2>
        <div className="grid grid-cols-2 gap-2">
          {PHRASES.map((phrase) => (
            <PhraseOption
              key={phrase.id}
              selected={phrase.id === phraseId}
              title={phrase.name}
              detail={t.melody.difficulty(phrase.difficulty)}
              difficulty={phrase.difficulty}
              onSelect={() => setPhraseId(phrase.id)}
            />
          ))}
          <PhraseOption
            selected={phraseId === RANDOM_PHRASE_ID}
            title={`🎲 ${t.melody.random}`}
            detail={t.melody.randomText}
            difficulty={2}
            onSelect={() => setPhraseId(RANDOM_PHRASE_ID)}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <NoteSelector
          label={t.melody.root}
          midi={root}
          min={MIN_ROOT}
          max={MAX_NOTE - maxOffset}
          reading={reading}
          onChange={setRootMidi}
        />
        <PianoRoll notes={notes} toleranceCents={toleranceCents} playheadMs={null} />
        <p className="text-center text-sm text-muted">
          {notes.map((n) => noteName(n.midi, settings.noteNaming)).join(' · ')}
        </p>
      </Card>

      <Card className="space-y-4">
        <OptionGroup label={t.melody.tempo} options={TEMPOS_BPM} value={bpm} format={t.melody.tempoValue} onChange={setBpm} />
        <OptionGroup
          label={t.hold.tolerance}
          options={TOLERANCES_CENTS}
          value={toleranceCents}
          format={t.hold.toleranceValue}
          onChange={setToleranceCents}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => void playNotes(notes)}>
          {t.melody.listen}
        </Button>
        <Button onClick={() => begin()}>{t.melody.start}</Button>
      </div>
    </div>
  );
}

interface PhraseOptionProps {
  selected: boolean;
  title: string;
  detail: string;
  difficulty: 1 | 2 | 3;
  onSelect(): void;
}

function PhraseOption({ selected, title, detail, difficulty, onSelect }: PhraseOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex min-h-12 flex-col justify-center gap-1 rounded-xl border px-3 py-2 text-left transition ${
        selected ? 'border-accent bg-accent/10' : 'border-border hover:bg-bg'
      }`}
    >
      <span className="text-sm leading-tight font-semibold">{title}</span>
      <span className="flex items-center gap-2 text-xs text-muted">
        <span className="tracking-widest text-accent" aria-hidden="true">
          {'●'.repeat(difficulty)}
          <span className="text-track">{'●'.repeat(3 - difficulty)}</span>
        </span>
        {detail}
      </span>
    </button>
  );
}

const STATUS_STYLE: Record<NoteStatus, { icon: string; className: string }> = {
  hit: { icon: '✓', className: 'text-hit' },
  low: { icon: '↑', className: 'text-low' },
  high: { icon: '↓', className: 'text-high' },
  unsteady: { icon: '~', className: 'text-high' },
  missed: { icon: '–', className: 'text-muted' },
};

interface ResultViewProps extends MelodyRun {
  onAgain(): void;
  onNewRandom?: () => void;
  onSettings(): void;
}

function ResultView({ result, trail, notes, toleranceCents, onAgain, onNewRandom, onSettings }: ResultViewProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4 text-center">
        <h2 className="text-sm font-medium text-muted">{t.result.title}</h2>
        <Stars stars={result.stars} />
        <p className="text-lg font-semibold">{t.melody.hits(result.hitCount, notes.length)}</p>
        <PianoRoll
          notes={notes}
          toleranceCents={toleranceCents}
          playheadMs={null}
          trail={trail}
          statuses={result.notes.map((n) => n.status)}
        />
        <ol className="flex flex-wrap justify-center gap-2">
          {result.notes.map((note, i) => {
            const style = STATUS_STYLE[note.status];
            return (
              <li key={i} className="rounded-lg bg-bg px-3 py-2 text-sm">
                <span className="font-semibold">{noteName(notes[i].midi, settings.noteNaming)}</span>{' '}
                <span className={style.className}>
                  <span aria-hidden="true">{style.icon}</span> {t.melody.status[note.status]}
                </span>
                {(note.status === 'low' || note.status === 'high') && note.medianCents !== null && (
                  <span className="block text-xs text-muted tabular-nums">{t.feedback.distance(note.medianCents)}</span>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
      <div className={`grid gap-3 ${onNewRandom ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Button variant="secondary" onClick={onSettings}>
          {t.result.settings}
        </Button>
        {onNewRandom && (
          <Button variant="secondary" onClick={onNewRandom}>
            {t.melody.newRandom}
          </Button>
        )}
        <Button onClick={onAgain}>{t.result.again}</Button>
      </div>
    </div>
  );
}
