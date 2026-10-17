import { createPitchAnalyzer, DEFAULT_DETECTOR_OPTIONS, type DetectorOptions } from './pitch';
import { PitchTracker, type PitchReading } from './tracker';

/** 2048 samples ≈ 43 ms at 48 kHz: enough periods for low male voices. */
const FRAME_SIZE = 2048;

export interface PitchStream {
  stop(): void;
}

export type MicrophoneErrorKind = 'denied' | 'no-device' | 'unsupported' | 'unknown';

export class MicrophoneError extends Error {
  readonly kind: MicrophoneErrorKind;

  constructor(kind: MicrophoneErrorKind, cause?: unknown) {
    super(kind, { cause });
    this.kind = kind;
  }
}

function toMicrophoneError(error: unknown): MicrophoneError {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return new MicrophoneError('denied', error);
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') return new MicrophoneError('no-device', error);
  }
  return new MicrophoneError('unknown', error);
}

/**
 * Opens the microphone and calls `onReading` once per animation frame.
 * Must be called from a user gesture (browsers block audio otherwise).
 */
export async function startPitchStream(
  onReading: (reading: PitchReading) => void,
  options: DetectorOptions = DEFAULT_DETECTOR_OPTIONS,
): Promise<PitchStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new MicrophoneError('unsupported');

  let media: MediaStream;
  try {
    // Browser voice processing distorts pitch and level: switch it off.
    media = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (error) {
    throw toMicrophoneError(error);
  }

  const context = new AudioContext();
  await context.resume();
  const source = context.createMediaStreamSource(media);
  const analyser = context.createAnalyser();
  analyser.fftSize = FRAME_SIZE;
  source.connect(analyser);

  const buffer = new Float32Array(FRAME_SIZE);
  const analyze = createPitchAnalyzer(FRAME_SIZE, options);
  const tracker = new PitchTracker();
  let frameId = 0;

  const loop = () => {
    analyser.getFloatTimeDomainData(buffer);
    onReading(tracker.push(performance.now(), analyze(buffer, context.sampleRate)));
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);

  return {
    stop() {
      cancelAnimationFrame(frameId);
      source.disconnect();
      media.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
}
