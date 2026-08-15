import { describe, expect, it } from 'vitest';
import { email, iban, ikn, tckn, vkn } from './index';

describe('ABACUS validate doğrulama motoru', () => {
  describe('vkn (Vergi Kimlik No doğrulama)', () => {
    it('algoritmadan geçen geçerli 10 haneli VKN için true döner', () => {
      // 1111111114 -> p_1..9 = 0,9,7,7,3,8,5,3,4 -> sum=46 -> (10 - (46 % 10)) % 10 = 4
      expect(vkn('1111111114')).toBe(true);
    });

    it('checksum tutmayan 10 haneli VKN için false döner', () => {
      expect(vkn('1111111115')).toBe(false);
      expect(vkn('1234567891')).toBe(false);
    });

    it('eksik/fazla haneli girdiler için false döner', () => {
      expect(vkn('123')).toBe(false);
      expect(vkn('11111111111')).toBe(false);
      expect(vkn('')).toBe(false);
    });
  });

  describe('tckn (T.C. Kimlik No doğrulama)', () => {
    it('algoritmadan geçen geçerli 11 haneli TCKN için true döner', () => {
      // 10000000078 -> odd=1, even=0 -> d10 = (7*1-0)%10 = 7 -> sum1..10=8 -> d11 = 8%10 = 8
      expect(tckn('10000000078')).toBe(true);
      expect(tckn('10000000146')).toBe(true);
    });

    it('tüm haneleri aynı olan (11111111111) geçersiz TCKN için false döner', () => {
      expect(tckn('11111111111')).toBe(false);
    });

    it('ilk hanesi 0 olan TCKN için false döner', () => {
      expect(tckn('01000000078')).toBe(false);
    });

    it('eksik haneli girdiler için false döner', () => {
      expect(tckn('1000000007')).toBe(false);
    });
  });

  describe('ikn (İhale Kayıt No doğrulama)', () => {
    it('YYYY/N... formatındaki geçerli İKN için true döner', () => {
      expect(ikn('2026/1298071')).toBe(true);
      expect(ikn('2025/12345')).toBe(true);
    });

    it('yanlış ayraç veya eksik yıl/numara için false döner', () => {
      expect(ikn('2026-1298071')).toBe(false);
      expect(ikn('26/12')).toBe(false);
      expect(ikn('')).toBe(false);
    });
  });

  describe('iban (TR IBAN mod-97 doğrulama)', () => {
    it('mod-97 = 1 olan geçerli TR IBAN için true döner', () => {
      // TR40 0006 2000 0000 0000 0000 01 -> mod 97 = 1
      expect(iban('TR40 0006 2000 0000 0000 0000 01')).toBe(true);
      expect(iban('TR400006200000000000000001')).toBe(true);
    });

    it('checksum veya uzunluğu hatalı IBAN için false döner', () => {
      expect(iban('TR00 0000 0000 0000 0000 0000 00')).toBe(false);
      expect(iban('TR12345')).toBe(false);
      expect(iban('DE400006200000000000000001')).toBe(false);
    });
  });

  describe('email (E-posta format doğrulama)', () => {
    it('geçerli e-posta formatı için true döner', () => {
      expect(email('a@b.com')).toBe(true);
      expect(email('info@tradekasa.com')).toBe(true);
    });

    it('geçersiz e-posta formatı için false döner', () => {
      expect(email('abc')).toBe(false);
      expect(email('@b.com')).toBe(false);
      expect(email('a@b')).toBe(false);
      expect(email('')).toBe(false);
    });
  });
});
