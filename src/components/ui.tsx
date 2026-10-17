import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:opacity-90',
  secondary: 'border border-border bg-surface hover:bg-bg',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-xl px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}>{children}</section>;
}

interface OptionGroupProps {
  label: string;
  options: readonly number[];
  value: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

/** Segmented control with large touch targets. */
export function OptionGroup({ label, options, value, format, onChange }: OptionGroupProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-muted">{label}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={`min-h-11 rounded-lg border text-sm font-medium transition ${
              option === value ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface hover:bg-bg'
            }`}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
