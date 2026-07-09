// ====================================================================
// HESAP MOTORU — saf fonksiyonlar (React / store bağımlılığı yok)
// ====================================================================
import type { MarketConfig, Settings, TradeInput, TradeResult } from '../types';

/** Toplam TL kasa = TL kasalar + USD kasaların TL karşılığı */
export function totalKasaTRY(s: Settings): number {
  const tl = (s.bistKasaTL || 0) + (s.viopKasaTL || 0);
  const usd = (s.abdKasaUSD || 0) + (s.kriptoKasaUSD || 0);
  return tl + usd * (s.usdTryKuru || 0);
}

/** TL cinsi toplam kasa (bilgi amaçlı) */
export function totalKasaTLPart(s: Settings): number {
  return (s.bistKasaTL || 0) + (s.viopKasaTL || 0);
}

/** USD cinsi toplam kasa (bilgi amaçlı) */
export function totalKasaUSDPart(s: Settings): number {
  return (s.abdKasaUSD || 0) + (s.kriptoKasaUSD || 0);
}

/**
 * Fırsat maliyeti eşik süresi (bileşik faiz):
 * Hedeflenen getiriye risksiz faizle kaç günde ulaşılırdı?
 */
export function calculateThresholdDays(targetReturnRatio: number, annualRate: number): number {
  if (targetReturnRatio <= 0 || annualRate <= 0) return 0;
  const dailyRate = Math.pow(1 + annualRate / 100, 1 / 365) - 1;
  const days = Math.log(1 + targetReturnRatio) / Math.log(1 + dailyRate);
  return Math.max(1, Math.round(days));
}

/**
 * Miktar <-> hacim çift yönlü türetme yardımcıları.
 * Hacim = miktar * fiyat * çarpan
 */
export function qtyFromVolume(volume: number, price: number, multiplier: number, fractional: boolean): number {
  const denom = price * (multiplier || 1);
  if (denom <= 0) return 0;
  const raw = volume / denom;
  return fractional ? raw : Math.floor(raw);
}

export function volumeFromQty(qty: number, price: number, multiplier: number): number {
  return qty * price * (multiplier || 1);
}

/**
 * Ana hesap: bir işlem girdisini alıp tüm türetilmiş metrikleri döner.
 * Native = piyasanın kendi para birimi (BİST/VİOP: TL, ABD/Kripto: USD).
 */
export function computeTrade(input: TradeInput, market: MarketConfig, s: Settings): TradeResult {
  const price = input.price || 0;
  const stop = input.stop || 0;
  const tp = input.tp || 0;
  const qty = input.qty || 0;
  const multiplier = input.multiplier || 1;
  const marginPerUnit = market.allowLeverage ? input.marginPerUnit || 0 : 0;
  const isLong = input.direction === 'long';

  const rate = market.currency === 'USD' ? s.usdTryKuru || 0 : 1;
  const totalTRY = totalKasaTRY(s);
  const subKasaNative = s[market.kasaKey] || 0;

  // --- Hacim ---
  const volumeNative = volumeFromQty(qty, price, multiplier);
  const volumeTRY = volumeNative * rate;

  // --- Kullanılan sermaye (teminat varsa teminat, yoksa hacmin tamamı) ---
  const leveraged = marginPerUnit > 0;
  const capitalUsedNative = leveraged ? qty * marginPerUnit : volumeNative;
  const capitalUsedTRY = capitalUsedNative * rate;
  const leverage = leveraged && capitalUsedNative > 0 ? volumeNative / capitalUsedNative : 1;

  // --- Stop / TP yön geçerliliği ---
  const stopValid =
    stop > 0 && price > 0 && (isLong ? stop < price : stop > price);
  const tpValid =
    tp > 0 && price > 0 && (isLong ? tp > price : tp < price);

  // --- Olası kayıp / kazanç (native) ---
  const perUnitLoss = isLong ? price - stop : stop - price;
  const perUnitProfit = isLong ? tp - price : price - tp;

  const potentialLossNative = stopValid ? Math.max(0, perUnitLoss) * qty * multiplier : 0;
  const potentialProfitNative = tpValid ? Math.max(0, perUnitProfit) * qty * multiplier : 0;
  const potentialLossTRY = potentialLossNative * rate;
  const potentialProfitTRY = potentialProfitNative * rate;

  // --- R:R ---
  const risk = Math.max(0, perUnitLoss);
  const reward = Math.max(0, perUnitProfit);
  const rr = stopValid && tpValid && risk > 0 ? reward / risk : null;

  // --- Oranlar ---
  const exposurePctTotal = totalTRY > 0 ? (volumeTRY / totalTRY) * 100 : 0;
  const exposurePctSub = subKasaNative > 0 ? (volumeNative / subKasaNative) * 100 : 0;
  const riskPctTotal = totalTRY > 0 ? (potentialLossTRY / totalTRY) * 100 : 0;
  const riskPctSub = subKasaNative > 0 ? (potentialLossNative / subKasaNative) * 100 : 0;

  // --- Fırsat maliyeti eşik süresi ---
  let thresholdDays = 0;
  if (tpValid && capitalUsedNative > 0) {
    const targetReturnRatio = potentialProfitNative / capitalUsedNative;
    thresholdDays = calculateThresholdDays(targetReturnRatio, s[market.riskFreeKey] || 0);
  }

  // --- Bakiye yeterliliği ---
  const insufficientBalance = capitalUsedNative > 0 && capitalUsedNative > subKasaNative;

  return {
    volumeNative,
    volumeTRY,
    capitalUsedNative,
    capitalUsedTRY,
    leverage,
    leveraged,
    potentialLossNative,
    potentialProfitNative,
    potentialLossTRY,
    potentialProfitTRY,
    rr,
    exposurePctTotal,
    exposurePctSub,
    riskPctTotal,
    riskPctSub,
    thresholdDays,
    stopValid,
    tpValid,
    insufficientBalance,
  };
}
