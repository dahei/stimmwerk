import type { PitchStatus } from '../exercises/scoring';

/** CSS color token for each feedback status (see index.css). */
export const STATUS_COLOR_VAR: Record<PitchStatus, string> = {
  hit: '--hit',
  low: '--low',
  high: '--high',
};
