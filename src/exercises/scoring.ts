export type PitchStatus = 'hit' | 'low' | 'high';

export function classifyCents(cents: number, toleranceCents: number): PitchStatus {
  if (cents < -toleranceCents) return 'low';
  if (cents > toleranceCents) return 'high';
  return 'hit';
}

export type Stars = 0 | 1 | 2 | 3;

/** Score 0..1 to stars. 2 stars unlock the next lesson (see PLAN.md). */
export function starsForScore(score: number): Stars {
  if (score >= 0.85) return 3;
  if (score >= 0.65) return 2;
  if (score >= 0.4) return 1;
  return 0;
}

export function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function standardDeviation(values: readonly number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}
