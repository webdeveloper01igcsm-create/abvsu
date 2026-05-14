// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAIelYQziPwJ75EbHA0RTKn72a0rrktZwY",
    authDomain: "developer-subscription.firebaseapp.com",
    projectId: "developer-subscription",
    storageBucket: "developer-subscription.firebasestorage.app",
    messagingSenderId: "573515526454",
    appId: "1:573515526454:web:aa1bc03412a582ba018397",
  };
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };