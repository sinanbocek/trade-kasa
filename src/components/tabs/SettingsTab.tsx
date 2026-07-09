import React, { useEffect, useRef, useState } from 'react';
import { Download, Moon, RefreshCw, RotateCcw, Sun, Upload } from 'lucide-react';
import type { Settings } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { exportSettings } from '../../lib/storage';
import { fmtDecimalGrouped, formatGroupedInput, parseNumber } from '../../lib/format';
import { ConfirmDialog, InfoTip } from '../ui';

/** Ayar için sayı girişi — yerel metin taslağı tutar, dışarıdan değişince eşitler */
const SettingNumber: React.FC<{
  label: string;
  hint?: string;
  suffix?: string;
  value: number;
  digits?: number;
  tip?: string;
  onCommit: (n: number) => void;
}> = ({ label, hint, suffix, value, digits = 2, tip, onCommit }) => {
  const [text, setText] = useState<string>(() => fmtDecimalGrouped(value, digits));
  const focused = useRef(false);

  // Dış değişiklik (reset / import / canlı kur) geldiğinde eşitle
  useEffect(() => {
    if (!focused.current && parseNumber(text) !== value) {
      setText(fmtDecimalGrouped(value, digits));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="block space-y-1.5">
      <span className="inline-flex items-center text-xs font-semibold text-[var(--ink-2)]">
        {label}
        {hint && <span className="ml-1 text-[10px] font-normal text-[var(--muted)]">{hint}</span>}
        {tip && <InfoTip text={tip} align="left" />}
      </span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            setText(fmtDecimalGrouped(value, digits));
          }}
          onChange={(e) => {
            const formatted = formatGroupedInput(e.target.value);
            setText(formatted);
            onCommit(parseNumber(formatted));
          }}
          className={`w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm font-semibold text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft-strong)] ${suffix ? 'pr-9' : ''}`}
          style={{ borderColor: 'var(--border)' }}
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

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-3 text-sm font-bold text-[var(--ink)]">{children}</h3>
);

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; children: React.ReactNode; tone?: 'default' | 'danger' }> = ({
  onClick,
  icon,
  children,
  tone = 'default',
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
    style={
      tone === 'danger'
        ? { borderColor: 'color-mix(in srgb, var(--critical) 35%, transparent)', color: 'var(--critical)', background: 'var(--surface)' }
        : { borderColor: 'var(--border)', color: 'var(--ink-2)', background: 'var(--surface)' }
    }
  >
    {icon} {children}
  </button>
);

export const SettingsTab: React.FC = () => {
  const { settings, update, reset, importJson, fx, refreshRate } = useSettings();
  const { mode, resolved, setMode } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = (patch: Partial<Settings>) => update(patch);

  const handleExport = () => {
    const blob = new Blob([exportSettings(settings)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trade-kasa-ayarlar.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      importJson(text);
      setImportMsg('Ayarlar içe aktarıldı ✓');
    } catch {
      setImportMsg('Dosya okunamadı veya geçersiz ✗');
    }
    setTimeout(() => setImportMsg(null), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Alt Kasalar */}
      <section>
        <SectionTitle>Alt Kasa Bakiyeleri</SectionTitle>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Alt kasaları gir; toplam kasa (TL + USD'nin TL karşılığı) otomatik hesaplanır.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SettingNumber label="BİST Kasa" suffix="₺" digits={0} value={settings.bistKasaTL} onCommit={(n) => set({ bistKasaTL: n })} />
          <SettingNumber label="VİOP Kasa" suffix="₺" digits={0} value={settings.viopKasaTL} onCommit={(n) => set({ viopKasaTL: n })} />
          <SettingNumber label="ABD Kasa" suffix="$" digits={0} value={settings.abdKasaUSD} onCommit={(n) => set({ abdKasaUSD: n })} />
          <SettingNumber label="Kripto Kasa" suffix="$" digits={0} value={settings.kriptoKasaUSD} onCommit={(n) => set({ kriptoKasaUSD: n })} />
        </div>
      </section>

      {/* Kur */}
      <section>
        <SectionTitle>Döviz Kuru</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SettingNumber label="USD/TRY Kuru" hint="canlı + elle" suffix="₺" digits={4} value={settings.usdTryKuru} onCommit={(n) => set({ usdTryKuru: n })} />
          <div className="flex items-end">
            <ActionButton onClick={() => void refreshRate()} icon={<RefreshCw size={15} className={fx.loading ? 'animate-spin' : ''} />}>
              Canlı Kuru Çek
            </ActionButton>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          {fx.error ? `Canlı kur alınamadı (${fx.error}) — elle girilen değer kullanılıyor.` : 'Saat başı otomatik güncellenir. Kaynak: open.er-api.com'}
        </p>
      </section>

      {/* Risk Kuralları */}
      <section>
        <SectionTitle>Risk Kuralları</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SettingNumber
            label="Max Risk (tek işlem)"
            hint="toplam kasa %"
            suffix="%"
            digits={1}
            value={settings.maxRiskYuzdesi}
            onCommit={(n) => set({ maxRiskYuzdesi: n })}
            tip="Tek bir işlemde, stop çalışırsa kaybedebileceğin tutarın toplam kasana oranı için koyduğun üst sınır. İşlem sekmelerindeki 'Risk / Toplam Kasa' göstergesi bu limite göre yeşil/sarı/kırmızı renk alır."
          />
          <SettingNumber
            label="Max Pozisyon (tek işlem)"
            hint="toplam kasa %"
            suffix="%"
            digits={0}
            value={settings.maxPozisyonYuzdesi}
            onCommit={(n) => set({ maxPozisyonYuzdesi: n })}
            tip="Tek bir işlemin hacminin (kayıp değil, açtığın pozisyonun toplam büyüklüğü) toplam kasana oranı için üst sınır. Kaldıraçlı işlemlerde hacim, bloke edilen teminattan büyük olabilir."
          />
          <SettingNumber
            label="Hedef R:R"
            hint="1 : X"
            value={settings.hedefRR}
            digits={1}
            onCommit={(n) => set({ hedefRR: n })}
            tip="Hedeflediğin Risk/Ödül oranı. Örn. 2,5 → riske attığın her 1 birime karşılık en az 2,5 birim kâr hedefliyorsun. İşlem sekmelerinde gerçekleşen R:R bu hedefin altındaysa uyarı rengiyle gösterilir."
          />
        </div>
      </section>

      {/* Referans Oranlar */}
      <section>
        <SectionTitle>Referans Risksiz Getiri</SectionTitle>
        <p className="mb-4 text-xs text-[var(--muted)]">Fırsat maliyeti "eşik süresi" hesabında kullanılır (yıllık %).</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingNumber
            label="TL Risksiz Getiri"
            hint="BİST / VİOP"
            suffix="%"
            digits={0}
            value={settings.risksizGetiriTL}
            onCommit={(n) => set({ risksizGetiriTL: n })}
            tip="Parayı hiç riske atmadan (mevduat, bono, para piyasası fonu gibi) elde edebileceğin yıllık faiz oranı. 'Risksiz Getiri Eşik Süresi' hesabında karşılaştırma noktası olarak kullanılır."
          />
          <SettingNumber
            label="USD Risksiz Getiri"
            hint="ABD / Kripto"
            suffix="%"
            digits={0}
            value={settings.risksizGetiriUSD}
            onCommit={(n) => set({ risksizGetiriUSD: n })}
            tip="USD cinsinden risksiz bir yatırımdan (ör. ABD hazine bonosu, para piyasası fonu) elde edebileceğin yıllık faiz oranı."
          />
        </div>
      </section>

      {/* Yönetim */}
      <section className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <SectionTitle>Görünüm & Yönetim</SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          {(
            [
              { key: 'light', label: 'Açık', icon: <Sun size={14} /> },
              { key: 'dark', label: 'Koyu', icon: <Moon size={14} /> },
              { key: 'system', label: 'Sistem', icon: null },
            ] as const
          ).map((opt) => {
            const active = mode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setMode(opt.key)}
                className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors"
                style={
                  active
                    ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-2)' }
                }
              >
                {opt.icon} {opt.label}
              </button>
            );
          })}
          <span className="text-[11px] text-[var(--muted)]">şu an: {resolved === 'dark' ? 'koyu' : 'açık'}</span>

          <span className="hidden h-6 w-px sm:block" style={{ background: 'var(--border)' }} />

          <ActionButton onClick={handleExport} icon={<Download size={15} />}>
            Dışa Aktar (JSON)
          </ActionButton>
          <ActionButton onClick={() => fileRef.current?.click()} icon={<Upload size={15} />}>
            İçe Aktar
          </ActionButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = '';
            }}
          />
          <ActionButton tone="danger" onClick={() => setConfirmReset(true)} icon={<RotateCcw size={15} />}>
            Varsayılana Sıfırla
          </ActionButton>
          {importMsg && <span className="text-xs font-semibold text-[var(--ink-2)]">{importMsg}</span>}
        </div>
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          Ayarlar tarayıcının localStorage'ında saklanır (bu cihaza özel). Farklı cihaza taşımak için Dışa/İçe Aktar kullanın.
        </p>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Varsayılana sıfırlansın mı?"
        message="Kasa bakiyeleri, kur, risk kuralları ve referans getiri oranları dahil tüm ayarlar fabrika değerlerine döner. Bu işlem geri alınamaz."
        confirmLabel="Sıfırla"
        cancelLabel="Vazgeç"
        onConfirm={() => {
          reset();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};
