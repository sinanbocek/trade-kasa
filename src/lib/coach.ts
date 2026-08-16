// ====================================================================
// KOÇ / YORUM MOTORU
// --------------------------------------------------------------------
// Kullanıcının girdiği işlem verilerini yorumlayıp eğitici, destekleyici
// dilde geri bildirim üreten kural tabanlı bir motor. Piyasalar arası
// ortak kurallar ile kaldıraç/short/piyasaya özgü kurallar ayrı ayrı
// tanımlanır. Saf fonksiyon — React/store bağımlılığı yoktur.
// ====================================================================
import type { MarketConfig, Settings, TradeInput, TradeResult } from '../types';
import { math, money } from '../domain/abacus';

const fmtDecimal = (v: number, d = 1) => String(math.round(v, d)).replace('.', ',');
const fmtCurrency = (v: number, currency: 'TRY' | 'USD' = 'TRY', digits = 2) =>
  money.format(math.round(math.mul(v, 100)), { currency, kurus: digits > 0 });


export type InsightLevel = 'critical' | 'warning' | 'good' | 'info';

export interface Insight {
  id: string;
  level: InsightLevel;
  title: string;
  message: string;
}

export const LEVEL_RANK: Record<InsightLevel, number> = { critical: 0, warning: 1, good: 2, info: 3 };

/**
 * Verilen işlem girdisi + hesap sonucunu yorumlayıp uygulanabilir tüm
 * içgörüleri (insight) üretir. Şiddete göre sıralı döner (kritik → bilgi).
 * Herhangi bir TradeResult alanı null ise o alana dayalı içgörüler atlanır.
 */
