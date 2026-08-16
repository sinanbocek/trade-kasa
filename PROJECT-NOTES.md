# PROJECT-NOTES.md — Proje İhlal ve Standartlara Geçiş Raporu

**Proje:** Trade Kasa Yönetimi (`trade-kasa`)  
**Tarih:** 15 Ağustos 2026  
**Bağlayıcı Belgeler:** `AI-RULES.md` (v2.0) · `ABACUS-SPEC.md` (v1.0)

---

## 1. ABACUS Durumu ve Motor Analizi

### 1.1 Mevcut Hesap ve Biçim Mantığının Yeri
Mevcut projede hesaplama ve formatlama işlemleri `src/lib/` klasörü altında dağınık ve standart dışı bir şekilde bulunmaktadır:
* `src/lib/format.ts`: Tüm para, yüzde, miktar ve sayı biçimlendirmelerini `toLocale*` ve `toFixed` kullanarak doğrudan JS sayıları üzerinde yapmaktadır.
* `src/lib/calc.ts`: Tüm kasa toplamları, pozisyon hacimleri, sermaye/teminat gereksinimleri, R:R oranları ve fırsat maliyeti eşik sürelerini JS float `number` aritmetiği ile hesaplamaktadır.
* `src/lib/coach.ts`: İşlem girdilerini ve sonuçlarını değerlendirip Türkçe içgörüler (insights) üretmektedir. Ancak biçimlendirmeyi `fmtCurrency` ve `fmtDecimal` üzerinden bağımsız yapmakta ve yaygın `|| 0` varsayılanları içermektedir.
* `src/components/Hero.tsx`: Göreli zaman ifadesini (`timeAgo`) `Math.floor` ile ad-hoc olarak kendi içinde hesaplamaktadır.

### 1.2 ABACUS Motor Yapısına Göre Mevcut / Eksik Durumu

| Motor | Durum | Mevcut Yapıdaki Yeri / Eksikler |
|---|---|---|
| `math` | **EKSİK** | `calc.ts` içinde JS float `number` ile yapılıyor. `decimal.js` entegrasyonu yok. |
| `money` | **EKSİK / YANLIŞ YERDE** | `format.ts` içinde `toLocaleString` / `toFixed` ile yapılıyor. TCMB kuralı (boşluksuz `₺`, sağda `TL`, `null` için `—`, `0` için `0`, `toWords`, `compact`) eksik. Para float işleniyor. |
| `currency` | **EKSİK / YANLIŞ YERDE** | `calc.ts` ve `Hero.tsx` içinde `usdTryKuru` ile doğrudan çarpılıyor. Ayrı kur dönüşüm motoru yok. |
| `date` | **EKSİK / YANLIŞ YERDE** | `Hero.tsx` içinde `timeAgo` fonksiyonu elle yazılmış. ABACUS `date` motoru yok. |
| `text` | **EKSİK** | Ek çekimi (`suffix`), Türkçe büyük/küçük harf (`İ/ı`), unvan/metin normalizasyonu yok. |
| `validate` | **EKSİK** | Girdi doğrulama motoru (VKN, TCKN, IBAN vb.) yok. |
| `mask` | **EKSİK** | PII / gizleme motoru yok. |
| `trading` *(Projeye Özel)* | **EKSİK** | Projeye özgü pozisyon hesaplama mantığı (`calc.ts`) ABACUS standartlarına uyarlanmış tiplenmiş motor yapısında değil. |

### 1.3 Mevcut Dosyaların Yeni Yapıya Dönüşümü
* `src/lib/format.ts` → **Tamamen Silinecek**: İşlevleri `src/domain/abacus/money/` ve `text/` motorlarına aktarılacak.
* `src/lib/calc.ts` → **Dönüştürülecek**: Mantık `src/domain/abacus/trading/` ve `math/` altına taşınacak, kuruş integer (`BIGINT`/`number` int) ve `decimal.js` ile yeniden yazılacak.
* `src/lib/coach.ts` → **Dönüştürülecek**: `src/domain/abacus/coach/` (veya `domain/` use-case) altına taşınarak ABACUS formatçıları ile tamamen tiplenmiş ve `null`-guarded hale getirilecek.

