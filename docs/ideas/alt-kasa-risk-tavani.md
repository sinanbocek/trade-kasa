# Öneri: Alt-Kasa Risk Tavanı + Kümülatif Açık Risk Farkındalığı

> **Durum:** Fikir / yapılacak. Öncelik: VIOP-short (SNN-S) canlıya geçmeden ÖNCE en az Bölüm A yapılmalı.
> **Bağlam:** Bu belge, `trade-kasa` aracının tek-işlem risk modelinin doğru, ama **alt-kasa tükenişi** ve **çoklu açık pozisyon** boyutunun eksik olduğu tespitinden doğdu. SNN-S sık ve kısa-ömürlü VIOP short üreteceği için bu boşluk kritik.
> **Not:** Eğitim/kişisel araç geliştirme notudur, yatırım tavsiyesi değildir.

---

## 0. Tek Cümle

Araç şu an bir işlemin riskini **toplam kasaya** göre sınırlıyor (`maxRiskYuzdesi`), ama aynı riskin **alt kasaya** (ör. VIOP 300k) oranının tavanı yok; bu yüzden "her işlem toplam kasaya göre güvenli" görünürken alt kasa sessizce erisyebilir — özellikle sık işlem yapılan kaldıraçlı VIOP-short'ta tehlikeli.

---

## 1. Problem — Neden Bu Boşluk Var?

### 1.1 Mevcut durum (doğru olan kısım)
`src/lib/calc.ts` içinde `computeTrade` her işlem için **dört** oran üretiyor:

```ts
exposurePctTotal = volumeTRY / totalTRY        // hacim / toplam kasa
exposurePctSub   = volumeNative / subKasaNative // hacim / alt kasa
riskPctTotal     = potentialLossTRY / totalTRY  // olası kayıp / toplam kasa
riskPctSub       = potentialLossNative / subKasaNative // olası kayıp / alt kasa
```

Ama `src/types.ts` içindeki `Settings` yalnızca **iki** tavan tanımlıyor, ve ikisi de **toplam kasaya** endeksli:

```ts
maxRiskYuzdesi: number;      // olası stop kaybının TOPLAM kasaya max oranı (ör. 2)
maxPozisyonYuzdesi: number;  // pozisyon hacminin TOPLAM kasaya max oranı (ör. 25)
```

Yani `riskPctSub` ve `exposurePctSub` **hesaplanıyor ama hiçbir tavanla karşılaştırılmıyor.** Uyarı yalnızca toplam-kasa oranı aşılınca çıkıyor.

