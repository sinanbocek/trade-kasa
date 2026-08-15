import { describe, expect, it } from 'vitest';
import { leverage, qtyFromVolume, volumeFromQty } from './position';

describe('ABACUS trading/position motoru (miktardan hacim/kaldıraç türetme)', () => {
  describe('volumeFromQty', () => {
    it('miktar * fiyatKuruş * çarpan formülü ile hacim kuruş int hesaplar', () => {
      // 100 lot * 145,50 TL (14.550 kuruş) * 1 çarpan = 1.455.000 kuruş (14.550 TL)
      expect(volumeFromQty(100, 14550, 1)).toBe(1_455_000);
    });

    it('VİOP 100 kontrat çarpanı ile doğru hacim kuruş int hesaplar', () => {
      // 10 kontrat * 100,00 TL (10.000 kuruş) * 100 çarpan = 10.000.000 kuruş (100.000 TL)
      expect(volumeFromQty(10, 10000, 100)).toBe(10_000_000);
    });
  });

  describe('qtyFromVolume', () => {
    it('tam sayılı (fractional=false) piyasalarda aşağı yuvarlayarak miktar döner', () => {
      // 1.455.000 kuruş / (14.550 kuruş * 1) = 100
      expect(qtyFromVolume(1_455_000, 14550, 1, false)).toBe(100);

      // 1.500.000 kuruş / (14.550 kuruş * 1) = 103.0927... -> floor 103
      expect(qtyFromVolume(1_500_000, 14550, 1, false)).toBe(103);
    });

    it('kesirli (fractional=true) piyasalarda ondalıklı miktar döner', () => {
      // 1.500.000 kuruş / (14.550 kuruş * 1) = 103.09278350515464
      const result = qtyFromVolume(1_500_000, 14550, 1, true);
      expect(result).toBeCloseTo(103.09278, 4);
    });

    it('fiyat veya çarpan 0 olduğunda belirsizliği önlemek için miktar sentinel olarak 0 döner', () => {
      expect(qtyFromVolume(1_000_000, 0, 1, false)).toBe(0);
      expect(qtyFromVolume(1_000_000, 14550, 0, false)).toBe(0);
    });
  });

  describe('leverage', () => {
    it('hacim / kullanılan teminat oranı ile kaldıraç katını döner', () => {
      // 10.000.000 kuruş hacim / 2.000.000 kuruş teminat = 5x kaldıraç
      expect(leverage(10_000_000, 2_000_000)).toBe(5);
    });

    it('teminat 0 veya negatif olduğunda sessiz 1 fallback yapmayıp null döner', () => {
      expect(leverage(10_000_000, 0)).toBeNull();
      expect(leverage(10_000_000, -500)).toBeNull();
    });
  });
});
