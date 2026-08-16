/**
 * ABACUS Trade Hesaplama Engine Motoru (ABACUS-SPEC §3.3 / §3.4).
 * İşlem yönü ve stop/TP fiyat seviyelerinin geçerliliğini denetler.
 */

export interface DirectionValidity {
  stopValid: boolean;
  tpValid: boolean;
}

/**
 * İşlem yönüne göre stop ve TP seviyelerinin matematiksel ve mantıksal geçerliliğini sınar.
 * Long işlemde: stop < price ve tp > price olmalıdır.
 * Short işlemde: stop > price ve tp < price olmalıdır.
 * Fiyat, stop veya TP <= 0 ise ilgili bayrak false döner (sessiz varsayılan yok).
 */
export function validateTradeDirections(
  priceMinor: number,
  stopMinor: number,
  tpMinor: number,
  isLong: boolean
): DirectionValidity {
  const stopValid =
    stopMinor > 0 &&
    priceMinor > 0 &&
    (isLong ? stopMinor < priceMinor : stopMinor > priceMinor);

  const tpValid =
    tpMinor > 0 &&
    priceMinor > 0 &&
    (isLong ? tpMinor > priceMinor : tpMinor < priceMinor);

  return {
    stopValid,
    tpValid,
  };
}
