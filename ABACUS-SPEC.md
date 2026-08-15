# ABACUS-SPEC.md — Davranış Şartnamesi

> Bu dosya, `AI-RULES.md` §3'ün **davranış tanımıdır**. AI-RULES "ABACUS kullan" der; bu dosya
> "ABACUS **şöyle** davranır" der. Kopyalanabilir tek parçadır: her repoya `AI-RULES.md` ile birlikte
> konur. Yeni bir projede AI'a "al bu ABACUS'u bağla" derken referans budur.
>
> **Sürüm:** 1.0 · **Dil:** kod İngilizce, UI/çıktı Türkçe · **Bağımlılık:** yalnız `decimal.js`

---

## 0. Temel İlkeler

1. **Tek otorite.** Tüm hesap, biçim, çevrim, metin ve doğrulama işleri yalnız ABACUS'tan geçer. Aynı iş için ikinci fonksiyon yazılmaz.
2. **Saf, I/O yok.** ABACUS veri **çekmez** (fetch/DB/localStorage/env yok). Kur, oran, sabit — hepsi parametre olarak **verilir**.
3. **Tek kapı, tiplenmiş, kısa çağrı.** `money.format(x)` gibi. String dispatch (`process({type})`) yasak.
4. **Para = kuruş bazlı tam sayı.** Girdi/çıktı kuruş `number`. DB'de `BIGINT`. Float ile para yasak. Aritmetik `decimal.js` ile.
5. **Yuvarlama = half-up (Türkiye usulü).** `2,49 → 2`, `2,50 → 3`. Banker's DEĞİL.
6. **Hata = `null` sentinel.** Hesaplanamazsa `null`. `0` (gerçek sıfır) ile yokluk (`—`) **ayrılır**. `|| 0` gibi sessiz varsayılan yasak.
7. **Düzelt ama aslını sakla.** Normalizasyon düzeltilmiş hali üretir; **ham girdi de saklanır** (yanlış düzeltme riskine karşı).
8. **Cümleye giren her sayı ABACUS'tan geçer.** Şablon metinde `%20.00`, `12.5 ton` gibi ham/noktalı sayı yasak.

---

## 1. Çağrı Deseni

Barrel (`src/domain/abacus/index.ts`) her motoru namespace olarak açar:

```ts
export * as math       from "./math";
export * as money      from "./money";
export * as currency   from "./currency";
export * as date       from "./date";
export * as text       from "./text";
export * as validate   from "./validate";
export * as mask       from "./mask";
```

Kullanım (kısa, İngilizce):

```ts
import { money, date, text, validate } from "@/domain/abacus";

money.format(2323223);              // "₺23.232"
date.format("2026-08-15");          // "15.08.2026"
text.suffix(2026, "year", "loc");   // "2026'da"
validate.vkn("1234567890");         // true | false
```

---

## 2. Varsayılanlar (özet tablo)

Her proje kendi "preset"iyle bu varsayılanları değiştirebilir (ör. mali projede kuruş açık, negatif parantez).

| Kategori | Varsayılan | Örnek |
|---|---|---|
| Para (simge) | `₺` **solda**, boşluksuz, **kuruşsuz** | `₺23.232` |
| Para (metin) | `TL` **sağda**, boşluklu | `23.232 TL` |
| Ayraç | binlik `.`, ondalık `,` | `1.234,56` |
| Negatif | eksi (mali projede parantez) | `-₺23.232` / `(₺23.232)` |
| Tarih | `GG.AA.YYYY` | `15.08.2026` |
| Yüzde | `%` önde, virgül | `%12,3` |
| Oran | `x` sonda, virgül | `8,71x` |
| Boş / sıfır | `—` / `0` | `—` |
| Yuvarlama | half-up | `2,50 → 3` |

---

## 3. Motorlar

### 3.1 `math` — hesap
Tüm aritmetik, oran, yüzde, yuvarlama. `decimal.js` ile. Sonuç `number` / `Decimal` / `null`.