### 1.2 Sayısal örnek — boşluğun neden tehlikeli olduğu
Varsayılan kasa: **Toplam 1.000.000 TL** = 700k BİST + 300k VİOP.
`maxRiskYuzdesi = 2` (toplam kasanın %2'si = **20.000 TL** tek işlem risk tavanı).

| Senaryo | Olası kayıp | riskPctTotal | riskPctSub (VİOP=300k) | Araç ne der? |
|---|---:|---:|---:|---|
| Tek VİOP short | 20.000 TL | %2,0 ✓ | **%6,7** | "Güvenli" (yeşil) |
| 3 art arda VİOP short | 60.000 TL | %6,0 | **%20,0** | Her biri tek tek yeşil görünür |
| 4 art arda | 80.000 TL | %8,0 | **%26,7** | Alt kasa çeyreği gitti, hâlâ "tek işlem %2" |

Sorun: Araç **tek işlemi** toplam kasaya göre doğru sınırlıyor, ama **VİOP alt kasasının tükenişini** göremiyor. Kullanıcı tek tek işlemlere bakarken, "toplam kasaya göre %2" rahatlığıyla VİOP kasasını erittiğini fark etmez.

### 1.3 Neden özellikle VIOP-short'ta kritik?
- **Kaldıraç:** VİOP'ta kayıp fiyat hareketi × tam pozisyon (teminat değil). Aynı %2 fiyat hareketi, alt kasada büyük gedik açar.
- **Sıklık:** SNN-S felsefesi "erken gir, erken çık" → çok sayıda kısa-ömürlü işlem → kümülatif alt-kasa tüketimi hızlı.
- **Margin call zinciri:** Alt kasa tükenince ana kasadan besleme gerekir; ama araç bunu tek-işlem bazında göremediği için MC'ye giden yol görünmez.
- **Sinan'ın tarihsel zayıflığı:** Dokümante edilmiş — "VİOP = kaldıraç yüzünden −1,5/−1,9R, terste kalınca zarar." Bu boşluk tam o yarayı besleyebilir.

---

## 2. Çözüm — İki Katman

### Bölüm A (ZORUNLU, küçük, felsefeyi bozmaz): Alt-kasa risk tavanı
Alt kasaya endeksli ayrı bir risk (ve opsiyonel pozisyon) tavanı ekle. Kod zaten `riskPctSub`'ı hesaplıyor; sadece bir tavan + uyarı bağlanacak.

### Bölüm B (İLERİDE, daha büyük, state gerektirir): Kümülatif açık-risk sayacı
"Şu an VİOP'ta toplam açık riskin alt kasanın %X'i" farkındalığı. Hesap-makinesi felsefesini zorlar (durum tutmak gerekir); trading_journal'daki açık pozisyonlardan beslenebilir.

---

## 3. Bölüm A — Uygulama Rehberi (adım adım)

### 3.1 `src/types.ts` — Settings'e yeni alanlar
Mevcut risk kuralları bloğuna ekle:

```ts
// Risk kuralları (tek işlem, toplam kasaya göre)
maxRiskYuzdesi: number;      // olası stop kaybının toplam kasaya max oranı, ör. 2
maxPozisyonYuzdesi: number;  // pozisyon hacminin toplam kasaya max oranı, ör. 25

// YENİ — Risk kuralları (tek işlem, ALT kasaya göre)
maxRiskYuzdesiSub: number;      // olası kaybın alt kasaya max oranı, ör. 5
maxPozisyonYuzdesiSub: number;  // hacmin alt kasaya max oranı, ör. 100 (opsiyonel/gevşek)
```

**Neden iki ayrı sayı (total vs sub)?** Felsefenin özü: aynı kaybı **iki referansa** birden oran­lamak. Tavanlar da bu ikiliği yansıtmalı. "Servetimin %2'si" VE "VİOP kasamın %5'i" — ikisi birden korunmalı; hangisi önce aşılırsa uyarı çıkar.

### 3.2 Varsayılan değerler — `src/lib/storage.ts`
`storage.ts` içindeki varsayılan Settings nesnesine ekle (dosyayı açıp mevcut defaults'a hizala):

```ts
maxRiskYuzdesiSub: 5,       // öneri: VİOP gibi kaldıraçlı alt kasada tek işlem max %5
maxPozisyonYuzdesiSub: 100, // öneri: başlangıçta gevşek; istenirse sıkılaştır
```

**Kalibrasyon notu:** `maxRiskYuzdesiSub` piyasaya göre farklı olmalı mı? İdealde evet — BİST alt kasası için %3-4, VİOP için daha da sıkı (%2-3?) mantıklı olabilir çünkü kaldıraç var. İki seçenek:
- **Basit (öneri, önce bunu yap):** Tek global `maxRiskYuzdesiSub`, tüm alt kasalara uygulanır.
- **Gelişmiş (ileride):** Piyasa-başına tavan (`MarketConfig`'e `maxRiskSubOverride?` ekle). Fazla mühendislik olabilir; önce basit olanı test et.

### 3.3 Versiyon migrasyonu — ÖNEMLİ (yoksa mevcut kullanıcı ayarları bozulur)
`Settings.version` alanı var → `storage.ts` versiyonlu. Yeni alan eklerken:
1. `version` sayısını bir artır.
2. Yükleme (load) mantığında, eski kayıtta yeni alanlar `undefined` gelirse varsayılanla doldur:

```ts
// storage.ts yükleme mantığında (pseudo)
const loaded = JSON.parse(raw);
const merged = { ...DEFAULT_SETTINGS, ...loaded };
// yeni alanlar eski kayıtta yoksa DEFAULT'tan gelir
if (loaded.version < CURRENT_VERSION) {
  merged.maxRiskYuzdesiSub ??= DEFAULT_SETTINGS.maxRiskYuzdesiSub;
  merged.maxPozisyonYuzdesiSub ??= DEFAULT_SETTINGS.maxPozisyonYuzdesiSub;
  merged.version = CURRENT_VERSION;
}
```
**Neden:** localStorage'daki eski ayarlar yeni alanları içermez; `??=` (nullish) ile güvenli doldur. `||=` KULLANMA (0 değeri geçerli bir tavan olabilir, `||` onu ezer). Bu, bugün SNN'de konuştuğumuz "0 vs yok ayrımı" disiplininin aynısı.

### 3.4 Uyarı mantığı — nerede uygulanır?
`computeTrade` saf hesap fonksiyonu; uyarı üretmiyor, sadece oranları döndürüyor (bu doğru, saf kalsın). Uyarı, TradeResult'ı tüketen katmanda (muhtemelen `TradeTab.tsx` veya `ui.tsx`) türetiliyor. Mevcut uyarı mantığını bul (`maxRiskYuzdesi` / `riskPctTotal` karşılaştırması) ve yanına ekle:

```ts
// pseudo — uyarı türetme katmanında
const riskTotalAsildi = result.riskPctTotal > s.maxRiskYuzdesi;
const riskSubAsildi    = result.riskPctSub   > s.maxRiskYuzdesiSub;      // YENİ
const pozTotalAsildi   = result.exposurePctTotal > s.maxPozisyonYuzdesi;
const pozSubAsildi     = result.exposurePctSub   > s.maxPozisyonYuzdesiSub; // YENİ (opsiyonel)

// Herhangi biri aşılırsa uyarı. Hangisinin aşıldığını AYRI göster:
// "⚠ Toplam kasa riski %2'yi aştı" VE/VEYA "⚠ VİOP kasası riski %5'i aştı"
```

**UX önerisi:** İki uyarıyı ayrı etiketle göster; kullanıcı hangi tavanın delindiğini bilsin. Sadece "risk yüksek" deme — "toplam mı, alt kasa mı" ayrımı, aracın tüm felsefesi (iki referansı ayrı gör). Renk: total aşımı kırmızı (sert), sub aşımı turuncu (uyarı) gibi kademelendirilebilir.

### 3.5 `SettingsTab.tsx` — yeni alanların girişi
Ayarlar sekmesine iki yeni input ekle (mevcut `maxRiskYuzdesi` / `maxPozisyonYuzdesi` inputlarının hemen altına, görsel olarak "Alt kasa" grubu altında). Etiketler net olsun:
- "Tek işlem — alt kasa risk tavanı (%)" → `maxRiskYuzdesiSub`
- "Tek işlem — alt kasa pozisyon tavanı (%)" → `maxPozisyonYuzdesiSub`

---

## 4. Bölüm A — Test Kontrol Listesi
Değişiklikten sonra, aşağıdaki senaryolarla doğrula (araç veritabanısız, elle test kolay):

- [ ] **Migrasyon:** Eski localStorage ayarıyla aç → yeni alanlar varsayılanla dolmalı, çökme olmamalı. (Test: eski JSON'u elle gir, sürüm eski olsun.)
- [ ] **Total aşımı:** Küçük alt kasa oranı ama büyük total risk → yalnızca "total" uyarısı.
- [ ] **Sub aşımı:** VİOP 300k, tek işlem 20k risk (`riskPctTotal`=%2 geçer, `riskPctSub`=%6,7 > %5) → yalnızca "alt kasa" uyarısı çıkmalı. **Bu, tüm eklemenin asıl amacı olan senaryo.**
- [ ] **İkisi birden:** Hem total hem sub aşılınca iki uyarı da görünür.
- [ ] **0 tavanı:** `maxRiskYuzdesiSub = 0` girilirse ne olmalı? Karar ver: 0 = "tavan yok/kapalı" mı, yoksa "her şey aşar" mı? Öneri: 0 → kapalı (uyarı üretme). Kodda `> 0 &&` guard'ı ekle.
- [ ] **JSON dışa/içe aktarma:** Yeni alanlar export/import'a dahil olmalı (README'de bu özellik var).

---

## 5. Bölüm B — Kümülatif Açık-Risk Sayacı (ileride, opsiyonel)

### 5.1 Amaç
Tek işlem değil, **aynı anda açık tüm VİOP short'ların toplam riski** alt kasanın yüzde kaçı? Asıl VİOP-short tehlikesi burada: 4 ayrı işlem her biri "güvenli" ama toplamı alt kasanın %25'i.

### 5.2 Neden zor / neden ayrı faz
Araç bilinçli olarak **stateless** (hesap makinesi, DB yok — bu bir tasarım değeri). Kümülatif risk için "açık pozisyonlar" durumu tutmak gerekir, bu felsefeyi zorlar. İki yol:
1. **Hafif (öneri):** Manuel — kullanıcı "şu an açık N işlem, toplam X risk" diye elle girer, araç alt kasaya oranlar. State minimal.
2. **Entegre (büyük):** `trading_journal`'dan (Supabase) açık VİOP pozisyonlarını çek, canlı kümülatif risk göster. Güçlü ama aracı "bağımsız hesap makinesi" olmaktan çıkarır → mimari kararı gerektirir.

### 5.3 Karar
Bölüm B'yi Bölüm A çalıştıktan VE SNN-S forward-test'i başladıktan sonra değerlendir. Muhtemelen gerekli olacak ama önce A'nın tek-işlem tavanı çoğu riski yakalar. Aşırı mühendislikten kaçın.

---

## 6. Felsefi Tutarlılık Notu (bunu bozma)
Bu araç bir "ne kadar kaybederim" aracı, "ne kadar kazanırım" aracı değil. Her ekleme bu ekseni GÜÇLENDİRMELİ:
- Alt-kasa tavanı = "servetim güvenli görünse de bu alt kasa erisyor mu" sorusunu sordurur → felsefeyle birebir.
- VİOP getiriyi teminata endeksleme (mevcut, bilinçli) → kaldıracın gerçek yüzünü gösterir, DOKUNMA.
- Ana/alt kasa ayrımı (mevcut) = MC geldiğinde "rezervim dayanır mı" → DOKUNMA.
- Yeni uyarılar "yasak" değil "farkındalık" olmalı — kullanıcıyı durdurma, resmi göster. Sert engelleme değil, bilinçli renk/etiket.

---

## 7. Özet — Yapılacaklar Sırası
1. **[Zorunlu, VIOP-short öncesi]** Bölüm A: `maxRiskYuzdesiSub` + uyarı + migrasyon + SettingsTab input. Küçük, felsefeyi bozmaz.
2. **[Test]** Bölüm 4 kontrol listesi — özellikle "sub aşımı" senaryosu.
3. **[İleride]** Bölüm B: kümülatif açık-risk (önce hafif/manuel, gerekirse journal entegrasyonu).
4. **[Karar]** `maxRiskYuzdesiSub` piyasa-başına mı, global mi? Önce global, veriyle gör.

---

*Belge sonu. Bu bir geliştirme fikri kaydıdır; kod değişikliği yapılmadan önce mevcut `storage.ts`, `TradeTab.tsx`, `ui.tsx` dosyalarının güncel hali okunup uyarı-türetme katmanının tam yeri teyit edilmeli (bu belge pseudo-kod kullanır, dosya yapısı değişmiş olabilir).*
