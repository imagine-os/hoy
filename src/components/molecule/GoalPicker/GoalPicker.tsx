import { useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import '../SegmentedControl/SegmentedControl.css';
import '../../atom/Chip/Chip.css';
import './GoalPicker.css';

export interface GoalPickerLabels {
  /** 'por semana' */
  perWeek: string;
  /** 'Sin meta por ahora' */
  noGoal: string;
  /** 'Sugerido' — bilingual default when omitted. */
  suggested?: string;
  /** '4+' — the label of the last option; defaults to `${last}+`. */
  plus?: string;
}

export interface GoalPickerProps {
  /** Classes per week; 0 = no goal. A value above the last option checks the last ("4+"). */
  value: number;
  onChange: (target: number) => void;
  /** Marks that option with the "suggested" line. */
  suggested?: number;
  /** Numeric options, ascending. The last one reads as "N+". */
  options?: number[];
  labels: GoalPickerLabels;
  disabled?: boolean;
  /** Name of the radiogroup; bilingual default "Meta semanal". */
  ariaLabel?: string;
  /** One-line hint under the control, wired with aria-describedby. */
  children?: ReactNode;
}

const WORDS = {
  suggested: { es: 'Sugerido', en: 'Suggested' },
  group: { es: 'Meta semanal', en: 'Weekly goal' },
};

/**
 * "How often do you want to practise?" — a goal for tracking, nothing about mood. A radiogroup of 44 px pills on the
 * SegmentedControl track (1 · 2 · 3 · 4+ per week) plus a "no goal for now" Chip, one roving tab stop. Manual
 * activation (0039): arrow keys and Home / End only move focus; Space / Enter or a click / tap select, so browsing the
 * options never saves. Re-selecting the checked option is a no-op. It is not a SegmentedControl wrapper because that
 * one is a tablist.
 */
export function GoalPicker({ value, onChange, suggested, options = [1, 2, 3, 4], labels, disabled = false, ariaLabel, children }: GoalPickerProps) {
  const { bi } = useI18n();
  const hintId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const nums = [...options].sort((a, b) => a - b);
  const last = nums[nums.length - 1];
  const all = [...nums, 0];
  const isChecked = (opt: number) => (opt === 0 ? value <= 0 : opt === last ? value >= last : value === opt);
  const checkedIdx = all.findIndex(isChecked);
  // The roving tab stop follows the focused option while the group has focus and returns to the checked one after.
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const tabIdx = focusIdx ?? (checkedIdx >= 0 ? checkedIdx : 0);

  /** Select (click, or the button's native Space / Enter activation). Selecting what is already checked does nothing. */
  const pick = (i: number) => { if (disabled || isChecked(all[i])) return; onChange(all[i]); };
  /** Move focus only: arrows wrap, Home / End jump. Nothing is written until the member activates. */
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = all.length;
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n
      : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    setFocusIdx(to);
    refs.current[to]?.focus();
  };
  const onGroupBlur = (e: FocusEvent<HTMLDivElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIdx(null); };
  const radio = (opt: number, i: number) => ({
    ref: (el: HTMLButtonElement | null) => { refs.current[i] = el; },
    type: 'button' as const, role: 'radio', 'aria-checked': isChecked(opt), tabIndex: i === tabIdx ? 0 : -1, disabled,
    onClick: () => pick(i), onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onKey(e, i), onFocus: () => setFocusIdx(i),
  });

  return (
    <div className="goalpick" data-disabled={disabled || undefined}>
      <div role="radiogroup" aria-label={ariaLabel ?? bi(WORDS.group)} aria-describedby={children != null ? hintId : undefined} aria-disabled={disabled || undefined} className="goalpick-group" onBlur={onGroupBlur}>
        <div className="goalpick-line">
          <div className="segmented segmented-md is-block goalpick-track">
            {nums.map((opt, i) => {
              const on = isChecked(opt);
              const isSug = suggested != null && suggested > 0 && (opt === last ? suggested >= last : suggested === opt);
              return (
                <button key={opt} {...radio(opt, i)} className={`segmented-btn goalpick-btn ${on ? 'is-active' : ''}`} data-suggested={isSug || undefined}>
                  <span className="goalpick-num">{opt === last ? labels.plus ?? `${last}+` : opt}<span className="sr-only"> {labels.perWeek}</span></span>
                  {isSug && <span className="sr-only">, </span>}{isSug && <span className="goalpick-sug">{labels.suggested ?? bi(WORDS.suggested)}</span>}
                </button>
              );
            })}
          </div>
          <span className="goalpick-per small muted" aria-hidden>{labels.perWeek}</span>
        </div>
        <button {...radio(0, all.length - 1)} className={`chip goalpick-none ${isChecked(0) ? 'is-selected' : ''}`}>{labels.noGoal}</button>
      </div>
      {children != null && <p id={hintId} className="goalpick-hint small muted">{children}</p>}
    </div>
  );
}
