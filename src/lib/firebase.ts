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
// açık olacak şekilde tasarlanmıştır (güvenlik, Firebase kuralları ile
// sağlanır) — yine de kod hijyeni için değerler .env dosyasından okunur.
// Gerçek değerler için .env.example'a bak.
// ====================================================================

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// İleride kullanmak için (Seçenek B/C):
// import { initializeApp } from 'firebase/app';
// export const app = initializeApp(firebaseConfig);
