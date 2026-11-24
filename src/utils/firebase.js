import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyBO_0T_qlXb_-iVyAigjOh4_pAShz-SQLg",
  authDomain: "smsc-portfolio.firebaseapp.com",
  projectId: "smsc-portfolio",
  storageBucket: "smsc-portfolio.firebasestorage.app",
  messagingSenderId: "706469623554",
  appId: "1:706469623554:web:1dcb69bf28f1e23481b41b",
  measurementId: "G-K4DK0QGHPL",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

// Initialize analytics safely only in supported browser contexts
if (typeof window !== "undefined") {
  isSupported()
    .then((yes) => {
      if (yes) getAnalytics(firebaseApp);
    })
    .catch(() => {});
}
