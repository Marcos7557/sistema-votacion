// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tus credenciales guardadas en su propio lugar
const firebaseConfig = {
    apiKey: "AIzaSyAGRdZkQ1s9yA-HI2tfYm7kTUHxmTE9Ub8",
    authDomain: "sistema-votacion-flexible.firebaseapp.com",
    projectId: "sistema-votacion-flexible",
    storageBucket: "sistema-votacion-flexible.firebasestorage.app",
    messagingSenderId: "7033695204",
    appId: "1:7033695204:web:54dda2345c89f1e33635f1",
    measurementId: "G-6DF1J4VYJX"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos la base de datos y la EXPORTAMOS para que otros archivos la usen
export const db = getFirestore(app);