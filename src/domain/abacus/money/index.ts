import { abs, div, floor, mod, round } from '../math';
import { numberToWords } from '../text';

export interface FormatMoneyOptions {
  kurus?: boolean;
  form?: 'symbol' | 'text';
  negative?: 'minus' | 'paren';
  currency?: 'TRY' | 'USD';
}

export interface ToWordsOptions {
  spaced?: boolean;
}

export interface CompactMoneyOptions {
  style?: 'K/M' | 'B/Mn/Mr';
  form?: 'symbol' | 'text';
}

/** Binlik ayraç ekleyici (Intl / toLocale kullanmadan) */
function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * ABACUS para biçimlendirme motoru (TCMB kurallarına uygun).
 * Girdi kuruş bazlı tam sayıdır (2323223 kuruş = 23.232,23 TL).
 * Tüm matematiksel işlemler math motoru üzerinden yürütülür (ham Math.* kullanımı yoktur).
 */
export function format(kurus: number | null | undefined, opts?: FormatMoneyOptions): string {
  if (kurus === null || kurus === undefined || !Number.isFinite(kurus)) {
    return '—';
  }

  const showKurus = opts?.kurus ?? false;
  const form = opts?.form ?? 'symbol';
  const negativeMode = opts?.negative ?? 'minus';
  const cur = opts?.currency ?? 'TRY';
  const symbol = cur === 'USD' ? '$' : '₺';
  const textCode = cur === 'USD' ? 'USD' : 'TL';

  if (kurus === 0) {
    if (form === 'text') {
      return showKurus ? `0,00 ${textCode}` : `0 ${textCode}`;
    }
    return showKurus ? '0,00' : '0';
  }


  const isNegative = kurus < 0;
  const absKurus = abs(kurus);

  let formattedNum = '';

  if (showKurus) {
    const tlDiv = div(absKurus, 100);
    const tl = tlDiv !== null ? floor(tlDiv) : 0;
    const kMod = mod(absKurus, 100);
    const k = kMod !== null ? round(kMod, 0) : 0;
    const kStr = k < 10 ? `0${k}` : `${k}`;
    formattedNum = `${groupThousands(tl)},${kStr}`;
  } else {
    const tlDiv = div(absKurus, 100);
    const roundedTL = tlDiv !== null ? round(tlDiv, 0) : 0;
    formattedNum = groupThousands(roundedTL);
  }

  const resultWithForm = form === 'symbol' ? `${symbol}${formattedNum}` : `${formattedNum} ${textCode}`;

  if (isNegative) {
    return negativeMode === 'paren' ? `(${resultWithForm})` : `-${resultWithForm}`;
  }

  return resultWithForm;
}

/**
 * ABACUS yüzde biçimlendirme motoru (%12,3).
 * Null / undefined / NaN için '—' (tire) döndürür.
 */
export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  const rounded = round(value, digits);
  const roundedStr = String(rounded).replace('.', ',');
  return `%${roundedStr}`;
}

/** Metin girişini (binlik ayraçlı) ham sayıya çevir — nokta binlik, virgül ondalık */
export function parseNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

/** Ondalıklı sayıyı binlik ayraçlı (nokta) + ondalık (virgül) göster — ör. 70000 -> "70.000" */
export function fmtDecimalGrouped(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0';
  const rounded = round(value, digits);
  const parts = String(rounded).split('.');
  const intPart = parts[0] ? groupThousands(Number(parts[0])) : '0';
  if (digits > 0) {
    const decPart = (parts[1] || '').padEnd(digits, '0').slice(0, digits);
    return `${intPart},${decPart}`;
  }
  return intPart;
}

/** Serbest ondalık giriş kutuları için CANLI biçimlendirme */
export function formatGroupedInput(raw: string): string {
  if (!raw) return '';
  const clean = raw.replace(/[^0-9,]/g, '');
  const firstComma = clean.indexOf(',');
  const intPartRaw = firstComma === -1 ? clean : clean.slice(0, firstComma);
  const decPart = firstComma === -1 ? '' : clean.slice(firstComma + 1).replace(/,/g, '');
  const intDigits = intPartRaw.replace(/^0+(?=\d)/, '');
  if (!intDigits && firstComma === -1) return '';
  const grouped = groupThousands(Number(intDigits || 0));
  if (firstComma === -1) return grouped;
  return `${grouped || '0'},${decPart}`;
}



