import React, { useMemo } from 'react';

/** Tek serili, 12+ noktalı mini trend çizgisi. Tek seri olduğu için ayrı lejant gerekmez. */
export const Sparkline: React.FC<{
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}> = ({ values, width = 240, height = 48, color = 'var(--accent)' }) => {
  const { linePath, areaPath, lastX, lastY } = useMemo(() => {
    if (values.length === 0) return { linePath: '', areaPath: '', lastX: 0, lastY: 0 };
    const padX = 4;
    const padY = 6;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const n = values.length;

    const points = values.map((v, i) => {
      const x = n === 1 ? padX : padX + (i / (n - 1)) * innerW;
      const y = padY + innerH - ((v - min) / range) * innerH;
      return [x, y] as const;
    });

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    if (!firstPoint || !lastPoint) return { linePath: '', areaPath: '', lastX: 0, lastY: 0 };

    const [fx, fy] = firstPoint;
    const [lx, ly] = lastPoint;
    const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${lx.toFixed(1)},${height - padY} L${fx.toFixed(1)},${height - padY} Z`;
    void fy;

    return { linePath: line, areaPath: area, lastX: lx, lastY: ly };
  }, [values, width, height]);

  if (values.length < 2) {
    return (
      <div className="flex h-12 items-center text-[11px] text-[var(--muted)]">
        Trend için en az 2 kayıt gerekir.
      </div>
    );
  }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block overflow-visible">
      <path d={areaPath} fill={color} opacity={0.1} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
};
