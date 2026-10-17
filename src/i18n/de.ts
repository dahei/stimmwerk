// All user-facing texts. Keep them here so that a translation is easy later.

const formatCents = (cents: number) =>
  `${cents > 0 ? '+' : cents < 0 ? '−' : '±'}${Math.abs(Math.round(cents))} Cent`;

export const de = {
  appName: 'Stimmwerk',
  back: 'Zurück',

  home: {
    tagline: 'Dein tägliches Stimmtraining',
    tunerTitle: 'Stimmgerät',
    tunerText: 'Sing frei und sieh, welchen Ton du triffst.',
    holdTitle: 'Ton halten',
    holdText: 'Halte einen Ton so stabil wie möglich.',
    headphoneHint: 'Tipp: Mit Kopfhörern und in einem ruhigen Raum klappt die Tonerkennung am besten.',
    credits: 'Klavierklang: Salamander Grand Piano von Alexander Holm (CC BY 3.0)',
  },

  microphone: {
    title: 'Mikrofon aktivieren',
    text: 'Stimmwerk hört dir zu, um deine Tonhöhe zu erkennen. Die Audiodaten bleiben auf deinem Gerät.',
    start: 'Mikrofon aktivieren',
    starting: 'Mikrofon wird gestartet …',
    errors: {
      denied: 'Der Zugriff auf das Mikrofon wurde verweigert. Bitte erlaube ihn in den Browser-Einstellungen und versuche es erneut.',
      'no-device': 'Es wurde kein Mikrofon gefunden.',
      unsupported: 'Dein Browser unterstützt keinen Mikrofonzugriff. Die Seite muss über HTTPS geöffnet werden.',
      unknown: 'Das Mikrofon konnte nicht gestartet werden.',
    },
    retry: 'Erneut versuchen',
  },

  feedback: {
    silent: 'Sing einen Ton …',
    hit: 'Getroffen',
    low: 'Höher singen',
    high: 'Tiefer singen',
    cents: formatCents,
    /** Below one semitone in cents, above that in semitones: "−30 Cent", "2,3 Halbtöne". */
    distance: (cents: number) => {
      if (Math.abs(cents) < 100) return formatCents(cents);
      const semitones = Math.round(Math.abs(cents) / 10) / 10;
      return `${semitones.toFixed(1).replace('.', ',')} ${semitones === 1 ? 'Halbton' : 'Halbtöne'}`;
    },
  },

  level: {
    label: 'Pegel',
    tooQuiet: 'zu leise',
  },

  hold: {
    targetNote: 'Zielton',
    lower: 'Halbton tiefer',
    higher: 'Halbton höher',
    takeCurrent: 'Gesungenen Ton übernehmen',
    duration: 'Dauer',
    seconds: (s: number) => `${s} s`,
    tolerance: 'Toleranz',
    toleranceValue: (c: number) => `±${c} Cent`,
    listen: 'Ton anhören',
    start: 'Start',
    listenPhase: 'Hör gut zu …',
    countIn: 'Gleich geht’s los',
    now: 'Jetzt singen!',
    cancel: 'Abbrechen',
    remaining: (s: number) => `noch ${s} s`,
  },

  result: {
    title: 'Ergebnis',
    hitRate: 'Im Zielbereich',
    meanDeviation: 'Ø Abweichung',
    tooHigh: 'zu hoch',
    tooLow: 'zu tief',
    onTarget: 'auf dem Ton',
    spread: 'Schwankung',
    onset: 'Zeit bis zum Ton',
    notReached: 'nicht erreicht',
    nothingSung: 'Es wurde kein Ton erkannt. Ist das Mikrofon an und singst du laut genug?',
    again: 'Nochmal',
    settings: 'Einstellungen',
    starsLabel: (n: number) => `${n} von 3 Sternen`,
  },

  tuner: {
    frequency: (hz: number) => `${hz.toFixed(1)} Hz`,
  },
} as const;

export const t = de;
