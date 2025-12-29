import firebase from '@react-native-firebase/app';
import '@react-native-firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCkXT93EFe3om3UODrmLFYCEHVDLMCBrcc",
  authDomain: "rdl-legalpro.firebaseapp.com",
  projectId: "rdl-legalpro",
  storageBucket: "rdl-legalpro.firebasestorage.app",
  messagingSenderId: "944390645097",
  appId: "1:944390645097:android:45ecd59a5a885a642349f8"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export const db = firebase.firestore();