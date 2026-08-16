import type { MarketConfig, Settings, TradeInput, TradeResult } from '../../../types';
import { convert } from '../currency';
import { div, max, mul, percent, ratio, round, sub } from '../math';
import { totalKasaTRY } from './kasa';
import { calculateThresholdDays } from './opportunity';
import { leverage, volumeFromQty } from './position';

/**
 * ABACUS Trade Hesaplama Engine Motoru (ABACUS-SPEC §3.3 / §3.4).
 * İşlem yönü, stop/TP geçerliliği, olası kayıp/kazanç ve portföy risk/yoğunlaşma oranlarını hesaplar.
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

export interface PortfolioRatios {
  exposurePctTotal: number | null;
  exposurePctSub: number | null;
  riskPctTotal: number | null;
  riskPctSub: number | null;
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

/**
 * Toplam kasa (TRY) ve alt kasa (native) bazında portföy yoğunlaşma ve risk yüzdelerini hesaplar.
 * Kasa değerleri parametre olarak alınır (Settings bağımlılığı yoktur, evrenseldir).
 * Pay veya payda null ise TRY oranları null döner (null propagasyonu, sessiz 0 yok).
 * Payda <= 0 olduğunda null döner; pay 0 olduğunda geçerli 0% döner.
 */
export function computePortfolioRatios(
  volumeTRY: number | null,
  volumeNative: number,
  potentialLossTRY: number | null,
  potentialLossNative: number,
  totalKasaTRY: number | null,
  subKasaNative: number
): PortfolioRatios {
  const exposurePctTotal =
    volumeTRY === null || totalKasaTRY === null || totalKasaTRY <= 0
      ? null
      : percent(volumeTRY, totalKasaTRY);

  const exposurePctSub =
    subKasaNative <= 0 ? null : percent(volumeNative, subKasaNative);

  const riskPctTotal =
    potentialLossTRY === null || totalKasaTRY === null || totalKasaTRY <= 0
      ? null
      : percent(potentialLossTRY, totalKasaTRY);

  const riskPctSub =
    subKasaNative <= 0 ? null : percent(potentialLossNative, subKasaNative);

  return {
    exposurePctTotal,
    exposurePctSub,
    riskPctTotal,
    riskPctSub,
  };
}

/**
 * ABACUS Ana İşlem Hesaplama Orkestratörü (ABACUS-SPEC §3.3 / §3.4).
 * Ham TradeInput, MarketConfig ve Settings girdilerini alıp tüm türetilmiş metrikleri hesaplar.
 * Float <-> Kuruş Int dönüşümleri SADECE bu fonksiyonun giriş ve çıkışında yürütülür.
 */
export function computeTrade(
  input: TradeInput,
  market: MarketConfig,
  s: Settings
): TradeResult {
  // 1. Float parasal girdileri kuruş int'e çevir (Tek Giriş Noktası)
  const priceMinor = round(mul(input.price || 0, 100));
  const stopMinor = round(mul(input.stop || 0, 100));
  const tpMinor = round(mul(input.tp || 0, 100));
  const qty = input.qty || 0;
  const multiplier = input.multiplier || 1;
  const marginPerUnitMinor = market.allowLeverage ? round(mul(input.marginPerUnit || 0, 100)) : 0;
  const isLong = input.direction === 'long';

  // 2. Kur belirleme (geçersiz ise null)
  const rate = market.currency === 'USD' ? (s.usdTryKuru > 0 ? s.usdTryKuru : null) : 1;

  // 3. Yön ve seviye doğrulaması
  const { stopValid, tpValid } = validateTradeDirections(priceMinor, stopMinor, tpMinor, isLong);

  // 4. Pozisyon Hacmi (kuruş int)
  const volumeNativeMinor = volumeFromQty(qty, priceMinor, multiplier);
  const volumeTRYMinor = rate === null ? null : convert(volumeNativeMinor, rate);

  // 5. Sermaye / Teminat ve Kaldıraç Katı
  const leveraged = marginPerUnitMinor > 0 && market.allowLeverage;
  const capitalUsedNativeMinor = leveraged ? mul(qty, marginPerUnitMinor) : volumeNativeMinor;
  const capitalUsedTRYMinor = rate === null ? null : convert(capitalUsedNativeMinor, rate);
  const levRatio = leveraged ? (leverage(volumeNativeMinor, capitalUsedNativeMinor) ?? 1) : 1;

  // 6. Risk / Ödül metrikleri
  const riskReward = computeRiskReward(
    priceMinor,
    stopMinor,
    tpMinor,
    qty,
    multiplier,
    isLong,
    stopValid,
    tpValid,
    rate
  );

  // 7. Kasa Bakiyeleri (kuruş int)
  const totalKasaTRYMinor = totalKasaTRY(s);
  const subKasaNativeMinor = s[market.kasaKey] ?? 0;

  // 8. Portföy Yüzdeleri (%)
  const ratios = computePortfolioRatios(
    volumeTRYMinor,
    volumeNativeMinor,
    riskReward.potentialLossTRY,
    riskReward.potentialLossNative,
    totalKasaTRYMinor,
    subKasaNativeMinor
  );

  // 9. Fırsat Maliyeti Eşik Süresi (gün)
  let thresholdDays = 0;
  if (tpValid && capitalUsedNativeMinor > 0) {
    const targetReturnRatio = div(riskReward.potentialProfitNative, capitalUsedNativeMinor);
    if (targetReturnRatio !== null) {
      thresholdDays = calculateThresholdDays(targetReturnRatio, s[market.riskFreeKey] || 0) ?? 0;
    }
  }

  // 10. Bakiye Yeterliliği
  const insufficientBalance = capitalUsedNativeMinor > 0 && capitalUsedNativeMinor > subKasaNativeMinor;

  // 11. Kuruş int parasal çıktıları float lira'ya çevir (Tek Çıkış Noktası)
  return {
    volumeNative: div(volumeNativeMinor, 100) ?? 0,
    volumeTRY: volumeTRYMinor !== null ? (div(volumeTRYMinor, 100) ?? 0) : 0,
    capitalUsedNative: div(capitalUsedNativeMinor, 100) ?? 0,
    capitalUsedTRY: capitalUsedTRYMinor !== null ? (div(capitalUsedTRYMinor, 100) ?? 0) : 0,
    leverage: levRatio,
    leveraged,
    potentialLossNative: div(riskReward.potentialLossNative, 100) ?? 0,
    potentialProfitNative: div(riskReward.potentialProfitNative, 100) ?? 0,
    potentialLossTRY: riskReward.potentialLossTRY !== null ? (div(riskReward.potentialLossTRY, 100) ?? 0) : 0,
    potentialProfitTRY: riskReward.potentialProfitTRY !== null ? (div(riskReward.potentialProfitTRY, 100) ?? 0) : 0,
    rr: riskReward.rr,
    exposurePctTotal: ratios.exposurePctTotal ?? 0,
    exposurePctSub: ratios.exposurePctSub ?? 0,
    riskPctTotal: ratios.riskPctTotal ?? 0,
    riskPctSub: ratios.riskPctSub ?? 0,
    thresholdDays,
    stopValid,
    tpValid,
    insufficientBalance,
  };
}
