import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhySzJaJO7PqtN8xqDvT8-M3AWGNDDPfM",
  authDomain: "lumiya-academy.firebaseapp.com",
  projectId: "lumiya-academy",
  storageBucket: "lumiya-academy.firebasestorage.app",
  messagingSenderId: "338617993201",
  appId: "1:338617993201:web:ec85aed9188bea9f77e650",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
