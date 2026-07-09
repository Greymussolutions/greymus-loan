// js/auth.js

import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    showLoader,
    hideLoader,
    showToast
} from "./utils.js";

// ==========================================
// DOM Elements
// ==========================================

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const logoutBtn = document.getElementById("logout-btn");

const loggedUser = document.getElementById("logged-user");

// ==========================================
// Login
// ==========================================

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {

            showToast("Please enter your email and password.", "error");

            return;

        }

        try {

            showLoader();

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            showToast("Login successful");

        } catch (error) {

            console.error(error);

            showToast(error.message, "error");

        } finally {

            hideLoader();

        }

    });

}

// ==========================================
// Logout
// ==========================================

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            showLoader();

            await signOut(auth);

            showToast("Logged out successfully");

        } catch (error) {

            console.error(error);

            showToast(error.message, "error");

        } finally {

            hideLoader();

        }

    });

}

// ==========================================
// Authentication State
// ==========================================

onAuthStateChanged(auth, async (user) => {

    try {

        if (user) {

            loginSection.classList.add("hidden");
            dashboardSection.classList.remove("hidden");

            if (loggedUser) {

                loggedUser.textContent =
                    user.displayName ||
                    user.email ||
                    "User";

            }

            // Initialize application
            const appModule = await import("./app.js");

            if (appModule.initializeApp) {

                await appModule.initializeApp(user);

            }

        } else {

            dashboardSection.classList.add("hidden");
            loginSection.classList.remove("hidden");

            if (loginForm) {

                loginForm.reset();

            }

        }

    } catch (error) {

        console.error("Application Initialization Error:", error);

        showToast(
            "Failed to initialize application.",
            "error"
        );

    }

});

// ==========================================
// Current User
// ==========================================

export function getCurrentUser() {

    return auth.currentUser;

    }
