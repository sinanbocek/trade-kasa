import { describe, expect, it } from 'vitest';
import { iban, money, phone, vkn } from './index';

describe('ABACUS mask PII gizleme motoru', () => {
  describe('money (tutar gizleme)', () => {
    it('sabit **** yıldız string döner', () => {
      expect(money()).toBe('****');
    });
  });

  describe('vkn (Vergi Kimlik No gizleme)', () => {
    it('10 haneli VKN için ilk 3 ve son 3 haneyi açık bırakıp ortayı maskeler', () => {
      expect(vkn('1234567890')).toBe('123****890');
    });

    it('boşluk içeren 10 haneli VKN için temizleyip maskeler', () => {
      expect(vkn(' 123 456 7890 ')).toBe('123****890');
    });

    it('geçersiz uzunluktaki VKN için — döner', () => {
      expect(vkn('12')).toBe('—');
      expect(vkn('')).toBe('—');
      expect(vkn('12345678901')).toBe('—');
    });
  });

  describe('iban (TR IBAN gizleme)', () => {
    it('26 karakterli TR IBAN için son 2 haneyi açık bırakıp standart gruplarla maskeler', () => {
      // Format: TR** **** **** **** **** **01
      expect(iban('TR400006200000000000000001')).toBe('TR** **** **** **** **** **01');
    });

    it('boşluklu veya küçük harfli IBAN girdisini normalize edip maskeler', () => {
      expect(iban('tr40 0006 2000 0000 0000 0000 01')).toBe('TR** **** **** **** **** **01');
    });

    it('geçersiz veya TR dışı IBAN için — döner', () => {
      expect(iban('123')).toBe('—');
      expect(iban('DE400006200000000000000001')).toBe('—');
      expect(iban('')).toBe('—');
    });
  });

  describe('phone (Telefon gizleme)', () => {
    it('TR cep telefonunu normalize edip ülke kodu, 5 ve son 2 hane açık maskeler', () => {
      // Format: +90 5** *** ** 67
      expect(phone('+905321234567')).toBe('+90 5** *** ** 67');
      expect(phone('05321234567')).toBe('+90 5** *** ** 67');
      expect(phone('532 123 45 67')).toBe('+90 5** *** ** 67');
    });

    it('geçersiz cep telefonu numarası için — döner', () => {
      expect(phone('123')).toBe('—');
      expect(phone('')).toBe('—');
      expect(phone('02123456789')).toBe('—');
    });
  });
});
