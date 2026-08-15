import { describe, expect, it } from 'vitest';
import { compact, format, toWords } from './index';

describe('ABACUS money.format motoru', () => {
  it('varsayılan biçim: simge solda, kuruşsuz (2323223 kuruş -> ₺23.232)', () => {
    expect(format(2323223)).toBe('₺23.232');
  });

  it('kuruşlu biçim: simge solda, kuruşlu (2323223 kuruş -> ₺23.232,23)', () => {
    expect(format(2323223, { kurus: true })).toBe('₺23.232,23');
  });

  it('metin biçimi: TL sağda, kuruşsuz (2323223 kuruş -> 23.232 TL)', () => {
    expect(format(2323223, { form: 'text' })).toBe('23.232 TL');
  });

  it('metin + kuruşlu biçim: TL sağda, kuruşlu (2323223 kuruş -> 23.232,23 TL)', () => {
    expect(format(2323223, { form: 'text', kurus: true })).toBe('23.232,23 TL');
  });

  it('negatif parantez biçimi (-2323223 kuruş -> (₺23.232))', () => {
    expect(format(-2323223, { negative: 'paren' })).toBe('(₺23.232)');
  });

  it('negatif eksi biçimi (-2323223 kuruş -> -₺23.232)', () => {
    expect(format(-2323223)).toBe('-₺23.232');
  });

  it('sıfır değeri kuruşsuz: "0"', () => {
    expect(format(0)).toBe('0');
  });

  it('sıfır değeri kuruşlu: "0,00"', () => {
    expect(format(0, { kurus: true })).toBe('0,00');
  });

  it('null/undefined değeri: "—"', () => {
    expect(format(null)).toBe('—');
    expect(format(undefined)).toBe('—');
  });

  it('100 kuruş = 1 TL (kuruşsuz)', () => {
    expect(format(100)).toBe('₺1');
  });

  it('50 kuruş = 0,50 TL (kuruşlu)', () => {
    expect(format(50, { kurus: true })).toBe('₺0,50');
  });

  it('kuruşsuz gösterimde half-up yuvarlama (2323250 kuruş = 23.232,50 TL -> ₺23.233)', () => {
    expect(format(2323250)).toBe('₺23.233');
  });
});

describe('ABACUS money.toWords motoru', () => {
  it('32000000 kuruş -> Yalnız ÜçYüzYirmiBinTürkLirası', () => {
    expect(toWords(32000000)).toBe('Yalnız ÜçYüzYirmiBinTürkLirası');
  });

  it('334533454 kuruş -> Yalnız ÜçMilyonÜçYüzKırkBeşBinÜçYüzOtuzDörtLiraElliDörtKuruş', () => {
    expect(toWords(334533454)).toBe('Yalnız ÜçMilyonÜçYüzKırkBeşBinÜçYüzOtuzDörtLiraElliDörtKuruş');
  });

  it('100 kuruş -> Yalnız BirTürkLirası', () => {
    expect(toWords(100)).toBe('Yalnız BirTürkLirası');
  });

  it('150 kuruş -> Yalnız BirLiraElliKuruş', () => {
    expect(toWords(150)).toBe('Yalnız BirLiraElliKuruş');
  });

  it('0 kuruş -> Yalnız SıfırTürkLirası', () => {
    expect(toWords(0)).toBe('Yalnız SıfırTürkLirası');
  });

  it('1 kuruş -> Yalnız SıfırLiraBirKuruş', () => {
    expect(toWords(1)).toBe('Yalnız SıfırLiraBirKuruş');
  });

  it('spaced seçeneği ile boşluklu yazım üretir', () => {
    expect(toWords(334533454, { spaced: true })).toBe('Yalnız Üç Milyon Üç Yüz Kırk Beş Bin Üç Yüz Otuz Dört Lira Elli Dört Kuruş');
  });

  describe('kuruş kenar durumları', () => {
    it('103 kuruş -> Yalnız BirLiraÜçKuruş', () => {
      expect(toWords(103)).toBe('Yalnız BirLiraÜçKuruş');
    });

    it('1009 kuruş -> Yalnız OnLiraDokuzKuruş', () => {
      expect(toWords(1009)).toBe('Yalnız OnLiraDokuzKuruş');
    });

    it('100000000000 kuruş (1 milyar TL) -> Yalnız BirMilyarTürkLirası', () => {
      expect(toWords(100000000000)).toBe('Yalnız BirMilyarTürkLirası');
    });
  });

  describe('negatif tutar davranışı', () => {
    it('-15000 kuruş -> -Yalnız YüzElliTürkLirası', () => {
      expect(toWords(-15000)).toBe('-Yalnız YüzElliTürkLirası');
    });

    it('-15000 kuruş (spaced) -> -Yalnız Yüz Elli Türk Lirası', () => {
      expect(toWords(-15000, { spaced: true })).toBe('-Yalnız Yüz Elli Türk Lirası');
    });
  });
});

