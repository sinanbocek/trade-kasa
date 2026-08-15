import { phone as normPhone, upper } from '../text';

/**
 * ABACUS PII gizleme (maskeleme) motoru (ABACUS-SPEC §3.8).
 * mask motoru yalnız gösterim amaçlıdır; saklanan gerçek veriyi asla mutasyona uğratmaz.
 * Geçersiz veya eksik girdilerde "—" (em dash) döner.
 */

/**
 * Gizlilik modunda tutar maskeleme (ABACUS-SPEC §3.8).
 * Sabit "****" stringi döner.
 */
export function money(): string {
  return '****';
}

/**
 * Vergi Kimlik No (VKN) maskeleme.
 * Biçim: "123****890" (ilk 3 hane + 4 yıldız + son 3 hane).
 * Geçersiz uzunluk/girdide "—" döner.
 */
export function vkn(s: string): string {
  if (!s) return '—';
  const clean = s.replace(/\s+/g, '');
  if (clean.length !== 10 || !/^\d{10}$/.test(clean)) {
    return '—';
  }
  const first3 = clean.slice(0, 3);
  const last3 = clean.slice(7);
  return `${first3}****${last3}`;
}

/**
 * TR IBAN maskeleme (ABACUS-SPEC §3.8).
 * Biçim: "TR** **** **** **** **** **01" (TR ve son 2 hane açık, 20 hane 4'erli gruplarla maskeli).
 * Girdi normalize edilir; geçersiz veya TR dışı IBAN için "—" döner.
 */
export function iban(s: string): string {
  if (!s) return '—';
  const clean = upper(s.replace(/\s+/g, ''));
  if (clean.length !== 26 || !clean.startsWith('TR')) {
    return '—';
  }
  const digits = clean.slice(2);
  if (!/^\d{24}$/.test(digits)) {
    return '—';
  }

  const last2 = digits.slice(22);
  return `TR** **** **** **** **** **${last2}`;
}

/**
 * TR cep telefonu maskeleme (ABACUS-SPEC §3.8).
 * Biçim: "+90 5** *** ** 67" (Ülke kodu +90, ilk hane 5 ve son 2 hane açık).
 * Girdi text.phone ile normalize edilir; geçersiz cep numarasında "—" döner.
 */
export function phone(s: string): string {
  if (!s) return '—';
  const norm = normPhone(s);
  if (!norm.valid) return '—';

  const core = norm.stored.slice(3); // 10 haneli cep no (5XXXXXXXXX)
  const last2 = core.slice(8);
  return `+90 5** *** ** ${last2}`;
}
