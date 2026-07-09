// ====================================================================
// BİÇİMLENDİRME YARDIMCILARI (tr-TR)
// ====================================================================
import type { Currency } from '../types';

const CURRENCY_SYMBOL: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
};

/** Para birimi biçimlendirme. USD ve kesirli değerler için ondalık gösterilir. */
export function fmtCurrency(value: number, currency: Currency = 'TRY', digits = 2): string {
  const v = Number.isFinite(value) ? value : 0;
  const str = v.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${CURRENCY_SYMBOL[currency]}${str}`;
}

/** Sadece sayı (miktar) biçimlendirme */
export function fmtAmount(value: number, digits = 0): string {
  const v = Number.isFinite(value) ? value : 0;
  return v.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, 4),
  });
}

/** Yüzde biçimlendirme (virgüllü) */
export function fmtPct(value: number, digits = 1): string {
  const v = Number.isFinite(value) ? value : 0;
  return `%${v.toFixed(digits).replace('.', ',')}`;
}

/** Ondalık sayıyı virgüllü stringe çevir (ör. 2.5 -> "2,5") */
export function fmtDecimal(value: number, digits = 1): string {
  const v = Number.isFinite(value) ? value : 0;
  return v.toFixed(digits).replace('.', ',');
}

/** Metin girişini (binlik ayraçlı) ham sayıya çevir — tr-TR: nokta binlik, virgül ondalık */
export function parseNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

/** Tam sayı girişini binlik ayraçlı göster */
export function formatIntInput(val: string): string {
  const clean = val.replace(/\D/g, '');
  if (!clean) return '';
  return parseInt(clean, 10).toLocaleString('tr-TR');
}

/** Ondalıklı sayıyı binlik ayraçlı (nokta) + ondalık (virgül) göster — ör. 70000 -> "70.000" */
export function fmtDecimalGrouped(value: number, digits = 0): string {
  const v = Number.isFinite(value) ? value : 0;
  return v.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Serbest ondalık giriş kutuları için CANLI biçimlendirme: kullanıcı yazarken
 * binlik ayraçları (nokta) otomatik ekler, ondalık kısmı (virgülden sonrası)
 * dokunmadan bırakır. parseNumber() ile tam uyumludur (nokta = binlik, virgül = ondalık).
 */
export function formatGroupedInput(raw: string): string {
  if (!raw) return '';
  const clean = raw.replace(/[^0-9,]/g, '');
  const firstComma = clean.indexOf(',');
  const intPartRaw = firstComma === -1 ? clean : clean.slice(0, firstComma);
  const decPart = firstComma === -1 ? '' : clean.slice(firstComma + 1).replace(/,/g, '');
  const intDigits = intPartRaw.replace(/^0+(?=\d)/, '');
  const grouped = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (firstComma === -1) return grouped;
  return `${grouped || '0'},${decPart}`;
}
