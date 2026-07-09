import React, { useState } from 'react';
import { BarChart3, Bitcoin, Flag, LineChart, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import { Hero } from './components/Hero';
import { TradeTab } from './components/tabs/TradeTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { MARKETS } from './config/markets';
import { useTheme } from './context/ThemeContext';

type TabKey = 'bist' | 'viop' | 'abd' | 'kripto' | 'ayarlar';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'bist', label: 'BİST', icon: <BarChart3 className="size-4" /> },
  { key: 'viop', label: 'VİOP', icon: <LineChart className="size-4" /> },
  { key: 'abd', label: 'ABD', icon: <Flag className="size-4" /> },
  { key: 'kripto', label: 'Kripto', icon: <Bitcoin className="size-4" /> },
  { key: 'ayarlar', label: 'Ayarlar', icon: <SettingsIcon className="size-4" /> },
];

const App: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('bist');
  const { resolved, toggle } = useTheme();

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Başlık */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
              Trade Kasa Yönetimi
            </h1>
            <p className="text-xs text-[var(--muted)]">Pozisyon & risk hesaplayıcı — BİST · VİOP · ABD · Kripto</p>
          </div>
          <button
            onClick={toggle}
            title={resolved === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-2)' }}
          >
            {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <Hero />

        {/* Tab bar */}
        <div
          className="mt-6 flex flex-wrap items-center gap-1 rounded-2xl border p-1.5 shadow-[var(--shadow-card)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 sm:flex-none"
                style={
                  active
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'transparent', color: 'var(--ink-2)' }
                }
              >
                <span style={{ color: active ? '#fff' : 'var(--muted)' }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* İçerik — her sekme her zaman mount kalır (display ile gizlenir) ki
            sekmeler arası geçişte girilen veriler kaybolmasın; yalnızca
            "Temizle" butonu formu sıfırlar. */}
        <div
          className="mt-6 rounded-2xl border p-5 shadow-[var(--shadow-card)] sm:p-6"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div style={{ display: tab === 'bist' ? 'block' : 'none' }}>
            <TradeTab market={MARKETS.bist} />
          </div>
          <div style={{ display: tab === 'viop' ? 'block' : 'none' }}>
            <TradeTab market={MARKETS.viop} />
          </div>
          <div style={{ display: tab === 'abd' ? 'block' : 'none' }}>
            <TradeTab market={MARKETS.abd} />
          </div>
          <div style={{ display: tab === 'kripto' ? 'block' : 'none' }}>
            <TradeTab market={MARKETS.kripto} />
          </div>
          {tab === 'ayarlar' && <SettingsTab />}
        </div>

        <footer className="mt-8 space-y-1 text-center text-[11px] text-[var(--muted)]">
          <p>Hesap makinesi amaçlıdır, yatırım tavsiyesi niteliğinde değildir. Uygulamada veritabanı yoktur. Ayarlar tarayıcınızda saklanmaktadır.</p>
          <p>
            <a
              href="https://x.com/SinanIpekTR"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition-colors hover:text-[var(--ink-2)]"
              style={{ color: 'var(--muted)' }}
            >
              Sinan İpek
            </a>{' '}
            tarafından kodlanmıştır. © 2026
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
