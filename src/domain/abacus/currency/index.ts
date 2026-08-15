import { div, mul, round } from '../math';

/**
 * ABACUS kur çevrimi motoru (ABACUS-SPEC §3.3).
 * Motor hiçbir yerden kur çekmez; kur her zaman parametre olarak verilir.
 * Tüm tutarlar kuruş (minor unit) tam sayıdır.
 */

export function convert(amountMinor: number, rate: number): number | null {
  if (rate <= 0 || !Number.isFinite(rate) || !Number.isFinite(amountMinor)) {
    return null;
  }
  if (amountMinor === 0) return 0;

  const target = mul(amountMinor, rate);
  if (target === null) return null;

  return round(target, 0);
}

export function cross(amountMinor: number, fromRate: number, toRate: number): number | null {
  if (
    fromRate <= 0 ||
    toRate <= 0 ||
    !Number.isFinite(fromRate) ||
    !Number.isFinite(toRate) ||
    !Number.isFinite(amountMinor)
  ) {
    return null;
  }
  if (amountMinor === 0) return 0;

  const intermediate = mul(amountMinor, fromRate);
  if (intermediate === null) return null;

  const target = div(intermediate, toRate);
  if (target === null) return null;

  return round(target, 0);
}
