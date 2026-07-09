import React, { useMemo, useState } from 'react';
import { AlertTriangle, Eraser, Lightbulb, Save, Trash2 } from 'lucide-react';
import type { Direction, MarketConfig, TradeInput } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useHistory } from '../../hooks/useHistory';
import { computeTrade, qtyFromVolume, volumeFromQty } from '../../lib/calc';
import { buildInsights, MAX_VISIBLE_INSIGHTS } from '../../lib/coach';
import { historyForMarket } from '../../lib/history';
import { fmtCurrency, fmtDecimal, fmtDecimalGrouped, fmtPct, parseNumber } from '../../lib/format';
import { Card, ConfirmDialog, DirectionToggle, InfoTip, NumField, Row } from '../ui';
import { Meter } from '../charts/Meter';
import { Sparkline } from '../charts/Sparkline';
import { CoachPanel } from '../coach/CoachPanel';

interface Props {
  market: MarketConfig;
}

export const TradeTab: React.FC<Props> = ({ market }) => {
  const { settings } = useSettings();
  const { entries, addEntry, clear } = useHistory();
  const cur = market.currency;

  const [price, setPrice] = useState('');
  const [stop, setStop] = useState('');
  const [tp, setTp] = useState('');
  const [qtyStr, setQtyStr] = useState('');
  const [volumeStr, setVolumeStr] = useState('');
  const [multiplierStr, setMultiplierStr] = useState(String(market.defaultMultiplier));
  const [marginStr, setMarginStr] = useState('');
  const [lastInput, setLastInput] = useState<'qty' | 'volume'>('qty');
  const [direction, setDirection] = useState<Direction>('long');
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const showMultiplier = market.key === 'viop';
  const multN = showMultiplier ? parseNumber(multiplierStr) || market.defaultMultiplier : market.defaultMultiplier;
  const priceN = parseNumber(price);

  // Çift yönlü miktar <-> hacim
  const resolvedQty = useMemo(() => {
    if (lastInput === 'volume') {
      return qtyFromVolume(parseNumber(volumeStr), priceN, multN, market.fractionalQty);
    }
    return parseNumber(qtyStr);
  }, [lastInput, qtyStr, volumeStr, priceN, multN, market.fractionalQty]);

  const onQtyChange = (v: string) => {
    setQtyStr(v);
    setLastInput('qty');
    if (priceN > 0) setVolumeStr(fmtDecimalGrouped(Math.round(volumeFromQty(parseNumber(v), priceN, multN)), 0));
  };
  const onVolumeChange = (v: string) => {
    setVolumeStr(v);
    setLastInput('volume');
    if (priceN * multN > 0) {
      const q = qtyFromVolume(parseNumber(v), priceN, multN, market.fractionalQty);
      setQtyStr(market.fractionalQty ? fmtDecimalGrouped(q, 4) : fmtDecimalGrouped(q, 0));
    }
  };
  const onPriceChange = (v: string) => {
    setPrice(v);
    const p = parseNumber(v);
    if (p > 0) {
      if (lastInput === 'qty' && qtyStr) {
        setVolumeStr(fmtDecimalGrouped(Math.round(volumeFromQty(parseNumber(qtyStr), p, multN)), 0));
      } else if (lastInput === 'volume' && volumeStr) {
        const q = qtyFromVolume(parseNumber(volumeStr), p, multN, market.fractionalQty);
        setQtyStr(market.fractionalQty ? fmtDecimalGrouped(q, 4) : fmtDecimalGrouped(q, 0));
      }
    }
  };

  const clearForm = () => {
    setPrice('');
    setStop('');
    setTp('');
    setQtyStr('');
    setVolumeStr('');
    setMarginStr('');
    setMultiplierStr(String(market.defaultMultiplier));
    setDirection('long');
  };

  const input: TradeInput = {
    price: priceN,
    stop: parseNumber(stop),
    tp: parseNumber(tp),
    qty: resolvedQty,
    multiplier: multN,
    marginPerUnit: market.allowLeverage ? parseNumber(marginStr) : 0,
    direction,
  };
  const r = computeTrade(input, market, settings);
  const insights = useMemo(() => buildInsights(input, r, market, settings), [input, r, market, settings]);

  const marketHistory = useMemo(() => historyForMarket(entries, market.key, 24), [entries, market.key]);
  const canSave = priceN > 0 && resolvedQty > 0;

  const handleSave = () => {
    if (!canSave) return;
    addEntry({
      market: market.key,
      direction,
      price: priceN,
      stop: parseNumber(stop),
      tp: r.tpValid ? parseNumber(tp) : null,
      qty: resolvedQty,
      volumeNative: r.volumeNative,
      riskPctTotal: r.riskPctTotal,
      exposurePctTotal: r.exposurePctTotal,
      rr: r.rr,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  // Oranlar (limite göre) — Meter bileşenleri için
  const riskRatio = settings.maxRiskYuzdesi > 0 ? r.riskPctTotal / settings.maxRiskYuzdesi : 0;
  const exposureRatio = settings.maxPozisyonYuzdesi > 0 ? r.exposurePctTotal / settings.maxPozisyonYuzdesi : 0;
  const riskRatioSub = settings.maxRiskYuzdesi > 0 ? r.riskPctSub / settings.maxRiskYuzdesi : 0;
  const exposureRatioSub = settings.maxPozisyonYuzdesi > 0 ? r.exposurePctSub / settings.maxPozisyonYuzdesi : 0;
  const rrRatio = r.rr !== null && settings.hedefRR > 0 ? r.rr / settings.hedefRR : 0;

  const riskCardTone: 'default' | 'good' | 'warning' | 'critical' = !r.stopValid
    ? 'default'
    : riskRatio <= 0.7
      ? 'good'
      : riskRatio <= 1
        ? 'warning'
        : 'critical';

  // Pozisyonun kendi getiri/zarar oranı (bloke edilen sermayeye göre — kaldıraç varsa onu yansıtır)
  const lossPctOfCapital = r.stopValid && r.capitalUsedNative > 0 ? (r.potentialLossNative / r.capitalUsedNative) * 100 : null;
  const profitPctOfCapital = r.tpValid && r.capitalUsedNative > 0 ? (r.potentialProfitNative / r.capitalUsedNative) * 100 : null;

  const exposureOver = r.exposurePctTotal > settings.maxPozisyonYuzdesi && r.volumeNative > 0;
  const riskOver = r.stopValid && r.riskPctTotal > settings.maxRiskYuzdesi;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* SOL: Girişler */}
      <div className="space-y-4 lg:col-span-5 xl:col-span-4">
        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
            {market.label} Giriş Bilgileri
          </h3>
          {market.allowShort && <DirectionToggle direction={direction} onChange={setDirection} />}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumField label={`Planlanan ${direction === 'short' ? 'Satış' : 'Alım'} Fiyatı`} suffix={cur === 'TRY' ? '₺' : '$'} value={price} onChange={onPriceChange} placeholder="0,00" />
          <NumField label="Stop Seviyesi (Fiyat)" suffix={cur === 'TRY' ? '₺' : '$'} value={stop} onChange={setStop} placeholder="0,00" accent="rose" />
          <NumField label={`Hedeflenen ${market.qtyLabel}`} value={qtyStr} onChange={onQtyChange} placeholder="0" />
          <NumField label="Hedeflenen Hacim / Tutar" suffix={cur === 'TRY' ? '₺' : '$'} value={volumeStr} onChange={onVolumeChange} placeholder="0" />
          {showMultiplier && (
            <NumField label="Kontrat Çarpanı" value={multiplierStr} onChange={setMultiplierStr} placeholder="100" />
          )}
          {market.allowLeverage && (
            <NumField
              label="Kontrat Başına Teminat"
              suffix={cur === 'TRY' ? '₺' : '$'}
              value={marginStr}
              onChange={setMarginStr}
              placeholder="0"
            />
          )}
          <div className="sm:col-span-2">
            <NumField label="Hedef Fiyat (TP)" hint="(Opsiyonel)" suffix={cur === 'TRY' ? '₺' : '$'} value={tp} onChange={setTp} placeholder="0,00" accent="emerald" />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearForm}
            title="Temizle"
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-2)' }}
          >
            <Eraser size={15} /> Temizle
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: savedFlash ? 'var(--good)' : 'var(--accent)' }}
          >
            <Save size={15} /> {savedFlash ? 'Kaydedildi ✓' : 'İşlemi Geçmişe Kaydet'}
          </button>
        </div>
      </div>

      {/* SAĞ: Sonuçlar */}
      <div className="space-y-4 lg:col-span-7 xl:col-span-8">
        <h3 className="border-b pb-2 text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>
          Risk & Portföy Özeti
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Pozisyon */}
          <Card>
            <span className="inline-flex items-center text-xs font-semibold text-[var(--ink-2)]">
              Pozisyon Büyüklüğü (Hacim)
              <InfoTip
                text="Bu işlem için planladığın toplam pozisyon tutarı: miktar × fiyat (VİOP'ta × kontrat çarpanı). Kaldıraçlı işlemlerde bloke ettiğin teminattan büyük olabilir."
                align="left"
              />
            </span>
            <span className="block text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {fmtCurrency(r.volumeNative, cur, 0)}
            </span>
            {cur === 'USD' && (
              <span className="block text-[11px] font-medium text-[var(--muted)]">≈ {fmtCurrency(r.volumeTRY, 'TRY', 0)}</span>
            )}
            <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <Meter
                label="Hacim / Toplam Kasa"
                ratio={exposureRatio}
                valueLabel={fmtPct(r.exposurePctTotal)}
                limitLabel={`%${fmtDecimal(settings.maxPozisyonYuzdesi, 0)}`}
                tip="Bu işlemin hacminin, tüm alt kasaların toplamına (BİST+VİOP+ABD+Kripto, TL karşılığıyla) oranı. Tek işlemde portföyünün ne kadarını kullandığını gösterir. Çubuktaki işaret çizgisi, Ayarlar'da belirlediğin 'Max Pozisyon' limitidir."
              />
              <Meter
                label={`Hacim / ${market.label} Kasa`}
                ratio={exposureRatioSub}
                valueLabel={fmtPct(r.exposurePctSub)}
                limitLabel={`%${fmtDecimal(settings.maxPozisyonYuzdesi, 0)}`}
                tip={`Bu işlemin hacminin, yalnızca ${market.label} alt kasasına oranı — toplam kasa değil, sadece bu piyasaya ayırdığın bakiye baz alınır. Aynı "Max Pozisyon" limitiyle karşılaştırılır; küçük bir alt kasada yüksek çıkması, o piyasada yoğunlaştığını gösterir.`}
              />
              {r.leveraged && (
                <>
                  <Row
                    label="Kaldıraç"
                    strong
                    tip="Açtığın pozisyonun hacminin, bloke ettiğin teminata oranı. Ör. 5x → 1 birim teminatla 5 birim büyüklüğünde pozisyon taşıyorsun; kâr da zarar da bu oranda büyür."
                  >
                    {fmtDecimal(r.leverage)}x
                  </Row>
                  <Row
                    label="Bloke Teminat"
                    tip="Bu pozisyonu açmak için kilitlenen (kullanılan) teminat tutarı. Kasa yeterliliği bu tutara göre kontrol edilir."
                  >
                    {fmtCurrency(r.capitalUsedNative, cur, market.fractionalQty ? 2 : 0)}
                  </Row>
                </>
              )}
              {exposureOver && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--critical)' }}>
                  <AlertTriangle size={12} /> Pozisyon limiti aşıldı (max %{fmtDecimal(settings.maxPozisyonYuzdesi, 0)})
                </div>
              )}
            </div>
          </Card>

          {/* Risk */}
          <Card tone={riskCardTone}>
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center text-xs font-semibold opacity-80">
                  Olası Stop Kaybı
                  <InfoTip text="Fiyat, girdiğin stop seviyesine düşerse (short'ta yükselirse) bu pozisyondan native para biriminde kaybedeceğin tutar: |fiyat − stop| × miktar × çarpan. Yanındaki yüzde, bu kaybın bloke ettiğin sermayeye (teminata, kaldıraç yoksa pozisyon hacmine) oranıdır — pozisyonun kendi getiri/zarar performansını gösterir." align="left" />
                </span>
                {r.stopValid ? (
                  <div>
                    <span className="block text-2xl font-black tabular-nums" style={{ color: 'var(--critical)' }}>
                      -{fmtCurrency(r.potentialLossNative, cur, 0)}
                    </span>
                    {lossPctOfCapital !== null && (
                      <span className="block text-sm font-bold tabular-nums" style={{ color: 'var(--critical)' }}>
                        -{fmtPct(lossPctOfCapital, 1)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="block text-sm font-semibold opacity-60">Stop girilmedi</span>
                )}
              </div>
              {r.tpValid && (
                <div className="text-right">
                  <span className="inline-flex items-center text-xs font-semibold opacity-80" style={{ color: 'var(--good)' }}>
                    Olası Getiri
                    <InfoTip text="Fiyat, girdiğin hedef (TP) seviyesine ulaşırsa bu pozisyondan elde edeceğin olası kâr tutarı. Yanındaki yüzde, bu kazancın bloke ettiğin sermayeye (teminata, kaldıraç yoksa pozisyon hacmine) oranıdır — pozisyonun kendi getiri performansını gösterir." />
                  </span>
                  <div>
                    <span className="block text-2xl font-black tabular-nums" style={{ color: 'var(--good)' }}>
                      +{fmtCurrency(r.potentialProfitNative, cur, 0)}
                    </span>
                    {profitPctOfCapital !== null && (
                      <span className="block text-sm font-bold tabular-nums" style={{ color: 'var(--good)' }}>
                        +{fmtPct(profitPctOfCapital, 1)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: 'var(--border-strong)' }}>
              {r.stopValid ? (
                <>
                  <Meter
                    label="Risk / Toplam Kasa"
                    ratio={riskRatio}
                    valueLabel={fmtPct(r.riskPctTotal, 2)}
                    limitLabel={`%${fmtDecimal(settings.maxRiskYuzdesi, 0)}`}
                    tip="Stop çalışırsa kaybedeceğin tutarın, tüm alt kasaların toplamına (TL karşılığıyla) oranı. Bu, bir işlemde gerçekten göze aldığın risktir — hacimden farklıdır. İşaret çizgisi Ayarlar'daki 'Max Risk' limitidir."
                  />
                  <Meter
                    label={`Risk / ${market.label} Kasa`}
                    ratio={riskRatioSub}
                    valueLabel={fmtPct(r.riskPctSub, 2)}
                    limitLabel={`%${fmtDecimal(settings.maxRiskYuzdesi, 0)}`}
                    tip={`Stop çalışırsa kaybedeceğin tutarın, yalnızca ${market.label} alt kasasına oranı. Aynı "Max Risk" limitiyle karşılaştırılır.`}
                  />
                  {riskOver && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--critical)' }}>
                      <AlertTriangle size={12} /> Risk limiti aşıldı (max %{fmtDecimal(settings.maxRiskYuzdesi, 0)})
                    </div>
                  )}
                </>
              ) : parseNumber(stop) > 0 && priceN > 0 ? (
                <div className="text-[11px] leading-tight" style={{ color: 'var(--warning)' }}>
                  {direction === 'long' ? 'Stop, fiyattan küçük olmalı.' : 'Stop, fiyattan büyük olmalı.'}
                </div>
              ) : (
                <div className="text-[11px] leading-tight opacity-70">Hesaplama için stop giriniz.</div>
              )}

              {r.rr !== null && (
                <div className="border-t pt-3" style={{ borderColor: 'var(--border-strong)' }}>
                  <Meter
                    mode="target"
                    scaleMax={2}
                    label="Risk / Ödül (R:R)"
                    ratio={rrRatio}
                    valueLabel={`1 : ${fmtDecimal(r.rr)}`}
                    limitLabel={`hedef 1:${fmtDecimal(settings.hedefRR)}`}
                    tip="Olası kazancın olası kayba oranı. Ör. 1 : 2,5 → riske attığın her 1 birime karşılık 2,5 birim kâr hedefliyorsun. Bu göstergede yüksek olmak iyidir: çubuk, Ayarlar'daki 'Hedef R:R' değerine ulaşıp ulaşmadığını gösterir."
                  />
                </div>
              )}

              {r.thresholdDays > 0 && (
                <div className="flex flex-col gap-0.5 border-t pt-2 text-xs" style={{ borderColor: 'var(--border-strong)' }}>
                  <div className="flex justify-between font-bold opacity-90">
                    <span className="inline-flex items-center text-[11px]">
                      Risksiz Getiri Eşik Süresi:
                      <InfoTip
                        text={`Bu işlemi hiç yapmadan, aynı parayı %${fmtDecimal(settings[market.riskFreeKey], 0)} yıllık risksiz getiriyle (mevduat/bono gibi) değerlendirseydin, hedeflediğin kâra ulaşmak kaç gün sürerdi? Süre kısaysa, bu işlemin riskini göze almanın "fırsat maliyeti" düşüktür; süre uzunsa, riske girmeden de benzer bir getiriye zamanla ulaşabilirsin.`}
                      />
                    </span>
                    <span>{r.thresholdDays} Gün</span>
                  </div>
                  <span className="text-[9px] font-normal leading-tight opacity-75">
                    %{fmtDecimal(settings[market.riskFreeKey], 0)} risksiz getiri eşiğine göre.
                  </span>
                </div>
              )}

              {r.insufficientBalance && (
                <div className="flex items-center gap-1.5 border-t pt-2 text-[11px] font-bold" style={{ borderColor: 'var(--border-strong)', color: 'var(--critical)' }}>
                  <AlertTriangle size={12} /> {market.label} kasa bakiyesi yetersiz!
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Koç özeti — girdileri yorumlayan eğitici geri bildirim */}
        {insights.length > 0 && (
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={16} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
                Koç Özeti
              </span>
            </div>
            <CoachPanel insights={insights.slice(0, MAX_VISIBLE_INSIGHTS)} />
          </Card>
        )}

        {/* Risk eğilimi — kaydedilen işlemlerden */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-2)]">
              {market.label} Risk Eğilimi <span className="text-[var(--muted)]">(kaydedilen işlemler)</span>
            </span>
            {marketHistory.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--critical)]"
              >
                <Trash2 size={11} /> geçmişi temizle
              </button>
            )}
          </div>
          {marketHistory.length >= 2 ? (
            <div className="mt-2">
              <Sparkline values={marketHistory.map((e) => e.riskPctTotal)} color="var(--accent)" />
              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>{marketHistory.length} kayıt</span>
                <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>
                  Son: {fmtPct(marketHistory[marketHistory.length - 1].riskPctTotal, 2)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Fiyat ve miktar girip <span className="font-semibold">"İşlemi Geçmişe Kaydet"</span> ile bu piyasadaki risk eğilimini burada izleyebilirsin.
            </p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="İşlem geçmişi silinsin mi?"
        message="Tüm piyasalardaki (BİST, VİOP, ABD, Kripto) kayıtlı işlem geçmişi ve risk eğilimi grafikleri kalıcı olarak silinecek. Bu işlem geri alınamaz."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
};
