import { div, floor, mod } from '../math';
import { format as formatMoney } from '../money';

export interface NumberToWordsOptions {
  spaced?: boolean;
}

export type SuffixKind = 'number' | 'money' | 'percent' | 'year';
export type SuffixCase = 'loc' | 'dat' | 'abl' | 'acc' | 'gen';
export type Iyelik = 'benim' | 'senin' | 'onun' | 'bizim' | 'sizin' | 'onların';

export interface SuffixOptions {
  hal?: SuffixCase;
  iyelik?: Iyelik;
}

export type SuffixArg = SuffixCase | SuffixOptions;

const ONES = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
const TENS = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
const SCALES = ['', 'Bin', 'Milyon', 'Milyar', 'Trilyon'];

const TR_VOWELS = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
const BACK_VOWELS = ['a', 'ı', 'o', 'u'];
const ROUNDED_VOWELS = ['o', 'ö', 'u', 'ü'];
const HARD_CONSONANTS = ['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p'];

const TR_UPPER_TO_LOWER_MAP: Record<string, string> = {
  'İ': 'i',
  'I': 'ı',
  'Ç': 'ç',
  'Ğ': 'ğ',
  'Ö': 'ö',
  'Ş': 'ş',
  'Ü': 'ü',
  'Â': 'â',
  'Î': 'î',
  'Û': 'û',
};

/**
 * Türkçe harf küçültme yardımcısı (Intl / ham toLowerCase kullanılmaz).
 * Harita öncelikli eşleme yapar; 'İ' -> 'i' ve 'I' -> 'ı' dönüşümlerinin ASCII dalına düşmesini engeller.
 */
export function toTrLower(str: string): string {
  if (!str) return '';
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (!ch) continue;

    const mapped = TR_UPPER_TO_LOWER_MAP[ch];
    if (mapped) {
      res += mapped;
    } else if (ch >= 'A' && ch <= 'Z') {
      res += String.fromCharCode(ch.charCodeAt(0) + 32);
    } else {
      res += ch;
    }
  }
  return res;
}

/**
 * Sayıyı Türkçe yazıya çeviren çekirdek fonksiyon (ABACUS-SPEC §3.5).
 * "Bir" düşme kuralını uygular: 100 -> "Yüz", 1000 -> "Bin", ancak 1.000.000 -> "BirMilyon".
 */
export function numberToWords(n: number, opts?: NumberToWordsOptions): string {
  const spaced = opts?.spaced ?? false;
  const joinStr = spaced ? ' ' : '';

  if (n === 0) return 'Sıfır';

  let remaining = n;
  const groups: { value: number; scaleIndex: number }[] = [];
  let scaleIndex = 0;

  while (remaining > 0) {
    const groupVal = mod(remaining, 1000) ?? 0;
    if (groupVal > 0) {
      groups.push({ value: groupVal, scaleIndex });
    }
    const nextRemaining = div(remaining, 1000);
    remaining = nextRemaining !== null ? floor(nextRemaining) : 0;
    scaleIndex++;
  }

  // Yüksek basamaktan düşüğe doğru işle
  const parts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    const val = g.value;
    const sIndex = g.scaleIndex;

    const hundreds = floor(div(val, 100) ?? 0);
    const rem100 = mod(val, 100) ?? 0;
    const tensVal = floor(div(rem100, 10) ?? 0);
    const onesVal = mod(rem100, 10) ?? 0;

    const tokens: string[] = [];

    // Yüzler basamağı ("BirYüz" yerine "Yüz")
    if (hundreds > 0) {
      if (hundreds === 1) {
        tokens.push('Yüz');
      } else {
        const onesWord = ONES[hundreds];
        if (onesWord) tokens.push(onesWord, 'Yüz');
      }
    }

    // Onlar basamağı
    if (tensVal > 0) {
      const tensWord = TENS[tensVal];
      if (tensWord) tokens.push(tensWord);
    }

    // Birler basamağı
    if (onesVal > 0) {
      const onesWord = ONES[onesVal];
      if (onesWord) tokens.push(onesWord);
    }

    let groupText = tokens.join(joinStr);

    // Binler basamağında "BirBin" yerine "Bin" düşürme kuralı
    if (sIndex === 1 && val === 1) {
      groupText = 'Bin';
    } else if (sIndex > 0) {
      const scaleName = SCALES[sIndex];
      if (scaleName) {
        groupText = groupText ? `${groupText}${joinStr}${scaleName}` : scaleName;
      }
    }

    if (groupText) {
      parts.push(groupText);
    }
  }

  return parts.join(joinStr);
}

/** Kelimedeki son ünlüyü döner (a/e/ı/i/o/ö/u/ü). Bulunamazsa null. */
export function lastVowel(word: string): string | null {
  if (!word) return null;
  const lower = toTrLower(word);
  for (let i = lower.length - 1; i >= 0; i--) {
    const char = lower[i];
    if (char && TR_VOWELS.includes(char)) {
      return char;
    }
  }
  return null;
}

/** Ünlünün kalın (a, ı, o, u) olup olmadığını kontrol eder. */
export function isBackVowel(vowel: string): boolean {
  if (!vowel) return false;
  const lower = toTrLower(vowel);
  return BACK_VOWELS.includes(lower);
}

/** Ünlünün yuvarlak (o, ö, u, ü) olup olmadığını kontrol eder. */
export function isRoundedVowel(vowel: string): boolean {
  if (!vowel) return false;
  const lower = toTrLower(vowel);
  return ROUNDED_VOWELS.includes(lower);
}

