// src/firebase.js
import { initializeApp, getApp } from "firebase/app"; // getApp is imported but not used in the provided snippet
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Added back for db export, assuming you need it

// ✅ Firebase config pulled from .env (must start with VITE_)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ✅ Initialize Firebase app
// NOTE: This direct initialization without a check (e.g., using getApps() or try-catch getApp())
// might reintroduce the "Firebase App named '[DEFAULT]' already exists" error
// if this module is imported multiple times in your application, especially with Vite's HMR.
const app = initializeApp(firebaseConfig);

// ✅ Set up Firebase Authentication
export const auth = getAuth(app);

// ✅ Set up Firebase Firestore (assuming you still need it for saving trips)
export const db = getFirestore(app);

// ✅ Conditionally enable Analytics (optional)
let analytics;
isSupported().then((yes) => {
  if (yes) {
    analytics = getAnalytics(app);
  }
});

export { app, auth, analytics, db }; // Exporting app, auth, analytics, and db