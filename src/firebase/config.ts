// Contenido para: src/firebase/config.ts

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- INICIALIZACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa Firebase y obtén las instancias de los servicios
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Función helper para gestionar la autenticación anónima
export const ensureAnonymousAuth = (callback: (uid: string) => void, errorCallback: () => void) => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuario ya autenticado (anónima o realmente)
        callback(user.uid);
      } else {
        // Nadie logueado, intentamos login anónimo
        signInAnonymously(auth).catch((error) => {
            console.error("Error en el inicio de sesión anónimo:", error);
            errorCallback();
        });
      }
    });
};

// Exportamos las instancias para usarlas en App.tsx
export { db, auth };