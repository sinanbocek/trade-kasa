import { describe, expect, it } from 'vitest';
import { convert, cross } from './index';

describe('ABACUS currency kur çevrimi motoru', () => {
  describe('convert (tekli kur çevrimi)', () => {
    it('10000 kuruş USD (%34.25 kur ile) -> 342500 kuruş TRY çevirir', () => {
      expect(convert(10000, 34.25)).toBe(342500);
    });

    it('10000 kuruş (1.00 kur ile) -> 10000 kuruş döner', () => {
      expect(convert(10000, 1)).toBe(10000);
    });

    it('333 kuruş (%34.25 kur ile) -> 11405 kuruş half-up yuvarlar', () => {
      // 3,33 USD × 34,25 = 114,0525 TRY -> 11405 kuruş
      expect(convert(333, 34.25)).toBe(11405);
    });

    it('rate 0 olduğunda null döner', () => {
      expect(convert(10000, 0)).toBeNull();
    });

    it('negatif rate olduğunda null döner', () => {
      expect(convert(10000, -5)).toBeNull();
    });

    it('0 tutar çevrildiğinde 0 döner', () => {
      expect(convert(0, 34.25)).toBe(0);
    });

    it('geçersiz rate (NaN) olduğunda null döner', () => {
      expect(convert(10000, NaN)).toBeNull();
    });
  });

  describe('cross (çapraz kur çevrimi)', () => {
    it('10000 kuruş USD -> TRY (34) -> EUR (37) = 9189 kuruş EUR çevirir', () => {
      // 100 USD × 34 = 3400 TRY = 340000 kuruş TRY / 37 = 9189.189189... -> 9189 kuruş EUR
      expect(cross(10000, 34, 37)).toBe(9189);
    });

    it('toRate 0 olduğunda null döner', () => {
      expect(cross(10000, 34, 0)).toBeNull();
    });

    it('fromRate 0 olduğunda null döner', () => {
      expect(cross(10000, 0, 37)).toBeNull();
    });

    it('3700 kuruş EUR -> TRY (37) -> USD (34) = 4026 kuruş USD çevirir', () => {
      // 3700 kuruş EUR × 37 = 136900 kuruş TRY / 34 = 4026.470588... -> 4026 kuruş USD (half-up)
      expect(cross(3700, 37, 34)).toBe(4026);
    });
  });
});
