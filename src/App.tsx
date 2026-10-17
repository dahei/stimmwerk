import { useState } from 'react';
import { MicrophoneProvider } from './audio/MicrophoneProvider';
import { Card } from './components/ui';
import { t } from './i18n/de';
import { HoldNoteScreen } from './screens/HoldNoteScreen';
import { TunerScreen } from './screens/TunerScreen';

type Screen = 'home' | 'tuner' | 'hold';

const TITLES: Record<Screen, string> = {
  home: t.appName,
  tuner: t.home.tunerTitle,
  hold: t.home.holdTitle,
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <MicrophoneProvider>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-8">
        <header className="flex h-16 items-center gap-2">
          {screen !== 'home' && (
            <button
              type="button"
              onClick={() => setScreen('home')}
              className="-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-2xl hover:bg-surface"
              aria-label={t.back}
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-bold">{TITLES[screen]}</h1>
        </header>

        <main className="flex-1">
          {screen === 'home' && <Home onOpen={setScreen} />}
          {screen === 'tuner' && <TunerScreen />}
          {screen === 'hold' && <HoldNoteScreen />}
        </main>
      </div>
    </MicrophoneProvider>
  );
}

function Home({ onOpen }: { onOpen(screen: Screen): void }) {
  const entries: { screen: Screen; icon: string; title: string; text: string }[] = [
    { screen: 'tuner', icon: '🎚️', title: t.home.tunerTitle, text: t.home.tunerText },
    { screen: 'hold', icon: '🎯', title: t.home.holdTitle, text: t.home.holdText },
  ];

  return (
    <div className="space-y-4">
      <p className="text-muted">{t.home.tagline}</p>
      {entries.map((entry) => (
        <button key={entry.screen} type="button" onClick={() => onOpen(entry.screen)} className="block w-full text-left">
          <Card className="flex items-center gap-4 transition hover:border-accent">
            <span className="text-4xl" aria-hidden="true">
              {entry.icon}
            </span>
            <span>
              <span className="block text-lg font-semibold">{entry.title}</span>
              <span className="block text-muted">{entry.text}</span>
            </span>
          </Card>
        </button>
      ))}
      <p className="pt-2 text-sm text-muted">{t.home.headphoneHint}</p>
    </div>
  );
}