/** Dört yönlü küçük ünlü uyumu yardımcısı (a/ı -> ı, e/i -> i, o/u -> u, ö/ü -> ü) */
function getHarmonyVowel(lastV: string | null): 'ı' | 'i' | 'u' | 'ü' {
  if (!lastV) return 'ı';
  const back = isBackVowel(lastV);
  const rounded = isRoundedVowel(lastV);

  if (back && !rounded) return 'ı';
  if (!back && !rounded) return 'i';
  if (back && rounded) return 'u';
  return 'ü';
}

/** Kelimenin son harfinin sert ünsüz (f, s, t, k, ç, ş, h, p) olup olmadığını kontrol eder. */
export function endsWithHardConsonant(word: string): boolean {
  if (!word) return false;
  const lower = toTrLower(word);
  const lastChar = lower[lower.length - 1];
  return lastChar ? HARD_CONSONANTS.includes(lastChar) : false;
}

/** Kelimenin son harfinin ünlü (a/e/ı/i/o/ö/u/ü) olup olmadığını kontrol eder. */
export function endsWithVowel(word: string): boolean {
  if (!word) return false;
  const lower = toTrLower(word);
  const lastChar = lower[lower.length - 1];
  return lastChar ? TR_VOWELS.includes(lastChar) : false;
}

/**
 * ABACUS Türkçe ek çekim motoru (ABACUS-SPEC §3.5-a).
 * Ek, sayının veya para biriminin (lira) okunuşunun son sesine göre belirlenir.
 * İyelik ve hâl birleşiminde onun/onların kişileri için pronominal-n araya girer.
 * Kesme işareti (') daima eklenir.
 */
export function suffix(value: number, kind: SuffixKind, arg: SuffixArg): string {
  let formattedValue = '';
  let lastWord = '';

  if (kind === 'money') {
    formattedValue = formatMoney(value);
    lastWord = 'lira';
  } else {
    switch (kind) {
      case 'year':
      case 'number':
        formattedValue = `${value}`;
        break;
      case 'percent':
        formattedValue = `%${value}`;
        break;
    }
    const wordsText = numberToWords(value, { spaced: true });
    const words = wordsText.split(' ');
    lastWord = words[words.length - 1] ?? '';
  }

  const opts: SuffixOptions = typeof arg === 'string' ? { hal: arg } : arg;

  let posSuffix = '';
  if (opts.iyelik) {
    const lastV = lastVowel(lastWord);
    const hv = getHarmonyVowel(lastV);
    const back = isBackVowel(lastV ?? '');
    const vowelEnd = endsWithVowel(lastWord);

    switch (opts.iyelik) {
      case 'benim':
        posSuffix = vowelEnd ? 'm' : `${hv}m`;
        break;
      case 'senin':
        posSuffix = vowelEnd ? 'n' : `${hv}n`;
        break;
      case 'onun':
        posSuffix = vowelEnd ? `s${hv}` : hv;
        break;
      case 'bizim':
        posSuffix = vowelEnd ? `m${hv}z` : `${hv}m${hv}z`;
        break;
      case 'sizin':
        posSuffix = vowelEnd ? `n${hv}z` : `${hv}n${hv}z`;
        break;
      case 'onların':
        posSuffix = back ? 'ları' : 'leri';
        break;
    }
  }

  let caseSuffix = '';
  if (opts.hal) {
    if (opts.iyelik) {
      // Fonoloji iyeliğin son ünlüsüne göre çalışır.
      // Eğer posSuffix ünsüzden ibaretse (ör. ünlü bitişinde benim -> 'm', senin -> 'n'),
      // son ünlü kök kelimeden (lastWord) alınır.
      const posLastV = lastVowel(posSuffix) ?? lastVowel(lastWord);
      const posBack = isBackVowel(posLastV ?? '');
      const posHv = getHarmonyVowel(posLastV);
      const hasPronominalN = opts.iyelik === 'onun' || opts.iyelik === 'onların';
      const buffer = hasPronominalN ? 'n' : '';

      switch (opts.hal) {
        case 'loc':
          caseSuffix = `${buffer}${posBack ? 'da' : 'de'}`;
          break;
        case 'abl':
          caseSuffix = `${buffer}${posBack ? 'dan' : 'den'}`;
          break;
        case 'dat':
          caseSuffix = `${buffer}${posBack ? 'a' : 'e'}`;
          break;
        case 'acc':
          caseSuffix = `${buffer}${posHv}`;
          break;
        case 'gen':
          caseSuffix = `${buffer}${posHv}n`;
          break;
      }
    } else {
      // Yalnızca hal ekinde kök kelimeye göre çalışır
      const lastV = lastVowel(lastWord);
      const back = isBackVowel(lastV ?? '');
      const hard = endsWithHardConsonant(lastWord);
      const vowelEnd = endsWithVowel(lastWord);

      switch (opts.hal) {
        case 'loc':
          caseSuffix = hard ? (back ? 'ta' : 'te') : back ? 'da' : 'de';
          break;
        case 'abl':
          caseSuffix = hard ? (back ? 'tan' : 'ten') : back ? 'dan' : 'den';
          break;
        case 'dat':
          caseSuffix = vowelEnd ? (back ? 'ya' : 'ye') : back ? 'a' : 'e';
          break;
        case 'acc': {
          const hv = getHarmonyVowel(lastV);
          caseSuffix = vowelEnd ? `y${hv}` : hv;
          break;
        }
        case 'gen': {
          const hv = getHarmonyVowel(lastV);
          caseSuffix = vowelEnd ? `n${hv}n` : `${hv}n`;
          break;
        }
      }
    }
  }

  return `${formattedValue}'${posSuffix}${caseSuffix}`;
}
