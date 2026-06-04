// lib/firebase/client.ts
// Firebase client SDK — only used for Google Sign-In in the browser
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyDCbHqW0BrAHMhujHW00PZkWqXss5x5AC0',
  authDomain:        'osu-replay-analyzer.firebaseapp.com',
  projectId:         'osu-replay-analyzer',
  storageBucket:     'osu-replay-analyzer.firebasestorage.app',
  messagingSenderId: '1030972564526',
  appId:             '1:1030972564526:web:32bf984f95c07ecbdd6bbf',
  measurementId:     'G-9VZDRTSYTQ',
};

// Avoid re-initializing in hot reload / SSR
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
