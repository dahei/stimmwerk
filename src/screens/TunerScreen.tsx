import { useMicrophone } from '../audio/microphoneContext';
import { nearestNote, noteName } from '../audio/notes';
import { MicrophoneGate } from '../components/MicrophoneGate';
import { PitchFeedback } from '../components/PitchFeedback';
import { TunerGauge } from '../components/TunerGauge';
import { Card } from '../components/ui';
import { t } from '../i18n/de';
import { settings } from '../settings';

/** Free tuner: compares the voice with the nearest semitone. */
const TUNER_TOLERANCE_CENTS = 10;

export function TunerScreen() {
  return (
    <MicrophoneGate>
      <Tuner />
    </MicrophoneGate>
  );
}

function Tuner() {
  const { reading } = useMicrophone();
  const nearest = reading?.displayMidi != null ? nearestNote(reading.displayMidi) : null;

  return (
    <Card className="space-y-4">
      <div className="text-center">
        <div className="text-7xl font-bold tabular-nums">
          {nearest ? noteName(nearest.midi, settings.noteNaming) : '–'}
        </div>
        <div className="mt-1 h-5 text-sm text-muted tabular-nums">
          {reading?.frequency ? t.tuner.frequency(reading.frequency) : ''}
        </div>
      </div>
      <TunerGauge cents={nearest?.cents ?? null} toleranceCents={TUNER_TOLERANCE_CENTS} />
      <PitchFeedback cents={nearest?.cents ?? null} toleranceCents={TUNER_TOLERANCE_CENTS} />
    </Card>
  );
}
