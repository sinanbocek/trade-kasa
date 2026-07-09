import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { Insight, InsightLevel } from '../../lib/coach';

const LEVEL_STYLE: Record<InsightLevel, { color: string; bg: string; icon: React.ReactNode }> = {
  critical: { color: 'var(--critical)', bg: 'var(--critical-soft)', icon: <AlertTriangle size={15} /> },
  warning: { color: 'var(--warning)', bg: 'var(--warning-soft)', icon: <AlertTriangle size={15} /> },
  good: { color: 'var(--good)', bg: 'var(--good-soft)', icon: <CheckCircle2 size={15} /> },
  info: { color: 'var(--accent)', bg: 'var(--accent-soft)', icon: <Info size={15} /> },
};

/** Koç motorunun ürettiği içgörüleri şiddete göre renklendirip listeleyen panel. */
export const CoachPanel: React.FC<{ insights: Insight[] }> = ({ insights }) => {
  if (insights.length === 0) return null;
  return (
    <div className="space-y-2">
      {insights.map((ins) => {
        const style = LEVEL_STYLE[ins.level];
        return (
          <div key={ins.id} className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: style.bg }}>
            <span className="mt-0.5 shrink-0" style={{ color: style.color }}>
              {style.icon}
            </span>
            <div className="min-w-0">
              <span className="block text-[12.5px] font-bold" style={{ color: 'var(--ink)' }}>
                {ins.title}
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {ins.message}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
