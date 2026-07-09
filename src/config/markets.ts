import type { MarketConfig, MarketKey } from '../types';

export const MARKETS: Record<MarketKey, MarketConfig> = {
  bist: {
    key: 'bist',
    label: 'BİST',
    currency: 'TRY',
    fractionalQty: false,
    allowLeverage: false,
    allowShort: false,
    defaultMultiplier: 1,
    qtyLabel: 'Lot',
    kasaKey: 'bistKasaTL',
    riskFreeKey: 'risksizGetiriTL',
  },
  viop: {
    key: 'viop',
    label: 'VİOP',
    currency: 'TRY',
    fractionalQty: false,
    allowLeverage: true,
    allowShort: true,
    defaultMultiplier: 100,
    qtyLabel: 'Kontrat',
    kasaKey: 'viopKasaTL',
    riskFreeKey: 'risksizGetiriTL',
  },
  abd: {
    key: 'abd',
    label: 'ABD',
    currency: 'USD',
    fractionalQty: true,
    allowLeverage: true,
    allowShort: true,
    defaultMultiplier: 1,
    qtyLabel: 'Adet',
    kasaKey: 'abdKasaUSD',
    riskFreeKey: 'risksizGetiriUSD',
  },
  kripto: {
    key: 'kripto',
    label: 'Kripto',
    currency: 'USD',
    fractionalQty: true,
    allowLeverage: true,
    allowShort: true,
    defaultMultiplier: 1,
    qtyLabel: 'Adet',
    kasaKey: 'kriptoKasaUSD',
    riskFreeKey: 'risksizGetiriUSD',
  },
};

export const MARKET_ORDER: MarketKey[] = ['bist', 'viop', 'abd', 'kripto'];
