import { Icon, type IconName } from '../../atom/Icon/Icon';
import { Placeholder } from '../../atom/Placeholder/Placeholder';
import './SegmentedControl.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** 0043: a glyph before the label. */
  icon?: IconName;
  /** 0043: the option cannot be picked (a tooltip says why through `hint`). */
  disabled?: boolean;
  /** 0043: tooltip text for the option (why it is disabled, or the label when `compact` hides it). */
  hint?: string;
  /** 0043: the option is not wired yet — wrapped in the Placeholder atom (tooltip + toast, dashed in dev mode). The value is what is missing. */
  placeholder?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  block?: boolean;
  /** 0043: below 768 px options with an icon show only the icon (the label stays for assistive tech and the tooltip). */
  compact?: boolean;
}

/** Two-to-seven way switch (Today / Week, Classes / Payments, the M-03 view kinds). Renders as a tablist. */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, size = 'md', block = false, compact = false }: SegmentedControlProps<T>) {
  return (
    <div className={`segmented segmented-${size} ${block ? 'is-block' : ''} ${compact ? 'is-compact' : ''}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const btn = (
          <button key={o.value} type="button" role="tab" aria-selected={value === o.value} disabled={o.disabled} title={o.hint ?? (compact && o.icon ? o.label : undefined)}
            className={`segmented-btn ${value === o.value ? 'is-active' : ''} ${o.icon ? 'has-icon' : ''}`} onClick={() => onChange(o.value)}>
            {o.icon && <Icon name={o.icon} size="sm" />}
            <span className="segmented-label">{o.label}</span>{o.count != null && <span className="segmented-count">{o.count}</span>}
          </button>
        );
        return o.placeholder ? <Placeholder key={o.value} what={o.placeholder}>{btn}</Placeholder> : btn;
      })}
    </div>
  );
}
