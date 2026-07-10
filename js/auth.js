// ==========================================
// Greymus Loan Financial Hub
// auth.js
// FINISHED
// ==========================================

console.log("auth.js loaded");

import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// DOM ELEMENTS
// ==========================================

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loggedUser = document.getElementById("logged-user");

const loadingOverlay = document.getElementById("loading-overlay");

// ==========================================
// LOADER
// ==========================================

function showLoader() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
    }
}

function hideLoader() {
    if (loadingOverlay) {
        loadingOverlay.classList.add("hidden");
    }
}

// ==========================================
// TOAST
// ==========================================

function showToast(message) {

    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ==========================================
// USER ROLE
// ==========================================

async function getUserRole(uid) {

    try {

        const ref = doc(db, "users", uid);

        const snap = await getDoc(ref);

        if (snap.exists()) {
            return snap.data();
        }

        return {
            role: "Field Officer"
        };

    } catch (error) {

        console.error(error);

        return {
            role: "Field Officer"
        };
    }
}

// ==========================================
// LOGIN
// ==========================================

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showToast("Enter email and password.");
            return;
        }

        try {

            showLoader();

            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = credential.user;

            const profile =
                await getUserRole(user.uid);

            localStorage.setItem(
                "userRole",
                profile.role
            );

            showToast("Login successful");

            loginForm.reset();

        } catch (error) {

            console.error(error);

            switch (error.code) {

                case "auth/invalid-email":
                    showToast("Invalid email.");
                    break;

                case "auth/user-not-found":
                    showToast("User not found.");
                    break;

                case "auth/wrong-password":
                case "auth/invalid-credential":
                    showToast("Incorrect email or password.");
                    break;

                case "auth/network-request-failed":
                    showToast("Network error.");
                    break;

                default:
                    showToast(error.message);
            }

        } finally {

            hideLoader();

        }

    });

}

// ==========================================
// AUTH STATE
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (user) {

        const profile =
            await getUserRole(user.uid);

        localStorage.setItem(
            "userRole",
            profile.role
        );

        if (loginSection)
            loginSection.classList.add("hidden");

        if (dashboardSection)
            dashboardSection.classList.remove("hidden");

        if (loggedUser)
            loggedUser.textContent =
                `${user.email} (${profile.role})`;

    } else {

        if (loginSection)
            loginSection.classList.remove("hidden");

        if (dashboardSection)
            dashboardSection.classList.add("hidden");

        if (loggedUser)
            loggedUser.textContent = "";

    }

});

// ==========================================
// LOGOUT
// ==========================================

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            showLoader();

            await signOut(auth);

            localStorage.removeItem("userRole");

            showToast("Logged out successfully");

        } catch (error) {

            console.error(error);

            showToast("Logout failed.");

        } finally {

            hideLoader();

        }

    });

}

// ==========================================
// END OF FILE
// FINISHED
// ==========================================
