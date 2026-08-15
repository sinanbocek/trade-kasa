import { describe, expect, it } from 'vitest';
import {
  endsWithHardConsonant,
  endsWithVowel,
  isBackVowel,
  isRoundedVowel,
  lastVowel,
  numberToWords,
  suffix,
  toTrLower,
} from './index';

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

describe('ABACUS text ek-fonetiği temel yardımcıları', () => {
  describe('toTrLower (Türkçe harf küçültme)', () => {
    it('tam kelimeleri Türkçe kurallarına göre doğru küçültür', () => {
      expect(toTrLower('İSTANBUL')).toBe('istanbul');
      expect(toTrLower('IŞIK')).toBe('ışık');
      expect(toTrLower('ÇAĞLAYAN')).toBe('çağlayan');
      expect(toTrLower('GÜNÜMÜZ')).toBe('günümüz');
      expect(toTrLower('ABC')).toBe('abc');
      expect(toTrLower('İğne')).toBe('iğne');
    });
  });

  describe('lastVowel', () => {
    it('kelimedeki son ünlüyü döner', () => {
      expect(lastVowel('kırk')).toBe('ı');
      expect(lastVowel('üç')).toBe('ü');
      expect(lastVowel('altı')).toBe('ı');
      expect(lastVowel('yedi')).toBe('i');
      expect(lastVowel('bin')).toBe('i');
    });

    it('ücretsiz/ünlüsüz kelimede null döner', () => {
      expect(lastVowel('krk')).toBeNull();
    });
  });

  describe('isBackVowel', () => {
    it('kalın ünlü kontrolü yapar (a, ı, o, u)', () => {
      expect(isBackVowel('a')).toBe(true);
      expect(isBackVowel('ı')).toBe(true);
      expect(isBackVowel('e')).toBe(false);
      expect(isBackVowel('ü')).toBe(false);
    });
  });

  describe('isRoundedVowel', () => {
    it('yuvarlak ünlü kontrolü yapar (o, ö, u, ü)', () => {
      expect(isRoundedVowel('u')).toBe(true);
      expect(isRoundedVowel('ö')).toBe(true);
      expect(isRoundedVowel('ı')).toBe(false);
      expect(isRoundedVowel('a')).toBe(false);
    });
  });

  describe('endsWithHardConsonant', () => {
    it('fıstıkçı şahap sert ünsüz kontrolünü doğru yapar', () => {
      expect(endsWithHardConsonant('kırk')).toBe(true);
      expect(endsWithHardConsonant('beş')).toBe(true);
      expect(endsWithHardConsonant('bin')).toBe(false);
      expect(endsWithHardConsonant('altı')).toBe(false);
    });
  });

  describe('endsWithVowel', () => {
    it('son harfin ünlü olup olmadığını kontrol eder', () => {
      expect(endsWithVowel('altı')).toBe(true);
      expect(endsWithVowel('kırk')).toBe(false);
    });
  });
});

describe('ABACUS text.suffix ek çekimi motoru (loc, dat, abl)', () => {
  it('loc (bulunma) eklerini doğru üretir (-de/-da/-te/-ta)', () => {
    expect(suffix(2026, 'year', 'loc')).toBe("2026'da");
    expect(suffix(2025, 'year', 'loc')).toBe("2025'te");
    expect(suffix(40, 'number', 'loc')).toBe("40'ta");
    expect(suffix(3, 'number', 'loc')).toBe("3'te");
    expect(suffix(100, 'number', 'loc')).toBe("100'de");
    expect(suffix(1000, 'number', 'loc')).toBe("1000'de");
  });

  it('abl (çıkma) eklerini doğru üretir (-den/-dan/-ten/-tan)', () => {
    expect(suffix(2026, 'year', 'abl')).toBe("2026'dan");
    expect(suffix(40, 'number', 'abl')).toBe("40'tan");
    expect(suffix(2025, 'year', 'abl')).toBe("2025'ten");
  });

  it('dat (yönelme) eklerini doğru üretir (-e/-a/-ye/-ya)', () => {
    expect(suffix(2, 'number', 'dat')).toBe("2'ye");
    expect(suffix(40, 'number', 'dat')).toBe("40'a");
    expect(suffix(6, 'number', 'dat')).toBe("6'ya");
    expect(suffix(3, 'number', 'dat')).toBe("3'e");
    expect(suffix(2, 'percent', 'dat')).toBe("%2'ye");
    expect(suffix(1000000, 'number', 'dat')).toBe("1000000'a");
  });
});
