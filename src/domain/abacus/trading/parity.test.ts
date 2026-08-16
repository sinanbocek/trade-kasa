import { describe, expect, it } from 'vitest';
import { MARKETS } from '../../../config/markets';
import { computeTrade as legacyComputeTrade } from '../../../lib/calc';
import { DEFAULT_SETTINGS } from '../../../lib/storage';
import type { MarketConfig, Settings, TradeInput } from '../../../types';
import { computeTrade as abacusComputeTrade } from './engine';

describe('computeTrade Parite / Denklik Testleri (Eski calc.ts ↔ Yeni ABACUS engine.ts)', () => {
  const runParityCheck = (input: TradeInput, market: MarketConfig, s: Settings) => {
    const legacy = legacyComputeTrade(input, market, s);
    const abacus = abacusComputeTrade(input, market, s);

    // 1. Temel Parasal ve Adet Metrikleri (Birebir / float toleransı)
    expect(abacus.volumeNative).toBeCloseTo(legacy.volumeNative, 2);
    expect(abacus.capitalUsedNative).toBeCloseTo(legacy.capitalUsedNative, 2);
    expect(abacus.leverage).toBeCloseTo(legacy.leverage, 2);
    expect(abacus.leveraged).toBe(legacy.leveraged);
    expect(abacus.potentialLossNative).toBeCloseTo(legacy.potentialLossNative, 2);
    expect(abacus.potentialProfitNative).toBeCloseTo(legacy.potentialProfitNative, 2);

    // 2. Mantıksal Bayraklar ve Gün Metrikleri
    expect(abacus.stopValid).toBe(legacy.stopValid);
    expect(abacus.tpValid).toBe(legacy.tpValid);
    expect(abacus.insufficientBalance).toBe(legacy.insufficientBalance);
    expect(abacus.thresholdDays).toBe(legacy.thresholdDays > 0 ? legacy.thresholdDays : null);

    // 3. R:R Oranı
    if (legacy.rr === null) {
      expect(abacus.rr).toBeNull();
    } else {
      expect(abacus.rr!).toBeCloseTo(legacy.rr, 4);
    }

    // 4. Kur Bağımlı TRY Metrikleri (Kur var ise birebir eşleşme; Kur yoksa Bilinçli Null Propagasyonu)
    const hasRate = market.currency === 'TRY' || (s.usdTryKuru || 0) > 0;
    if (hasRate) {
      expect(abacus.volumeTRY!).toBeCloseTo(legacy.volumeTRY!, 2);
      expect(abacus.capitalUsedTRY!).toBeCloseTo(legacy.capitalUsedTRY!, 2);
      expect(abacus.potentialLossTRY!).toBeCloseTo(legacy.potentialLossTRY!, 2);
      expect(abacus.potentialProfitTRY!).toBeCloseTo(legacy.potentialProfitTRY!, 2);
    } else {
      // Bilinçli Fark: Eski kod kur yokken 0 dönerdi, ABACUS null döner
      expect(legacy.volumeTRY).toBe(0);
      expect(abacus.volumeTRY).toBeNull();
      expect(legacy.capitalUsedTRY).toBe(0);
      expect(abacus.capitalUsedTRY).toBeNull();
      expect(legacy.potentialLossTRY).toBe(0);
      expect(abacus.potentialLossTRY).toBeNull();
      expect(legacy.potentialProfitTRY).toBe(0);
      expect(abacus.potentialProfitTRY).toBeNull();
    }

    // 5. Portföy Yüzdeleri (Kasa > 0 ise birebir eşleşme; Kasa <= 0 ise Bilinçli Null Propagasyonu)
    const hasTotalKasa = (s.bistKasaTL || 0) + (s.viopKasaTL || 0) + ((s.abdKasaUSD || 0) + (s.kriptoKasaUSD || 0)) * (s.usdTryKuru || 0) > 0;
    if (hasRate && hasTotalKasa) {
      expect(abacus.exposurePctTotal!).toBeCloseTo(legacy.exposurePctTotal!, 2);
      expect(abacus.riskPctTotal!).toBeCloseTo(legacy.riskPctTotal!, 2);
    } else {
      expect(abacus.exposurePctTotal).toBeNull();
      expect(abacus.riskPctTotal).toBeNull();
    }

    const subKasa = s[market.kasaKey] || 0;
    if (subKasa > 0) {
      expect(abacus.exposurePctSub!).toBeCloseTo(legacy.exposurePctSub!, 2);
      expect(abacus.riskPctSub!).toBeCloseTo(legacy.riskPctSub!, 2);
    } else {
      expect(abacus.exposurePctSub).toBeNull();
      expect(abacus.riskPctSub).toBeNull();
    }

    return { legacy, abacus };
  };

  it('Senaryo 1: Long BİST (Normal)', () => {
    runParityCheck({ price: 145.5, stop: 140.0, tp: 160.0, qty: 100, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.bist, DEFAULT_SETTINGS);
  });

  it('Senaryo 2: Short VİOP (Kaldıraçlı / Kontrat Çarpanı 100)', () => {
    runParityCheck({ price: 10.5, stop: 11.2, tp: 9.0, qty: 5, multiplier: 100, marginPerUnit: 150, direction: 'short' }, MARKETS.viop, DEFAULT_SETTINGS);
  });

  it('Senaryo 3: Long ABD (USD, Kesirli Miktar)', () => {
    runParityCheck({ price: 220.75, stop: 210.0, tp: 250.0, qty: 2.5, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.abd, DEFAULT_SETTINGS);
  });

  it('Senaryo 4: Short Kripto (USD, Kaldıraçlı)', () => {
    runParityCheck({ price: 65000, stop: 68000, tp: 58000, qty: 0.1, multiplier: 1, marginPerUnit: 650, direction: 'short' }, MARKETS.kripto, DEFAULT_SETTINGS);
  });

  it('Senaryo 5: Long ABD Kur Yok (usdTryKuru = 0 / Bilinçli Null Farkı)', () => {
    runParityCheck({ price: 150, stop: 140, tp: 170, qty: 10, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.abd, { ...DEFAULT_SETTINGS, usdTryKuru: 0 });
  });

  it('Senaryo 6: Long BİST Geçersiz Stop (stop > price)', () => {
    runParityCheck({ price: 100, stop: 105, tp: 120, qty: 50, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.bist, DEFAULT_SETTINGS);
  });

  it('Senaryo 7: Long BİST Geçersiz TP (tp < price)', () => {
    runParityCheck({ price: 100, stop: 90, tp: 85, qty: 50, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.bist, DEFAULT_SETTINGS);
  });

  it('Senaryo 8: Long BİST Küçük Tutarlar (price = 1.25, qty = 3)', () => {
    runParityCheck({ price: 1.25, stop: 1.1, tp: 1.5, qty: 3, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.bist, DEFAULT_SETTINGS);
  });

  it('Senaryo 9: Long BİST Büyük Tutarlar (price = 450.00, qty = 10000)', () => {
    runParityCheck({ price: 450.0, stop: 420.0, tp: 520.0, qty: 10000, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.bist, DEFAULT_SETTINGS);
  });

  it('Senaryo 10: Long VİOP Yetersiz Bakiye (capitalUsed > subKasa)', () => {
    runParityCheck({ price: 20, stop: 18, tp: 25, qty: 100, multiplier: 100, marginPerUnit: 5000, direction: 'long' }, MARKETS.viop, DEFAULT_SETTINGS);
  });

  it('Senaryo 11: Short BİST (Short yönü dene)', () => {
    runParityCheck({ price: 50, stop: 55, tp: 40, qty: 10, multiplier: 1, marginPerUnit: 0, direction: 'short' }, MARKETS.bist, DEFAULT_SETTINGS);
  });

  it('Senaryo 12: Long BİST Kasa Bakiye 0 (bistKasaTL = 0)', () => {
    runParityCheck({ price: 100, stop: 90, tp: 120, qty: 10, multiplier: 1, marginPerUnit: 0, direction: 'long' }, MARKETS.bist, { ...DEFAULT_SETTINGS, bistKasaTL: 0 });
  });
});
