import { describe, expect, it } from 'vitest';
import { validateTradeDirections } from './engine';

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
});
