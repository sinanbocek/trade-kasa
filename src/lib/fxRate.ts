// ====================================================================
// KUR KATMANI (USD/TRY) — SOYUTLANMIŞ
// --------------------------------------------------------------------
// Seçenek A (varsayılan): tarayıcıdan doğrudan ücretsiz FX API.
// İleride Seçenek B'ye geçmek için sadece fetchLiveRate() içeriğini
// bir Firebase Cloud Function proxy'sine (yfinance/Yahoo) çevirmek yeterli;
// uygulamanın geri kalanı değişmez.
// ====================================================================

export interface FxResult {
  rate: number;
  fetchedAt: number; // epoch ms
  source: string;
}

const CACHE_KEY = 'tky_fx_usdtry';
// Ücretsiz, anahtarsız, CORS-dostu kaynak. Günlük güncellenir.
const PRIMARY_URL = 'https://open.er-api.com/v6/latest/USD';

/** Canlı USD/TRY kurunu çeker (Seçenek A). Başarısız olursa hata fırlatır. */
export async function fetchLiveRate(): Promise<FxResult> {
  const res = await fetch(PRIMARY_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
  const data = await res.json();
  const rate = data?.rates?.TRY;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('FX yanıtı geçersiz');
  }
  const result: FxResult = { rate, fetchedAt: Date.now(), source: 'open.er-api.com' };
  cacheRate(result);
  return result;
}

export function cacheRate(r: FxResult): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(r));
  } catch {
    /* yut */
  }
}

export function readCachedRate(): FxResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.rate === 'number' && parsed.rate > 0) return parsed as FxResult;
    return null;
  } catch {
    return null;
  }
}

/** Kaç ms'de bir otomatik yoklanacağı (saat başı) */
export const FX_REFRESH_MS = 60 * 60 * 1000;
