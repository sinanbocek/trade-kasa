# Trade Kasa Yönetimi — Proje Rehberi (360° Analiz)

> Bu doküman, projenin tüm "DNA"sını tek yerde toplar: ne olduğu, nasıl çalıştığı, neden bu şekilde tasarlandığı ve gelecekte nasıl büyütülebileceği. Kod tabanına yeni katılan biri (insan ya da AI ajan) bu dosyayı okuyarak projenin tamamını zihinsel olarak yeniden inşa edebilmeli.
>
> **Son güncelleme:** v1.0.0 sürümü baz alınarak yazılmıştır (2026 Temmuz).

---

## İçindekiler

1. [Ne, Kime, Neden](#1-ne-kime-neden)
2. [Teknoloji Yığını](#2-teknoloji-yığını)
3. [Proje Yapısı](#3-proje-yapısı)
4. [Domain Modeli](#4-domain-modeli)
5. [Hesap Motoru (`lib/calc.ts`)](#5-hesap-motoru-libcalcts)
6. [Koç / Yorum Motoru (`lib/coach.ts`)](#6-koç--yorum-motoru-libcoachts)
7. [State Yönetimi](#7-state-yönetimi)
8. [Tasarım Sistemi](#8-tasarım-sistemi)
9. [Sayı Biçimlendirme](#9-sayı-biçimlendirme)
10. [Bileşen Envanteri](#10-bileşen-envanteri)
11. [Kalıcılık Katmanı (localStorage)](#11-kalıcılık-katmanı-localstorage)
12. [Firebase & Dağıtım](#12-firebase--dağıtım)
13. [Güvenlik Notları](#13-güvenlik-notları)
14. [Bilinen Sınırlamalar](#14-bilinen-sınırlamalar)
15. [Sürüm Geçmişi Özeti](#15-sürüm-geçmişi-özeti)
16. [Sonraki Fazlar — Öneriler ve Görüşler](#16-sonraki-fazlar--öneriler-ve-görüşler)

---

## 1. Ne, Kime, Neden

**Trade Kasa Yönetimi**, bağımsız bir **pozisyon büyüklüğü / risk hesaplayıcısıdır**. Bir borsa emri göndermez, gerçek zamanlı fiyat akışı çekmez, kimseyi bir yatırım kararına yönlendirmez — sadece kullanıcının zaten aklında olan bir işlemi (fiyat, stop, hedef, miktar) alıp **"bu işlem senin risk kurallarına göre mantıklı mı?"** sorusuna sayısal ve görsel bir cevap üretir.

**Kime hitap ediyor:** Türkiye'de BİST, VİOP, ve global ABD hisse/kripto piyasalarında işlem yapan, birden fazla "alt kasaya" (aracı kurum/borsa hesabına) sermaye dağıtmış, disiplinli pozisyon boyutlandırma yapmak isteyen bireysel yatırımcı/trader.

**Neden var:** Trader'ların en sık yaptığı hata "ne kadar alayım?" sorusunu gövdeden (miktar önce, risk sonra) cevaplamasıdır. Bu uygulama akışı tersine çevirir: önce risk toleransı (kasanın %X'i) tanımlanır, işlem o toleransa göre değerlendirilir — aşarsa görsel ve yazılı olarak uyarır.

**Temel felsefe — "hesap makinesi, tavsiye motoru değil":**
- Veritabanı yok, sunucu tarafı yok, kullanıcı hesabı yok.
- Tüm veri tarayıcının `localStorage`'ında yaşar; başka bir cihazdan erişilemez (JSON dışa/içe aktarma ile taşınabilir).
- Koç Özeti (bkz. §6) bir "AI tavsiyesi" değil, **sabit kurallara dayanan, tamamen deterministik** bir geri bildirim motorudur — hiçbir LLM/uzak API çağrısı yapmaz.

---

## 2. Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Framework | React 18 + TypeScript | Bileşen tabanlı, tip güvenliği |
| Build/Dev | Vite 5 | Hızlı HMR, sıfır-config |
| Stil | Tailwind CSS 3 (`darkMode: 'class'`) | Utility-first, hızlı iterasyon |
| İkonlar | `lucide-react` | Tutarlı, hafif SVG ikon seti |
| Grafik/Görselleştirme | **Sıfır kütüphane** — el yapımı SVG/CSS bileşenler (`Meter`, `Sparkline`, `AllocationBar`) | Bundle boyutu küçük kalsın diye (Chart.js/Recharts gibi ağır kütüphaneler bilinçli olarak alınmadı) |
| Kalıcılık | `localStorage` (versiyonlu JSON) | Backend'siz, anında, gizlilik dostu |
| Kur verisi | `open.er-api.com` (anahtarsız, CORS-dostu, ücretsiz) | Backend gerektirmeden canlı kur |
| Dağıtım | Firebase Hosting (statik) | `trade-kasa` projesi, tek komutla deploy |
| Firebase SDK | **Kurulu değil** — sadece Hosting kullanılıyor | Şu an Firestore/Auth aktif değil (bkz. §12) |

Bağımlılık sayısı bilinçli olarak minimalist tutulmuştur: `package.json`'da yalnızca `react`, `react-dom`, `lucide-react` runtime bağımlılığı vardır. Production bundle ≈ 213 KB (gzip ≈ 67 KB).

---

## 3. Proje Yapısı

```
trade-kasa/
├── index.html                    # Vite giriş noktası + tema flaş-önleme script'i
├── vite.config.ts                # port: 9000
├── tailwind.config.js            # darkMode: 'class', font ailesi
├── tsconfig.json                 # strict: true, noUnusedLocals/Parameters: true
├── firebase.json / .firebaserc   # Hosting yapılandırması (proje: trade-kasa)
├── .env / .env.example           # Firebase config değerleri (bkz. §12)
│
├── src/
│   ├── main.tsx                  # ReactDOM root — ThemeProvider > SettingsProvider > App
│   ├── App.tsx                   # Üst düzey layout: header, Hero, tab bar, içerik, footer
│   ├── index.css                 # CSS custom properties (renk sistemi) + global stiller
│   ├── vite-env.d.ts             # import.meta.env tipleri
│   ├── types.ts                  # Tüm domain tipleri (MarketConfig, Settings, TradeInput/Result)
│   │
│   ├── config/
│   │   └── markets.ts            # 4 piyasanın davranış tanımı (bkz. §4)
│   │
│   ├── lib/                      # Saf fonksiyonlar — React'ten bağımsız, test edilebilir
│   │   ├── calc.ts               # Hesap motoru (bkz. §5)
│   │   ├── coach.ts              # Koç/yorum motoru (bkz. §6)
│   │   ├── format.ts             # tr-TR sayı/para biçimlendirme (bkz. §9)
│   │   ├── storage.ts            # Ayarlar için localStorage katmanı + varsayılanlar
│   │   ├── history.ts            # İşlem geçmişi için localStorage katmanı
│   │   ├── fxRate.ts             # Kur çekme (soyutlanmış, bkz. §12)
│   │   └── firebase.ts           # Firebase config (env'den okunur, şu an kullanılmıyor)
│   │
│   ├── context/
│   │   ├── SettingsContext.tsx   # Ayarlar + canlı kur state'i (global)
│   │   └── ThemeContext.tsx      # Açık/Koyu/Sistem tema state'i (global)
│   │
│   ├── hooks/
│   │   └── useHistory.ts         # İşlem geçmişi için React kancası
│   │
│   └── components/
│       ├── ui.tsx                 # Paylaşılan atomlar: InfoTip, ConfirmDialog,
│       │                          #   DirectionToggle, NumField, Card, Row
│       ├── Hero.tsx                # Üstteki "Toplam Kasa" paneli
│       ├── charts/
│       │   ├── Meter.tsx           # Limit/hedef göstergesi (renkli çubuk)
│       │   ├── Sparkline.tsx       # Tek serili mini trend çizgisi (SVG)
│       │   └── AllocationBar.tsx   # Parça-bütün yatay yığılmış bar
│       ├── coach/
│       │   └── CoachPanel.tsx      # Koç içgörülerini listeleyen panel
│       └── tabs/
│           ├── TradeTab.tsx        # 4 piyasa için jenerik işlem sekmesi (asıl iş burada)
│           └── SettingsTab.tsx     # Kasa/kur/risk/görünüm ayarları
│
├── public/
│   └── favicon.svg
│
└── docs/guides/guides.md         # Bu dosya
```

**Mimari ilke:** `lib/` altındaki her şey **saf fonksiyondur** — React, DOM veya global state'e dokunmaz. Bu, `calc.ts` ve `coach.ts`'nin ileride bir test paketiyle (bkz. §16) kolayca doğrulanabilir olmasını sağlar.

---

## 4. Domain Modeli

### 4.1 Piyasalar (`config/markets.ts`)

Uygulama, her piyasanın davranışını tek bir `MarketConfig` nesnesiyle tanımlar; `TradeTab` bileşeni bu config'e göre kendini uyarlar (jenerik bileşen, piyasa başına kopya kod yok):

| Alan | BİST | VİOP | ABD | Kripto |
|---|---|---|---|---|
| Para birimi | ₺ | ₺ | $ | $ |
| Miktar tipi | tam sayı | tam sayı | kesirli | kesirli |
| Kaldıraç | ❌ | ✅ (teminat + çarpan) | ✅ (opsiyonel teminat) | ✅ (opsiyonel teminat) |
| Short | ❌ | ✅ | ✅ | ✅ |
| Varsayılan çarpan | 1 | 100 | 1 | 1 |
| Miktar etiketi | Lot | Kontrat | Adet | Adet |
| Risksiz getiri referansı | TL oranı | TL oranı | USD oranı | USD oranı |

### 4.2 "Kasa" Kavramı

Kullanıcı 4 **alt kasa** bakiyesi girer (Ayarlar sekmesi): `bistKasaTL`, `viopKasaTL`, `abdKasaUSD`, `kriptoKasaUSD`. Bunlar gerçek borsa/aracı kurum hesap bakiyeleridir — uygulama bunları senkronize etmez, kullanıcı elle günceller.

**Toplam Kasa** (`totalKasaTRY`) = TL alt kasaların toplamı + USD alt kasaların **güncel kurla TL karşılığı**. Bu, tüm risk yüzdelerinin ortak paydasıdır.

Her metrik **iki farklı paydaya göre** hesaplanır:
- **Toplam Kasa'ya göre** (`...PctTotal`) — "bu işlem tüm servetimin ne kadarını etkiliyor?"
- **İlgili Alt Kasa'ya göre** (`...PctSub`) — "bu işlem, bu piyasaya ayırdığım bakiyenin ne kadarını etkiliyor?"

Bu ikili bakış, küçük bir alt kasada büyük bir yoğunlaşmayı (toplamda güvenli görünse bile) yakalamak için bilinçli bir tasarım kararıdır — Koç Motoru'nun en sık kullandığı sinyallerden biri budur (bkz. §6.3).

---

## 5. Hesap Motoru (`lib/calc.ts`)

Tek giriş noktası: `computeTrade(input: TradeInput, market: MarketConfig, settings: Settings): TradeResult`. Tamamen saf, yan etkisiz.

### 5.1 Temel formüller

```
hacim (volumeNative)      = miktar × fiyat × çarpan
kullanılan sermaye         = kaldıraçlıysa (miktar × birim teminat), değilse hacmin tamamı
kaldıraç (leverage)        = hacim / kullanılan sermaye
olası kayıp (stop geçerli) = |fiyat − stop| × miktar × çarpan
olası kâr (tp geçerli)     = |tp − fiyat| × miktar × çarpan
R:R                        = olası kâr / olası kayıp   (ikisi de geçerliyse)
```

**Stop/TP geçerliliği yön bazlıdır:** Long'da stop < fiyat < tp; Short'ta stop > fiyat > tp olmalı. Yanlış yöndeyse `stopValid`/`tpValid` `false` döner ve o metrikler hesaplanmaz (0 ya da `null`).

### 5.2 Fırsat maliyeti — "Risksiz Getiri Eşik Süresi"

Bu, projenin en özgün hesabıdır. Soru: *"Bu işlemi hiç yapmasam, aynı parayı risksiz getiride (mevduat/bono) değerlendirseydim, hedeflediğim kâra kaç günde ulaşırdım?"*

```ts
dailyRate = (1 + yıllıkOran/100)^(1/365) − 1
days = ln(1 + hedefGetiriOranı) / ln(1 + dailyRate)
```

Burada `hedefGetiriOranı = olasıKâr / kullanılanSermaye` — yani işlemin **kendi getiri yüzdesi**. Sonuç ne kadar kısaysa, riske girmenin fırsat maliyeti o kadar düşüktür (risksiz alternatif çok daha yavaş büyürdü). Referans oran, piyasaya göre `risksizGetiriTL` (BİST/VİOP) ya da `risksizGetiriUSD` (ABD/Kripto) ayarından gelir.

### 5.3 İki para birimi arası dönüşüm

`market.currency === 'USD'` olan piyasalarda tüm "native" (piyasanın kendi para birimindeki) değerler, oran hesaplarında `settings.usdTryKuru` ile TL'ye çevrilir (`...TRY` alanları). Ekranda kullanıcıya native değer + "≈ ₺X" şeklinde ikisi birden gösterilir.

---

## 6. Koç / Yorum Motoru (`lib/coach.ts`)

### 6.1 Amaç ve tasarım kararı

Kullanıcı taleplerinden doğan bu motor, `computeTrade` çıktısını **eğitici, destekleyici Türkçe cümlelere** çevirir. Kritik tasarım kararı: **tamamen kural tabanlı ve deterministiktir** — LLM çağrısı, ağ isteği ya da olasılıksal bir bileşen yoktur. Aynı girdi her zaman aynı içgörüleri üretir. Bu, hem hız (senkron, anlık) hem güvenilirlik (halüsinasyon riski sıfır) hem de maliyet (API çağrısı yok) açısından bilinçli bir seçimdir.

### 6.2 Ton kuralı

Her mesaj şu üçlü kalıba uyar (kullanıcının ilk talebinde belirlediği ton):
1. **Gözlem** — "Şu an X durumundasın" (somut rakamlarla: tutar + yüzde)
2. **Neden/risk** — bunun neden önemli olduğu
3. **Öneri (buyurgan değil)** — "...düşünebilirsin" / "...değerlendirebilirsin"

### 6.3 Kural katalogu (12 kategori, 50+ senaryo)

| # | Kategori | Örnek tetikleyici |
|---|---|---|
| I | Temel girdi durumu | Fiyat/miktar/stop/TP eksik ya da yanlış yönde |
| II | Hacim / Toplam Kasa | Limit altı (iyi) / yaklaşıyor / aşıyor |
| III | Hacim / Alt Kasa yoğunlaşması | Toplamda güvenli ama tek piyasada yoğunlaşma |
| IV | Risk / Toplam & Alt Kasa | Aynı üçlü bant + "çok muhafazakâr" tespiti |
| V | Risk/Ödül (R:R) | Hedefin altında/üstünde/aşırı yüksek |
| VI | Fırsat maliyeti | Yalnızca **uçlarda** konuşur (≤21 gün cazip, >540 gün uzun) — orta bant bilinçli olarak sessiz bırakıldı (kullanıcı geri bildirimiyle: "her zaman aynı şeyi söylüyor" şikayeti sonrası) |
| VII | Kaldıraç | Yok/düşük/orta/yüksek/çok yüksek + stopsuz kaldıraç kritik uyarısı |
| VIII | Short pozisyon | Stopsuz short kritik, short+kaldıraç kombinasyonu |
| IX | Bakiye yeterliliği | Yetersiz bakiye / işlem sonrası kasa çok daralıyor |
| X | Stop mesafesi | Çok dar (<%0.5) / çok geniş (>%20) |
| XI | Piyasaya özgü notlar | BİST (kaldıraçsız avantajı), VİOP (çarpan değişikliği, teminat tamamlama), ABD (küçük miktar/komisyon, gece-gap riski), Kripto (7/24, dar stop, kaldıraç+volatilite) |
| XII | Bileşik sinyaller | Risk aşımı + düşük R:R birlikte (kritik), yüksek kaldıraç + risk aşımı, "her şey kurallara uygun" (olumlu pekiştirme) |

### 6.4 Çıktı yapısı

```ts
interface Insight {
  id: string;              // benzersiz kural kimliği (ör. 'risk-total-exceeded')
  level: 'critical' | 'warning' | 'good' | 'info';
  title: string;
  message: string;         // somut rakamlarla zenginleştirilmiş tam cümle
}
```

`buildInsights()` şiddete göre sıralı döner (`critical` → `warning` → `good` → `info`); `TradeTab` bunu `MAX_VISIBLE_INSIGHTS` (8) ile keser ve `CoachPanel` bileşeninde renkli kartlar halinde gösterir.

**Genişletme deseni:** Yeni bir kural eklemek = `buildInsights` içine yeni bir `if` bloğu + `push(id, level, title, message)` çağrısı. Mevcut kuralları bozmadan eklenebilir; test yazılacaksa her kural bağımsız test edilebilir (bkz. §16.7).

---

## 7. State Yönetimi

Global state için Redux/Zustand gibi bir kütüphane **yok** — React Context yeterli görüldü (state küçük ve az sayıda tüketici var).

| Context/Hook | Kapsam | Kalıcılık |
|---|---|---|
| `SettingsContext` | Kasa bakiyeleri, kur, risk kuralları, referans oranlar + canlı kur çekme durumu | `localStorage` (`tky_settings_v1`), her değişiklikte otomatik |
| `ThemeContext` | Açık/Koyu/Sistem tercihi + çözümlenmiş tema | `localStorage` (`tky_theme_v1`) + `<html class="dark">` |
| `useHistory` (hook, context değil) | Kaydedilen işlem geçmişi | `localStorage` (`tky_history_v1`), son 200 kayıt |
| `TradeTab` local state | Form girdileri (fiyat, stop, tp, miktar...) | **Yok** — sekmeler arası geçişte kaybolmasın diye `App.tsx` tüm sekmeleri her zaman mount tutar, yalnızca `display:none` ile gizler (bkz. §10.5) |

**Kur güncelleme akışı** (`SettingsContext`): açılışta önbellekteki kur gösterilir → bayatsa (>1 saat) hemen canlı çekilir → sonra saatte bir otomatik yoklanır. Kur kaynağı `open.er-api.com`; kullanıcı isterse elle de üzerine yazabilir.

---

## 8. Tasarım Sistemi

### 8.1 Renk sistemi — CSS custom properties

Tüm renkler `src/index.css` içinde `:root` (açık) ve `:root.dark` (koyu) altında CSS değişkeni olarak tanımlıdır; bileşenler asla ham hex kullanmaz, `var(--token)` kullanır. Bu sayede tema geçişi tek satır (`classList.toggle('dark')`) ile tüm uygulamaya yayılır.

Palet, **dataviz skill'inin doğrulanmış referans paletinden** türetildi (kategorik renkler `node scripts/validate_palette.js` ile CVD/kontrast testinden geçirildi):
- Nötr yüzeyler: sıcak gri tonları (`--bg`, `--surface`, `--ink`, `--muted`)
- Vurgu: tek bir mavi (`--accent`)
- Durum renkleri (sabit, temalanmaz): `--good` / `--warning` / `--critical`
- Kategorik (kasa dağılımı): `--cat-1..4`

### 8.2 Tema

`ThemeContext` üç modu destekler: `light` / `dark` / `system`. **Varsayılan `light`'tır** (sistem tercihini otomatik takip etmez — kullanıcı isterse "Sistem"i seçer). `index.html`'deki inline script, React yüklenmeden önce doğru `class="dark"`'ı uygulayarak flaş-of-wrong-theme'i önler.

### 8.3 Hero paneli — "her zaman koyu" tasarım deseni

`Hero.tsx`, genel tema ne olursa olsun **her zaman koyu bir degrade panel**dir (grafit → indigo → teal, 5 duraklı diyagonal gradyan + iki yumuşak renkli glow + ince üst parlaklık katmanı). Bu, premium fintech ürünlerinde (Mercury, Ramp) sık görülen bir "öne çıkan panel" desenidir — açık temada bile en önemli rakamın (Toplam Kasa) göz alıcı kalmasını sağlar.

### 8.4 Veri görselleştirme bileşenleri

Üç özel bileşen, `dataviz` skill'inin form/mark/renk kurallarına göre sıfırdan yazıldı:

- **`Meter`** — bir oranın bir referansa (limit ya da hedef) göre nerede durduğunu gösterir. `mode="limit"` (düşük iyi — risk/hacim) ve `mode="target"` (yüksek iyi — R:R) olmak üzere iki anlamsal mod destekler; renk (yeşil/sarı/kırmızı) `statusForLimit`/`statusForTarget` eşiklerinden gelir.
- **`Sparkline`** — tek serili, SVG polyline tabanlı mini trend çizgisi (kaydedilen işlem geçmişinden risk% eğilimi).
- **`AllocationBar`** — parça-bütün yatay yığılmış bar + doğrudan etiketli lejant (`Etiket (%pay) · Tutar` formatı).

### 8.5 Ortak UI atomları (`ui.tsx`)

`InfoTip` (hover/tık ile açılan bilgi balonu — sonuç panelindeki **her metrik** için mevcut), `ConfirmDialog` (native `confirm()` yerine tasarım diline uygun modal), `DirectionToggle` (Long/Short kaydırmalı şalter), `NumField` (binlik ayraçlı canlı biçimlendirmeli sayı girişi), `Card`, `Row`.

---

## 9. Sayı Biçimlendirme

Tüm sayılar `tr-TR` yerel ayarına göre biçimlenir: **nokta = binlik ayraç, virgül = ondalık** (`70.000`, `%1,82`). `lib/format.ts` bu mantığı iki yönde sağlar:

- **Görüntüleme:** `fmtCurrency`, `fmtDecimalGrouped`, `fmtPct`, `fmtDecimal`
- **Canlı giriş biçimlendirme:** `formatGroupedInput(raw)` — kullanıcı yazarken binlik noktaları otomatik ekler, ondalık kısmı dokunmadan bırakır
- **Ayrıştırma:** `parseNumber(val)` — görüntüleme formatını (nokta/virgül) ham `number`'a çevirir; yukarıdaki tüm biçimlendirme fonksiyonlarıyla round-trip uyumludur

---

## 10. Bileşen Envanteri

| Bileşen | Sorumluluk |
|---|---|
| `App.tsx` | Layout iskeleti, sekme yönlendirme, tema butonu, footer |
| `Hero.tsx` | Toplam Kasa, TL/USD kasa çipleri, kur kutusu, kasa dağılımı |
| `TradeTab.tsx` | **Ana ekran** — girişler (sol), sonuçlar + Meter'lar + Koç Özeti + Sparkline (sağ) |
| `SettingsTab.tsx` | Kasa bakiyeleri, kur, risk kuralları, referans oranlar, görünüm, dışa/içe aktar, sıfırlama |
| `ui.tsx` | Paylaşılan atomlar (bkz. §8.5) |
| `charts/*` | Görselleştirme bileşenleri (bkz. §8.4) |
| `coach/CoachPanel.tsx` | Koç içgörülerini render eder |

**Neden `TradeTab` piyasa başına ayrı bileşen değil:** BİST/VİOP/ABD/Kripto arasındaki farklar (`allowLeverage`, `allowShort`, `fractionalQty`, çarpan, para birimi) tamamen `MarketConfig` verisiyle ifade edilebildiğinden tek jenerik bileşen + config-driven davranış tercih edildi. Bu, 4 piyasaya yeni bir alan eklemek istendiğinde (ör. komisyon oranı) tek bir yerde değişiklik yapmayı sağlar.

**Sekmeler arası veri kalıcılığı:** `App.tsx`, her `TradeTab` örneğini **her zaman mount tutar**, yalnızca aktif olmayanı `display:none` ile gizler. Bu, React'in koşullu render (`{tab==='x' && <X/>}`) deseninin varsayılan davranışı olan "unmount → state kaybı" sorununu bilinçli olarak atlar.

---

## 11. Kalıcılık Katmanı (localStorage)

| Anahtar | İçerik | Versiyonlama |
|---|---|---|
| `tky_settings_v1` | `Settings` nesnesi | `SETTINGS_VERSION` alanı ile; `normalizeSettings()` eksik/eski alanları varsayılanla birleştirir |
| `tky_theme_v1` | `'light' \| 'dark' \| 'system'` | — |
| `tky_history_v1` | `TradeHistoryEntry[]` (son 200) | — |
| `tky_fx_usdtry` | Önbelleğe alınmış kur + zaman damgası | — |

Tüm okuma/yazma fonksiyonları `try/catch` ile sarılıdır (localStorage kapalı/dolu senaryosunda sessizce varsayılana düşer, uygulamayı çökertmez).

---

## 12. Firebase & Dağıtım

**Şu an aktif olan:** Yalnızca **Firebase Hosting** (statik dosya sunumu). Firebase JS SDK'sı kurulu değil, hiçbir yerde import edilmiyor — `src/lib/firebase.ts` yalnızca ileride kullanılmak üzere config'i env değişkenlerinden okuyup export eden hazır bir "Seçenek A/B/C" iskeletidir.

```bash
npm run build              # tsc --noEmit && vite build → dist/
npx firebase deploy --only hosting
```

**Kur katmanı da benzer şekilde soyutlanmış** (`lib/fxRate.ts`): bugün tarayıcıdan doğrudan `open.er-api.com`'a istek atılıyor (Seçenek A). İleride daha zengin bir kaynağa (yfinance/Yahoo) geçmek istenirse yalnızca `fetchLiveRate()` fonksiyonunun içeriği bir Cloud Function proxy'sine yönlendirilir; geri kalan kod değişmez.

**Env değişkenleri:** `VITE_FIREBASE_*` — `.env` (git'e girmez) gerçek değerleri, `.env.example` (git'e girer) şablonu tutar.

---

## 13. Güvenlik Notları

- Firebase web `apiKey`'i **tasarım gereği gizli değildir** (Google/Firebase dokümantasyonu bunu doğrular); gerçek erişim kontrolü Firestore/Storage **Security Rules** ve Cloud Console'daki **HTTP referrer kısıtlaması** ile sağlanır. Yine de kod hijyeni için `.env`'e taşındı (v1.0.0 sonrası fix commit'i).
- Firestore/Auth şu an **aktif değil** — dolayısıyla bugün gerçek bir veri erişim riski yok. Aktif edilirse Security Rules yazılmadan asla prod'a alınmamalı.
- `.gitignore`, `.env*` (`.env.example` hariç) ve `.claude/` (yerel ajan ayarları) dosyalarını dışarıda tutar.

---

## 14. Bilinen Sınırlamalar

- **Tek cihaz:** Ayarlar/geçmiş yalnızca tarayıcı localStorage'ında; farklı cihazda sıfırdan başlar (JSON dışa/içe aktarma dışında senkron yok).
- **Manuel kasa bakiyesi:** Gerçek aracı kurum/borsa hesaplarıyla otomatik senkron yok; kullanıcı elle günceller.
- **Geçmiş yalnızca anlık görüntü:** "Kaydet" butonuna basılan anın risk/hacim/R:R değerleri saklanır; işlemin gerçek sonucu (kâr/zarar gerçekleşti mi, ne zaman kapandı) takip edilmez — bir "trade journal" değil, bir "risk eğilimi" kaydıdır.
- **Kur kaynağı tek nokta:** `open.er-api.com` çökerse (nadir), en son önbellek veya elle giriş devreye girer; ikinci bir yedek kaynak yok.
- **Otomatik test yok:** `lint` script'i yalnızca `tsc --noEmit` çalıştırır; birim/entegrasyon testi bulunmuyor (bkz. §16.7).
- **i18n yok:** Arayüz sabit Türkçedir.

---

## 15. Sürüm Geçmişi Özeti

**v1.0.0** — İlk yayın (GitHub: `sinanbocek/trade-kasa`, canlı: `trade-kasa.web.app`). Bu sürümde tamamlanan başlıca aşamalar, sırasıyla:

1. **Temel işlevsellik:** 4 piyasa sekmesi, hesap motoru, kasa/kur/risk ayarları, localStorage kalıcılığı.
2. **Tasarım yenilemesi:** "AI'nın yaptığı belli oluyor" görünümünden, dataviz skill'i referans alınarak doğrulanmış bir renk paletine, açık/koyu temaya, premium bir Hero paneline geçiş.
3. **Görselleştirme katmanı:** `Meter`, `Sparkline`, `AllocationBar` bileşenlerinin eklenmesi; sayısal alanlara binlik ayraç.
4. **Eğitici katman:** Her metrik için `InfoTip` açıklamaları; ardından 50+ kurallı Koç Motoru.
5. **UX düzeltmeleri:** `ConfirmDialog` (native `confirm()` yerine), Long/Short şalteri, sekmeler arası veri kalıcılığı, Temizle/Kaydet buton yerleşimi.
6. **Yayına hazırlık:** Firebase config'in `.env`'e taşınması (GitHub secret-scanning uyarısına yanıt), GitHub'a push, Firebase Hosting'e deploy.

---

## 16. Sonraki Fazlar — Öneriler ve Görüşler

Aşağıdakiler benim (bu kod tabanını uçtan uca inşa eden ajan olarak) **görüşlerimdir** — hiçbiri karar değil, değerlendirme için önceliklendirilmiş bir öneri listesidir.

### Faz 2 — "Gerçek trade journal'a dönüşüm" *(en yüksek değer/efor oranı)*

Şu an "Kaydet" yalnızca bir anlık görüntü kaydediyor. En doğal ve en çok değer katacak adım, kaydedilen işlemlere **gerçek sonucu** eklemek:
- Kaydedilen her işleme "Kapat" aksiyonu → gerçekleşen çıkış fiyatı, kâr/zarar
- Win-rate, ortalama gerçekleşen R:R, "planlanan vs. gerçekleşen risk" karşılaştırması
- Bu veri zaten `TradeHistoryEntry` şemasına yakın; şema genişletmesi küçük, UI eklemesi orta büyüklükte.
- Bu adım, Koç Motoru'na yeni bir kategori açar: *"Son 10 işleminde ortalama R:R hedefinin altında kaldı"* gibi **geçmişe dayalı** içgörüler (şu anki motor yalnızca **anlık** işlemi değerlendiriyor).

### Faz 3 — Test paketi *(düşük efor, yüksek güven)*

`calc.ts` ve `coach.ts` tamamen saf fonksiyonlar olduğundan **Vitest** ile yazılacak testler çok ucuza gelir ve regresyon riskini büyük ölçüde azaltır. Öncelik sırası:
1. `calc.ts` — formülleri sabit girdilerle doğrulayan tablo-tabanlı testler (özellikle long/short işaret farkları, kaldıraç, threshold-days).
2. `coach.ts` — her kural için "bu koşulda bu id tetiklenir/tetiklenmez" testleri (50+ kural olduğundan burada regresyon riski en yüksek).
3. `format.ts` — round-trip testleri (`parseNumber(formatGroupedInput(x))` gibi).

### Faz 4 — CI/CD

GitHub Actions ile: her `main` push'unda `tsc --noEmit` + (varsa) test paketi çalıştır, başarılıysa otomatik `firebase deploy`. Şu an dağıtım tamamen manuel (`npm run build && firebase deploy`) — bu, "unuttum, eski sürüm canlıda kaldı" riskini taşıyor.

### Faz 5 — Çoklu cihaz senkronu (opsiyonel, büyük karar)

`lib/firebase.ts` zaten bunun için hazırlanmış ("Seçenek C" yorumunda belirtilmiş). Eğer kullanıcı tabanı büyürse:
- Firestore + anonim/e-posta Auth ile ayarlar ve geçmiş buluta taşınabilir.
- **Riski:** projenin "veritabanı yok, tavsiye değil" kimliğiyle gerilim yaratır — bu bilinçli bir ürün kararı gerektirir, hafif bir teknik ekleme değil. Yapılırsa "opt-in bulut senkronu" olarak, localStorage varsayılan kalmalı.

### Faz 6 — Bildirim/uyarı katmanı

Kullanıcı bir işlem kaydettiğinde, fiyat gerçekten stop/TP seviyesine yaklaşırsa haber vermek isteyebilir. Bu, canlı fiyat akışı gerektirir (şu an sadece USD/TRY kuru çekiliyor, hisse/kripto fiyatı çekilmiyor) — kapsamı genişleten, orta-büyük bir faz. Web Push API + bir fiyat kaynağı (ör. Binance public API kripto için, bir borsa verisi sağlayıcısı BİST/ABD için) gerekir.

### Faz 7 — Daha küçük, hızlı kazanımlar

- **PWA desteği** (manifest + service worker) — offline çalışabilirlik ve "ana ekrana ekle" (uygulama zaten sunucu bağımsız olduğundan bu neredeyse bedava bir kazanım).
- **Komisyon/spread alanı** — özellikle ABD/Kripto'daki küçük işlemler için Koç Motoru zaten "komisyon maliyeti" uyarısı veriyor (`abd-small-qty-commission`); gerçek bir komisyon oranı girilebilse bu net kâr/zarar hesabına dahil edilebilir.
- **Pozisyon şablonları** — sık kullanılan miktar/kaldıraç kombinasyonlarını "favori" olarak kaydetme.
- **Erişilebilirlik denetimi** — mevcut tasarım dataviz skill'inin kontrast kurallarına uyacak şekilde kuruldu, ama tam bir WCAG denetimi (klavye navigasyonu, ekran okuyucu etiketleri) henüz yapılmadı.
- **English i18n** — mimari buna hazır değil (metinler component içine gömülü); yapılacaksa önce bir çeviri anahtarı katmanı (ör. basit bir `t()` fonksiyonu + JSON sözlük) eklenmeli.

### Önceliklendirme özeti

| Faz | Değer | Efor | Önerilen sıra |
|---|---|---|---|
| Gerçek trade journal | Yüksek | Orta | 1 |
| Test paketi | Orta (uzun vadede yüksek) | Düşük | 2 |
| CI/CD | Orta | Düşük | 3 |
| PWA | Düşük-Orta | Düşük | 4 |
| Komisyon alanı | Düşük-Orta | Düşük | 5 |
| Bulut senkronu | Yüksek (ama riskli) | Yüksek | Ürün kararı bekliyor |
| Fiyat bildirimleri | Yüksek | Yüksek | Ürün kararı bekliyor |
| i18n | Düşük (şimdilik) | Orta | Talep gelirse |

**Genel görüş:** Proje şu haliyle "hesap makinesi" kimliğinde tutarlı ve tamamlanmış hissettiriyor. En doğal büyüme yönü, bu kimliği bozmadan (backend eklemeden) **geçmişe dayalı zeka** eklemektir (Faz 2) — çünkü uygulama zaten her işlem için tüm hesabı yapıyor, eksik olan tek şey "bu tahminin ne kadar isabetli çıktığı" geri bildirimi. Bulut senkronu ve bildirimler gerçek değer katar ama ürünün "basit, hesap makinesi gibi, veritabanı yok" konumlandırmasıyla doğrudan gerilir; bunlara girmeden önce bunun bilinçli bir konumlandırma değişikliği olduğu kabul edilmeli.
