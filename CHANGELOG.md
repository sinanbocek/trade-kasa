# Changelog

Tüm önemli değişiklikler bu dosyada belgelenecektir.
Format [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standardına dayanmaktadır ve [Semantic Versioning](https://semver.org/spec/v2.0.0.html) versiyonlaması kullanılır.

## [2.0.0] - 2026-08-16

### Eklenen
- **ABACUS Finans ve Matematik Motoru Katmanı**:
  - `src/domain/abacus/math`: `decimal.js` tabanlı hassas ve taşma korumalı matematik motoru (`add`, `sub`, `mul`, `div`, `round`, `percent`, `ratio` vb.).
  - `src/domain/abacus/money`: TCMB standartlarına uygun kuruş integer para biçimlendirme ve metinleştirme motoru (`format`, `percent`, `toWords`, `compact`). USD ve TRY para birimi desteği.
  - `src/domain/abacus/currency`: Kur dönüşüm ve ölçek haritalama motoru.
  - `src/domain/abacus/date`: Bağımsız tarih/zaman biçimlendirme motoru (`timeAgo`, `format`).
  - `src/domain/abacus/text`: Türkçe dil bilgisi, ek çekimi (`suffix`) ve harf dönüştürme motoru.
  - `src/domain/abacus/validate` & `mask`: Girdi doğrulama ve PII maskeleme motorları.
  - `src/domain/abacus/trading`: Pozisyon büyüklüğü, kaldıraç, teminat, risk/ödül, portföy riski ve fırsat maliyeti eşik süresi hesaplayan özel trading motoru (`engine.ts`, `kasa.ts`, `position.ts`, `opportunity.ts`).
- **Parite / Denklik Testleri**: Eski `calc.ts` ile ABACUS `engine.ts` arasında %100 sonuç denkliğini doğrulayan 12 kapsamlı senaryo testi (`parity.test.ts`).

### Değişen
- `TradeTab.tsx` hesabı tamamen ABACUS `trading.computeTrade` motoruna bağlandı.
- `coach.ts` `TradeResult` `number | null` alanları için tam null-güvenli hale getirildi (0 tsc hatası).
- `Hero.tsx` toplam bakiye ve çip gösterimleri ABACUS `money.format` ve `date` motoruna geçirildi.
- TL/USD Risksiz Getiri alanlarının hassasiyeti `digits={2}` olarak ayarlanarak ondalıklı faiz girişi sağlandı.
- USD/TRY kur gösterimi `money.fmtDecimalGrouped(rate, 4)` ile sabit 4 ondalık basamağa (`47,8900`) hizalandı.

### Kaldırılan
- Eski `src/lib/format.ts` dosyası tamamen silindi. `toLocale*` ve `toFixed` sızıntıları temizlendi.

### Güvenlik & Kalite
- ESLint linter uyarıları **0 HATA, 0 UYARI** seviyesine indirildi.
- TypeScript tip denetimi (`npx tsc --noEmit`) **0 HATA** ile tamamlandı.
- 225 Vitest birim testi %100 YEŞİL geçti.
