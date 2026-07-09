// ====================================================================
// AYAR DEPOSU — localStorage (versiyonlu)
// ====================================================================
import type { Settings } from '../types';

export const SETTINGS_VERSION = 1;
const STORAGE_KEY = 'tky_settings_v1';

/** Varsayılan ayarlar (kullanıcı ilk girişte bunları görür) */
export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,

  bistKasaTL: 700000,
  viopKasaTL: 300000,
  abdKasaUSD: 4000,
  kriptoKasaUSD: 1000,

  usdTryKuru: 40,

  maxRiskYuzdesi: 1,
  maxPozisyonYuzdesi: 20,
  hedefRR: 2.5,

  risksizGetiriTL: 35,
  risksizGetiriUSD: 3,
};

/** Kısmi/eski kaydı varsayılanlarla birleştirip güvenli Settings üretir */
export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  // Sayısal alanları güvenceye al
  const numericKeys: (keyof Settings)[] = [
    'bistKasaTL', 'viopKasaTL', 'abdKasaUSD', 'kriptoKasaUSD',
    'usdTryKuru', 'maxRiskYuzdesi', 'maxPozisyonYuzdesi', 'hedefRR',
    'risksizGetiriTL', 'risksizGetiriUSD',
  ];
  for (const k of numericKeys) {
    const v = Number(merged[k]);
    (merged as Record<string, unknown>)[k] = Number.isFinite(v) ? v : DEFAULT_SETTINGS[k];
  }
  merged.version = SETTINGS_VERSION;
  return merged;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // sessizce yut — localStorage kapalı olabilir
  }
}

export function exportSettings(s: Settings): string {
  return JSON.stringify(s, null, 2);
}

export function importSettings(json: string): Settings {
  const parsed = JSON.parse(json);
  return normalizeSettings(parsed);
}
