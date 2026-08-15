import { describe, expect, it } from 'vitest';
import { format } from './index';

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
