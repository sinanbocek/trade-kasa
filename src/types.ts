// ====================================================================
// TİPLER — Trade Kasa Yönetimi
// ====================================================================

export type MarketKey = 'bist' | 'viop' | 'abd' | 'kripto';
export type Direction = 'long' | 'short';
export type Currency = 'TRY' | 'USD';

/** Bir piyasanın davranış kuralları (para birimi, kaldıraç, kesirli miktar vb.) */
export interface MarketConfig {
  key: MarketKey;
  label: string;
  currency: Currency;
  /** true → kesirli miktar (ABD/Kripto), false → tam sayı min 1 (BİST/VİOP) */
  fractionalQty: boolean;
  /** Kaldıraç (teminat girişi) destekleniyor mu? BİST hariç true */
  allowLeverage: boolean;
  /** Short pozisyon açılabilir mi? BİST hariç true */
  allowShort: boolean;
  /** Varsayılan kontrat çarpanı (VİOP 100, diğerleri 1) */
  defaultMultiplier: number;
  /** Miktar alanı etiketi: 'Lot' | 'Kontrat' | 'Adet' */
  qtyLabel: string;
  /** Bu piyasanın alt kasa ayar anahtarı */
  kasaKey: 'bistKasaTL' | 'viopKasaTL' | 'abdKasaUSD' | 'kriptoKasaUSD';
  /** Fırsat maliyeti eşiğinde kullanılacak risksiz getiri ayar anahtarı */
  riskFreeKey: 'risksizGetiriTL' | 'risksizGetiriUSD';
}

/** Kullanıcı ayarları — localStorage'da saklanır */
export interface Settings {
  version: number;

  // Alt kasa bakiyeleri (kullanıcı girer, toplam sistemce hesaplanır)
  bistKasaTL: number;
  viopKasaTL: number;
  abdKasaUSD: number;
  kriptoKasaUSD: number;

  // Kur
  usdTryKuru: number;

  // Risk kuralları (tek işlem, toplam kasaya göre)
  maxRiskYuzdesi: number; // olası stop kaybının toplam kasaya max oranı, ör. 2
  maxPozisyonYuzdesi: number; // pozisyon hacminin toplam kasaya max oranı, ör. 25
  hedefRR: number; // hedeflenen risk:ödül, ör. 2.5

  // Referans risksiz getiri oranları (fırsat maliyeti eşik süresi için)
  risksizGetiriTL: number; // yıllık %, ör. 35
  risksizGetiriUSD: number; // yıllık %, ör. 3
}

/** Bir işlem hesabı için ham girdiler */
export interface TradeInput {
  price: number;
  stop: number;
  tp: number;
  qty: number;
  multiplier: number;
  /** Birim başına teminat (0 → spot, kaldıraç yok) */
  marginPerUnit: number;
  direction: Direction;
}

/** Hesap motorunun ürettiği türetilmiş metrikler */
export interface TradeResult {
  // Hacim
  volumeNative: number;
  volumeTRY: number | null;

  // Kullanılan sermaye (teminat varsa teminat, yoksa hacmin kendisi)
  capitalUsedNative: number;
  capitalUsedTRY: number | null;

  leverage: number;
  leveraged: boolean;

  // Risk / Ödül (native para biriminde)
  potentialLossNative: number;
  potentialProfitNative: number;
  potentialLossTRY: number | null;
  potentialProfitTRY: number | null;
  rr: number | null;

  // Oranlar (%)
  exposurePctTotal: number | null; // hacim / toplam kasa
  exposurePctSub: number | null; // hacim / alt kasa
  riskPctTotal: number | null; // olası kayıp / toplam kasa
  riskPctSub: number | null; // olası kayıp / alt kasa

  thresholdDays: number | null;

  // Geçerlilik bayrakları
  stopValid: boolean; // stop yönü doğru mu
  tpValid: boolean; // tp yönü doğru mu
  insufficientBalance: boolean; // kullanılan sermaye alt kasadan büyük mü
}

