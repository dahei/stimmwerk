import { classifyCents } from '../exercises/scoring';
import { STATUS_COLOR_VAR } from './colors';
import { cssColor, useCanvas } from './useCanvas';

interface TunerGaugeProps {
  /** Deviation from the target in cents, null when silent. */
  cents: number | null;
  toleranceCents: number;
}

/** Horizontal tuner: center = target, left = too low, right = too high. */
export function TunerGauge({ cents, toleranceCents }: TunerGaugeProps) {
  const range = toleranceCents <= 20 ? 50 : 100;

  const ref = useCanvas((ctx, width, height) => {
    const padding = 18;
    const trackY = height / 2;
    const toX = (c: number) => padding + ((c + range) / (2 * range)) * (width - 2 * padding);

    // Track
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = cssColor('--track');
    ctx.beginPath();
    ctx.moveTo(toX(-range), trackY);
    ctx.lineTo(toX(range), trackY);
    ctx.stroke();

    // Tolerance zone
    ctx.strokeStyle = cssColor('--hit-soft');
    ctx.beginPath();
    ctx.moveTo(toX(-toleranceCents), trackY);
    ctx.lineTo(toX(toleranceCents), trackY);
    ctx.stroke();

    // Ticks every 10 cents, longer at the center and at ±50
    ctx.lineCap = 'butt';
    ctx.strokeStyle = cssColor('--muted');
    for (let c = -range; c <= range; c += 10) {
      const major = c === 0 || c % 50 === 0;
      ctx.lineWidth = c === 0 ? 2 : 1;
      const length = major ? 16 : 7;
      ctx.beginPath();
      ctx.moveTo(toX(c), trackY - 8 - length);
      ctx.lineTo(toX(c), trackY - 8);
      ctx.stroke();
    }

    if (cents === null) return;

    // Needle; out of range it sticks to the edge as a triangle
    const status = classifyCents(cents, toleranceCents);
    ctx.fillStyle = cssColor(STATUS_COLOR_VAR[status]);
    const clamped = Math.max(-range, Math.min(range, cents));
    const x = toX(clamped);
    ctx.beginPath();
    if (clamped !== cents) {
      const dir = Math.sign(cents);
      ctx.moveTo(x + dir * 12, trackY);
      ctx.lineTo(x - dir * 4, trackY - 13);
      ctx.lineTo(x - dir * 4, trackY + 13);
      ctx.closePath();
    } else {
      ctx.arc(x, trackY, 12, 0, 2 * Math.PI);
    }
    ctx.fill();
  });

  return <canvas ref={ref} className="h-20 w-full" aria-hidden="true" />;
}
