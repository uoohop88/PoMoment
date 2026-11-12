import { initializeApp } from "firebase/app";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initializeAuth,
  getReactNativePersistence,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeRbZxFo5_8w2LRtR97aFbVu6wfY-o-6c",
  authDomain: "mobile-app-v1-a7eff.firebaseapp.com",
  projectId: "mobile-app-v1-a7eff",
  storageBucket: "mobile-app-v1-a7eff.firebasestorage.app",
  messagingSenderId: "77452256756",
  appId: "1:77452256756:web:9cb95fa762118175f805a1",
  measurementId: "G-5QEXBDT80D"
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export async function ensureAnonAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          unsub();
          resolve(user);
          return;
        }
        const cred = await signInAnonymously(auth);
        unsub();
        resolve(cred.user);
      } catch (e) {
        unsub();
        reject(e);
      }
    });
  });
}
