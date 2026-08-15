import { abs, div, round, sub } from '../math';

export type DateFormatStyle = 'short' | 'long' | 'dayMonth' | 'monthYear' | 'period';

const MONTH_NAMES_FULL = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const MONTH_NAMES_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

const DAY_NAMES_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];

/** ISO tarih stringini güvenle UTC gün sayısına çeviren dahili yardımcı */
function parseUtcDays(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== 'string') return null;
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  if (!datePart) return null;

  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const utcMs = Date.UTC(y, m - 1, d);
  const daysDiv = div(utcMs, 86400000);
  return daysDiv !== null ? round(daysDiv, 0) : null;
}

/**
 * ABACUS tarih biçimlendirme motoru (ABACUS-SPEC §3.4).
 * ISO string girdi alır ("2026-08-15" veya "2026-08-15T21:30:00Z").
 * Intl / toLocale kullanılmadan string ayrıştırması ve sabit ay dizileri ile çalışır.
 */
export function format(iso: string | null | undefined, style: DateFormatStyle = 'short'): string {
  if (!iso || typeof iso !== 'string') {
    return '—';
  }

  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  if (!datePart) return '—';

  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return '—';
  }

  const yearStr = match[1];
  const monthStr = match[2];
  const dayStr = match[3];

  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return '—';
  }

  const fullMonth = MONTH_NAMES_FULL[month - 1];
  const shortMonth = MONTH_NAMES_SHORT[month - 1];

  if (!fullMonth || !shortMonth) {
    return '—';
  }

  switch (style) {
    case 'long':
      return `${day} ${fullMonth} ${yearStr}`;
    case 'dayMonth':
      return `${day} ${shortMonth}.`;
    case 'monthYear':
      return `${fullMonth} ${yearStr}`;
    case 'period':
      return `${monthStr}/${yearStr}`;
    case 'short':
    default:
      return `${dayStr}.${monthStr}.${yearStr}`;
  }
}

/** İki ISO tarihi arasındaki gün farkını hesaplar (isoB - isoA) */
export function daysBetween(isoA: string, isoB: string): number | null {
  const daysA = parseUtcDays(isoA);
  const daysB = parseUtcDays(isoB);
  if (daysA === null || daysB === null) return null;
  return sub(daysB, daysA);
}

/** Bugünden hedefe gün farkını hesaplar (iso - today) */
export function daysUntil(iso: string, today: string): number | null {
  return daysBetween(today, iso);
}

/** Bugüne göre Türkçe bağıl zaman ifadesi döner (bugün / dün / yarın / N gün önce/sonra) */
export function relative(iso: string, today: string): string {
  const diff = daysUntil(iso, today);
  if (diff === null) return '—';

  if (diff === 0) return 'bugün';
  if (diff === -1) return 'dün';
  if (diff === 1) return 'yarın';

  if (diff < 0) {
    const absDiff = abs(diff);
    return `${absDiff} gün önce`;
  }

  return `${diff} gün sonra`;
}

/** Tarihin Türkçe kısa gün adını döner (Pzt / Sal / Çar / Per / Cum / Cts / Paz) */
export function dayName(iso: string): string {
  if (!iso || typeof iso !== 'string') return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  if (!datePart) return '—';

  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return '—';

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (m < 1 || m > 12 || d < 1 || d > 31) return '—';

  const dayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return DAY_NAMES_SHORT[dayIndex] ?? '—';
}
