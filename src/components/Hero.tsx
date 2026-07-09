import React from 'react';
import { DollarSign, Landmark, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { totalKasaTRY, totalKasaTLPart, totalKasaUSDPart } from '../lib/calc';
import { fmtCurrency } from '../lib/format';
import { AllocationBar } from './charts/AllocationBar';

function timeAgo(ts: number | null): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

/** Kur kutusuyla aynı görünümde kompakt bilgi çipi (içeriğe göre daralır, satır germez) */
const StatChip: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({
  icon,
  label,
  value,
  sub,
}) => (
  <div
    className="flex min-h-[64px] items-center gap-2.5 rounded-xl border px-3 py-2"
    style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
  >
    <span className="text-white/60">{icon}</span>
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-white/50">{label}</span>
      <span className="block text-sm font-bold tabular-nums leading-tight">
        {value}
        {sub && <span className="ml-1.5 text-[10px] font-medium text-white/45">{sub}</span>}
      </span>
    </div>
  </div>
);

export const Hero: React.FC = () => {
  const { settings, fx, refreshRate } = useSettings();
  const total = totalKasaTRY(settings);
  const tlPart = totalKasaTLPart(settings);
  const usdPart = totalKasaUSDPart(settings);
  const rate = settings.usdTryKuru || 0;

  const segments = [
    { label: 'BİST', value: settings.bistKasaTL || 0, color: 'var(--cat-1)', display: fmtCurrency(settings.bistKasaTL, 'TRY', 0) },
    { label: 'VİOP', value: settings.viopKasaTL || 0, color: 'var(--cat-2)', display: fmtCurrency(settings.viopKasaTL, 'TRY', 0) },
    { label: 'ABD', value: (settings.abdKasaUSD || 0) * rate, color: 'var(--cat-3)', display: fmtCurrency(settings.abdKasaUSD, 'USD', 0) },
    { label: 'Kripto', value: (settings.kriptoKasaUSD || 0) * rate, color: 'var(--cat-4)', display: fmtCurrency(settings.kriptoKasaUSD, 'USD', 0) },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 text-white shadow-[var(--shadow-pop)] sm:p-5"
      style={{
        background: 'linear-gradient(120deg, #0a0b10 0%, #161a2c 30%, #232a4d 60%, #1a3a4a 85%, #0d2b30 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* İnce üst parlaklık — cam/premium hissi */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%)' }}
      />
      {/* Dekoratif accent glow'lar — saf süs, veri taşımaz */}
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-25 blur-3xl"
        style={{ background: '#5b6ee8' }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full opacity-20 blur-3xl"
        style={{ background: '#14b8a6' }}
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* Hero: Toplam Kasa — tek belirgin büyük rakam */}
        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
            <Wallet size={13} /> Toplam Kasa Bakiyesi
          </span>
          <div className="text-3xl font-extrabold tabular-nums sm:text-[38px]">{fmtCurrency(total, 'TRY', 0)}</div>
          <span className="block text-[11px] text-white/45">TL kasalar + USD kasaların TL karşılığı</span>
        </div>

        {/* Kompakt çip grubu: TL Kasa, USD Kasa, Kur — hepsi aynı hizada */}
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatChip icon={<Landmark size={15} />} label="TL Kasa (BİST + VİOP)" value={fmtCurrency(tlPart, 'TRY', 0)} />
          <StatChip
            icon={<DollarSign size={15} />}
            label="USD Kasa (ABD + Kripto)"
            value={fmtCurrency(usdPart, 'USD', 0)}
            sub={`≈ ${fmtCurrency(usdPart * rate, 'TRY', 0)}`}
          />

          {/* Kur kutusu */}
          <button
            onClick={() => void refreshRate()}
            disabled={fx.loading}
            title="Kuru güncelle"
            className="group flex min-h-[64px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left backdrop-blur transition-colors hover:bg-white/10 disabled:opacity-60"
            style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
          >
            <TrendingUp size={15} className="text-white/60" />
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/50">USD/TRY</span>
              <span className="block text-sm font-bold tabular-nums leading-tight">
                {rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span className="block text-[9px] text-white/40">
                {fx.loading ? 'güncelleniyor…' : fx.error ? 'canlı alınamadı' : timeAgo(fx.fetchedAt)}
              </span>
            </div>
            <RefreshCw size={13} className={`text-white/60 transition-transform ${fx.loading ? 'animate-spin' : 'group-hover:rotate-90'}`} />
          </button>
        </div>
      </div>

      {/* Kasa dağılımı — parça/bütün */}
      <div className="relative mt-3 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-white/50">Kasa Dağılımı (TL karşılığı)</span>
        <AllocationBar segments={segments} surfaceVar="rgba(255,255,255,0.08)" />
      </div>
    </div>
  );
};
