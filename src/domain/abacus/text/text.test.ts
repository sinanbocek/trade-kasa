import { describe, expect, it } from 'vitest';
import { numberToWords } from './index';

describe('ABACUS text.numberToWords motoru', () => {
  it('0 için Sıfır döner', () => {
    expect(numberToWords(0)).toBe('Sıfır');
  });

  it('1-9 tek basamaklı sayıları çevirir', () => {
    expect(numberToWords(1)).toBe('Bir');
    expect(numberToWords(5)).toBe('Beş');
  });

  it('10-99 iki basamaklı sayıları çevirir', () => {
    expect(numberToWords(11)).toBe('OnBir');
    expect(numberToWords(20)).toBe('Yirmi');
    expect(numberToWords(54)).toBe('ElliDört');
  });

  it('yüz kuralını "bir" düşürme ile uygular (100 -> Yüz, 200 -> İkiYüz)', () => {
    expect(numberToWords(100)).toBe('Yüz');
    expect(numberToWords(300)).toBe('ÜçYüz');
    expect(numberToWords(345)).toBe('ÜçYüzKırkBeş');
  });

  it('bin kuralını "bir" düşürme ile uygular (1000 -> Bin, 2000 -> İkiBin)', () => {
    expect(numberToWords(1000)).toBe('Bin');
    expect(numberToWords(2000)).toBe('İkiBin');
    expect(numberToWords(320000)).toBe('ÜçYüzYirmiBin');
  });

  it('milyon kuralında "bir" düşmez (1000000 -> BirMilyon)', () => {
    expect(numberToWords(1000000)).toBe('BirMilyon');
    expect(numberToWords(3345334)).toBe('ÜçMilyonÜçYüzKırkBeşBinÜçYüzOtuzDört');
  });

  it('boşluklu (spaced) seçeneğini doğru uygular', () => {
    expect(numberToWords(3345334, { spaced: true })).toBe('Üç Milyon Üç Yüz Kırk Beş Bin Üç Yüz Otuz Dört');
  });

  describe('kenar durumları (edge cases)', () => {
    it('101 -> YüzBir', () => {
      expect(numberToWords(101)).toBe('YüzBir');
    });

    it('1001 -> BinBir', () => {
      expect(numberToWords(1001)).toBe('BinBir');
    });

    it('1000001 -> BirMilyonBir', () => {
      expect(numberToWords(1000001)).toBe('BirMilyonBir');
    });

    it('1001000 -> BirMilyonBin', () => {
      expect(numberToWords(1001000)).toBe('BirMilyonBin');
    });

    it('100100 -> YüzBinYüz', () => {
      expect(numberToWords(100100)).toBe('YüzBinYüz');
    });

    it('2001 -> İkiBinBir', () => {
      expect(numberToWords(2001)).toBe('İkiBinBir');
    });

    it('11000 -> OnBirBin', () => {
      expect(numberToWords(11000)).toBe('OnBirBin');
    });

    it('1100000 -> BirMilyonYüzBin', () => {
      expect(numberToWords(1100000)).toBe('BirMilyonYüzBin');
    });
  });
});
