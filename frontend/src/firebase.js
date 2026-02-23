import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBkwS5c0YeNq1E8JByZ7aMb6Vy5M_wMMps",
  authDomain: "photoniq-87438.firebaseapp.com",
  databaseURL: "https://photoniq-87438-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "photoniq-87438",
  storageBucket: "photoniq-87438.firebasestorage.app",
  messagingSenderId: "889913458052",
  appId: "1:889913458052:web:15b32f0af395daa68b71d1",
  measurementId: "G-K1GVP6VSHT"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, onValue };
