// js/firebase.js

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// FIREBASE CONFIGURATION
// Replace these values with your Firebase project settings

const firebaseConfig = {
  apiKey: "AIzaSyDt9iW5woMIRP1E-eMTHdYpgceQZxK8wrE",
  authDomain: "greymus-loan.firebaseapp.com",
  projectId: "greymus-loan",
  storageBucket: "greymus-loan.firebasestorage.app",
  messagingSenderId: "689969179781",
  appId: "1:689969179781:web:aca0247196d31dcd68cdec"
};


// INITIALIZE FIREBASE

const app =
    initializeApp(
        firebaseConfig
    );


// SERVICES

const auth =
    getAuth(
        app
    );


const db =
    getFirestore(
        app
    );


// EXPORT SERVICES

export {
    app,
    auth,
    db
};
