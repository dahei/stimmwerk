export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Moving median over a time window. Values older than `windowMs` drop out.
 * A median (not a mean) removes single octave jumps and keeps vibrato centered.
 */
export class TimedMedian {
  private samples: { time: number; value: number }[] = [];
  private readonly windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  push(time: number, value: number): number {
    this.samples.push({ time, value });
    while (this.samples.length > 0 && time - this.samples[0].time > this.windowMs) {
      this.samples.shift();
    }
    return median(this.samples.map((s) => s.value));
  }

  reset(): void {
    this.samples = [];
  }
}