describe('ABACUS money.compact motoru', () => {
  it('123456789 kuruş (1.234.567,89 TL) -> ₺1,23M', () => {
    expect(compact(123456789)).toBe('₺1,23M');
  });

  it('123456789 kuruş (B/Mn/Mr stili) -> ₺1,23Mn', () => {
    expect(compact(123456789, { style: 'B/Mn/Mr' })).toBe('₺1,23Mn');
  });

  it('100000000 kuruş (tam 1 milyon TL) -> ₺1M (gereksiz sıfır yok)', () => {
    expect(compact(100000000)).toBe('₺1M');
  });

  it('150000000 kuruş (1.5 milyon TL) -> ₺1,5M', () => {
    expect(compact(150000000)).toBe('₺1,5M');
  });

  it('1234500 kuruş (12.345 TL) -> ₺12,35K', () => {
    expect(compact(1234500)).toBe('₺12,35K');
  });

  it('1234500 kuruş (B/Mn/Mr stili) -> ₺12,35B', () => {
    expect(compact(1234500, { style: 'B/Mn/Mr' })).toBe('₺12,35B');
  });

  it('100000000000 kuruş (1 milyar TL) -> ₺1B (K/M) / ₺1Mr (B/Mn/Mr)', () => {
    expect(compact(100000000000)).toBe('₺1B');
    expect(compact(100000000000, { style: 'B/Mn/Mr' })).toBe('₺1Mr');
  });

  it('50000 kuruş (500 TL < 1000 TL eşiği) -> ₺500 (normal format)', () => {
    expect(compact(50000)).toBe('₺500');
  });

  it('-123456789 kuruş -> -₺1,23M', () => {
    expect(compact(-123456789)).toBe('-₺1,23M');
  });

  it('0 kuruş -> 0', () => {
    expect(compact(0)).toBe('0');
  });

  it('null/undefined -> —', () => {
    expect(compact(null)).toBe('—');
    expect(compact(undefined)).toBe('—');
  });

  it('123456789 kuruş (form: text) -> 1,23M TL', () => {
    expect(compact(123456789, { form: 'text' })).toBe('1,23M TL');
  });

  describe('ölçek-sınırı yuvarlama vakaları', () => {
    it('99999900 kuruş (999.999 TL) -> ₺1M (bin->milyon sınırı)', () => {
      expect(compact(99999900)).toBe('₺1M');
    });

    it('99999990000 kuruş (999.999.900 TL) -> ₺1B (milyon->milyar sınırı K/M)', () => {
      expect(compact(99999990000)).toBe('₺1B');
    });

    it('99999990000 kuruş (B/Mn/Mr stili) -> ₺1Mr', () => {
      expect(compact(99999990000, { style: 'B/Mn/Mr' })).toBe('₺1Mr');
    });

    it('99990000 kuruş (999.900 TL) -> ₺999,9K (bu ölçek atlamamalı)', () => {
      expect(compact(99990000)).toBe('₺999,9K');
    });
  });
});
