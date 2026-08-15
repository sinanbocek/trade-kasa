import { div, floor, mul } from '../math';

/**
 * ABACUS Pozisyon Miktar, Hacim ve Kaldıraç Motoru (ABACUS-SPEC §3.3 / §3.4).
 * Tüm parasal değerler (priceMinor, volumeMinor, capitalUsedNativeMinor) kuruş integer seviyesindedir.
 * Sıfır ham Math.* kullanımı: Tüm çarpma, bölme ve aşağı yuvarlamalar math motoru (Decimal.js) ile yürütülür.
 */

/** Miktar, birim fiyat (kuruş int) ve kontrat çarpanından toplam hacmi (kuruş int) hesaplar. */
export function volumeFromQty(qty: number, priceMinor: number, multiplier: number): number {
  if (qty <= 0 || priceMinor <= 0 || multiplier <= 0) {
    return 0;
  }
  return mul(mul(qty, priceMinor), multiplier);
}

/**
 * Hacimden (kuruş int) miktar türetir.
 * Payda (fiyat * çarpan) 0 veya negatif ise belirsizlik durumunda 0 (miktarsız) döner.
 * fractional = false ise miktarı aşağı yuvarlayıp tam sayı döner; true ise ondalık kalabilir.
 */
export function qtyFromVolume(volumeMinor: number, priceMinor: number, multiplier: number, fractional: boolean): number {
  if (volumeMinor <= 0 || priceMinor <= 0 || multiplier <= 0) {
    return 0;
  }

  const denom = mul(priceMinor, multiplier);
  if (denom <= 0) {
    return 0;
  }

  const raw = div(volumeMinor, denom);
  if (raw === null) {
    return 0;
  }

  if (fractional) {
    return raw;
  }

  return floor(raw);
}

/**
 * Fiili kaldıraç oranını (hacim / kullanılan teminat) hesaplar.
 * Teminat <= 0 ise sessiz 1 fallback yapmayıp null döner.
 */
export function leverage(volumeNativeMinor: number, capitalUsedNativeMinor: number): number | null {
  if (capitalUsedNativeMinor <= 0 || volumeNativeMinor < 0) {
    return null;
  }

  return div(volumeNativeMinor, capitalUsedNativeMinor);
}
