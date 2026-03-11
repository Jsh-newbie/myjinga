import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function validateClientEnv() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase client env: ${missing.join(', ')}`);
  }
}

function getFirebaseApp() {
  validateClientEnv();

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}

let _auth: Auth | null = null;

export function getClientAuth(): Auth {
  if (_auth) return _auth;

  _auth = initializeAuth(getFirebaseApp(), {
    persistence: browserLocalPersistence,
  });

  return _auth;
}

export function getClientDb() {
  return getFirestore(getFirebaseApp());
}
