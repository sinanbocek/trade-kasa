import React from 'react';
import { DollarSign, Landmark, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { math, money } from '../domain/abacus';
import { totalKasaTRY, totalKasaTLPart, totalKasaUSDPart } from '../lib/calc';
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

const fmtMoney = (val: number, currency: 'TRY' | 'USD' = 'TRY') =>
  money.format(math.round(math.mul(val, 100)), { currency });

/** Kur kutusuyla aynı görünümde kompakt bilgi çipi (içeriğe göre daralır, satır germez) */
const StatChip: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({
  icon,
  label,
  value,
  sub,
}) => (
  <div
    className="flex min-h-[64px] items-center gap-2.5 rounded-xl border px-3 py-2 backdrop-blur sm:shrink-0"
    style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
  >
    <div className="text-white/60">{icon}</div>
    <div>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-white/50">{label}</span>
      <span className="block text-sm font-bold tabular-nums leading-tight">{value}</span>
      {sub && <span className="block text-[9px] text-white/40">{sub}</span>}
    </div>
  </div>
);

export const Hero: React.FC = () => {
  const { settings, fx, refreshRate } = useSettings();
  const rate = settings.usdTryKuru || 0;

  const total = totalKasaTRY(settings) ?? 0;
  const tlPart = totalKasaTLPart(settings);
  const usdPart = totalKasaUSDPart(settings);

  const segments = [
    { label: 'BİST', value: settings.bistKasaTL, color: 'var(--cat-1)', display: fmtMoney(settings.bistKasaTL, 'TRY') },
    { label: 'VİOP', value: settings.viopKasaTL, color: 'var(--cat-2)', display: fmtMoney(settings.viopKasaTL, 'TRY') },
    { label: 'ABD', value: math.mul(settings.abdKasaUSD, rate), color: 'var(--cat-3)', display: fmtMoney(settings.abdKasaUSD, 'USD') },
    { label: 'Kripto', value: math.mul(settings.kriptoKasaUSD, rate), color: 'var(--cat-4)', display: fmtMoney(settings.kriptoKasaUSD, 'USD') },
  ];


  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xl sm:p-6"
      style={{
        background: 'linear-gradient(120deg, #0a0b10 0%, #161a2c 30%, #232a4d 60%, #1a3a4a 85%, #0d2b30 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        {/* Sol: Başlık ve toplam bakiye */}
        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
            <Wallet size={13} /> Toplam Kasa Bakiyesi
          </span>
          <div className="text-3xl font-extrabold tabular-nums sm:text-[38px]">{fmtMoney(total, 'TRY')}</div>
          <span className="block text-[11px] text-white/45">TL kasalar + USD kasaların TL karşılığı</span>
        </div>

        {/* Kompakt çip grubu: TL Kasa, USD Kasa, Kur — hepsi aynı hizada */}
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatChip icon={<Landmark size={15} />} label="TL Kasa (BİST + VİOP)" value={fmtMoney(tlPart, 'TRY')} />
          <StatChip
            icon={<DollarSign size={15} />}
            label="USD Kasa (ABD + Kripto)"
            value={fmtMoney(usdPart, 'USD')}
            sub={`≈ ${fmtMoney(math.mul(usdPart, rate), 'TRY')}`}
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
                {money.fmtDecimalGrouped(rate, 4)}
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