| Fonksiyon | Ne yapar | Not |
|---|---|---|
| `add/sub/mul(a,b)` | 4 işlem (kuruş, kayan-nokta hatasız) | |
| `div(a,b)` | bölme; `b=0` → `null` | sessiz hata yok |
| `round(x, d=0)` | **half-up**, işaret korumalı (`-192,5 → -193`) | |
| `ratio(pay, payda)` | katsayı (`Decimal`); `payda ≤ 0` → `null` | |
| `percent(pay, payda)` | yüzde (`Decimal`); `payda ≤ 0` → `null` | değer, gösterim değil |

> Hesap `math`'te (sonuç sayı), gösterim `money`'de (sonuç metin). Karışmaz.

### 3.2 `money` — para ve sayı gösterimi
Girdi **kuruş tam sayı**. TCMB kurallarına uyar.

**TCMB kuralı (bağlayıcı):** Simge `₺` ve kısaltma `TL` **asla birlikte** kullanılmaz. Simge grafik/tablo/kart içindir, **rakamın soluna boşluksuz** yazılır (`₺23.232`). Metin/cümle/resmi çıktıda **kısaltma** kullanılır (`23.232 TL`, sağda, boşluklu).

| Çağrı | Çıktı |
|---|---|
| `money.format(2323223)` | `₺23.232` (varsayılan: simge, sol, kuruşsuz) |
| `money.format(2323223, { kurus:true })` | `₺23.232,23` |
| `money.format(2323223, { form:"text" })` | `23.232 TL` |
| `money.format(-2323223, { negative:"paren" })` | `(₺23.232)` |
| `money.format(0)` | `0` · `money.format(null)` | `—` |
| `money.compact(123456789)` | `₺1,23M` (veya TR: `1,23 Mn₺`) |
| `money.usd(123456)` | `$1,234.56` (USD ayracı `,`/`.`) |
| `money.percent(...)` | bkz. §3.6 (yüzde `money`'de biçimlenir) |

**Seçenekler:** `kurus` (varsayılan `false`), `form` (`"symbol"` \| `"text"`), `negative` (`"minus"` \| `"paren"`), `currency` (`"TRY"` \| `"USD"` \| `"EUR"`), `compactStyle` (`"K/M"` \| `"B/Mn/Mr"`).

**`money.toWords(kurus)` — tutar yazısı (çek/sözleşme "Yalnız...")**
Girdi kuruş. Çıktı geleneksel bitişik biçim:

| Girdi (kuruş) | Çıktı |
|---|---|
| `32000000` | `Yalnız ÜçYüzYirmiBinTürkLirası` |
| `334533454` | `Yalnız ÜçMilyonÜçYüzKırkBeşBinÜçYüzOtuzDörtLiraElliDörtKuruş` |

Kuruş `0` ise `...Lirası` ile biter; kuruş varsa `...Lira...Kuruş`. (Boşluklu varyant için `{ spaced:true }`.)

### 3.3 `currency` — para birimi çevrimi
Kuru **kendisi çekmez**; kur parametre olarak gelir.

| Çağrı | Ne yapar |
|---|---|
| `currency.convert(amountMinor, rate)` | tutar × kur → kuruş (half-up); kur yoksa `null` |
| `currency.cross(amountMinor, from, to, rates)` | TRY üzerinden çapraz çevrim; eksik kur → `null` |

### 3.4 `date` — tarih
Ay adları motor içinde sabit dizi (Türkçe). `Intl` kullanılmaz.

| Çağrı | Çıktı |
|---|---|
| `date.format(iso)` | `15.08.2026` (varsayılan `"short"`) |
| `date.format(iso, "long")` | `15 Ağustos 2026` |
| `date.format(iso, "dayMonth")` | `15 Ağu.` |
| `date.format(iso, "monthYear")` | `Ağustos 2026` |
| `date.format(iso, "period", {ceyrek})` | `12/2025` (mali dönem etiketi) |
| `date.relative(iso)` | `bugün` / `dün` / `3 gün sonra` / `3 gün önce` |
| `date.daysBetween(a,b)` / `date.daysUntil(iso)` | gün (sayı) |
| `date.dayName(iso)` | `Cum` (kısaltma) |

Saat gösterimi opsiyonel (`date.time(iso)` → `21:30`, Europe/Istanbul), varsayılanda kapalı.

### 3.5 `text` — metin, ek, normalizasyon
ABACUS'ın en geniş motoru. Alt başlıklar:

**(a) Ek çekimi — `text.suffix(value, kind, case)`**
Ek, sayının **okunuşuna** bağlıdır (yazısına değil). Bu yüzden fonksiyon **ham değeri** alır (biçimli string değil), içinde okunuşu (`text.toWords`) hesaplar, son okunan kelimenin sesine göre ek üretir.

- `kind`: `"number"` \| `"money"` \| `"percent"` \| `"year"`
- `case` (hal): `"loc"` (bulunma -de/-da/-te/-ta) · `"dat"` (yönelme -e/-a/-ye/-ya) · `"abl"` (çıkma -den/-dan/-ten/-tan) · `"acc"` (belirtme -i/-ı/-u/-ü) · `"gen"` (tamlayan -in/-ın...) · `"poss"` (iyelik+hal, ör. `'sine`/`'ına`)

| Çağrı | Çıktı | Neden |
|---|---|---|
| `text.suffix(2026,"year","loc")` | `2026'da` | "...altı" → a |
| `text.suffix(2025,"year","loc")` | `2025'te` | "...beş" → ş sert |
| `text.suffix(40,"number","loc")` | `40'ta` | "kırk" → k sert |
| `text.suffix(3,"number","acc")` | `3'ü` | "üç" → ü |
| `text.suffix(1450000,"money","abl")` | `1,45 M₺'den` → **"...milyon lira" → `'dan`** | okunuş "lira" |
| `text.suffix(31,"percent","poss")` | `%31'ine` | "...bir" → ince, ünsüz |

> Not: Yönetici Özeti'ndeki mevcut 1-9 haritası doğru; ABACUS bunu devralır, **0 ile biten sayı hatasını** (onlar/yüzler basamağı okunur) ve büyük sayıları tamamlar.

**(b) Sayı → yazı — `text.toWords(n)`**
`2026` → `"iki bin yirmi altı"`. Hem ek çekiminin (son kelime), hem `money.toWords`'un ("Yalnız...") temeli. Tek okunuş kaynağı.

**(c) Türkçe harf — `text.upper/lower/title`**
`İ/ı` duyarlı (`toUpperCase` KULLANILMAZ): `"istanbul"` → `text.upper` → `"İSTANBUL"`; `"AHMET"` → `text.lower` → `"ahmet"`; `"ahmet yılmaz"` → `text.title` → `"Ahmet Yılmaz"`. `title` istisna sözlüğü tutar: `TYC` büyük kalır, `ve` küçük kalır, `A.Ş.` bozulmaz.

**(d) Liste bağlama — `text.join(words)`**
`["A"]`→`"A"` · `["A","B"]`→`"A ve B"` · `["A","B","C"]`→`"A, B ve C"`.

**(e) Normalizasyon** — saklama ve gösterim biçimi **ayrı** döner; **ham girdi de korunur**.

| Alan | Fonksiyon | Saklama | Gösterim |
|---|---|---|---|
| Telefon | `text.phone` | `+905323865173` | `+90 (532) 386 51 73` (+ WhatsApp linki) |
| E-posta | `text.email` | `info@x.com` (trim+lower) | aynen |
| Web | `text.website` | `x.com` (çıplak host) | link için `https://x.com` |
| İsim | `text.name` | `Ahmet Yılmaz` | title + kısaltma istisnaları |
| Unvan | `text.company` | `ABC San. ve Tic. Ltd.Şti.` | aynen |
| İKN | `text.ikn` | `2026/1298071` | aynen |
| Ürün adı | `text.product` | `Kırmızı Branda 10 m²` | aynen |

**Unvan/adres kısaltma sözlüğü (başlangıç — Nakit'ten, genişletilecek):**
`A.Ş.`, `Ltd.Şti.`, `San.`, `Tic.`, `İth.`, `İhr.`, `İnş.`, `Paz.`, `Eğt.`, `Sağ.`, `Ener.`, `ve`
→ İleride eklenecekler için: adres kısaltmaları (`Mah.`, `Cad.`, `Sok.`, `Org.San.Böl.` …) ve sektöre özel unvanlar bu sözlüğe eklenir.

### 3.6 `money.percent` / `money.ratio` — yüzde ve oran gösterimi
Yüzde ve oran **para ile aynı motordan** geçer → ondalık ayracı **her zaman virgül**.

| Çağrı | Çıktı |
|---|---|
| `money.percent(12.3)` | `%12,3` (`%` önde, virgül) |
| `money.percent(12.3, {sign:true})` | `%+12,3` |
| `money.ratio(8.712)` | `8,71x` |
| `money.percent(null)` | `—` |

### 3.7 `validate` — doğrulama
Saf kural, `true`/`false` (veya normalize+geçerlilik) döner.

| Çağrı | Kontrol |
|---|---|
| `validate.vkn(s)` | 10 hane + VKN algoritması |
| `validate.tckn(s)` | 11 hane + TCKN algoritması |
| `validate.ikn(s)` | `^\d{4}/\d{5,7}$` |
| `validate.iban(s)` | TR IBAN 26 hane + mod-97 |
| `validate.email(s)` | biçim |

### 3.8 `mask` — gizleme (PII)
**Yalnız gösterim**; saklanan değeri değiştirmez.

| Çağrı | Çıktı |
|---|---|
| `mask.money(x)` | `****` (gizlilik modu) |
| `mask.vkn("1234567890")` | `123****890` |
| `mask.iban(s)` | `TR** **** … **34` (son 4 açık) |
| `mask.phone(s)` | `+90 5** *** ** 73` |

---

## 4. Kapsam Dışı (ABACUS **yapmaz**)

- **I/O:** kur/fiyat çekme, API, DB, `localStorage` → `infrastructure` katmanında; ABACUS'a veri verilir.
- **İş kararları:** "pozisyon açılabilir mi", "kura sırası kim", "ödeme onaylansın mı" → domain iş kuralı, ABACUS değil.
- **Renk/tema:** ABACUS en fazla durum (`iyi`/`nötr`/`kötü`) üretebilir; **rengi tema** verir. Hex/CSS ABACUS'a girmez.
- **Genel gramer düzeltme:** serbest metinde 'de/'da ayrımı, ki eki, soru eki → yapılmaz. Sabit metinleri doğru yazmak yazarın işi.
- **Çoğul eki (-ler/-lar):** Türkçe'de sayıdan sonra tekil kullanıldığı için gereksiz.
- **Yazım denetimi / NLP:** hece, imla hatası bulma, eş anlamlı → kapsam dışı.
- **Projeye özel hesap motorları** (Portföy'ün `valuation`/`trading`/`psychology`'si gibi): çekirdek ABACUS'a değil, o projenin ABACUS ağacına girer (aynı desen/kurallarla).

---

## 5. Zorlama (AI-RULES §3.8 ile)

- `abacus/` **dışında** yasak (ESLint `error`): `Intl.*`, `.toLocale*`, `.toFixed`, `parseFloat` ile para/oran, elle string ile para/tarih.
- Cümle şablonlarına gömülen her sayı/tutar/yüzde ABACUS'tan geçer (`%20.00` gibi ham/noktalı değer yasak).
- `presentation` hesap motorlarını (`math`/`currency`) import edemez; yalnız gösterim çıktısını kullanır.
- CI grep guard: `src/presentation/` içinde `toFixed|Intl|toLocale|Decimal|parseFloat` = 0.

---

*Bu şartname tüm projelerde aynıdır. Her proje kendi `PROJECT-NOTES.md`'sinde yalnız (a) preset varsayılanlarını (kuruş açık/kapalı, negatif biçimi) ve (b) projeye özel ABACUS motorlarını belgeler; hiçbiri bu dosyadaki davranışı gevşetemez.*
