import { describe, expect, it } from 'vitest';
import { format } from './index';

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
