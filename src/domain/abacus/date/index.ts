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
