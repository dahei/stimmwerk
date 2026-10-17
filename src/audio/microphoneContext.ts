import { createContext, useContext } from 'react';
import type { MicrophoneErrorKind } from './microphone';
import type { PitchReading } from './tracker';

export type Status = 'idle' | 'starting' | 'running' | 'error';
export type Listener = (reading: PitchReading) => void;

export interface MicrophoneState {
  status: Status;
  error: MicrophoneErrorKind | null;
  /** Latest reading; updates once per animation frame while running. */
  reading: PitchReading | null;
  start(): Promise<void>;
  /** Receives every reading. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void;
}

export const MicrophoneContext = createContext<MicrophoneState | null>(null);

export function useMicrophone(): MicrophoneState {
  const context = useContext(MicrophoneContext);
  if (!context) throw new Error('useMicrophone must be used inside MicrophoneProvider');
  return context;
}
