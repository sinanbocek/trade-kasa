# Trade Kasa Yönetimi

Bağımsız bir **pozisyon planlayıcı / risk hesaplayıcı**. Veritabanı yok — tıpkı bir hesap makinesi gibi çalışır. Kullanıcı alt kasa bakiyelerini ve risk parametrelerini girer; uygulama BİST, VİOP, ABD ve Kripto işlemleri için pozisyon büyüklüğü, risk ve getiri metriklerini hesaplar.

> Bu araç yalnızca hesaplama amaçlıdır, yatırım tavsiyesi değildir.

## Özellikler

- **5 sekme:** BİST · VİOP · ABD · Kripto · Ayarlar
- **Piramit hero:** Toplam Kasa = TL kasalar + USD kasaların TL karşılığı (TL ve USD ayrı gösterilir)
- **Piyasa bazlı davranış:**
  | Piyasa | Para | Miktar | Kaldıraç | Yön |
  |--------|------|--------|----------|-----|
  | BİST   | ₺    | tam sayı (min 1) | yok (spot) | long |
  | VİOP   | ₺    | tam sayı (min 1) | teminat + çarpan | long / short |
  | ABD    | $    | kesirli | teminat (opsiyonel) | long / short |
  | Kripto | $    | kesirli | teminat (opsiyonel) | long / short |
- **Metrikler:** pozisyon büyüklüğü (hacim), kaldıraç, bloke teminat, olası stop kaybı & getiri, R:R, fırsat maliyeti eşik süresi
- **İki ayrı risk metriği:** olası kayıp hem **toplam kasaya** hem de **ilgili alt kasaya** oranlanır
- **Limit uyarıları:** `maxRiskYuzdesi` ve `maxPozisyonYuzdesi` aşımında ve bakiye yetersizliğinde renkli uyarı
- **Ayarlar localStorage'da saklanır** (bu cihaza özel) + JSON dışa/içe aktarma
- **Canlı USD/TRY kuru:** sayfa açılışında ve saat başı otomatik, ayrıca elle "Güncelle"; elle de düzenlenebilir

## Teknoloji

- React 18 + TypeScript + Vite
- Tailwind CSS
- lucide-react (ikonlar)
- Dağıtım: Firebase Hosting

## Geliştirme

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi (dist/)
npm run preview  # derlemeyi yerelde önizle
```

## Dağıtım (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

`.firebaserc` içindeki proje kimliği `trade-kasa`'dir. İlk kez dağıtım öncesi `firebase login` ve gerekirse `firebase use trade-kasa`.

## Döviz Kuru Katmanı

Kur mantığı `src/lib/fxRate.ts` içinde **soyutlanmıştır**. Varsayılan (Seçenek A): tarayıcıdan doğrudan ücretsiz, anahtarsız bir FX API (`open.er-api.com`) çağrılır — backend gerektirmez.

İleride daha canlı bir kaynağa (ör. yfinance/Yahoo) geçmek istenirse yalnızca `fetchLiveRate()` bir Firebase Cloud Function proxy'sine yönlendirilir; uygulamanın geri kalanı değişmez. (Not: Cloud Functions'ın dış servise istek atabilmesi için Blaze planı gerekir.)

## Mimari

```
src/
  types.ts                 # Ortak tipler
  config/markets.ts        # Piyasa tanımları (para birimi, kaldıraç, kesirli vb.)
  lib/
    calc.ts                # Saf hesap fonksiyonları (React/store bağımsız)
    format.ts              # tr-TR biçimlendirme
    fxRate.ts              # Soyutlanmış kur katmanı
    storage.ts             # localStorage (versiyonlu) + varsayılanlar
  context/SettingsContext  # Ayarlar + kur durumu sağlayıcısı
  components/
    Hero.tsx               # Toplam kasa piramidi + kur
    ui.tsx                 # Paylaşılan giriş/kart bileşenleri
    tabs/
      TradeTab.tsx         # 4 piyasa için jenerik işlem sekmesi
      SettingsTab.tsx      # Parametre yönetimi
```
