import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { MicrophoneError, startPitchStream, type MicrophoneErrorKind, type PitchStream } from './microphone';
import { MicrophoneContext, type Listener, type Status } from './microphoneContext';
import type { PitchReading } from './tracker';

/** One microphone stream for the whole app, so that the user grants access only once. */
export function MicrophoneProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<MicrophoneErrorKind | null>(null);
  const [reading, setReading] = useState<PitchReading | null>(null);
  const streamRef = useRef<PitchStream | null>(null);
  const listeners = useRef(new Set<Listener>());

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setStatus('starting');
    setError(null);
    try {
      streamRef.current = await startPitchStream((r) => {
        listeners.current.forEach((listener) => listener(r));
        setReading(r);
      });
      setStatus('running');
    } catch (e) {
      setError(e instanceof MicrophoneError ? e.kind : 'unknown');
      setStatus('error');
    }
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(
    () => () => {
      streamRef.current?.stop();
      streamRef.current = null;
    },
    [],
  );

  return (
    <MicrophoneContext.Provider value={{ status, error, reading, start, subscribe }}>
      {children}
    </MicrophoneContext.Provider>
  );
}
