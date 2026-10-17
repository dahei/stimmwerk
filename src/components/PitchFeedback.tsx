import { classifyCents } from '../exercises/scoring';
import { t } from '../i18n/de';

const STATUS_TEXT = {
  hit: { icon: '✓', text: t.feedback.hit, className: 'text-hit' },
  low: { icon: '↑', text: t.feedback.low, className: 'text-low' },
  high: { icon: '↓', text: t.feedback.high, className: 'text-high' },
} as const;

interface PitchFeedbackProps {
  cents: number | null;
  toleranceCents: number;
}

/** Direction hint in text and arrow form, so that it does not depend on color only. */
export function PitchFeedback({ cents, toleranceCents }: PitchFeedbackProps) {
  if (cents === null) {
    return <p className="text-center text-lg text-muted">{t.feedback.silent}</p>;
  }
  const status = STATUS_TEXT[classifyCents(cents, toleranceCents)];
  return (
    <p className={`text-center text-lg font-semibold ${status.className}`} aria-live="polite">
      <span aria-hidden="true">{status.icon}</span> {status.text}
      <span className="ml-2 font-normal text-muted tabular-nums">{t.feedback.cents(cents)}</span>
    </p>
  );
}
