import { describe, expect, it } from 'vitest';
import type { Settings } from '../../../types';
import { totalKasaTLPart, totalKasaTRY, totalKasaUSDPart } from './kasa';

const mockSettings: Settings = {
  version: 1,
  bistKasaTL: 100_000_000, // 1.000.000,00 TL (kuruş int)
  viopKasaTL: 50_000_000, // 500.000,00 TL (kuruş int)
  abdKasaUSD: 10_000_000, // 100.000,00 USD (kuruş int)
  kriptoKasaUSD: 5_000_000, // 50.000,00 USD (kuruş int)
  usdTryKuru: 34,
  maxRiskYuzdesi: 2,
  maxPozisyonYuzdesi: 25,
  hedefRR: 2.5,
  risksizGetiriTL: 35,
  risksizGetiriUSD: 3,
};

describe('ABACUS trading/kasa motoru (kasa toplamları)', () => {
  describe('totalKasaTLPart', () => {
    it('TL kasaların (bistKasaTL + viopKasaTL) kuruş int toplamını döner', () => {
      // 100.000.000 + 50.000.000 = 150.000.000
      expect(totalKasaTLPart(mockSettings)).toBe(150_000_000);
    });
  });

  describe('totalKasaUSDPart', () => {
    it('USD kasaların (abdKasaUSD + kriptoKasaUSD) USD kuruş int toplamını döner', () => {
      // 10.000.000 + 5.000.000 = 15.000.000
      expect(totalKasaUSDPart(mockSettings)).toBe(15_000_000);
    });
  });

  describe('totalKasaTRY', () => {
    it('TL kasalar + USD kasaların TL karşılığını (currency.convert) kuruş int olarak toplar', () => {
      // TL = 150.000.000
      // USD = 15.000.000 * 34 = 510.000.000
      // Toplam = 660.000.000 TL kuruş int
      expect(totalKasaTRY(mockSettings)).toBe(660_000_000);
    });

    it('ondalıklı kur (34.25) ile doğru TL kuruş int hesaplar', () => {
      const settingsWithFloatRate: Settings = { ...mockSettings, usdTryKuru: 34.25 };
      // 15.000.000 USD kuruş * 34.25 = 513.750.000 TL kuruş
      // 150.000.000 + 513.750.000 = 663.750.000 TL kuruş
      expect(totalKasaTRY(settingsWithFloatRate)).toBe(663_750_000);
    });

    it('usdTryKuru <= 0 veya geçersiz olduğunda sessiz 0 yapmayıp null döner', () => {
      expect(totalKasaTRY({ ...mockSettings, usdTryKuru: 0 })).toBeNull();
      expect(totalKasaTRY({ ...mockSettings, usdTryKuru: -10 })).toBeNull();
      expect(totalKasaTRY({ ...mockSettings, usdTryKuru: NaN })).toBeNull();
    });
  });
});
