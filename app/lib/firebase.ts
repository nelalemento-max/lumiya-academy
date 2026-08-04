import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfLszzb9G1jRXzzUkunwrG6_y21IZL9Aw",
  authDomain: "lumiya-academy-web.firebaseapp.com",
  projectId: "lumiya-academy-web",
  storageBucket: "lumiya-academy-web.firebasestorage.app",
  messagingSenderId: "150814976336",
  appId: "1:150814976336:web:96d8b3211ee66badf62455",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
