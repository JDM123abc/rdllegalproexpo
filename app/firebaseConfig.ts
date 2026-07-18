// app/firebaseConfig.ts
import { initializeApp, getApps } from '@react-native-firebase/app';

// Polyfill for web
if (typeof window !== 'undefined' && typeof window.setImmediate === 'undefined') {
  window.setImmediate = (callback: any) => setTimeout(callback, 0);
}

const firebaseConfig = {
  apiKey: "AIzaSyB0lmbFy0yH9ssowyPEu5cLc3jDPdFBfAE",
  authDomain: "rdl-legalpro.firebaseapp.com",
  projectId: "rdl-legalpro",
  storageBucket: "rdl-legalpro.firebasestorage.app",
  messagingSenderId: "944390645097",
  appId: "1:944390645097:web:93dc0f4957309ff32349f8",
  databaseURL: "https://rdl-legalpro.firebaseio.com",
};

// ← Only initialize once
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export default {};