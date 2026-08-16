import { add, div, log, max, pow, round, sub } from '../math';

/**
 * ABACUS Fırsat Maliyeti Eşik Süresi Motoru (ABACUS-SPEC §3.3 / §3.4).
 * Hedeflenen getiriye risksiz faiz oranıyla kaç günde ulaşılacağını bileşik faiz formülüyle hesaplar:
 * 1. dailyRate = (1 + annualRate / 100) ^ (1 / 365) - 1
 * 2. days = ln(1 + targetReturnRatio) / ln(1 + dailyRate)
 * 3. result = max(1, round(days))
 * 
 * Sıfır ham Math.* kullanımı: Tüm hesaplamalar math motoru üzerinden yürütülür.
 * Girdiler <= 0 veya geçersizse sessiz 0 yapmayıp null döner.
 */

export function calculateThresholdDays(targetReturnRatio: number, annualRate: number): number | null {
  if (targetReturnRatio <= 0 || annualRate <= 0 || !Number.isFinite(targetReturnRatio) || !Number.isFinite(annualRate)) {
    return null;
  }

  const annualDiv100 = div(annualRate, 100);
  if (annualDiv100 === null) return null;

  const rateBase = add(1, annualDiv100);
  const exp = div(1, 365);
  if (exp === null) return null;

  const powResult = pow(rateBase, exp);
  if (powResult === null) return null;

  const dailyRate = sub(powResult, 1);

  const targetTerm = add(1, targetReturnRatio);
  const logTarget = log(targetTerm);
  const logDaily = log(add(1, dailyRate));

  if (logTarget === null || logDaily === null || logDaily === 0) {
    return null;
  }

  const daysRaw = div(logTarget, logDaily);
  if (daysRaw === null) return null;

  const roundedDays = round(daysRaw, 0);
  const result = max(1, roundedDays);
  return result;
}
