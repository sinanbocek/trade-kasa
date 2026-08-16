import { describe, expect, it } from 'vitest';
import { computeRiskReward, validateTradeDirections } from './engine';


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
});

