// ====================================================================
// FIREBASE YAPILANDIRMASI
// --------------------------------------------------------------------
// Not: Bu uygulama şu an "Seçenek A" (yalnızca Firebase Hosting) ile
// çalışır ve çalışma zamanında Firebase JS SDK'sına ihtiyaç duymaz —
// Hosting sadece statik dosya sunumudur.
//
// İleride Firestore/Auth (bulut senkron, hesaplar — "Seçenek C") ya da
// Cloud Functions ("Seçenek B", canlı kur proxy) eklenmek istenirse:
//   1) `npm i firebase`
//   2) Aşağıdaki initializeApp bloğunun yorumunu kaldır
//   3) İhtiyaç duyulan servisi (getFirestore / getAuth …) içe aktar
//
// apiKey burada gizli değildir; Firebase web istemci anahtarları herkese
// açık olacak şekilde tasarlanmıştır (güvenlik, Firebase kuralları ile sağlanır).
// ====================================================================

export const firebaseConfig = {
  apiKey: 'AIzaSyBWNc2axKbY1fL9cUzoONrg8EmynPlEOj0',
  authDomain: 'trade-kasa.firebaseapp.com',
  projectId: 'trade-kasa',
  storageBucket: 'trade-kasa.firebasestorage.app',
  messagingSenderId: '1001284519246',
  appId: '1:1001284519246:web:91992866c7b8baa57f8a1f',
};

// İleride kullanmak için (Seçenek B/C):
// import { initializeApp } from 'firebase/app';
// export const app = initializeApp(firebaseConfig);
