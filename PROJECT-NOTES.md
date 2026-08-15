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
