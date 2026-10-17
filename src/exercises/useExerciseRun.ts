import { useEffect, useRef, useState } from 'react';
import { useMicrophone } from '../audio/microphoneContext';
import { playCountIn, playNotes, type NoteEvent, type Playback } from '../audio/playback';
import type { PitchSample } from './holdNote';

/** Times are on the `performance.now()` clock, like the microphone readings. */
export type RunPhase<R> =
  | { kind: 'setup' }
  | { kind: 'listen'; startTime: number }
  | { kind: 'countIn'; singStart: number; beatMs: number }
  | { kind: 'singing'; startTime: number }
  | { kind: 'result'; result: R };

export interface RunOptions<R> {
  /** What the app plays first (call). */
  notes: readonly NoteEvent[];
  beatMs: number;
  countInBeats: number;
  /** Length of the singing phase (response). */
  singDurationMs: number;
  /** `score` uses the scoring smoothing, `display` the live smoothing. Times are ms from the start of singing. */
  evaluate(score: PitchSample[], display: PitchSample[]): R;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

/**
 * Call and response: play the notes, one beat pause, count-in clicks, then record the voice
 * for `singDurationMs` and evaluate it.
 */
export function useExerciseRun<R>() {
  const { subscribe } = useMicrophone();
  const [phase, setPhase] = useState<RunPhase<R>>({ kind: 'setup' });
  /** Display samples of the current attempt, for live drawing. */
  const [liveTrail, setLiveTrail] = useState<PitchSample[]>([]);
  // Each run gets an id; a cancel or unmount makes older runs stop.
  const runId = useRef(0);
  const playing = useRef<Playback[]>([]);
  const options = useRef<RunOptions<R> | null>(null);

  function stopAudio() {
    playing.current.forEach((p) => p.stop());
    playing.current = [];
  }

  useEffect(
    () => () => {
      runId.current++;
      stopAudio();
    },
    [],
  );

  async function start(runOptions: RunOptions<R>) {
    const run = ++runId.current;
    const stale = () => runId.current !== run;
    stopAudio();
    options.current = runOptions;
    const { notes, beatMs, countInBeats } = runOptions;

    const call = await playNotes(notes);
    playing.current.push(call);
    if (stale()) return call.stop();
    setPhase({ kind: 'listen', startTime: call.startTime });

    const countIn = await playCountIn(countInBeats, beatMs, call.endTime + beatMs - performance.now());
    playing.current.push(countIn);
    if (stale()) return countIn.stop();
    setPhase({ kind: 'countIn', singStart: countIn.endTime, beatMs });

    await wait(countIn.endTime - performance.now());
    if (stale()) return;
    setLiveTrail([]);
    setPhase({ kind: 'singing', startTime: countIn.endTime });
  }

  function cancel() {
    runId.current++;
    stopAudio();
    setPhase({ kind: 'setup' });
  }

  useEffect(() => {
    const runOptions = options.current;
    if (phase.kind !== 'singing' || !runOptions) return;
    const { startTime } = phase;
    const score: PitchSample[] = [];
    const display: PitchSample[] = [];
    let finished = false;
    return subscribe((reading) => {
      const time = reading.time - startTime;
      if (finished || time < 0) return;
      if (time > runOptions.singDurationMs) {
        finished = true;
        setPhase({ kind: 'result', result: runOptions.evaluate(score, display) });
        return;
      }
      score.push({ time, midi: reading.scoreMidi });
      display.push({ time, midi: reading.displayMidi });
      setLiveTrail([...display]);
    });
  }, [phase, subscribe]);

  return { phase, liveTrail, start, cancel, toSetup: () => setPhase({ kind: 'setup' }) };
}
