# CLAUDE.md — Trade Kasa Yönetimi

Bu dosya, kod tabanını okuyarak çıkarılmıştır. Emin olunamayan noktalar **[belirsiz]** ile işaretlenmiştir.

---

## 1. Projenin Amacı

- Bağımsız bir **pozisyon planlayıcı / risk hesaplayıcı** web uygulaması. Kullanıcı alt kasa bakiyelerini ve risk parametrelerini girer; uygulama BİST, VİOP, ABD ve Kripto işlemleri için pozisyon büyüklüğü, olası kayıp/kazanç, R:R ve limit aşımlarını hesaplar.
- Hedef kullanıcı: kendi sermayesini birden fazla piyasaya bölmüş, işlem öncesi risk boyutlandırması yapmak isteyen bireysel yatırımcı (arayüz tamamen Türkçe).
- Çözdüğü problem: "bu işlemde ne kadar riske giriyorum" sorusunu **iki referansa birden** (toplam kasa ve ilgili alt kasa) oranlayarak yanıtlar. Sunucu/veritabanı yoktur — hesap makinesi gibi çalışır, tüm veri tarayıcıda kalır.
- Uygulama içinde açıkça yatırım tavsiyesi olmadığı belirtilir (`src/App.tsx` footer).

---

## 2. Teknoloji Yığını

