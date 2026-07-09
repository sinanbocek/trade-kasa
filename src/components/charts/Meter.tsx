import React from 'react';
import { InfoTip } from '../ui';

type Status = 'good' | 'warning' | 'critical';

/** limit modu: düşük iyi (risk/hacim bir üst sınırı aşmamalı) */
function statusForLimit(ratio: number): Status {
  if (ratio <= 0.7) return 'good';
  if (ratio <= 1) return 'warning';
  return 'critical';
}

/** target modu: yüksek iyi (R:R gibi bir hedefe ulaşmalı/geçmeli) */
function statusForTarget(ratio: number): Status {
  if (ratio >= 1) return 'good';
  if (ratio >= 0.6) return 'warning';
  return 'critical';
}

const STATUS_VAR: Record<Status, string> = {
  good: 'var(--good)',
  warning: 'var(--warning)',
  critical: 'var(--critical)',
};

/**
 * Bir oranın bir referans noktaya (limit ya da hedef) göre nerede durduğunu gösteren mini gösterge.
 * Skala 0 → scaleMax·referans arası sabitlenir; referans noktasında dikey bir işaret çizgisi vardır.
 */
export const Meter: React.FC<{
  label: string;
  ratio: number; // değer / referans, ör. 0.8 = referansın %80'i
  valueLabel: string;
  limitLabel: string;
  tip?: string;
  mode?: 'limit' | 'target';
  scaleMax?: number;
}> = ({ label, ratio, valueLabel, limitLabel, tip, mode = 'limit', scaleMax = 1.5 }) => {
  const safeRatio = Number.isFinite(ratio) ? Math.max(0, ratio) : 0;
  const fillPct = (Math.min(safeRatio, scaleMax) / scaleMax) * 100;
  const refPct = (1 / scaleMax) * 100;
  const status = mode === 'target' ? statusForTarget(safeRatio) : statusForLimit(safeRatio);
  const color = STATUS_VAR[status];

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center font-semibold text-[var(--ink-2)]">
          {label}
          {tip && <InfoTip text={tip} align="left" />}
        </span>
        <span className="whitespace-nowrap font-bold tabular-nums" style={{ color }}>
          {valueLabel}
          <span className="ml-1 font-medium text-[var(--muted)]">/ {limitLabel}</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: 'var(--grid)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${fillPct}%`, background: color }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full"
          style={{ left: `${refPct}%`, background: 'var(--ink-2)', opacity: 0.4 }}
          title={mode === 'target' ? 'Hedef' : 'Limit'}
        />
      </div>
    </div>
  );
};