---

## 2. AI-RULES.md Kural İhlalleri Taraması

### 2.1 ABACUS Dışında `Intl` / `toLocale*` / `toFixed` / `parseFloat` İhlalleri
ESLint ile yasaklanması gereken yerel formatlama çağrılarının tam listesi:

* **`src/lib/format.ts`**
  * Satır 14: `v.toLocaleString('tr-TR', ...)` (`fmtCurrency`)
  * Satır 24: `v.toLocaleString('tr-TR', ...)` (`fmtAmount`)
  * Satır 33: `v.toFixed(digits).replace('.', ',')` (`fmtPct`)
  * Satır 39: `v.toFixed(digits).replace('.', ',')` (`fmtDecimal`)
  * Satır 54: `parseInt(clean, 10).toLocaleString('tr-TR')` (`formatIntInput`)
  * Satır 60: `v.toLocaleString('tr-TR', ...)` (`fmtDecimalGrouped`)
* **`src/components/Hero.tsx`**
  * Satır 110: `rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })`
* **`src/context/SettingsContext.tsx`**
  * Satır 50: `Number(r.rate.toFixed(4))`
  * Satır 65: `Number(cached.rate.toFixed(4))`
* **`src/components/charts/Sparkline.tsx`**
  * Satır 27, 30: `x.toFixed(1)`, `y.toFixed(1)`, `lx.toFixed(1)`, `fx.toFixed(1)` (SVG koordinat string üretimi — UI/SVG haritalama kuralına uygun utility'e dönüştürülecek).

### 2.2 Para Birimi & Sayısal Hassasiyet İhlalleri (`AI-RULES §3.5`)
* **İHLAL:** Projedeki tüm para tutarları (`bistKasaTL`, `viopKasaTL`, `abdKasaUSD`, `kriptoKasaUSD`), fiyatlar, stop/TP seviyeleri ve hesaplanan hacim/kayıp tutarları float `number` (örn: `105000.50`) olarak tutulmakta ve float aritmetiği ile işlenmektedir.
* **Standart:** Para **her zaman kuruş bazlı tam sayı** (`number` int / DB'de `BIGINT`) olmalıdır. Ondalıklı float para yasaktır.

### 2.3 Tip Güvenliği İhlalleri (`AI-RULES §5`)
* `tsconfig.json` dosyasında `"strict": true` açık durumdadır.
* **İHLAL:** `noUncheckedIndexedAccess: true` **EKSİKTİR**.
* **İHLAL:** `exactOptionalPropertyTypes: true` **EKSİKTİR**.
* *Not:* Projede `any`, `@ts-ignore` veya `@ts-expect-error` kullanımı **tespit edilmemiştir** (Temiz).

### 2.4 Sessiz `|| 0` / Fallback İhlalleri (`AI-RULES §3.6 & §4`)
Sessiz varsayılan atamaları `0` ile yokluk (`—`) ayrımını bozmakta ve hatalı veriyi gizlemektedir:

* **`src/lib/calc.ts`**: Satır 8, 9, 10, 15, 20, 39, 46, 54, 55, 56, 57, 59, 62, 64, 106 (`|| 0` ve `|| 1` atamaları).
* **`src/lib/coach.ts`**: Satır 33, 34, 35, 36, 144, 191, 355 (`|| 0` atamaları).
* **`src/components/Hero.tsx`**: Satır 46, 49, 50, 51, 52 (`|| 0` atamaları).

### 2.5 Sır Sızıntısı Taraması (`AI-RULES §8`)
* **DURUM: TEMİZ.** Kod dosyalarında veya konfigürasyonlarda hardcoded secret / API key tespit edilmemiştir.
* `.env` dosyası `.gitignore` altındadır.
* `.env.example` placeholder değerlere sahiptir.

---

## 3. Eksik Altyapı ve Otomasyon Analizi

Projede katman kurallarını ve ABACUS yasaklarını makine zorlamasıyla garanti altına alacak altyapılar henüz kurulmamıştır:

| Altyapı Bileseni | Mevcut Durum | Gereksinim / Kurulacak Paketler |
|---|---|---|
| **ESLint Config** | ❌ **YOK** | `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` kurulmalı. |
| **Boundaries Rule** | ❌ **YOK** | `eslint-plugin-boundaries` ile katman sınırları (presentation → domain vb.) tanımlanmalı. |
| **No-Restricted-Syntax** | ❌ **YOK** | `Intl.*`, `.toLocale*`, `.toFixed`, `parseFloat` kullanımını `src/domain/abacus/` dışı için `error` yapacak ESLint kuralı yazılmalı. |
| **Test Framework** | ❌ **YOK** | `vitest` kurulmalı ve `package.json`'a `"test": "vitest run"` script'i eklenmeli. |
| **Husky Pre-commit** | ❌ **YOK** | `husky` ve `lint-staged` kurularak commit öncesi `tsc` ve `lint` zorunlu kılınmalı. |
| **CI Workflow** | ❌ **YOK** | `.github/workflows/ci.yml` oluşturularak `install → lint → typecheck → build → test` pipeline'ı ve presentation `grep guard` eklenmeli. |

---

## 4. Öncelikli Kademeli Geçiş Planı (Migration Roadmap)

`AI-RULES.md §14` gereği toplu refactor yapılmayacak, geçiş atomik ve tek başına test edilebilir adımlarla yürütülecektir:

### Adım 1: Otomasyon & Altyapı Kurulumu (Tooling & Quality Gates)
1. ESLint ve `eslint-plugin-boundaries` paketlerinin yüklenmesi; `eslint.config.js` dosyasının oluşturulması (`no-restricted-properties` ile `toLocale*`/`toFixed` yasaklarının `abacus` dışı için tanımlanması).
2. Vitest test altyapısının kurulması ve `package.json` içerisine `test` ve `lint` script'lerinin eklenmesi (`build` script'inin `tsc && npm run lint && npm run test && vite build` yapılması).
3. `tsconfig.json` dosyasına `noUncheckedIndexedAccess: true` ve `exactOptionalPropertyTypes: true` bayraklarının eklenmesi.
4. Husky `pre-commit` hook'unun yapılandırılması.

### Adım 2: Çekirdek ABACUS Katmanının Oluşturulması (`src/domain/abacus/`)
1. `decimal.js` bağımlılığının projeye eklenmesi.
2. `src/domain/abacus/` klasör yapısının ve barrel (`index.ts`) dışa aktarımının kurulması.
3. TDD (kırmızı-yeşil) ilkesiyle çekirdek motorların yazılması ve birim testlerinin eklenmesi:
   * `math` (Decimal.js ile 4 işlem, half-up yuvarlama, oran, yüzde)
   * `money` (Kuruş integer bazlı TCMB uyumlu biçimlendirme, `toWords`, `compact`)
   * `currency` (Dışarıdan verilen kur ile dönüştürme)
   * `date` (Türkçe tarih biçimlendirme ve relative zaman hesaplama)
   * `text` (Ek çekimi, `İ/ı` duyarlı büyük/küçük harf, normalizasyon)
   * `validate` & `mask` (Girdi doğrulama ve PII gizleme)

### Adım 3: Projeye Özel Motorların ABACUS Yapısına Taşınması
1. `src/domain/abacus/trading/` motorunun oluşturulması; `calc.ts` içindeki pozisyon hesaplama mantığının (`computeTrade`, `qtyFromVolume`, `calculateThresholdDays`) kuruş bazlı integer ve `decimal.js` yapısına dönüştürülerek buraya taşınması + unit testlerinin yazılması.
2. `src/domain/abacus/coach/` motorunun oluşturulması; `coach.ts` içindeki `buildInsights` mantığının sessiz `|| 0` varsayılanlarından arındırılarak tiplenmiş ABACUS motorlarıyla entegre edilmesi.

### Adım 4: Presentation (UI) Katmanının Dönüştürülmesi
1. UI bileşenlerinde (`Hero.tsx`, `TradeTab.tsx`, `SettingsTab.tsx`, `Sparkline.tsx`) doğrudan çağrılan `format.ts` ve `calc.ts` bağımlılıklarının temizlenmesi, doğrudan ABACUS barrel export'larına bağlanması.
2. `src/lib/format.ts` dosyasının projeden silinmesi.
3. State ve storage katmanında (`SettingsContext`, `storage.ts`) tutarların kuruş integer seviyesinde tutulması için adaptörlerin eklenmesi.

### Adım 5: CI Guard & Tam Doğrulama
1. `.github/workflows/ci.yml` oluşturulması.
2. `src/presentation/` veya `src/components/` altında `Intl|toLocale|toFixed|Decimal|parseFloat` taraması yapan CI grep guard'ın aktifleştirilmesi.
3. Tam `lint + typecheck + test + build` kanıtının sunularak geçişin tamamlanması.

---

## 5. Adım 3-4 Geçiş Haritası (Tam Fonksiyon Envanteri ve Sınıflandırma)

### 5.1 `format.ts` Tam Fonksiyon Envanteri ve Karar Tablosu

| Fonksiyon (imza) | Ne yapıyor (1 cümle) | ABACUS karşılığı | Durum |
|---|---|---|---|
| `fmtCurrency(value: number, currency: Currency = 'TRY', digits = 2): string` | Sayıyı belirtilen para birimi sembolü ve `tr-TR` binlik/ondalık ayraçlarıyla gösterir. | `money.format(amountMinor, { currency, digits })` | `TAM KARŞILANIYOR` |
| `fmtAmount(value: number, digits = 0): string` | Sayıyı/miktarı `tr-TR` binlik ve 0-4 ondalık basamak ile string'e çevirir. | `money.format` veya `math.round` | `TAM KARŞILANIYOR` |
| `fmtPct(value: number, digits = 1): string` | Sayıyı yüzde simgesi (`%`) ve virgüllü ondalıkla string'e çevirir. | `text.suffix(val, "percent")` veya `math.round` | `TAM KARŞILANIYOR` |
| `fmtDecimal(value: number, digits = 1): string` | Ondalık sayıyı belirtilen basamakta virgüllü stringe çevirir. | `math.round` / `String(x).replace('.', ',')` | `TAM KARŞILANIYOR` |
| `parseNumber(val: string): number` | `tr-TR` biçimli metin girdisini temizleyip ham JS sayısına çevirir. | ABACUS `text` / `math` String köprüsü | `TAM KARŞILANIYOR` |
| `formatIntInput(val: string): string` | Metin kutusundaki tam sayı girdisini anlık `tr-TR` binlik ayraçlı gösterir. | ABACUS `money.format` / `text` gruptan tam sayı | `TAM KARŞILANIYOR` |
| `fmtDecimalGrouped(value: number, digits = 0): string` | Ondalıklı sayıyı binlik ayraçlı (nokta) + ondalık (virgül) gösterir. | `money.format(amountMinor, { digits })` | `TAM KARŞILANIYOR` |
| `formatGroupedInput(raw: string): string` | Serbest ondalık giriş kutuları için canlı binlik nokta ayracı ekler. | ABACUS `money.format` / `text` canlı girdi formatçısı | `TAM KARŞILANIYOR` |

> **Net Karar (format.ts)**: `src/lib/format.ts` içerisindeki 8 fonksiyonun TAMAMI ABACUS çekirdek motorlarında (`money`, `math`, `text`) **TAM KARŞILANMAKTADIR**. Herhangi bir ön fonksiyon eklemesine gerek duyulmaksızın `format.ts` dosyası Adım 4'te **tümüyle silinecektir**.

---

### 5.2 `calc.ts` Tam Fonksiyon Envanteri ve Kova Tablosu

| Fonksiyon (imza) | Ne yapıyor | Çağıran dosyalar | Kova |
|---|---|---|---|
| `totalKasaTRY(s: Settings): number` | TL kasalar ile USD kasaların TL karşılığını toplayıp toplam TL kasa değerini hesaplar. | `Hero.tsx`, `calc.ts` | **(b) Projeye özel SAF HESAP** → `domain/abacus/trading/kasa.ts` |
| `totalKasaTLPart(s: Settings): number` | TL kasaların (`bistKasaTL` + `viopKasaTL`) toplamını döner. | `Hero.tsx` | **(b) Projeye özel SAF HESAP** → `domain/abacus/trading/kasa.ts` |
| `totalKasaUSDPart(s: Settings): number` | USD kasaların (`abdKasaUSD` + `kriptoKasaUSD`) toplamını döner. | `Hero.tsx` | **(b) Projeye özel SAF HESAP** → `domain/abacus/trading/kasa.ts` |
| `calculateThresholdDays(targetReturnRatio: number, annualRate: number): number` | Hedeflenen getiriye risksiz faiz oranıyla kaç günde ulaşılacağını bileşik faiz formülüyle hesaplar. | `calc.ts` (`computeTrade`) | **(b) Projeye özel SAF HESAP** → `domain/abacus/trading/opportunity.ts` |
| `qtyFromVolume(volume: number, price: number, multiplier: number, fractional: boolean): number` | Toplam hacim, fiyat ve kontrat çarpanından miktar türetir. | `TradeTab.tsx` | **(b) Projeye özel SAF HESAP** → `domain/abacus/trading/position.ts` |
| `volumeFromQty(qty: number, price: number, multiplier: number): number` | Miktar, fiyat ve kontrat çarpanından hacim hesaplar. | `TradeTab.tsx`, `calc.ts` | **(b) Projeye özel SAF HESAP** → `domain/abacus/trading/position.ts` |
| `computeTrade(input: TradeInput, market: MarketConfig, s: Settings): TradeResult` | Giriş girdisini alarak tüm pozisyon hacmi, teminat, kaldıraç, risk %, R:R ve fırsat maliyeti metriklerini hesaplar. | `TradeTab.tsx` | **(b) Projeye özel SAF HESAP** → `domain/abacus/trading/engine.ts` |

---

### 5.3 `coach.ts` Tam Fonksiyon Envanteri ve Kova Tablosu

| Fonksiyon (imza) | Ne yapıyor | Saf hesap mı, karar mı? | Kova |
|---|---|---|---|
| `buildInsights(input: TradeInput, r: TradeResult, market: MarketConfig, settings: Settings): Insight[]` | Girdi ve hesaplanan işlem sonuçlarını 12 farklı risk kategorisinde değerlendirip sıralı koç kartları (`Insight[]`) üretir. | **ÇİFT YAPILI (İki parçalı)**: Oran/mesafe hesapları (`exposureRatio`, `riskRatio`, `rrRatio`, `stopDistPct`) saf hesap; eşik kıyaslaması ve metin üretimi karar/UI mantığıdır. | **(c) İş Kararı / UI Mantığı (Application Layer)** → `src/services/coach/` kalacak. Saf oran hesapları Adım 4'te `trading` motorundaki `TradeResult` metriklerine devredilecek. |
| `LEVEL_RANK: Record<InsightLevel, number>` | Şiddet seviyesi öncelik sıralaması (`critical: 0`, `warning: 1` vb.). | Karar / Sabit Veri. | **(c) UI Mantığı** |
| `MAX_VISIBLE_INSIGHTS: number` | Panelde gösterilecek maksimum içgörü kartı sayısı (`8`). | Karar / Sabit Veri. | **(c) UI Mantığı** |

---

### 5.4 ABACUS `trading` Motoru Taslak Önizlemesi (`src/domain/abacus/trading/`)

`(b)` kovasındaki tüm saf hesapları toplayan ve `math` (Decimal.js) ile `currency` motorlarını kullanan tiplenmiş ABACUS motoru taslağı:

1. **`trading/kasa.ts`**:
   - `totalKasaTRY(settings: Settings): number` (kuruş int) — Toplam TL kasa tutarını hesaplar.
   - `totalKasaTLPart(settings: Settings): number` (kuruş int) — Yalnızca TL kasalarının toplamını hesaplar.
   - `totalKasaUSDPart(settings: Settings): number` (kuruş int) — Yalnızca USD kasalarının toplamını hesaplar.

2. **`trading/position.ts`**:
   - `volumeFromQty(qty: number, priceMinor: number, multiplier: number): number` — Miktar ve fiyattan pozisyon hacmini hesaplar.
   - `qtyFromVolume(volumeMinor: number, priceMinor: number, multiplier: number, fractional: boolean): number` — Hacimden pozisyon miktarını türetir.
   - `leverage(volumeNativeMinor: number, capitalUsedNativeMinor: number): number` — Fiili kaldıraç oranını hesaplar.

3. **`trading/opportunity.ts`**:
   - `calculateThresholdDays(targetReturnRatio: number, annualRate: number): number` — Hedef getirinin risksiz faiz eşik gün sayısını bileşik faizle hesaplar.

4. **`trading/engine.ts`**:
   - `computeTrade(input: TradeInput, market: MarketConfig, settings: Settings): TradeResult` — `math` ve `currency` motorlarıyla tüm pozisyon, teminat, kaldıraç, risk %, R:R ve bakiye metriklerini hesaplayan ana tiplenmiş motor.

---

### 5.5 ESLint 14 Warn Eşleştirme Listesi (`npm run lint`)

| Sıra | Dosya | Satır | İhlal Edilen Kural | Erime Yolu (Adım 4 UI Bağlama) |
|---|---|---|---|---|
| 1 | `src/components/Hero.tsx` | 110 | `no-restricted-properties` (`toLocaleString`) | `ABACUS.money.format` / `currency` kullanımına geçilerek erir. |
| 2 | `src/components/charts/Sparkline.tsx` | 33 | `no-restricted-properties` (`toFixed` x) | `ABACUS.math.round(x, 1)` kullanımına geçilerek erir. |
| 3 | `src/components/charts/Sparkline.tsx` | 33 | `no-restricted-properties` (`toFixed` y) | `ABACUS.math.round(y, 1)` kullanımına geçilerek erir. |
| 4 | `src/components/charts/Sparkline.tsx` | 34 | `no-restricted-properties` (`toFixed` lx) | `ABACUS.math.round(lx, 1)` kullanımına geçilerek erir. |
| 5 | `src/components/charts/Sparkline.tsx` | 34 | `no-restricted-properties` (`toFixed` fx) | `ABACUS.math.round(fx, 1)` kullanımına geçilerek erir. |
| 6 | `src/components/tabs/SettingsTab.tsx` | 28 | `react-hooks/exhaustive-deps` (unused disable) | Gereksiz `eslint-disable` satırı silinerek erir. |
| 7 | `src/context/SettingsContext.tsx` | 50 | `no-restricted-properties` (`toFixed`) | `ABACUS.math.round` / `money` kullanımına geçilerek erir. |
| 8 | `src/context/SettingsContext.tsx` | 65 | `no-restricted-properties` (`toFixed`) | `ABACUS.math.round` / `money` kullanımına geçilerek erir. |
| 9 | `src/lib/format.ts` | 14 | `no-restricted-properties` (`toLocaleString`) | **`format.ts` dosyası tamamen silinerek** erir. |
| 10 | `src/lib/format.ts` | 24 | `no-restricted-properties` (`toLocaleString`) | **`format.ts` dosyası tamamen silinerek** erir. |
| 11 | `src/lib/format.ts` | 33 | `no-restricted-properties` (`toFixed`) | **`format.ts` dosyası tamamen silinerek** erir. |
| 12 | `src/lib/format.ts` | 39 | `no-restricted-properties` (`toFixed`) | **`format.ts` dosyası tamamen silinerek** erir. |
| 13 | `src/lib/format.ts` | 54 | `no-restricted-properties` (`toLocaleString`) | **`format.ts` dosyası tamamen silinerek** erir. |
| 14 | `src/lib/format.ts` | 60 | `no-restricted-properties` (`toLocaleString`) | **`format.ts` dosyası tamamen silinerek** erir. |

---

## 6. ABACUS `engine.ts` (`computeTrade`) Geçiş Analizi

### 6.1 Tam İmza ve Tipler
- **İmza**: `computeTrade(input: TradeInput, market: MarketConfig, s: Settings): TradeResult`
- **Girdiler**:
  - `input: TradeInput`: `price` (fiyat), `stop` (stop fiyatı), `tp` (hedef fiyat), `qty` (miktar), `multiplier` (kontrat çarpanı), `marginPerUnit` (birim teminat), `direction` (`'long' | 'short'`).
  - `market: MarketConfig`: `key`, `label`, `currency` (`'TRY' | 'USD'`), `fractionalQty`, `allowLeverage`, `allowShort`, `defaultMultiplier`, `qtyLabel`, `kasaKey`, `riskFreeKey`.
  - `s: Settings`: `bistKasaTL`, `viopKasaTL`, `abdKasaUSD`, `kriptoKasaUSD`, `usdTryKuru`, `maxRiskYuzdesi`, `maxPozisyonYuzdesi`, `hedefRR`, `risksizGetiriTL`, `risksizGetiriUSD`.
- **Çıktı (`TradeResult`)**:
  - `volumeNative`: Piyasanın kendi para birimindeki toplam pozisyon hacmi.
  - `volumeTRY`: Pozisyon hacminin TL karşılığı.
  - `capitalUsedNative`: Kullanılan sermaye/teminat (native).
  - `capitalUsedTRY`: Kullanılan sermayenin TL karşılığı.
  - `leverage`: Fiili kaldıraç katı (kaldıraçsız ise 1).
  - `leveraged`: Kaldıraçlı işlem mi bayrağı (`boolean`).
  - `potentialLossNative`: Stop çalışırsa olası azami kayıp (native).
  - `potentialProfitNative`: TP çalışırsa olası azami kazanç (native).
  - `potentialLossTRY`: Olası azami kaybın TL karşılığı.
  - `potentialProfitTRY`: Olası azami kazancın TL karşılığı.
  - `rr`: Risk/Ödül oranı (`number | null`).
  - `exposurePctTotal`: Pozisyon hacminin toplam kasaya oranı (%).
  - `exposurePctSub`: Pozisyon hacminin alt kasaya oranı (%).
  - `riskPctTotal`: Olası kaybın toplam kasaya oranı (%).
  - `riskPctSub`: Olası kaybın alt kasaya oranı (%).
  - `thresholdDays`: Hedeflenen kazanca risksiz faizle ulaşma eşik gün sayısı (`number`).
  - `stopValid`: Stop seviyesi yön açısından geçerli mi (`boolean`).
  - `tpValid`: TP seviyesi yön açısından geçerli mi (`boolean`).
  - `insufficientBalance`: Kullanılan sermaye alt kasa bakiyesinden fazla mı (`boolean`).

### 6.2 İç Hesap Adımları ve ABACUS Karşılıkları
1. **Teminat Belirleme**: `allowLeverage` false ise 0; true ise `input.marginPerUnit`. (ABACUS: Saf guard).
2. **Kur ve Kasa Toplamı**: `currency.convert` & `trading.kasa.totalKasaTRY(s)`.
3. **Pozisyon Hacmi**: `trading.position.volumeFromQty` & `currency.convert`.
4. **Teminat ve Kaldıraç Katı**: `trading.position.leverage` & `currency.convert`.
5. **Stop/TP Yön Geçerliliği**: Yön bazlı mantıksal sınama (`stopValid`, `tpValid`).
6. **Kayıp/Kazanç Seviyeleri**: `math.sub`, `math.mul`, `math.max` & `currency.convert`.
7. **R:R Oranı**: `math.ratio(reward, risk)`.
8. **Portföy Risk Oranları (%)**: `math.percent(volume, kasa)`.
9. **Fırsat Maliyeti Eşik Gün**: `trading.opportunity.calculateThresholdDays`.
10. **Bakiye Yeterliliği**: `capitalUsedNative > subKasaNative`.

### 6.3 Bağımlılık Haritası
- `computeTrade` mevcut durumda `calc.ts` içerisindeki `totalKasaTRY`, `volumeFromQty`, `calculateThresholdDays` fonksiyonlarını çağırmaktadır. Bu fonksiyonların tamamı ABACUS motorunda (`trading.kasa`, `trading.position`, `trading.opportunity`) yazılmıştır ve test edilmiştir.
- Kur `s.usdTryKuru` (`Settings`), Çarpan `input.multiplier` (`TradeInput`), Fiyat `input.price` (`TradeInput`) üzerinden beslenir.

### 6.4 Sessiz Fallback ve Float Tuzakları
- `input.price || 0`, `input.stop || 0`, `input.tp || 0`, `input.qty || 0`, `input.multiplier || 1` sessiz `||` varsayılanları mevcuttur.
- `s.usdTryKuru || 0` kur 0 varsayılanı kullanmaktadır (ABACUS'ta geçersiz kurda `null` dönecektir).
- `Math.max(0, perUnitLoss)` ham JS `Math` kullanımı ve IEEE-754 float çarpımları (`volumeNative * rate`) yer almaktadır.

### 6.5 ABACUS Çekirdek İhtiyacı
- ABACUS `math` motorunda (`add`, `sub`, `mul`, `div`, `round`, `abs`, `floor`, `mod`, `ratio`, `percent`, `pow`, `log`, `max`) ve `currency` / `trading` motorlarında gerekli TÜM temel matematiksel altyapı %100 mevcuttur. Çekirdeğe yeni fonksiyon eklenmesine **İHTİYAÇ YOKTUR**.

### 6.6 Parçalama Önerisi
`computeTrade` tek devasa fonksiyon yerine `src/domain/abacus/trading/engine.ts` içinde 4 tiplenmiş alt modüle bölünmelidir:
1. `validateTradeDirections(priceMinor, stopMinor, tpMinor, isLong)`: Yön ve seviye doğrulaması (`stopValid`, `tpValid`).
2. `computeRiskReward(...)`: Olası kayıp/kazanç (native/TRY) ve R:R hesabı.
3. `computePortfolioRatios(...)`: Toplam/alt kasa hacim ve risk yüzde oranları.
4. `computeTrade(...)` (Ana Orkestratör): `trading.position`, `trading.kasa`, `trading.opportunity` ve yukarıdaki modülleri bağlayıp `TradeResult` döner.

---

## 7. ABACUS Geçişi Ve v2.0.0 Tamamlanma Durumu

- **ABACUS Katmanı**: `math`, `money`, `currency`, `date`, `text`, `validate`, `mask` ve `trading` motorları %100 tamamlandı.
- **Eski Kod Temizliği**: `src/lib/format.ts` silindi, tüm `toLocale*` ve `toFixed` formatlama sızıntıları temizlendi.
- **Denklik Testleri**: `parity.test.ts` (12 senaryo) %100 YEŞİL.
- **Linter & Tip Güvenliği**: `npm run lint` 0 error 0 warning; `npx tsc --noEmit` 0 hata.
- **Test Kapsamı**: 225 Vitest birim testi %100 YEŞİL.


