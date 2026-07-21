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
const settingsBtn =
document.getElementById("settings-btn");

const settingsBtnMobile =
document.getElementById("settings-btn-mobile");
const settingsMenu = document.getElementById("settings-menu");
const closeSettings = document.getElementById("close-settings");
// Close Settings

if (closeSettings && settingsMenu) {

    closeSettings.addEventListener("click", () => {

        settingsMenu.classList.add("hidden");

    });

}settingsMenu?.addEventListener("click", (e) => {

    if (e.target === settingsMenu) {

        settingsMenu.classList.add("hidden");

    }

});
const mobileLogoutBtn = document.getElementById("mobile-logout-btn");
const mobileNav = document.querySelector(".mobile-nav");
const fab = document.getElementById("fab-new-loan");
const footer = document.querySelector(".app-footer");

// ======================================================
// AUTH STATE
// ======================================================

const startupLogo = document.getElementById("startup-logo");

onAuthStateChanged(auth, (user) => {

    if (startupLogo) {
        startupLogo.style.display = "none";
    }

    if (user) {

        loginSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");
mobileNav?.classList.remove("hidden");
fab?.classList.remove("hidden");
footer?.classList.remove("hidden");
        if (loggedUser) {
            loggedUser.textContent = user.email;
        }

        openTab("dashboard");

    } else {

        dashboardSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
mobileNav?.classList.add("hidden");
fab?.classList.add("hidden");
footer?.classList.add("hidden");

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

history.pushState(
    {
        tab: tabName
    },
    "",
    "#"+tabName
);

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

if (settingsBtnMobile && settingsMenu) {

    settingsBtnMobile.addEventListener("click", () => {

        settingsMenu.classList.remove("hidden");

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
// ANDROID BACK BUTTON SUPPORT
// ======================================================

window.addEventListener("popstate", () => {

    // Close any open modal first
    const openModal = document.querySelector(".modal:not(.hidden)");

    if (openModal) {

        openModal.classList.add("hidden");

        history.pushState(
            { tab: "dashboard" },
            "",
            "#dashboard"
        );

        return;

    }

    // Return to Dashboard if another tab is open
    const activeTab = document.querySelector(".tab-btn.active");

    if (
        activeTab &&
        activeTab.dataset.tab !== "dashboard"
    ) {

        openTab("dashboard");

    }

});

// ======================================================
// END OF FILE
// ======================================================