/**
 * ABACUS tutar yazısı motoru (çek/sözleşme "Yalnız..." formatı, ABACUS-SPEC §3.2).
 * Girdi kuruş bazlı tam sayıdır. Negatif girdilerde eksi işareti "Yalnız" ibaresinin önüne eklenir (-Yalnız ...).
 */
export function toWords(kurus: number, opts?: ToWordsOptions): string {
  const spaced = opts?.spaced ?? false;
  const joinStr = spaced ? ' ' : '';
  const signPrefix = kurus < 0 ? '-' : '';

  const absKurus = abs(kurus);
  const tlDiv = div(absKurus, 100);
  const lira = tlDiv !== null ? floor(tlDiv) : 0;
  const kMod = mod(absKurus, 100);
  const kurusPart = kMod !== null ? round(kMod, 0) : 0;

  const prefix = `${signPrefix}Yalnız `;

  if (lira === 0 && kurusPart === 0) {
    const zeroTL = spaced ? 'Sıfır Türk Lirası' : 'SıfırTürkLirası';
    return `${prefix}${zeroTL}`;
  }

  if (kurusPart === 0) {
    const liraWords = numberToWords(lira, opts);
    const tlSuffix = spaced ? 'Türk Lirası' : 'TürkLirası';
    return `${prefix}${liraWords}${joinStr}${tlSuffix}`;
  }

  const liraWords = lira > 0 ? numberToWords(lira, opts) : 'Sıfır';
  const kurusWords = numberToWords(kurusPart, opts);
  return `${prefix}${liraWords}${joinStr}Lira${joinStr}${kurusWords}${joinStr}Kuruş`;
}

/**
 * ABACUS büyük tutar kısaltma motoru (ABACUS-SPEC §3.2).
 * Girdi kuruş bazlı tam sayıdır. 1.000 TL altı standart format'a düşer.
 * Yuvarlama sonucu >= 1000 olan durumlarda üst ölçeğe terfi mantığı barındırır.
 */
export function compact(kurus: number | null | undefined, opts?: CompactMoneyOptions): string {
  if (kurus === null || kurus === undefined || !Number.isFinite(kurus)) {
    return '—';
  }

  if (kurus === 0) {
    return '0';
  }

  const style = opts?.style ?? 'K/M';
  const form = opts?.form ?? 'symbol';

  const isNegative = kurus < 0;
  const absKurus = abs(kurus);
  const tlValue = div(absKurus, 100);

  if (tlValue === null) return '—';

  // 1.000 TL altı kısaltmasız standart biçime düşer
  if (tlValue < 1000) {
    return format(kurus, { form, kurus: false });
  }

  let scaledVal = 0;
  let unit = '';

  if (tlValue >= 1000000000) {
    scaledVal = div(tlValue, 1000000000) ?? 0;
    unit = style === 'K/M' ? 'B' : 'Mr';
  } else if (tlValue >= 1000000) {
    scaledVal = div(tlValue, 1000000) ?? 0;
    unit = style === 'K/M' ? 'M' : 'Mn';
  } else {
    scaledVal = div(tlValue, 1000) ?? 0;
    unit = style === 'K/M' ? 'K' : 'B';
  }

  let roundedVal = round(scaledVal, 2);

  // Yuvarlama sonrası 1000 ve üzerine ulaşırsa üst ölçeğe terfi et
  if (roundedVal >= 1000) {
    if (unit === 'K' || unit === 'B') {
      const promoted = div(roundedVal, 1000);
      if (promoted !== null) {
        scaledVal = promoted;
        unit = style === 'K/M' ? 'M' : 'Mn';
        roundedVal = round(scaledVal, 2);
      }
    } else if (unit === 'M' || unit === 'Mn') {
      const promoted = div(roundedVal, 1000);
      if (promoted !== null) {
        scaledVal = promoted;
        unit = style === 'K/M' ? 'B' : 'Mr';
        roundedVal = round(scaledVal, 2);
      }
    }
  }

  const numStr = String(roundedVal).replace('.', ',');

  const scaledWithUnit = `${numStr}${unit}`;
  const resultWithForm = form === 'symbol' ? `₺${scaledWithUnit}` : `${scaledWithUnit} TL`;

  return isNegative ? `-${resultWithForm}` : resultWithForm;
}
