import { useRef } from 'react';
import './OtpInput.css';

export interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  onComplete?: (code: string) => void;
}

/** Six single-digit cells that behave as one field: typing advances, backspace retreats, paste fills. */
export function OtpInput({ value, onChange, length = 6, label, invalid = false, disabled = false, onComplete }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const commit = (next: string) => { onChange(next); if (next.length === length && onComplete) onComplete(next); };
  const setAt = (i: number, ch: string) => {
    const arr = [...digits]; arr[i] = ch;
    commit(arr.join('').slice(0, length));
  };
  return (
    <div className={`otp ${invalid ? 'is-invalid' : ''}`} role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="otp-cell input"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`${label} ${i + 1}/${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, ch);
            if (ch && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) { refs.current[i - 1]?.focus(); setAt(i - 1, ''); }
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (text) { e.preventDefault(); commit(text); refs.current[Math.min(length - 1, text.length)]?.focus(); }
          }}
        />
      ))}
    </div>
  );
}
