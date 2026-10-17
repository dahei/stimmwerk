import type { ReactNode } from 'react';
import { useMicrophone } from '../audio/microphoneContext';
import { t } from '../i18n/de';
import { Button, Card } from './ui';

/** Shows the children only while the microphone runs; asks for access otherwise. */
export function MicrophoneGate({ children }: { children: ReactNode }) {
  const { status, error, start } = useMicrophone();
  if (status === 'running') return <>{children}</>;

  return (
    <Card className="space-y-4 text-center">
      <div className="text-5xl" aria-hidden="true">🎤</div>
      <h2 className="text-xl font-semibold">{t.microphone.title}</h2>
      <p className="text-muted">{t.microphone.text}</p>
      {error && <p className="rounded-lg bg-high-soft p-3 text-sm">{t.microphone.errors[error]}</p>}
      <Button onClick={() => void start()} disabled={status === 'starting'}>
        {status === 'starting' ? t.microphone.starting : error ? t.microphone.retry : t.microphone.start}
      </Button>
    </Card>
  );
}
