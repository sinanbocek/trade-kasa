import { describe, expect, it } from 'vitest';
import type { MarketConfig, Settings, TradeInput } from '../../../types';
import { computePortfolioRatios, computeRiskReward, computeTrade, validateTradeDirections } from './engine';

const mockSettings: Settings = {
  version: 1,
  bistKasaTL: 500_000_000, // 5.000.000 TL
  viopKasaTL: 0,
  abdKasaUSD: 500_000_000, // 5.000.000 USD
  kriptoKasaUSD: 0,
  usdTryKuru: 34,
  maxRiskYuzdesi: 2,
  maxPozisyonYuzdesi: 25,
  hedefRR: 2.5,
  risksizGetiriTL: 35,
  risksizGetiriUSD: 5,
};

const bistMarket: MarketConfig = {
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
};

const abdMarket: MarketConfig = {
  key: 'abd',
  label: 'ABD',
  currency: 'USD',
  fractionalQty: true,
  allowLeverage: false,
  allowShort: true,
  defaultMultiplier: 1,
  qtyLabel: 'Adet',
  kasaKey: 'abdKasaUSD',
  riskFreeKey: 'risksizGetiriUSD',
};




describe('ABACUS trading/engine motoru (validateTradeDirections)', () => {
  it('Long yönlü geçerli işlemde stop < price ve tp > price için her ikisini de true döner', () => {
    const res = validateTradeDirections(10000, 9500, 11000, true);
    expect(res.stopValid).toBe(true);
    expect(res.tpValid).toBe(true);
  });

  it('Long yönlü işlemde stop fiyatın üstündeyse (stop >= price) stopValid false döner', () => {
    const res = validateTradeDirections(10000, 10500, 11000, true);
    expect(res.stopValid).toBe(false);
    expect(res.tpValid).toBe(true);
  });

  it('Long yönlü işlemde tp fiyatın altındaysa (tp <= price) tpValid false döner', () => {
    const res = validateTradeDirections(10000, 9500, 9500, true);
    expect(res.stopValid).toBe(true);
    expect(res.tpValid).toBe(false);
  });

  it('Short yönlü geçerli işlemde stop > price ve tp < price için her ikisini de true döner', () => {
    const res = validateTradeDirections(10000, 10500, 9000, false);
    expect(res.stopValid).toBe(true);
    expect(res.tpValid).toBe(true);
  });

  it('Short yönlü işlemde stop fiyatın altındaysa (stop <= price) stopValid false döner', () => {
    const res = validateTradeDirections(10000, 9500, 9000, false);
    expect(res.stopValid).toBe(false);
    expect(res.tpValid).toBe(true);
  });

  it('Fiyat <= 0 olduğunda her iki geçerlilik bayrağını da false döner', () => {
    const res = validateTradeDirections(0, 9500, 11000, true);
    expect(res.stopValid).toBe(false);
    expect(res.tpValid).toBe(false);
  });

  it('Stop seviyesi <= 0 olduğunda stopValid false döner', () => {
    const res = validateTradeDirections(10000, 0, 11000, true);
    expect(res.stopValid).toBe(false);
    expect(res.tpValid).toBe(true);
  });

  it('Fiyat ve stop eşit olduğunda (stop == price) stopValid false döner', () => {
    const res = validateTradeDirections(10000, 10000, 11000, true);
    expect(res.stopValid).toBe(false);
    expect(res.tpValid).toBe(true);
  });

  describe('computeRiskReward', () => {
    it('Long TL işleminde (rate=1) olası kayıp/kazanç native ve TRY değerlerini ve R:R 2 hesaplar', () => {
      // price=10000 (100 TL), stop=9500 (95 TL), tp=11000 (110 TL), qty=10, mult=1, rate=1
      // perUnitLoss = 500, perUnitProfit = 1000
      // lossNative = 500 * 10 * 1 = 5000 kuruş (50 TL)
      // profitNative = 1000 * 10 * 1 = 10000 kuruş (100 TL)
      // rr = 1000 / 500 = 2
      const res = computeRiskReward(10000, 9500, 11000, 10, 1, true, true, true, 1);
      expect(res.potentialLossNative).toBe(5000);
      expect(res.potentialProfitNative).toBe(10000);
      expect(res.potentialLossTRY).toBe(5000);
      expect(res.potentialProfitTRY).toBe(10000);
      expect(res.rr).toBe(2);
    });

    it('USD işleminde (rate=34) TRY karşılıklarını doğru hesaplar', () => {
      // lossNative = 5000 -> lossTRY = 5000 * 34 = 170.000 kuruş
      // profitNative = 10000 -> profitTRY = 10000 * 34 = 340.000 kuruş
      const res = computeRiskReward(10000, 9500, 11000, 10, 1, true, true, true, 34);
      expect(res.potentialLossNative).toBe(5000);
      expect(res.potentialProfitNative).toBe(10000);
      expect(res.potentialLossTRY).toBe(170_000);
      expect(res.potentialProfitTRY).toBe(340_000);
      expect(res.rr).toBe(2);
    });

    it('Kur tanımlı değilse (rate=null) TRY alanları null döner', () => {
      const res = computeRiskReward(10000, 9500, 11000, 10, 1, true, true, true, null);
      expect(res.potentialLossNative).toBe(5000);
      expect(res.potentialProfitNative).toBe(10000);
      expect(res.potentialLossTRY).toBeNull();
      expect(res.potentialProfitTRY).toBeNull();
      expect(res.rr).toBe(2);
    });

    it('stopValid=false durumunda lossNative=0 döner; rate=1 ise lossTRY=0, rate=null ise lossTRY=null döner', () => {
      const resValidRate = computeRiskReward(10000, 10500, 11000, 10, 1, true, false, true, 1);
      expect(resValidRate.potentialLossNative).toBe(0);
      expect(resValidRate.potentialLossTRY).toBe(0);

      const resNullRate = computeRiskReward(10000, 10500, 11000, 10, 1, true, false, true, null);
      expect(resNullRate.potentialLossNative).toBe(0);
      expect(resNullRate.potentialLossTRY).toBeNull();
    });

    it('Short işleminde (price=10000, stop=10500, tp=9000) olası kayıp/kazanç ve R:R 2 hesaplar', () => {
      // perUnitLoss = 10500 - 10000 = 500
      // perUnitProfit = 10000 - 9000 = 1000
      const res = computeRiskReward(10000, 10500, 9000, 10, 1, false, true, true, 1);
      expect(res.potentialLossNative).toBe(5000);
      expect(res.potentialProfitNative).toBe(10000);
      expect(res.rr).toBe(2);
    });

    it('tpValid=false durumunda profitNative=0 ve rr=null döner', () => {
      const res = computeRiskReward(10000, 9500, 9500, 10, 1, true, true, false, 1);
      expect(res.potentialProfitNative).toBe(0);
      expect(res.rr).toBeNull();
    });

    it('risk=0 durumunda rr=null döner', () => {
      const res = computeRiskReward(10000, 10000, 11000, 10, 1, true, false, true, 1);
      expect(res.rr).toBeNull();
    });
  });

  describe('computePortfolioRatios', () => {
    it('Standart senaryoda toplam kasa ve alt kasa risk/pozisyon yüzdelerini doğru hesaplar', () => {
      // volumeTRY = 1.000.000 (100M kuruş), volumeNative = 100M kuruş
      // potentialLossTRY = 50.000 (5M kuruş), potentialLossNative = 5M kuruş
      // totalKasaTRY = 10.000.000 (1.000M kuruş), subKasaNative = 5.000.000 (500M kuruş)
      // expTotal = 100M / 1000M * 100 = 10
      // expSub = 100M / 500M * 100 = 20
      // riskTotal = 5M / 1000M * 100 = 0.5
      // riskSub = 5M / 500M * 100 = 1
      const res = computePortfolioRatios(
        100_000_000,
        100_000_000,
        5_000_000,
        5_000_000,
        1_000_000_000,
        500_000_000
      );
      expect(res.exposurePctTotal).toBe(10);
      expect(res.exposurePctSub).toBe(20);
      expect(res.riskPctTotal).toBe(0.5);
      expect(res.riskPctSub).toBe(1);
    });

    it('totalKasaTRY=null olduğunda (kur yok) TRY oranları null, native oranlar hesaplanmış döner', () => {
      const res = computePortfolioRatios(
        null,
        100_000_000,
        null,
        5_000_000,
        null,
        500_000_000
      );
      expect(res.exposurePctTotal).toBeNull();
      expect(res.riskPctTotal).toBeNull();
      expect(res.exposurePctSub).toBe(20);
      expect(res.riskPctSub).toBe(1);
    });

    it('volumeTRY=null veya totalKasaTRY=0 ise exposurePctTotal null döner', () => {
      const res1 = computePortfolioRatios(null, 100_000_000, 5_000_000, 5_000_000, 1_000_000_000, 500_000_000);
      expect(res1.exposurePctTotal).toBeNull();

      const res2 = computePortfolioRatios(100_000_000, 100_000_000, 5_000_000, 5_000_000, 0, 500_000_000);
      expect(res2.exposurePctTotal).toBeNull();
      expect(res2.riskPctTotal).toBeNull();
    });

    it('subKasaNative=0 olduğunda (payda 0) alt kasa oranları null döner', () => {
      const res = computePortfolioRatios(100_000_000, 100_000_000, 5_000_000, 5_000_000, 1_000_000_000, 0);
      expect(res.exposurePctSub).toBeNull();
      expect(res.riskPctSub).toBeNull();
    });

    it('potentialLossNative=0 olduğunda riskPctSub=0 döner (0 risk geçerli sayıdır, null değildir)', () => {
      const res = computePortfolioRatios(100_000_000, 100_000_000, 0, 0, 1_000_000_000, 500_000_000);
      expect(res.riskPctSub).toBe(0);
      expect(res.riskPctTotal).toBe(0);
    });
  });

  describe('computeTrade (Ana Orkestratör)', () => {
    it('Standart Long TL işleminde tüm metrikleri float lira bazında eksiksiz hesaplar', () => {
      const input: TradeInput = {
        price: 100,
        stop: 95,
        tp: 110,
        qty: 10,
        multiplier: 1,
        marginPerUnit: 0,
        direction: 'long',
      };
      // mockSettings: bistKasaTL = 500.000.000 kuruş (5.000.000 TL), abdKasaUSD = 500.000.000 USD (17.000.000.000 kuruş)
      // subKasaNative = 5.000.000 TL -> exposurePctSub = 1.000 / 5.000.000 * 100 = 0.02 %
      // riskPctSub = 50 / 5.000.000 * 100 = 0.001 %
      const res = computeTrade(input, bistMarket, mockSettings);

      expect(res.volumeNative).toBe(1000);
      expect(res.volumeTRY).toBe(1000);
      expect(res.capitalUsedNative).toBe(1000);
      expect(res.capitalUsedTRY).toBe(1000);
      expect(res.leverage).toBe(1);
      expect(res.leveraged).toBe(false);
      expect(res.potentialLossNative).toBe(50);
      expect(res.potentialProfitNative).toBe(100);
      expect(res.potentialLossTRY).toBe(50);
      expect(res.potentialProfitTRY).toBe(100);
      expect(res.rr).toBe(2);
      expect(res.exposurePctSub).toBe(0.02);
      expect(res.riskPctSub).toBe(0.001);
      expect(res.thresholdDays).toBe(116);
      expect(res.stopValid).toBe(true);
      expect(res.tpValid).toBe(true);
      expect(res.insufficientBalance).toBe(false);
    });


    it('USD işleminde (rate=34) TRY metriklerini kur çevrimiyle hesaplar', () => {
      const input: TradeInput = {
        price: 100,
        stop: 95,
        tp: 110,
        qty: 10,
        multiplier: 1,
        marginPerUnit: 0,
        direction: 'long',
      };
      const res = computeTrade(input, abdMarket, mockSettings);

      expect(res.volumeNative).toBe(1000);
      expect(res.volumeTRY).toBe(34000);
      expect(res.capitalUsedNative).toBe(1000);
      expect(res.capitalUsedTRY).toBe(34000);
      expect(res.potentialLossNative).toBe(50);
      expect(res.potentialProfitNative).toBe(100);
      expect(res.potentialLossTRY).toBe(1700);
      expect(res.potentialProfitTRY).toBe(3400);
      expect(res.rr).toBe(2);
    });

    it('Kur geçersiz/0 olduğunda (usdTryKuru=0) TRY metrikleri null olarak döner ve null propagasyonu sağlanır', () => {
      const input: TradeInput = {
        price: 100,
        stop: 95,
        tp: 110,
        qty: 10,
        multiplier: 1,
        marginPerUnit: 0,
        direction: 'long',
      };
      const invalidSettings = { ...mockSettings, usdTryKuru: 0 };
      const res = computeTrade(input, abdMarket, invalidSettings);

      expect(res.volumeNative).toBe(1000);
      expect(res.volumeTRY).toBeNull();
      expect(res.capitalUsedTRY).toBeNull();
      expect(res.potentialLossTRY).toBeNull();
      expect(res.potentialProfitTRY).toBeNull();
      expect(res.exposurePctTotal).toBeNull();
      expect(res.riskPctTotal).toBeNull();
    });

  });
});



