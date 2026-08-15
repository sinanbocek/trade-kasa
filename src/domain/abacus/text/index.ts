import { div, floor, mod } from '../math';

export interface NumberToWordsOptions {
  spaced?: boolean;
}

const ONES = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
const TENS = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
const SCALES = ['', 'Bin', 'Milyon', 'Milyar', 'Trilyon'];

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
