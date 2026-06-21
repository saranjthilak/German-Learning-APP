import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 FIREBASE CONFIGURATION
// Replace the placeholder values below with your own Firebase project config.
// How to get your config:
//   1. Go to https://console.firebase.google.com
//   2. Create a project (or select an existing one)
//   3. Click "Web" (</>)  to add a web app
//   4. Copy the firebaseConfig object and paste the values here
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'YOUR_API_KEY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'YOUR_AUTH_DOMAIN',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'YOUR_PROJECT_ID',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'YOUR_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? 'YOUR_MESSAGING_SENDER_ID',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? 'YOUR_APP_ID',
};

const app  = initializeApp(firebaseConfig);

export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
