import Decimal from 'decimal.js';

// Decimal.js varsayılan yuvarlama modunu half-up (ROUND_HALF_UP = 1) yapalım
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/** Kuruş bazlı iki sayıyı güvenle toplar (float köprüsü için String dönüşümü kullanılır) */
export function add(a: number, b: number): number {
  return new Decimal(String(a)).plus(String(b)).toNumber();
}

/** Kuruş bazlı iki sayıyı güvenle çıkarır */
export function sub(a: number, b: number): number {
  return new Decimal(String(a)).minus(String(b)).toNumber();
}

/** Kuruş bazlı iki sayıyı güvenle çarpar */
export function mul(a: number, b: number): number {
  return new Decimal(String(a)).times(String(b)).toNumber();
}

/** Bölme işlemi. Bölünen 0 ise null döner (sessiz hata/varsayılan yok). */
export function div(a: number, b: number): number | null {
  if (b === 0) return null;
  return new Decimal(String(a)).dividedBy(String(b)).toNumber();
}

/** Half-up yuvarlama (Türkiye usulü, işaret korumalı: 2,5 -> 3, -2,5 -> -3) */
export function round(x: number, d = 0): number {
  return new Decimal(String(x)).toDecimalPlaces(d, Decimal.ROUND_HALF_UP).toNumber();
}

/** Mutlak değer hesabı */
export function abs(x: number): number {
  return new Decimal(String(x)).abs().toNumber();
}

/** Taban / aşağı yuvarlama */
export function floor(x: number): number {
  return new Decimal(String(x)).floor().toNumber();
}

/** Kalan / modülasyon hesabı (payda 0 ise null) */
export function mod(a: number, b: number): number | null {
  if (b === 0) return null;
  return new Decimal(String(a)).mod(String(b)).toNumber();
}

/** Katsayı hesabı. Payda <= 0 ise null döner. */
export function ratio(pay: number, payda: number): number | null {
  if (payda <= 0) return null;
  return new Decimal(String(pay)).dividedBy(String(payda)).toNumber();
}

/** Yüzde değeri hesabı (pay / payda * 100). Payda <= 0 ise null döner. */
export function percent(pay: number, payda: number): number | null {
  if (payda <= 0) return null;
  return new Decimal(String(pay)).dividedBy(String(payda)).times(100).toNumber();
}
