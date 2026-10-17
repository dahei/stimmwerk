import type { Stars as StarCount } from '../exercises/scoring';
import { t } from '../i18n/de';

export function Stars({ stars }: { stars: StarCount }) {
  return (
    <div className="text-5xl tracking-widest" role="img" aria-label={t.result.starsLabel(stars)}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= stars ? 'text-star' : 'text-track'}>
          ★
        </span>
      ))}
    </div>
  );
}

export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {value}
        {detail && <span className="block text-sm font-normal text-muted">{detail}</span>}
      </dd>
    </div>
  );
}