export function buildInsights(input: TradeInput, r: TradeResult, market: MarketConfig, settings: Settings): Insight[] {
  const insights: Insight[] = [];
  const push = (id: string, level: InsightLevel, title: string, message: string) => {
    insights.push({ id, level, title, message });
  };

  const price = input.price || 0;
  const stop = input.stop || 0;
  const tp = input.tp || 0;
  const qty = input.qty || 0;
  const isLong = input.direction === 'long';
  const isShort = input.direction === 'short';
  const stopEntered = stop > 0;
  const tpEntered = tp > 0;
  const cur = market.currency;
  const moneyDigits = market.fractionalQty ? 2 : 0;
  const money = (v: number) => fmtCurrency(v, cur, moneyDigits);

  // ------------------------------------------------------------------
  // I. TEMEL GİRDİ DURUMU (1–2: fiyat/miktar olmadan hiçbir şey hesaplanamaz)
  // ------------------------------------------------------------------
  if (price <= 0) {
    push(
      'no-price',
      'info',
      'Başlamak için fiyat gir',
      'Bir değerlendirme görebilmen için önce planladığın alım/satış fiyatını girmen gerekiyor.',
    );
    return insights;
  }

  if (qty <= 0) {
    push(
      'no-qty',
      'info',
      'Miktar veya hacim gir',
      'Fiyatı girdin; şimdi hedeflediğin miktarı ya da hacmi/tutarı gir ki pozisyon büyüklüğünü ve riskini birlikte hesaplayabilelim.',
    );
    return insights;
  }

  // (3) Stop eksik
  if (!stopEntered) {
    push(
      'no-stop',
      'warning',
      'Stop seviyesi eksik',
      'Şu an stop girmeden bir pozisyon büyüklüğü planlıyorsun. Fiyat aleyhine döndüğünde ne kadar kaybedeceğini bilmeden işleme girmek riskli olabilir — devam etmeden önce bir stop seviyesi belirlemeyi düşünebilirsin.',
    );
  } else if (!r.stopValid) {
    // (4) Stop yönü hatalı
    push(
      'stop-wrong-direction',
      'critical',
      'Stop yönü hatalı',
      isLong
        ? 'Long pozisyonda stop seviyesi, giriş fiyatının altında olmalı. Şu anki girişle sistem riskini hesaplayamıyor; bu haliyle stop bir işe yaramaz.'
        : 'Short pozisyonda stop seviyesi, giriş fiyatının üzerinde olmalı. Şu anki girişle sistem riskini hesaplayamıyor; bu haliyle stop bir işe yaramaz.',
    );
  }

  // (5) TP eksik
  if (!tpEntered) {
    push(
      'no-tp',
      'info',
      'Hedef fiyat (TP) girilmedi',
      'TP girmezsen risk/ödül oranını göremeyiz. Zorunlu değil ama bir çıkış hedefin olması işlem disiplinini artırır — istersen ekleyebilirsin.',
    );
  } else if (!r.tpValid) {
    // (6) TP yönü hatalı
    push(
      'tp-wrong-direction',
      'warning',
      'Hedef fiyat yönü hatalı',
      isLong
        ? 'Long pozisyonda hedef fiyat, giriş fiyatının üzerinde olmalı; aksi halde girdiğin değer bir kâr hedefi değil, zarar seviyesi olarak okunur.'
        : 'Short pozisyonda hedef fiyat, giriş fiyatının altında olmalı; aksi halde girdiğin değer bir kâr hedefi değil, zarar seviyesi olarak okunur.',
    );
  }

  // ------------------------------------------------------------------
  // II. HACİM / TOPLAM KASA (7–9)
  // ------------------------------------------------------------------
  if (r.exposurePctTotal !== null) {
    const exposureRatioTotal = settings.maxPozisyonYuzdesi > 0 ? r.exposurePctTotal / settings.maxPozisyonYuzdesi : 0;
    if (exposureRatioTotal > 1) {
      push(
        'exposure-total-exceeded',
        'critical',
        'Pozisyon, toplam kasa limitini aşıyor',
        `Bu işlemin hacmi ${money(r.volumeNative)} — toplam kasanın %${fmtDecimal(r.exposurePctTotal, 1)}'i. Belirlediğin max pozisyon limiti %${fmtDecimal(settings.maxPozisyonYuzdesi, 0)} olduğundan bu, limitin üzerinde. Tek bir işleme bu kadar büyük bir pay ayırmak çeşitlendirmeni azaltıyor; miktarı düşürmeyi düşünebilirsin.`,
      );
    } else if (exposureRatioTotal > 0.7) {
      push(
        'exposure-total-near-limit',
        'warning',
        'Pozisyon limite yaklaşıyor',
        `Hacim ${money(r.volumeNative)} — toplam kasanın %${fmtDecimal(r.exposurePctTotal, 1)}'i, belirlediğin %${fmtDecimal(settings.maxPozisyonYuzdesi, 0)} limitin yaklaşık %${fmtDecimal(exposureRatioTotal * 100, 0)}'ine ulaşmış durumda. Başka bir fırsat çıkarsa manevra alanının daralabileceğini unutma.`,
      );
    } else {
      push(
        'exposure-total-safe',
        'good',
        'Pozisyon büyüklüğü kontrollü',
        `Hacim ${money(r.volumeNative)} — toplam kasanın yalnızca %${fmtDecimal(r.exposurePctTotal, 1)}'i, belirlediğin %${fmtDecimal(settings.maxPozisyonYuzdesi, 0)} limitin oldukça altında. Portföyünün büyük kısmı diğer fırsatlar için serbest kalıyor.`,
      );
    }
  }

  // ------------------------------------------------------------------
  // III. HACİM / ALT KASA — yoğunlaşma (10–11)
  // ------------------------------------------------------------------
  if (r.exposurePctSub !== null) {
    const exposureRatioSub = settings.maxPozisyonYuzdesi > 0 ? r.exposurePctSub / settings.maxPozisyonYuzdesi : 0;
    const exposureRatioTotal = r.exposurePctTotal !== null && settings.maxPozisyonYuzdesi > 0 ? r.exposurePctTotal / settings.maxPozisyonYuzdesi : 0;
    if (exposureRatioSub > 1 && exposureRatioTotal <= 1) {
      push(
        'exposure-sub-concentration',
        'warning',
        `${market.label} kasasında yoğunlaşma`,
        `Toplam kasana göre pozisyon büyüklüğün limit içinde kalsa da, bu işlem (${money(r.volumeNative)}) ${market.label} alt kasanın (${money(settings[market.kasaKey] || 0)}) %${fmtDecimal(r.exposurePctSub, 1)}'ini kullanıyor. O piyasadaki bakiyenin büyük kısmını tek işleme bağlamış oluyorsun; isteğe bağlı olarak diğer alt kasalarla dengelemeyi değerlendirebilirsin.`,
      );
    }
  }

  // ------------------------------------------------------------------
  // IV. RİSK (stop geçerliyse) (12–16)
  // ------------------------------------------------------------------
  if (stopEntered && r.stopValid) {
    if (r.riskPctTotal !== null) {
      const riskRatioTotal = settings.maxRiskYuzdesi > 0 ? r.riskPctTotal / settings.maxRiskYuzdesi : 0;
      if (riskRatioTotal > 1.5) {
        push(
          'risk-total-far-exceeded',
          'critical',
          'Risk, limitin çok üzerinde',
          `Stop çalışırsa kaybın ${money(r.potentialLossNative)} olur — toplam kasanın %${fmtDecimal(r.riskPctTotal, 2)}'i. Bu, %${fmtDecimal(settings.maxRiskYuzdesi, 0)} olan max risk limitinin oldukça üzerinde. Bu haliyle işlem tek başına önemli bir hasar verebilir; stop seviyesini fiyata yakınlaştırmayı ya da miktarı belirgin şekilde azaltmayı düşünebilirsin.`,
        );
      } else if (riskRatioTotal > 1) {
        push(
          'risk-total-exceeded',
          'critical',
          'Risk, toplam kasa limitini aşıyor',
          `${market.label} için stop çalışırsa olası kaybın ${money(r.potentialLossNative)} olur — toplam kasanın %${fmtDecimal(r.riskPctTotal, 2)}'i; bu, belirlediğin %${fmtDecimal(settings.maxRiskYuzdesi, 0)} limitinin üzerinde. Stop seviyesini fiyata biraz daha yaklaştırmayı ya da pozisyon miktarını azaltmayı düşünebilirsin.`,
        );
      } else if (riskRatioTotal > 0.7) {
        push(
          'risk-total-near-limit',
          'warning',
          'Risk limite yaklaşıyor',
          `Olası kayıp ${money(r.potentialLossNative)} — toplam kasanın %${fmtDecimal(r.riskPctTotal, 2)}'i, belirlediğin %${fmtDecimal(settings.maxRiskYuzdesi, 0)} limitin yaklaşık %${fmtDecimal(riskRatioTotal * 100, 0)}'ine ulaşmış. Piyasa koşulları belirsizse stopunu biraz daha sıkı tutmayı değerlendirebilirsin.`,
        );
      } else {
        push(
          'risk-total-safe',
          'good',
          'Risk seviyesi kontrol altında',
          `Olası kayıp ${money(r.potentialLossNative)} — toplam kasanın yalnızca %${fmtDecimal(r.riskPctTotal, 2)}'i, belirlediğin %${fmtDecimal(settings.maxRiskYuzdesi, 0)} limitin oldukça altında. Bu, disiplinli bir risk boyutlandırması.`,
        );
      }
    }

    if (r.riskPctSub !== null) {
      const riskRatioTotal = r.riskPctTotal !== null && settings.maxRiskYuzdesi > 0 ? r.riskPctTotal / settings.maxRiskYuzdesi : 0;
      const riskRatioSub = settings.maxRiskYuzdesi > 0 ? r.riskPctSub / settings.maxRiskYuzdesi : 0;

      // Alt kasa risk yoğunlaşması
      if (riskRatioSub > 1 && riskRatioTotal <= 1) {
        push(
          'risk-sub-concentration',
          'warning',
          `Risk, ${market.label} kasasında yoğunlaşıyor`,
          `Toplam kasaya göre risk kontrol altında görünse de, olası kayıp (${money(r.potentialLossNative)}) ${market.label} alt kasanın (${money(settings[market.kasaKey] || 0)}) %${fmtDecimal(r.riskPctSub, 2)}'i — bu piyasaya ayırdığın bakiyenin önemli bir kısmı tek işlemde risk altında. Bu genelde alt kasa büyüklüğünün göreli küçük olmasından kaynaklanır.`,
        );
      } else if (r.riskPctTotal !== null && riskRatioSub < 0.15 && riskRatioTotal < 0.15) {
        push(
          'risk-very-conservative',
          'info',
          'Oldukça muhafazakâr bir risk seviyesi',
          `Hem toplam hem ${market.label} kasana göre risk çok düşük: olası kayıp ${money(r.potentialLossNative)}, toplamın yalnızca %${fmtDecimal(r.riskPctTotal, 2)}'i. Bu güvenli bir yaklaşım; istersen sermayeni biraz daha verimli kullanmak için pozisyonu limitler dahilinde büyütmeyi değerlendirebilirsin.`,
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // V. RİSK / ÖDÜL (R:R) (17–20)
  // ------------------------------------------------------------------
  if (r.rr !== null && settings.hedefRR > 0) {
    const rrRatio = r.rr / settings.hedefRR;
    if (rrRatio < 0.6) {
      push(
        'rr-far-below-target',
        'critical',
        'Risk/Ödül hedefin belirgin altında',
        `Bu kurulumda 1 birim riske karşılık yalnızca ${fmtDecimal(r.rr)} birim kazanç hedefliyorsun; belirlediğin hedef 1:${fmtDecimal(settings.hedefRR)}. Riske girdiğin tutara kıyasla beklenen getiri düşük kalıyor — hedef fiyatı (TP) yükseltmeyi ya da stopu sıkılaştırıp daha uygun bir miktarla girmeyi düşünebilirsin.`,
      );
    } else if (rrRatio < 1) {
      push(
        'rr-below-target',
        'warning',
        'Risk/Ödül hedefin biraz altında',
        `Gerçekleşen R:R (1:${fmtDecimal(r.rr)}), hedeflediğin 1:${fmtDecimal(settings.hedefRR)} değerinin biraz altında. Hedef fiyatı gözden geçirmek ya da stopu biraz daha yakınlaştırmak oranı iyileştirebilir.`,
      );
    } else if (rrRatio > 3) {
      push(
        'rr-unusually-high',
        'info',
        'Risk/Ödül oranı olağan dışı yüksek',
        `1:${fmtDecimal(r.rr)} gibi çok yüksek bir R:R bazen hedef fiyatın piyasa gerçekliğine göre fazla iddialı (uzak) seçildiğini gösterebilir. Hedefinin makul bir sürede ulaşılabilir olduğundan emin olmak faydalı olur.`,
      );
    } else {
      push(
        'rr-at-or-above-target',
        'good',
        'Risk/Ödül hedefe ulaşıyor',
        `Gerçekleşen R:R (1:${fmtDecimal(r.rr)}), hedeflediğin 1:${fmtDecimal(settings.hedefRR)} değerine ulaşıyor ya da üzerinde. Bu, riske göre dengeli bir kurulum.`,
      );
    }
  }

  // ------------------------------------------------------------------
  // VI. FIRSAT MALİYETİ — RİSKSİZ GETİRİ EŞİK SÜRESİ (21–22)
  // ------------------------------------------------------------------
  if (r.thresholdDays !== null && r.thresholdDays > 0) {
    if (r.thresholdDays <= 21) {
      push(
        'threshold-short',
        'good',
        'Potansiyel getiri fırsat maliyetine göre cazip',
        `Hedeflediğin ${money(r.potentialProfitNative)} kâra, parayı risksiz getiride (%${fmtDecimal(settings[market.riskFreeKey], 0)}) değerlendirseydin ${r.thresholdDays} günde ulaşırdın. Bu kısa süre, işlemin potansiyel getirisinin risksiz alternatife göre cazip olduğuna işaret ediyor.`,
      );
    } else if (r.thresholdDays > 540) {
      push(
        'threshold-long',
        'warning',
        'Risksiz alternatif de benzer sürede getiriyi verebilir',
        `Hedeflediğin ${money(r.potentialProfitNative)} kâra risksiz getiriyle (%${fmtDecimal(settings[market.riskFreeKey], 0)}) ulaşman ${r.thresholdDays} gün (yaklaşık ${fmtDecimal(r.thresholdDays / 365, 1)} yıl) sürerdi — oldukça uzun bir süre. Bu, riske girmenin fırsat maliyetinin düşük olmayabileceğini gösterir; hedef fiyatını ya da pozisyon boyutunu gözden geçirmek isteyebilirsin.`,
      );
    }
  }

  // ------------------------------------------------------------------
  // VII. KALDIRAÇ (24–30)
  // ------------------------------------------------------------------
  if (market.allowLeverage) {
    if (!r.leveraged) {
      push(
        'leverage-none',
        'info',
        'Kaldıraçsız (spot) işlem',
        'Teminat girmediğin için bu işlem kaldıraçsız değerlendiriliyor. Riskin, yatırdığın sermaye ile sınırlı kalır; likidasyon riski taşımazsın.',
      );
    } else {
      if (r.leverage > 10) {
        push(
          'leverage-very-high',
          'critical',
          'Çok yüksek kaldıraç',
          `${fmtDecimal(r.leverage)}x kaldıraç kullanıyorsun — ${money(r.capitalUsedNative)} teminatla ${money(r.volumeNative)} büyüklüğünde pozisyon taşıyorsun. Bu seviyede, fiyatta küçük bir ters hareket bile teminatının önemli bir kısmını (hatta tamamını) hızla eritebilir. Kaldıracı azaltmayı ya da pozisyonu küçültmeyi düşünebilirsin.`,
        );
      } else if (r.leverage > 5) {
        push(
          'leverage-high',
          'warning',
          'Yüksek kaldıraç',
          `${fmtDecimal(r.leverage)}x kaldıraç ile ${money(r.capitalUsedNative)} teminatla ${money(r.volumeNative)} büyüklüğünde pozisyon taşıyorsun; kâr ve zararın aynı oranda büyüyor. Ters bir harekette teminat tamamlama ya da likidasyon riskiyle daha hızlı karşılaşabilirsin; stopunu bu riske göre sıkı tutmayı düşünebilirsin.`,
        );
      } else if (r.leverage > 2) {
        push(
          'leverage-medium',
          'warning',
          'Orta düzey kaldıraç',
          `${fmtDecimal(r.leverage)}x kaldıraç ile ${money(r.capitalUsedNative)} teminatla ${money(r.volumeNative)} büyüklüğünde pozisyon taşıyorsun. Fiyat aleyhine döndüğünde kayıpların, kaldıraçsız bir işleme göre daha hızlı büyüyeceğini unutma.`,
        );
      } else {
        push(
          'leverage-low',
          'info',
          'Düşük düzey kaldıraç',
          `${fmtDecimal(r.leverage)}x gibi görece düşük bir kaldıraç kullanıyorsun (${money(r.capitalUsedNative)} teminatla ${money(r.volumeNative)} pozisyon); bu, kaldıraçsız işleme yakın bir risk profiline karşılık gelir.`,
        );
      }

      if (!stopEntered || !r.stopValid) {
        push(
          'leverage-no-stop',
          'critical',
          'Kaldıraçlı işlemde stop yok',
          'Kaldıraçlı pozisyonlarda geçerli bir stop olmadan işlem açmak, ters bir harekette teminatının tamamına yakınını kaybetme riskini beraberinde getirir. Bir stop seviyesi belirlemeden bu pozisyonu açmamayı düşünebilirsin.',
        );
      } else if (r.riskPctTotal !== null && settings.maxRiskYuzdesi > 0 && r.riskPctTotal / settings.maxRiskYuzdesi <= 0.5) {
        push(
          'leverage-controlled-risk',
          'good',
          'Kaldıraç kontrollü kullanılıyor',
          `Kaldıraç kullanıyor olsan da olası kayıp toplam kasanın yalnızca %${fmtDecimal(r.riskPctTotal, 2)}'i — teminatını disiplinli bir şekilde yönetiyorsun.`,
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // VIII. SHORT POZİSYON (31–32)
  // ------------------------------------------------------------------
  if (market.allowShort && isShort) {
    if (!stopEntered || !r.stopValid) {
      push(
        'short-no-stop',
        'critical',
        'Short pozisyonda stop yok',
        'Short pozisyonlarda fiyat teorik olarak sınırsız yükselebileceğinden olası kayıp da sınırsız büyüyebilir. Stop seviyesi belirlemek, long pozisyonlardan daha da önemli hale gelir.',
      );
    }
    if (r.leveraged) {
      push(
        'short-with-leverage',
        'critical',
        'Short + kaldıraç bir arada',
        'Açığa satışı kaldıraçla birlikte kullanmak, riskini iki yönden büyütür: hem short pozisyonun teorik sınırsız kayıp potansiyeli hem de kaldıracın etkisi. Pozisyon boyutunu ve stop mesafeni buna göre gözden geçirmeyi düşünebilirsin.',
      );
    } else {
      push(
        'short-basic-info',
        'info',
        'Short pozisyon notu',
        'Açığa satış pozisyonlarında bazı piyasalarda ödünç/finansman maliyeti oluşabilir ve pozisyonu ne kadar uzun tutarsan bu maliyet o kadar birikir; bunu planlamana dahil etmeyi unutma.',
      );
    }
  }

  // ------------------------------------------------------------------
  // IX. BAKİYE YETERLİLİĞİ (33–34)
  // ------------------------------------------------------------------
  const subKasaNative = settings[market.kasaKey] || 0;
  if (r.insufficientBalance) {
    push(
      'balance-insufficient',
      'critical',
      `${market.label} kasa bakiyesi yetersiz`,
      `Bu pozisyon için gereken tutar ${money(r.capitalUsedNative)}, ${market.label} kasandaki ${money(subKasaNative)} bakiyeden fazla. Miktarı azaltmadan bu pozisyonu gerçekte açamazsın.`,
    );
  } else if (subKasaNative > 0 && r.capitalUsedNative / subKasaNative > 0.9) {
    push(
      'balance-tight',
      'warning',
      `${market.label} kasası bu işlemden sonra çok daralıyor`,
      `Bu pozisyon ${money(r.capitalUsedNative)} kullanıyor — ${market.label} kasandaki ${money(subKasaNative)} bakiyenin %${fmtDecimal((r.capitalUsedNative / subKasaNative) * 100, 0)}'i. İşlem sonrası bu piyasada yeni bir fırsat çıkarsa değerlendirecek alanın çok az kalır.`,
    );
  }

  // ------------------------------------------------------------------
  // X. STOP MESAFESİ (genel, tüm piyasalar) (35–36)
  // ------------------------------------------------------------------
  if (stopEntered && r.stopValid && price > 0) {
    const stopDistPct = (Math.abs(price - stop) / price) * 100;
    const stopDistAbs = Math.abs(price - stop);
    if (stopDistPct < 0.5) {
      push(
        'stop-too-tight',
        'warning',
        'Stop fiyata çok yakın',
        `Stop, giriş fiyatına sadece ${fmtCurrency(stopDistAbs, cur, moneyDigits + 1)} (%${fmtDecimal(stopDistPct, 2)}) mesafede. Bu kadar dar bir stop, normal piyasa dalgalanmasıyla (gürültüyle) bile tetiklenebilir ve seni erken pozisyondan çıkarabilir.`,
      );
    } else if (stopDistPct > 20) {
      push(
        'stop-too-wide',
        'info',
        'Stop mesafesi oldukça geniş',
        `Stop, giriş fiyatından ${fmtCurrency(stopDistAbs, cur, moneyDigits)} (%${fmtDecimal(stopDistPct, 1)}) uzakta. Geniş bir stop mesafesi genelde daha küçük bir miktarla dengelenmeli; aksi halde aynı miktarda olası kaybın (${money(r.potentialLossNative)}) da büyüdüğünü unutma.`,
      );
    }
  }

  // ------------------------------------------------------------------
  // XI. PİYASAYA ÖZGÜ NOTLAR (37–46)
  // ------------------------------------------------------------------
  if (market.key === 'bist') {
    push(
      'bist-no-leverage-info',
      'info',
      'BİST notu',
      'BİST\'te kaldıraç ve açığa satış imkanı sunulmadığından riskin sınırı, bu işleme ayırdığın sermaye ile sınırlıdır — likidasyon riski taşımazsın.',
    );
  }

  if (market.key === 'viop') {
    if (input.multiplier !== market.defaultMultiplier) {
      push(
        'viop-multiplier-changed',
        'info',
        'Kontrat çarpanı değiştirildi',
        `Kontrat çarpanını varsayılan olan ${market.defaultMultiplier} yerine ${fmtDecimal(input.multiplier, 0)} olarak girdin. Hacim ve risk hesaplamalarının buna göre değiştiğinden emin ol.`,
      );
    }
    if (r.leveraged) {
      push(
        'viop-margin-call-warning',
        'warning',
        'Teminat tamamlama riski',
        'VİOP\'ta piyasa aleyhine hareket ederse teminat tamamlama çağrısı alabilirsin. Bu pozisyonu açmadan önce nakit rezervinin bu ihtimali karşılayıp karşılamadığını gözden geçir.',
      );
    }
  }

  if (market.key === 'abd') {
    if (market.fractionalQty && qty > 0 && qty < 1) {
      push(
        'abd-small-qty-commission',
        'info',
        'Çok küçük miktarlı işlem',
        'Kesirli (1 adetin altında) bir miktar girdin. Çok küçük işlemlerde komisyon/spread maliyeti, elde edeceğin getiriye oranla daha büyük bir pay tutabilir; bunu hesaba katmak isteyebilirsin.',
      );
    }
    push(
      'abd-overnight-gap',
      'info',
      'Gece/hafta sonu haber riski',
      'ABD piyasaları kapalıyken açıklanan haberler (kazanç raporları vb.) fiyatta ani sıçramalara (gap) yol açabilir; bu durumda stop seviyeni atlayarak planladığından daha büyük bir kayıpla karşılaşabilirsin.',
    );
  }

  if (market.key === 'kripto') {
    push(
      'kripto-24-7',
      'info',
      'Kripto 24/7 işlem görür',
      'Kripto piyasaları hafta sonu dahil kesintisiz açık olduğundan, sen uzaktayken de stop seviyen tetiklenebilir. Pozisyon boyutunu buna göre planlaman faydalı olur.',
    );
    if (stopEntered && r.stopValid && price > 0) {
      const stopDistPct = (Math.abs(price - stop) / price) * 100;
      if (stopDistPct < 1.5) {
        push(
          'kripto-tight-stop',
          'warning',
          'Kripto\'da stop dar olabilir',
          `Stop, girişten ${fmtCurrency(Math.abs(price - stop), cur, moneyDigits)} (%${fmtDecimal(stopDistPct, 2)}) mesafede. Kripto varlıklar kısa vadede bundan daha fazla oynayabildiğinden, bu stop normal dalgalanmayla bile tetiklenebilir.`,
        );
      }
    }
    if (r.leveraged) {
      push(
        'kripto-leverage-extra-danger',
        'critical',
        'Kripto + kaldıraç: ekstra dikkat',
        'Kripto piyasalarındaki yüksek volatilite, kaldıraçlı pozisyonlarda likidasyon riskini diğer piyasalara göre daha belirgin hale getirir. Kaldıracı ve pozisyon boyutunu buna göre temkinli seçmeyi düşünebilirsin.',
      );
    }
  }

  // ------------------------------------------------------------------
  // XII. BİLEŞİK (BİRDEN FAZLA SİNYAL BİR ARADA) (47–50)
  // ------------------------------------------------------------------
  if (stopEntered && r.stopValid && r.rr !== null && settings.hedefRR > 0 && r.riskPctTotal !== null) {
    const riskExceeded = settings.maxRiskYuzdesi > 0 ? r.riskPctTotal / settings.maxRiskYuzdesi > 1 : false;
    const rrLow = r.rr / settings.hedefRR < 1;
    if (riskExceeded && rrLow) {
      push(
        'combo-risk-exceeded-and-rr-low',
        'critical',
        'Risk hem yüksek hem karşılığı düşük',
        `Bu kurulumda risk (${money(r.potentialLossNative)}), %${fmtDecimal(settings.maxRiskYuzdesi, 0)} limitinin üzerinde (%${fmtDecimal(r.riskPctTotal, 2)}) ve buna karşılık beklediğin getiri de hedefin (1:${fmtDecimal(settings.hedefRR)}) altında (1:${fmtDecimal(r.rr)}). Yani hem daha fazla riske giriyorsun hem de karşılığında hedeflediğin kazancı alamıyorsun — stop seviyesini sıkılaştırmayı ve/veya hedef fiyatı gözden geçirmeyi düşünmen bu durumda özellikle faydalı olabilir.`,
      );
    } else if (!riskExceeded && r.rr / settings.hedefRR >= 1) {
      push(
        'combo-all-good',
        'good',
        'Bu kurulum risk kurallarınla uyumlu',
        `Risk limit içinde (%${fmtDecimal(r.riskPctTotal, 2)} / %${fmtDecimal(settings.maxRiskYuzdesi, 0)}) ve Risk/Ödül oranın hedefine ulaşıyor (1:${fmtDecimal(r.rr)}). Bu, disiplinli bir işlem kurulumunun işaretidir.`,
      );
    }
  }

  if (r.riskPctTotal !== null && settings.maxRiskYuzdesi > 0 && (r.riskPctTotal / settings.maxRiskYuzdesi) > 1 && r.leveraged && r.leverage > 5) {
    push(
      'combo-risk-exceeded-and-high-leverage',
      'critical',
      'Yüksek kaldıraç + limit üstü risk',
      'Hem risk limitinin üzerindesin hem de yüksek kaldıraç kullanıyorsun. Bu ikisinin bir aradaki etkisi, teminat kaybı ihtimalini belirgin şekilde artırır; pozisyonu küçültmeyi ya da kaldıracı azaltmayı öncelikli olarak değerlendirebilirsin.',
    );
  }

  if (stopEntered && !r.tpValid && tpEntered === false && r.stopValid) {
    push(
      'combo-stop-no-tp',
      'info',
      'Sadece aşağı yönlü senaryo tanımlı',
      'Stop belirledin ama hedef fiyat (TP) girmedin — şu an yalnızca riskini tanımlamış oluyorsun. Bir kâr hedefi eklersen, riske girdiğin tutarın karşılığında neyi hedeflediğini de görebilirsin.',
    );
  }

  return insights.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
}

/** Panelde gösterilecek üst sınır — çok fazla mesaj kullanıcıyı boğmasın diye en önemlileri öne alıp keser. */
export const MAX_VISIBLE_INSIGHTS = 8;
