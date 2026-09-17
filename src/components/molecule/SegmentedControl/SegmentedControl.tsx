import './SegmentedControl.css';

export interface SegmentOption<T extends string> { value: T; label: string; count?: number }

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  block?: boolean;
}

/** Two-to-four way switch (Today / Week, Classes / Payments, Monthly / Yearly). Renders as a tablist. */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, size = 'md', block = false }: SegmentedControlProps<T>) {
  return (
    <div className={`segmented segmented-${size} ${block ? 'is-block' : ''}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={`segmented-btn ${value === o.value ? 'is-active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="segmented-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
