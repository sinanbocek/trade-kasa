import { describe, expect, it } from 'vitest';
import { add, sub, mul, div, round, ratio, percent, abs, floor, mod, pow, log, max } from './index';



describe('ABACUS math motoru', () => {
  describe('add / sub / mul (temel aritmetik)', () => {
    it('kuruş tam sayıları doğru toplar', () => {
      expect(add(1000, 2500)).toBe(3500);
    });

    it('IEEE-754 float toplama tuzağını doğru aşar (0.1 + 0.2 = 0.3)', () => {
      expect(add(0.1, 0.2)).toBe(0.3);
    });

    it('kuruş tam sayıları doğru çıkarır', () => {
      expect(sub(5000, 1500)).toBe(3500);
    });

    it('kuruş tam sayıları doğru çarpar', () => {
      expect(mul(150, 4)).toBe(600);
    });
  });

  describe('div (bölme)', () => {
    it('sıfıra bölmede null döner', () => {
      expect(div(10, 0)).toBeNull();
    });

    it('tam bölmeyi doğru hesaplar', () => {
      expect(div(100, 8)).toBe(12.5);
    });
  });

  describe('round (half-up yuvarlama - Türkiye usulü)', () => {
    it('2.49 değerini 2ye yuvarlar', () => {
      expect(round(2.49)).toBe(2);
    });

    it('2.50 değerini 3e yuvarlar', () => {
      expect(round(2.50)).toBe(3);
    });

    it('negatif -2.5 değerini -3e yuvarlar (işaret korumalı)', () => {
      expect(round(-2.5)).toBe(-3);
    });

    it('-192.5 değerini -193e yuvarlar', () => {
      expect(round(-192.5)).toBe(-193);
    });

    it('ondalık hassasiyetli yuvarlama yaparken IEEE-754 tuzaklarını aşar (1.005 -> 1.01, 2.005 -> 2.01, 2.675 -> 2.68)', () => {
      expect(round(1.005, 2)).toBe(1.01);
      expect(round(2.005, 2)).toBe(2.01);
      expect(round(2.675, 2)).toBe(2.68);
    });
  });

  describe('abs (mutlak değer)', () => {
    it('pozitif ve negatif sayıların mutlak değerini döner', () => {
      expect(abs(2500)).toBe(2500);
      expect(abs(-2500)).toBe(2500);
      expect(abs(0)).toBe(0);
    });
  });

  describe('floor (aşağı yuvarlama / taban)', () => {
    it('taban değerini hesaplar', () => {
      expect(floor(23.85)).toBe(23);
      expect(floor(23232.23)).toBe(23232);
    });
  });

  describe('mod (kalan / modülasyon)', () => {
    it('kalan değerini hesaplar', () => {
      expect(mod(2323223, 100)).toBe(23);
      expect(mod(2323250, 100)).toBe(50);
    });

    it('payda 0 ise null döner', () => {
      expect(mod(100, 0)).toBeNull();
    });
  });

  describe('ratio (katsayı)', () => {
    it('payda pozitifse katsayıyı hesaplar', () => {
      expect(ratio(300, 100)).toBe(3);
    });

    it('payda 0 ise null döner', () => {
      expect(ratio(5, 0)).toBeNull();
    });

    it('payda negatif ise null döner', () => {
      expect(ratio(5, -10)).toBeNull();
    });
  });

  describe('percent (yüzde hesaplama)', () => {
    it('yüzde değerini doğru hesaplar (25 / 100 = %25)', () => {
      expect(percent(25, 100)).toBe(25);
    });

    it('payda 0 veya negatifse null döner', () => {
      expect(percent(1, 0)).toBeNull();
      expect(percent(25, -50)).toBeNull();
    });

    it('küsuratlı yüzde hesaplar (1 / 3)', () => {
      const res = percent(1, 3);
      expect(res).not.toBeNull();
      expect(round(res!, 4)).toBe(33.3333);
    });
  });

  describe('pow (üs alma)', () => {
    it('üs alma işlemini doğru hesaplar (2^3 = 8, 1.35^(1/365))', () => {
      expect(pow(2, 3)).toBe(8);
      const res = pow(1.35, 1 / 365);
      expect(res).not.toBeNull();
      expect(round(res!, 6)).toBe(1.000823);
    });


    it('base < 0 ise null döner', () => {
      expect(pow(-2, 0.5)).toBeNull();
    });
  });

  describe('log (doğal logaritma)', () => {
    it('ln(x) doğal logaritmasını doğru hesaplar', () => {
      const res = log(1.10);
      expect(res).not.toBeNull();
      expect(round(res!, 6)).toBe(0.09531);
    });

    it('x <= 0 ise null döner', () => {
      expect(log(0)).toBeNull();
      expect(log(-5)).toBeNull();
    });
  });

  describe('max (en büyük sayı)', () => {
    it('verilen sayılar arasından en büyüğünü döner', () => {
      expect(max(1, 5, 10, 3)).toBe(10);
      expect(max(-10, 1)).toBe(1);
    });

    it('hiç sayı verilmezse null döner', () => {
      expect(max()).toBeNull();
    });
  });
});

