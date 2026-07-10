// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// app.js
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

const loggedUser = document.getElementById("logged-user");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Settings
const settingsBtn = document.getElementById("settings-btn");
const settingsMenu = document.getElementById("settings-menu");
const closeSettings = document.getElementById("close-settings");
const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

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

        openTab("dashboard");

    } else {

        dashboardSection.classList.add("hidden");
        loginSection.classList.remove("hidden");

    }

});

// ======================================================
// TAB SWITCHING
// ======================================================

function openTab(tabName) {

    tabContents.forEach(tab => {
        tab.classList.add("hidden");
    });

    const active = document.getElementById(`${tabName}-tab`);

    if (active) {
        active.classList.remove("hidden");
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

        const tab = btn.dataset.tab;

        if (tab) {
            openTab(tab);
        }

    });

});

// ======================================================
// SETTINGS MENU
// ======================================================

if (settingsBtn && settingsMenu) {

    settingsBtn.addEventListener("click", () => {

        settingsMenu.classList.remove("hidden");

    });

}

if (closeSettings && settingsMenu) {

    closeSettings.addEventListener("click", () => {

        settingsMenu.classList.add("hidden");

    });

}

// ======================================================
// LOGOUT
// ======================================================

if (mobileLogoutBtn) {

    mobileLogoutBtn.addEventListener("click", async () => {

        try {

            settingsMenu?.classList.add("hidden");

            await signOut(auth);

        } catch (error) {

            console.error(error);
            alert(error.message);

        }

    });

}

// ======================================================
// CLOSE MODALS
// ======================================================

document.querySelectorAll(".close-modal").forEach(button => {

    button.addEventListener("click", () => {

        const modal = button.closest(".modal");

        if (modal) {

            modal.classList.add("hidden");

        }

    });

});

// ======================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ======================================================

document.querySelectorAll(".modal").forEach(modal => {

    modal.addEventListener("click", (e) => {

        if (e.target === modal) {

            modal.classList.add("hidden");

        }

    });

});

// ======================================================
// ESC KEY CLOSES SETTINGS & MODALS
// ======================================================

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        settingsMenu?.classList.add("hidden");

        document.querySelectorAll(".modal").forEach(modal => {
            modal.classList.add("hidden");
        });

    }

});

// ======================================================
// END OF FILE
// ======================================================