// Firebase Configuration (Keep your original keys here!)
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
let registeredClients = [];

// 1. Listen for Registered Clients
db.collection('clients').onSnapshot((snapshot) => {
    const select = document.getElementById('loan-client-select');
    select.innerHTML = '<option value="">-- Choose a Registered Client --</option>';
    registeredClients = [];
    snapshot.forEach(doc => {
        const client = { id: doc.id, ...doc.data() };
        registeredClients.push(client);
        select.innerHTML += `<option value="${doc.id}">${client.name}</option>`;
    });
});

// 2. Real-time Math Logic
function calculate() {
    const p = parseFloat(document.getElementById('loan-principal').value) || 0;
    const w = parseInt(document.getElementById('loan-weeks').value) || 0;
    const interest = (p * 0.05) * w;
    const total = p + interest;
    document.getElementById('calc-interest').innerText = 'KES ' + interest.toLocaleString();
    document.getElementById('calc-total').innerText = 'KES ' + total.toLocaleString();
    document.getElementById('calc-weekly').innerText = 'KES ' + (total / (w || 1)).toLocaleString() + ' / week';
}
document.getElementById('loan-principal').addEventListener('input', calculate);
document.getElementById('loan-weeks').addEventListener('input', calculate);

// 3. Register Client Action
document.getElementById('btn-register-client').addEventListener('click', () => {
    db.collection('clients').add({
        name: document.getElementById('reg-client-name').value,
        phone: document.getElementById('reg-client-phone').value
    }).then(() => alert("Client Saved!"));
});

// 4. Issue Loan Action
document.getElementById('btn-issue-loan').addEventListener('click', () => {
    const clientId = document.getElementById('loan-client-select').value;
    if (!clientId) return alert("Select a client first!");
    alert("Loan disbursed to selected client!");
});
