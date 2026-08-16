import { convert } from '../currency';
import { max, mul, ratio, sub } from '../math';

/**
 * ABACUS Trade Hesaplama Engine Motoru (ABACUS-SPEC §3.3 / §3.4).
 * İşlem yönü, stop/TP geçerliliği, olası kayıp/kazanç (native/TRY) ve R:R metriklerini hesaplar.
 */

export interface DirectionValidity {
  stopValid: boolean;
  tpValid: boolean;
}

export interface RiskRewardResult {
  potentialLossNative: number;
  potentialProfitNative: number;
  potentialLossTRY: number | null;
  potentialProfitTRY: number | null;
  rr: number | null;
}

/**
 * İşlem yönüne göre stop ve TP seviyelerinin matematiksel ve mantıksal geçerliliğini sınar.
 * Long işlemde: stop < price ve tp > price olmalıdır.
 * Short işlemde: stop > price ve tp < price olmalıdır.
 * Fiyat, stop veya TP <= 0 ise ilgili bayrak false döner (sessiz varsayılan yok).
 */
export function validateTradeDirections(
  priceMinor: number,
  stopMinor: number,
  tpMinor: number,
  isLong: boolean
): DirectionValidity {
  const stopValid =
    stopMinor > 0 &&
    priceMinor > 0 &&
    (isLong ? stopMinor < priceMinor : stopMinor > priceMinor);

  const tpValid =
    tpMinor > 0 &&
    priceMinor > 0 &&
    (isLong ? tpMinor > priceMinor : tpMinor < priceMinor);

  return {
    stopValid,
    tpValid,
  };
}

/**
 * Stop ve TP seviyelerine göre olası azami kaybı, kazancı (native & TRY kuruş int) ve R:R oranını hesaplar.
 * rate == null ise TRY karşılıkları sessiz 0 yapılmayıp null döner.
 * Sıfır ham Math.* kullanımı: Tüm işlemler math ve currency motorları üzerinden yürütülür.
 */
export function computeRiskReward(
  priceMinor: number,
  stopMinor: number,
  tpMinor: number,
  qty: number,
  multiplier: number,
  isLong: boolean,
  stopValid: boolean,
  tpValid: boolean,
  rate: number | null
): RiskRewardResult {
  const mult = multiplier > 0 ? multiplier : 1;

  const perUnitLoss = isLong ? sub(priceMinor, stopMinor) : sub(stopMinor, priceMinor);
  const perUnitProfit = isLong ? sub(tpMinor, priceMinor) : sub(priceMinor, tpMinor);

  const risk = max(0, perUnitLoss) ?? 0;
  const reward = max(0, perUnitProfit) ?? 0;

  const potentialLossNative = stopValid ? mul(mul(risk, qty), mult) : 0;
  const potentialProfitNative = tpValid ? mul(mul(reward, qty), mult) : 0;

  const potentialLossTRY = rate === null ? null : convert(potentialLossNative, rate);
  const potentialProfitTRY = rate === null ? null : convert(potentialProfitNative, rate);

  const rr = stopValid && tpValid && risk > 0 ? ratio(reward, risk) : null;

  return {
    potentialLossNative,
    potentialProfitNative,
    potentialLossTRY,
    potentialProfitTRY,
    rr,
  };
}