- **Dil:** TypeScript 5.6 (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`; `noEmit`)
- **Çatı:** React 18.3 (`react`, `react-dom`), JSX runtime `react-jsx`
- **Derleyici/sunucu:** Vite 5.4 + `@vitejs/plugin-react`; dev sunucu portu **9000** (`vite.config.ts`)
- **Stil:** Tailwind CSS 3.4 (`darkMode: 'class'`) + PostCSS + autoprefixer; renkler CSS değişkenleriyle (`src/index.css`)
- **İkonlar:** `lucide-react` 0.462
- **Veritabanı:** Yok. Kalıcılık yalnızca `localStorage`.
- **Barındırma:** Firebase Hosting (`firebase.json` → `public: "dist"`, SPA rewrite `**` → `/index.html`), proje kimliği `trade-kasa` (`.firebaserc`)
- **Harici servis:** `https://open.er-api.com/v6/latest/USD` — anahtarsız USD/TRY kuru (`src/lib/fxRate.ts`)
- **Firebase JS SDK kurulu DEĞİL.** `src/lib/firebase.ts` yalnızca `VITE_FIREBASE_*` env değişkenlerinden bir config nesnesi export eder; hiçbir yerde import edilmez, çalışma zamanında kullanılmaz.
- **Test kütüphanesi yok**, lint aracı (ESLint vb.) yok.
- Git uzak deposu: `https://github.com/sinanbocek/trade-kasa.git`

---

## 3. Klasör ve Dosya Yapısı

```
index.html              # Giriş HTML'i; React'ten önce çalışan tema (dark class) inline script'i
vite.config.ts          # Vite + React eklentisi, port 9000
firebase.json/.firebaserc
.env / .env.example     # VITE_FIREBASE_* (gerçek .env git'e girmez)
public/favicon.svg
dist/                   # Derleme çıktısı (git'e girmez)
docs/                   # Dokümantasyon (git'te İZLENMİYOR — untracked)
  guides/guides.md      # 360° proje rehberi (v1.0 bazlı, ayrıntılı)
  ideas/alt-kasa-risk-tavani.md  # Yapılmamış bir geliştirme önerisi
src/
  main.tsx              # KOD GİRİŞ NOKTASI — ThemeProvider > SettingsProvider > App
  App.tsx               # Layout, 5 sekme, tema butonu, footer
  types.ts              # Tüm ortak tipler (MarketConfig, Settings, TradeInput, TradeResult)
  index.css             # Tailwind direktifleri + tüm tasarım tokenları (:root / :root.dark)
  vite-env.d.ts
  config/markets.ts     # 4 piyasanın davranış tanımı (MARKETS, MARKET_ORDER)
  lib/
    calc.ts             # Hesap motoru (saf fonksiyonlar)
    coach.ts            # Kural tabanlı yorum/"Koç" motoru (saf)
    format.ts           # tr-TR biçimlendirme + ayrıştırma
    fxRate.ts           # USD/TRY kur katmanı + localStorage önbelleği
    storage.ts          # Settings varsayılanları + localStorage okuma/yazma/import/export
    history.ts          # İşlem geçmişi (localStorage, son 200 kayıt)
    firebase.ts         # Kullanılmayan config iskeleti
  context/
    SettingsContext.tsx # Ayarlar + kur durumu sağlayıcısı (useSettings)
    ThemeContext.tsx    # light/dark/system tema (useTheme)
  hooks/useHistory.ts   # Geçmiş listesi + ekle/temizle
  components/
    Hero.tsx            # Toplam kasa paneli, TL/USD çipleri, kur kutusu, dağılım barı
    ui.tsx              # InfoTip, ConfirmDialog, DirectionToggle, NumField, Card, Row
    tabs/TradeTab.tsx   # ANA EKRAN — 4 piyasa için tek jenerik işlem sekmesi
    tabs/SettingsTab.tsx
    charts/{Meter,Sparkline,AllocationBar}.tsx
    coach/CoachPanel.tsx
```

Önemli dosyalar: `src/lib/calc.ts` (tüm formüller), `src/lib/coach.ts` (~50 kural, dosyanın çoğu metin), `src/components/tabs/TradeTab.tsx` (ana ekran), `src/types.ts` (sözleşme), `src/index.css` (tasarım tokenları).

---

## 4. Mimari ve Veri Akışı

**Katmanlar (yukarıdan aşağı bağımlılık, ters yönde bağımlılık yok):**

1. `types.ts` + `config/markets.ts` — veri sözleşmesi ve piyasa kuralları
2. `lib/` — saf mantık (`calc.ts`, `coach.ts`, `format.ts`) ve I/O sarmalayıcıları (`storage.ts`, `history.ts`, `fxRate.ts`). `calc.ts` ve `coach.ts` React'e hiç bağımlı değildir.
3. `context/` — React state (ayarlar, kur, tema)
4. `components/` — sunum

**Veri akışı (bir işlem hesabı):**

- `TradeTab` form alanlarını **string** olarak tutar → `parseNumber()` ile sayıya çevirir → `TradeInput` oluşturur.
- `computeTrade(input, market, settings)` → `TradeResult` (hacim, bloke sermaye, kaldıraç, olası kayıp/kazanç, 4 oran, `thresholdDays`, geçerlilik bayrakları).
- `buildInsights(input, result, market, settings)` → şiddete göre sıralı `Insight[]`; ilk `MAX_VISIBLE_INSIGHTS` (8) tanesi `CoachPanel`'de gösterilir.
- Hesap **her render'da yeniden yapılır**; hiçbir ara sonuç saklanmaz.
- Kullanıcı "İşlemi Geçmişe Kaydet" derse anlık metrikler `tky_history_v1`'e eklenir (`useHistory` → `history.ts`) ve `Sparkline`'da risk eğilimi olarak çizilir.

**Ayarlar akışı:** `SettingsProvider` mount olurken `loadSettings()` ile localStorage'dan okur; her `settings` değişiminde `useEffect` ile geri yazar. `update(patch)` kısmi güncelleme yapar.

**Kur akışı:** İlk mount'ta `readCachedRate()` ile önbellek okunur ve `usdTryKuru` ile birleştirilir; önbellek yoksa ya da `FX_REFRESH_MS` (1 saat) eskiyse `fetchLiveRate()` çağrılır. Ayrıca `setInterval` ile saat başı yenilenir. Hata olursa `fx.error` set edilir, mevcut değer korunur.

**Kimlik doğrulama / yetkilendirme:** **Yoktur.** Auth, kullanıcı hesabı, sunucu tarafı yetkilendirme yok; uygulama tamamen istemci tarafında ve tek kullanıcılıdır. Firebase Hosting yalnızca statik dosya sunar.

**Arka plan işleri:** Yok. Tek periyodik iş, `SettingsProvider` içindeki saatlik kur yenileme `setInterval`'idir. Service worker / PWA yok.

---

## 5. Veri Modeli

Veritabanı yoktur; "tablo" karşılığı localStorage anahtarlarıdır.

| Anahtar | İçerik | Tanım yeri |
|---|---|---|
| `tky_settings_v1` | `Settings` nesnesi (JSON) | `lib/storage.ts` |
| `tky_history_v1` | `TradeHistoryEntry[]`, son **200** kayıt | `lib/history.ts` |
| `tky_theme_v1` | `'light' \| 'dark' \| 'system'` | `context/ThemeContext.tsx` (ayrıca `index.html` okur) |
| `tky_fx_usdtry` | `FxResult` = `{ rate, fetchedAt, source }` | `lib/fxRate.ts` |

**`Settings`** (tüm sayısal alanlar `number`):

| Alan | Anlam | Varsayılan |
|---|---|---|
| `version` | Şema sürümü (`SETTINGS_VERSION = 1`) | 1 |
| `bistKasaTL` | BİST alt kasası (₺) | 700000 |
| `viopKasaTL` | VİOP alt kasası (₺) | 300000 |
| `abdKasaUSD` | ABD alt kasası ($) | 4000 |
| `kriptoKasaUSD` | Kripto alt kasası ($) | 1000 |
| `usdTryKuru` | USD/TRY | 40 |
| `maxRiskYuzdesi` | Tek işlem olası kaybının **toplam kasaya** max oranı (%) | 1 |
| `maxPozisyonYuzdesi` | Tek işlem hacminin **toplam kasaya** max oranı (%) | 20 |
| `hedefRR` | Hedef risk:ödül (1:X) | 2.5 |
| `risksizGetiriTL` | Yıllık % — BİST/VİOP eşik süresi hesabı | 35 |
| `risksizGetiriUSD` | Yıllık % — ABD/Kripto eşik süresi hesabı | 3 |

**`MarketConfig`** (`config/markets.ts`, 4 sabit kayıt — düzenlenebilir ayar değil):

| key | currency | fractionalQty | allowLeverage | allowShort | defaultMultiplier | qtyLabel | kasaKey | riskFreeKey |
|---|---|---|---|---|---|---|---|---|
| `bist` | TRY | false | false | false | 1 | Lot | `bistKasaTL` | `risksizGetiriTL` |
| `viop` | TRY | false | true | true | 100 | Kontrat | `viopKasaTL` | `risksizGetiriTL` |
| `abd` | USD | true | true | true | 1 | Adet | `abdKasaUSD` | `risksizGetiriUSD` |
| `kripto` | USD | true | true | true | 1 | Adet | `kriptoKasaUSD` | `risksizGetiriUSD` |

**`TradeHistoryEntry`:** `id` (crypto.randomUUID ya da `timestamp-random`), `ts` (epoch ms), `market` (MarketKey), `direction` (`long|short`), `price`, `stop`, `tp` (`number | null` — TP geçersizse null), `qty`, `volumeNative`, `riskPctTotal`, `exposurePctTotal`, `rr` (`number | null`).

**İlişkiler:**
- `MarketConfig.kasaKey` → `Settings` içindeki alt kasa alanına işaret eder (tip düzeyinde bağlı).
- `MarketConfig.riskFreeKey` → `Settings` içindeki risksiz getiri alanına işaret eder.
- `TradeHistoryEntry.market` → `MarketKey` (yabancı anahtar benzeri; `historyForMarket()` ile filtrelenir).
- `Settings` ile `TradeHistoryEntry` arasında kalıcı bağ yoktur; geçmiş kaydı, kaydedildiği andaki ayarlarla hesaplanmış yüzdeleri **donmuş** olarak tutar.

**Temel formüller (`lib/calc.ts`):**
- `totalKasaTRY = bistKasaTL + viopKasaTL + (abdKasaUSD + kriptoKasaUSD) × usdTryKuru`
- `volumeNative = qty × price × multiplier`
- `capitalUsedNative = marginPerUnit > 0 ? qty × marginPerUnit : volumeNative`; `leverage = volume / capitalUsed` (teminat yoksa 1)
- `potentialLoss = |price − stop| × qty × multiplier` (yalnızca `stopValid` ise), `potentialProfit` aynı mantıkla TP ile
- `riskPctTotal / riskPctSub / exposurePctTotal / exposurePctSub` — dört oran
- `thresholdDays = log(1 + hedefGetiriOranı) / log(1 + günlükRisksizOran)`, min 1 gün
- `insufficientBalance = capitalUsedNative > subKasaNative`

---

## 6. Geliştirme Komutları

```bash
npm install
```
```bash
npm run dev
```
```bash
npm run build
```
```bash
npm run preview
```
```bash
npm run lint
```

- `dev` → Vite, `http://localhost:9000`
- `build` → `tsc --noEmit && vite build` → `dist/`
- `lint` → yalnızca `tsc --noEmit` (gerçek bir linter değil)
- **Test komutu yoktur** — otomatik test yok.

Dağıtım (manuel):
```bash
npm run build
```
```bash
firebase deploy --only hosting
```
İlk kez: `firebase login`, gerekirse `firebase use trade-kasa`. CI/CD yapılandırması yok.

---

## 7. Kurallar ve Konvansiyonlar

- **Dil:** Kod içi yorumlar, commit mesajları, kullanıcıya görünen tüm metinler **Türkçe**. Alan adları da Türkçe (`maxRiskYuzdesi`, `bistKasaTL`) — İngilizce/Türkçe karışıktır ama tutarlı bir bölünme var: domain/ayar alanları Türkçe, hesap sonucu alanları İngilizce (`volumeNative`, `potentialLossTRY`).
- **Dosya başlıkları:** `lib/` altındaki dosyalar `// ===...===` çerçeveli Türkçe bir başlık bloğuyla başlar; yeni `lib/` dosyaları aynı deseni izlemeli.
- **Saf mantık ayrımı:** `calc.ts` ve `coach.ts` React/store bağımlılığı içermez. Yeni hesap ya da kural buraya yazılır; UI'ya hesap gömülmez.
- **`computeTrade` uyarı üretmez** — sadece oran döndürür. Uyarı/yorum üretimi `coach.ts` ve `TradeTab.tsx` içindedir.
- **Config-driven piyasa:** Piyasa farkları ayrı bileşenle değil, `MarketConfig` alanlarıyla ifade edilir. Yeni bir piyasa davranışı gerekirse önce `MarketConfig`'e alan eklenir, `TradeTab` tek kalır.
- **Renkler:** Bileşenlerde ham hex **kullanılmaz**; `var(--token)` kullanılır. Tokenlar `src/index.css` içinde `:root` ve `:root.dark` altında tanımlıdır. (İstisnalar: `Hero.tsx`'in bilinçli olarak her zaman koyu olan gradyanı ve `#fff` metin renkleri.)
- **Tailwind + inline style karışımı:** yerleşim/tipografi Tailwind sınıflarıyla, renkler `style={{ ... var(--token) }}` ile verilir. Mevcut desen budur.
- **Sayı biçimi (tr-TR):** nokta = binlik ayraç, virgül = ondalık. Girişler `formatGroupedInput()` ile canlı biçimlenir, `parseNumber()` ile çözülür. Yeni sayı alanları **her zaman** bu ikiliyi kullanmalı; ham `Number(value)` kullanılmamalı.
- **Form state string tutulur**, sayıya yalnızca hesap anında çevrilir.
- **localStorage erişimi** her zaman `try/catch` ile sarılır ve hata sessizce yutulur (yorum: `/* yut */`).
- **Geri alınamaz eylemler** için native `confirm()` değil `ConfirmDialog` kullanılır.
- **Her metrik için `InfoTip`** açıklaması yazma alışkanlığı var; yeni metrik eklerken tip metni de eklenmeli.
- **Bileşen ihracı:** hepsi named export ve `React.FC<{...}>` tipiyle; `App` tek default export.
- **`.env` git'e girmez** (`.env.example` girer). Yeni env değişkeni eklenirse örnek dosyaya da eklenmeli.

---

## 8. Tuzaklar ve Dikkat Edilecekler

- **Kur elle girildiğinde kalıcı değildir.** `SettingsContext`, mount'ta önbellek/canlı kuru `usdTryKuru`'ya yazar ve saat başı `setInterval` ile tekrar üzerine yazar. Ayarlar'da elle girilen kur, bir sonraki otomatik yenilemede kaybolur.
- **Alt kasa oranlarının tavanı yok.** `riskPctSub` ve `exposurePctSub` hesaplanır ve gösterilir, ama `Settings`'te alt kasaya özel bir limit alanı yoktur; `Meter` bileşenleri bunları **toplam kasa limitleriyle** (`maxRiskYuzdesi` / `maxPozisyonYuzdesi`) karşılaştırır. Bu bilinçli bir eksiklik olarak `docs/ideas/alt-kasa-risk-tavani.md` içinde belgelenmiş, henüz uygulanmamıştır.
- **`normalizeSettings()` gerçek bir migrasyon yapmaz:** varsayılanlarla sığ birleştirme (`{...DEFAULT, ...raw}`) yapar, sayısal alanları `Number.isFinite` ile doğrular ve `version`'ı koşulsuz `SETTINGS_VERSION`'a set eder. Alan yeniden adlandırma / anlam değişikliği gerektiren bir değişiklikte burada açık bir sürüm dallanması yazılmalıdır.
- **`parseNumber` noktayı binlik ayraç sayar:** `"1.5"` → `15`. Ondalık için virgül gerekir. Test/hesap kodunda string üretirken buna dikkat.
- **"Geçmişi temizle" tüm piyasaları siler.** `TradeTab` içindeki buton yalnızca o piyasanın kaydını değil, `tky_history_v1`'in tamamını temizler (`clearHistory()`). Dialog metni bunu doğru söylüyor, buton etiketi yanıltıcı olabilir.
- **`useHistory` her `TradeTab` örneğinde ayrı state tutar.** 4 sekme aynı anda mount olduğundan 4 bağımsız kopya vardır; birinde kaydetmek diğerlerinin state'ini güncellemez (yalnızca localStorage ortaktır, sayfa yenilenene kadar diğer sekmeler eski listeyi gösterir).
- **Sekmeler unmount edilmez.** `App.tsx` işlem sekmelerini `display:none` ile gizler (form verisi korunsun diye). Sekmeye özgü "mount'ta çalışsın" mantığı yazarken bu geçerli değildir. Yalnızca Ayarlar sekmesi koşullu render edilir.
- **`insights` `useMemo` bağımlılıkları her render değişir** (`input` ve `r` her render'da yeni nesne). Memo pratikte etkisizdir; performans sorunu görülürse asıl neden budur.
- **BİST'te teminat alanı yoktur** ve `computeTrade` `allowLeverage` false ise `marginPerUnit`'i sıfırlar. Yani BİST'te `capitalUsed = volume`, kaldıraç her zaman 1.
- **Kur kaynağı tek noktadır** (`open.er-api.com`, günlük güncellenir). Yedek kaynak yoktur; başarısız olursa önbellek ya da mevcut değer kullanılır.
- **`src/lib/firebase.ts` ölü koddur** — `firebase` paketi kurulu değil. Buna dayanarak Firestore/Auth kodu yazmadan önce paketin kurulması ve Security Rules yazılması gerekir; kurallar yazılmadan prod'a alınmamalı.
- **`.claude/settings.json` içinde `node scripts/validate_palette.js ...` izni var ama `scripts/` klasörü depoda yoktur.** `docs/guides/guides.md` de bu betikten söz eder; mevcut değildir.
- **`docs/` git'te izlenmiyor** (untracked). Oradaki bilgi kaybolabilir; kaynak doğruluğu için önce koda bakın.
- **Otomatik test yok** — `calc.ts`/`coach.ts` formüllerini değiştirirken hiçbir güvenlik ağı yoktur. Değişiklikten sonra en az `npm run build` çalıştırın.
- **Asla yapılmaması gerekenler:** kullanıcı verisini sunucuya göndermek (uygulamanın "veritabanı yok" konumlandırması ve footer'daki söz), yatırım tavsiyesi diline kayan metinler yazmak, bileşenlere ham renk hex'i gömmek, `.env`'i commit'lemek.

---

## 9. Mevcut Durum

- **Sürüm:** `package.json` 1.0.0; git etiketi `v1.0`. Son commit: Firebase yapılandırmasının `.env` değişkenlerine taşınması.
- **Çalışan:** 5 sekme (BİST/VİOP/ABD/Kripto/Ayarlar); hesap motoru; ~50 kurallı Koç motoru; Meter/Sparkline/AllocationBar görselleştirmeleri; açık/koyu/sistem teması; canlı + elle USD/TRY kuru; ayarların localStorage'da saklanması; JSON dışa/içe aktarma; işlem geçmişi ve risk eğilimi sparkline'ı; Firebase Hosting'e manuel dağıtım.
- **Eksik:** otomatik test, ESLint, CI/CD, çoklu cihaz senkronu, gerçek trade journal (kaydedilen işlemin sonucu izlenmiyor — yalnızca plan anlık görüntüsü), alt kasa risk tavanı, komisyon/spread alanı, PWA, i18n, tam erişilebilirlik denetimi.
- **Belgelenmiş sıradaki işler** (`docs/ideas/alt-kasa-risk-tavani.md` — henüz kodda yok): `Settings`'e `maxRiskYuzdesiSub` / `maxPozisyonYuzdesiSub` eklenmesi, ayrı alt kasa uyarısı, SettingsTab girişleri, sürüm migrasyonu.
- **`docs/guides/guides.md` §16'da önerilen faz sırası:** (1) gerçek trade journal, (2) test paketi (Vitest), (3) CI/CD, (4) PWA, (5) komisyon alanı; bulut senkronu ve fiyat bildirimleri ürün kararı olarak beklemede. Bunlar öneridir, karar verilmiş iş değildir. **[belirsiz]** — hangisinin fiilen sıradaki iş olduğu kodda ya da git geçmişinde belirtilmemiş.
