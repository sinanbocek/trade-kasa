import React from 'react';

export interface AllocationSegment {
  label: string;
  value: number;
  color: string;
  display: string;
}

/**
 * Parça-bütün: yatay yığılmış bar. Segmentler arasında 2px yüzey rengi boşluk vardır
 * (kenarlık yerine boşlukla ayrım). 4 kategori olduğu için doğrudan etiketli lejant kullanılır.
 */
export const AllocationBar: React.FC<{ segments: AllocationSegment[]; surfaceVar?: string }> = ({
  segments,
  surfaceVar = 'var(--surface)',
}) => {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const safeSegments = segments.filter((s) => s.value > 0);

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: surfaceVar }}>
        {safeSegments.map((s, i) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <div
              key={s.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${pct}%`,
                background: s.color,
                marginLeft: i === 0 ? 0 : 2,
              }}
              title={`${s.label}: ${s.display}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-1.5 text-[10px]">
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="font-medium text-white/70">
                {s.label} <span className="font-semibold tabular-nums text-white/50">(%{pct})</span>
              </span>
              <span className="text-white/30">·</span>
              <span className="font-bold tabular-nums text-white">{s.display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
