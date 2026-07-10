// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// app.js
// FINISHED
// ======================================================

import { auth } from "./firebase.js";

import {
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ======================================================
// ELEMENTS
// ======================================================

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const logoutBtn = document.getElementById("logout-btn");
const loggedUser = document.getElementById("logged-user");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(auth, (user) => {

    if (user) {

        loginSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");

        if (loggedUser) {
            loggedUser.textContent = user.email;
        }

    } else {

        dashboardSection.classList.add("hidden");
        loginSection.classList.remove("hidden");

    }

});

// ======================================================
// TAB SWITCHING
// ======================================================

function openTab(tabName) {

    tabContents.forEach(section => {

        section.classList.add("hidden");

    });

    const activeSection =
        document.getElementById(`${tabName}-tab`);

    if (activeSection) {

        activeSection.classList.remove("hidden");

    }

    tabButtons.forEach(btn => {

        if (btn.dataset.tab === tabName) {

            btn.classList.add("active");

        } else {

            btn.classList.remove("active");

        }

    });

}

tabButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        openTab(btn.dataset.tab);

    });

});

// Open dashboard by default
openTab("dashboard");

// ======================================================
// LOGOUT
// ======================================================

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            await signOut(auth);

        } catch (error) {

            console.error(error);
            alert(error.message);

        }

    });

}
// =========================
// MOBILE SETTINGS
// =========================

const settingsBtn = document.getElementById("settings-btn");
const settingsMenu = document.getElementById("settings-menu");
const closeSettings = document.getElementById("close-settings");
const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

settingsBtn?.addEventListener("click", () => {
    settingsMenu.classList.remove("hidden");
});

closeSettings?.addEventListener("click", () => {
    settingsMenu.classList.add("hidden");
});

mobileLogoutBtn?.addEventListener("click", () => {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.click();   // Uses your existing logout code
    } else {
        settingsMenu.classList.add("hidden");
    }
});
// ======================================================
// CLOSE MODALS
// ======================================================

document.querySelectorAll(".close-modal").forEach(button => {

    button
