import { describe, expect, it } from 'vitest';
import { calculateThresholdDays } from './opportunity';

describe('ABACUS trading/opportunity motoru (fırsat maliyeti eşik günü)', () => {
  it('tipik senaryoda (%10 getiri hedefi, %35 yıllık faiz) bileşik faiz ile 116 gün hesaplar', () => {
    // targetReturnRatio = 0.10 (%10)
    // annualRate = 35 (%35)
    // 1.35 ^ (1/365) - 1 = 0.000822244...
    // ln(1.10) / ln(1.000822244) = 115.962... -> max(1, round(115.962)) = 116 gün
    expect(calculateThresholdDays(0.10, 35)).toBe(116);
  });

  it('sınır senaryosunda (%1 getiri hedefi, %35 yıllık faiz) 12 gün hesaplar', () => {
    // targetReturnRatio = 0.01 (%1)
    // annualRate = 35 (%35)
    // ln(1.01) / ln(1.000822244) = 12.106... -> 12 gün
    expect(calculateThresholdDays(0.01, 35)).toBe(12);
  });

  it('geçersiz veya <= 0 girdilerde (faiz <= 0 veya hedef <= 0) sessiz 0 yapmayıp null döner', () => {
    expect(calculateThresholdDays(0, 35)).toBeNull();
    expect(calculateThresholdDays(0.10, 0)).toBeNull();
    expect(calculateThresholdDays(-0.05, 35)).toBeNull();
    expect(calculateThresholdDays(0.10, -10)).toBeNull();
  });
});
