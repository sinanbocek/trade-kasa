import { describe, expect, it } from 'vitest';
import { dayName, daysBetween, daysUntil, format, relative } from './index';

describe('ABACUS date.format motoru', () => {
  it('varsayılan short biçimi: GG.AA.YYYY (2026-08-15 -> 15.08.2026)', () => {
    expect(format('2026-08-15')).toBe('15.08.2026');
  });

  it('long biçimi: GG Ay YYYY (2026-08-15 -> 15 Ağustos 2026)', () => {
    expect(format('2026-08-15', 'long')).toBe('15 Ağustos 2026');
  });

  it('dayMonth biçimi: GG Ay. (2026-08-15 -> 15 Ağu.)', () => {
    expect(format('2026-08-15', 'dayMonth')).toBe('15 Ağu.');
  });

  it('monthYear biçimi: Ay YYYY (2026-08-15 -> Ağustos 2026)', () => {
    expect(format('2026-08-15', 'monthYear')).toBe('Ağustos 2026');
  });

  it('period biçimi: AA/YYYY (2026-08-15 -> 08/2026)', () => {
    expect(format('2026-08-15', 'period')).toBe('08/2026');
  });

  it('tek haneli gün ve ay için short biçiminde sıfır dolgulu gösterim (2026-01-05 -> 05.01.2026)', () => {
    expect(format('2026-01-05')).toBe('05.01.2026');
  });

  it('long biçiminde gün sıfır dolgusuz (2026-12-01 -> 1 Aralık 2026)', () => {
    expect(format('2026-12-01', 'long')).toBe('1 Aralık 2026');
  });

  it('ISO string saat kısmını yok sayar (2026-08-15T21:30:00Z -> 15.08.2026)', () => {
    expect(format('2026-08-15T21:30:00Z')).toBe('15.08.2026');
  });

  it('geçersiz, boş veya null/undefined girdi için — döner', () => {
    expect(format(null)).toBe('—');
    expect(format(undefined)).toBe('—');
    expect(format('')).toBe('—');
    expect(format('abc')).toBe('—');
    expect(format('2026-13-45')).toBe('—');
  });
});

describe('ABACUS date relative & gün aritmetiği motoru', () => {
  describe('daysBetween', () => {
    it('iki tarih arası gün farkını hesaplar', () => {
      expect(daysBetween('2026-08-10', '2026-08-15')).toBe(5);
      expect(daysBetween('2026-08-15', '2026-08-10')).toBe(-5);
      expect(daysBetween('2026-01-01', '2026-12-31')).toBe(364);
    });

    it('geçersiz girdilerde null döner', () => {
      expect(daysBetween('abc', '2026-08-15')).toBeNull();
      expect(daysBetween('2026-08-10', 'invalid')).toBeNull();
    });
  });

  describe('daysUntil', () => {
    it('bugünden hedefe gün farkını hesaplar', () => {
      expect(daysUntil('2026-08-20', '2026-08-15')).toBe(5);
      expect(daysUntil('2026-08-10', '2026-08-15')).toBe(-5);
    });
  });

  describe('relative (Türkçe bağıl zaman)', () => {
    it('bugün / dün / yarın ve gün önce/sonra ifadelerini döner', () => {
      expect(relative('2026-08-15', '2026-08-15')).toBe('bugün');
      expect(relative('2026-08-14', '2026-08-15')).toBe('dün');
      expect(relative('2026-08-16', '2026-08-15')).toBe('yarın');
      expect(relative('2026-08-12', '2026-08-15')).toBe('3 gün önce');
      expect(relative('2026-08-18', '2026-08-15')).toBe('3 gün sonra');
      expect(relative('2026-08-15T21:30:00Z', '2026-08-15')).toBe('bugün');
    });

    it('geçersiz girdilerde — döner', () => {
      expect(relative('abc', '2026-08-15')).toBe('—');
    });
  });

  describe('dayName (gün kısaltması)', () => {
    it('gün kısaltmasını Türkçe döner', () => {
      expect(dayName('2026-08-15')).toBe('Cts');
      expect(dayName('2026-08-17')).toBe('Pzt');
    });

    it('geçersiz girdilerde — döner', () => {
      expect(dayName('invalid')).toBe('—');
    });
  });
});
