import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const loggedUser = document.getElementById("logged-user");

  if (user) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");

    if (loggedUser) {
      loggedUser.textContent = user.email;
    }
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }
});
