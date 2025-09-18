"use client";

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

// Safe configuration that handles missing environment variables during build
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'dummy-key-for-build',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'dummy.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'dummy-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'dummy-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:123456789:web:dummy',
};

// Only initialize Firebase if we have real configuration (not build-time dummies)
const hasValidConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'dummy_key_for_build' &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'dummy-project';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
let auth: Auth | null;

if (hasValidConfig || typeof window !== 'undefined') {
  // Initialize Firebase app
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);

  // Connect to Auth emulator only when explicitly enabled
  if (
    process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && 
    typeof window !== 'undefined'
  ) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.warn('✅ Connected to Firebase Auth emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Firebase Auth emulator:', error);
    }
  }
} else {
  // Create dummy objects for build time
  console.warn('🏗️ Firebase config not available during build - using dummy config');
  app = null;
  auth = null;
}

export { auth };
export default app;