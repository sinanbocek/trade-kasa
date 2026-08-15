import type { Settings } from '../../../types';
import { convert } from '../currency';
import { add } from '../math';

/**
 * ABACUS Kasa Toplamları Motoru (ABACUS-SPEC §3.3 / §3.4).
 * Tüm hesaplar kuruş integer seviyesindedir.
 * Kur enjekte edilir; geçersiz veya <= 0 kur durumunda sessiz 0 yapmayıp null döner.
 */

/** TL kasaların toplamını döner (bistKasaTL + viopKasaTL), kuruş int. */
export function totalKasaTLPart(settings: Settings): number {
  if (!settings) return 0;
  const bist = settings.bistKasaTL ?? 0;
  const viop = settings.viopKasaTL ?? 0;
  return add(bist, viop);
}

/** USD kasaların toplamını döner (abdKasaUSD + kriptoKasaUSD), USD kuruş int. */
export function totalKasaUSDPart(settings: Settings): number {
  if (!settings) return 0;
  const abd = settings.abdKasaUSD ?? 0;
  const kripto = settings.kriptoKasaUSD ?? 0;
  return add(abd, kripto);
}

/** TL kasalar + USD kasaların TL karşılığı (currency.convert ile), TL kuruş int. */
export function totalKasaTRY(settings: Settings): number | null {
  if (!settings) return null;
  const tlPart = totalKasaTLPart(settings);
  const usdPart = totalKasaUSDPart(settings);

  const usdInTry = convert(usdPart, settings.usdTryKuru);
  if (usdInTry === null) {
    return null;
  }

  return add(tlPart, usdInTry);
}
