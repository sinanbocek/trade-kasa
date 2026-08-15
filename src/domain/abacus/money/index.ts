import { abs, div, floor, mod, round } from '../math';
import { numberToWords } from '../text';

export interface FormatMoneyOptions {
  kurus?: boolean;
  form?: 'symbol' | 'text';
  negative?: 'minus' | 'paren';
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

  if (kurus === 0) {
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

  const resultWithForm = form === 'symbol' ? `₺${formattedNum}` : `${formattedNum} TL`;

  if (isNegative) {
    return negativeMode === 'paren' ? `(${resultWithForm})` : `-${resultWithForm}`;
  }

  return resultWithForm;
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
