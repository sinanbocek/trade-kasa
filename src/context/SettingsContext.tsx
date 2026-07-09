import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, importSettings } from '../lib/storage';
import { FX_REFRESH_MS, fetchLiveRate, readCachedRate } from '../lib/fxRate';

interface FxState {
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  source: string | null;
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  importJson: (json: string) => void;
  fx: FxState;
  refreshRate: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [fx, setFx] = useState<FxState>({ loading: false, error: null, fetchedAt: null, source: null });
  const didInit = useRef(false);

  // Ayar değişince kalıcılaştır
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const importJson = useCallback((json: string) => {
    setSettings(importSettings(json));
  }, []);

  const refreshRate = useCallback(async () => {
    setFx((f) => ({ ...f, loading: true, error: null }));
    try {
      const r = await fetchLiveRate();
      setSettings((prev) => ({ ...prev, usdTryKuru: Number(r.rate.toFixed(4)) }));
      setFx({ loading: false, error: null, fetchedAt: r.fetchedAt, source: r.source });
    } catch (e) {
      setFx((f) => ({ ...f, loading: false, error: (e as Error).message || 'Kur alınamadı' }));
    }
  }, []);

  // İlk yükleme: önbellekteki kuru göster, bayatsa/eksikse canlı çek. Sonra saat başı yokla.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const cached = readCachedRate();
    if (cached) {
      setFx({ loading: false, error: null, fetchedAt: cached.fetchedAt, source: cached.source });
      setSettings((prev) => ({ ...prev, usdTryKuru: Number(cached.rate.toFixed(4)) }));
    }
    const stale = !cached || Date.now() - cached.fetchedAt > FX_REFRESH_MS;
    if (stale) void refreshRate();

    const id = window.setInterval(() => void refreshRate(), FX_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refreshRate]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset, importJson, fx, refreshRate }),
    [settings, update, reset, importJson, fx, refreshRate],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings SettingsProvider içinde kullanılmalı');
  return ctx;
}
