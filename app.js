// Import the Firebase SDK functions you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TODO: Replace the object below with YOUR actual Firebase config from your Firebase tab
const firebaseConfig = {
 
  apiKey: "AIzaSyDt9iW5woMIRP1E-eMTHdYpgceQZxK8wrE",
  authDomain: "greymus-loan.firebaseapp.com",
  projectId: "greymus-loan",
  storageBucket: "greymus-loan.firebasestorage.app",
  messagingSenderId: "689969179781",
  appId: "1:689969179781:web:aca0247196d31dcd68cdec"
 };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Simple Login Logic test
document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert("Logged in successfully!");
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});
