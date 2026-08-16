import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { money } from '../domain/abacus';


/** Küçük "i" bilgi ikonu — üzerine gelince/tıklayınca açıklama gösterir */
export const InfoTip: React.FC<{ text: string; align?: 'left' | 'center' }> = ({ text, align = 'center' }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label="Bilgi"
        className="ml-1 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold leading-none transition-colors hover:opacity-80"
        style={{ color: 'var(--muted)', border: '1px solid var(--border-strong)' }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute bottom-full z-30 mb-2 w-60 rounded-lg border p-2.5 text-[11px] font-normal leading-snug shadow-[var(--shadow-pop)] ${
            align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
          }`}
          style={{ background: 'var(--surface-3)', borderColor: 'var(--border-strong)', color: 'var(--ink-2)' }}
        >
          {text}
        </span>
      )}
    </span>
  );
};

/** Onay gerektiren (geri alınamaz) eylemler için tasarım diline uygun modal — native confirm() yerine */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Onayla', cancelLabel = 'Vazgeç', danger = true, onConfirm, onCancel }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,11,11,0.55)' }}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-pop)' }}
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--critical-soft)', color: 'var(--critical)' }}
            >
              <AlertTriangle size={17} />
            </span>
          )}
          <div>
            <h4 id="confirm-dialog-title" className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
              {title}
            </h4>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-2)', background: 'var(--surface)' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ background: danger ? 'var(--critical)' : 'var(--accent)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Long/Short yön şalteri — kaldıraç/açığa satış destekleyen piyasalarda kullanılır */
export const DirectionToggle: React.FC<{
  direction: 'long' | 'short';
  onChange: (d: 'long' | 'short') => void;
}> = ({ direction, onChange }) => {
  const isShort = direction === 'short';
  return (
    <div
      role="group"
      aria-label="Long / Short"
      className="relative inline-flex h-8 w-32 shrink-0 rounded-full p-0.5"
      style={{ background: 'var(--surface-3)' }}
    >
      <div
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full transition-transform duration-200 ease-out"
        style={{
          background: isShort ? 'var(--critical)' : 'var(--good)',
          transform: isShort ? 'translateX(100%)' : 'translateX(0)',
        }}
      />
      <button
        type="button"
        onClick={() => onChange('long')}
        className="relative z-10 flex-1 rounded-full text-xs font-bold transition-colors"
        style={{ color: isShort ? 'var(--muted)' : '#fff' }}
      >
        Long
      </button>
      <button
        type="button"
        onClick={() => onChange('short')}
        className="relative z-10 flex-1 rounded-full text-xs font-bold transition-colors"
        style={{ color: isShort ? '#fff' : 'var(--muted)' }}
      >
        Short
      </button>
    </div>
  );
};

/** Etiketli sayı girişi (serbest ondalık, binlik ayraçlı) */
export const NumField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  accent?: 'default' | 'rose' | 'emerald';
  hint?: string;
}> = ({ label, value, onChange, placeholder = '0', suffix, accent = 'default', hint }) => {
  const accentStyle: React.CSSProperties =
    accent === 'rose'
      ? { color: 'var(--critical)' }
      : accent === 'emerald'
        ? { color: 'var(--good)' }
        : { color: 'var(--ink)' };
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-[var(--ink-2)]">
        {label}
        {hint && <span className="ml-1 text-[10px] font-normal text-[var(--muted)]">{hint}</span>}
      </span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(money.formatGroupedInput(e.target.value))}

          style={{ ...accentStyle, borderColor: 'var(--border)' }}
          className={`w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm font-semibold outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft-strong)] ${suffix ? 'pr-9' : ''}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
};

/** Bilgi kartı çerçevesi */
export const Card: React.FC<{ children: React.ReactNode; className?: string; tone?: 'default' | 'good' | 'warning' | 'critical' }> = ({
  children,
  className = '',
  tone = 'default',
}) => {
  const toneStyle: React.CSSProperties =
    tone === 'good'
      ? { background: 'var(--good-soft)', borderColor: 'color-mix(in srgb, var(--good) 30%, transparent)', color: 'var(--ink)' }
      : tone === 'warning'
        ? { background: 'var(--warning-soft)', borderColor: 'color-mix(in srgb, var(--warning) 35%, transparent)', color: 'var(--ink)' }
        : tone === 'critical'
          ? { background: 'var(--critical-soft)', borderColor: 'color-mix(in srgb, var(--critical) 30%, transparent)', color: 'var(--ink)' }
          : { background: 'var(--surface-2)', borderColor: 'var(--border)' };
  return (
    <div className={`rounded-2xl border p-4 ${className}`} style={toneStyle}>
      {children}
    </div>
  );
};

/** Etiket : değer satırı */
export const Row: React.FC<{ label: string; children: React.ReactNode; strong?: boolean; tip?: string }> = ({
  label,
  children,
  strong,
  tip,
}) => (
  <div className="flex items-center justify-between text-xs">
    <span className="inline-flex items-center text-[var(--ink-2)]">
      {label}
      {tip && <InfoTip text={tip} />}
    </span>
    <span
      className={`tabular-nums ${strong ? 'font-bold' : 'font-semibold'}`}
      style={{ color: strong ? 'var(--ink)' : 'var(--ink-2)' }}
    >
      {children}
    </span>
  </div>
);
