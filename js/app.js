// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// app.js
// VERSION 2.0
//
// APP CONTROLLER
// • Firebase authentication
// • Login / dashboard visibility
// • Startup logo
// • Settings menu
// • Mobile navigation visibility
// • Logout
// • Global modal closing
// • Android back-button integration
//
// NOTE:
// Tab navigation and browser history are handled by ui.js.
// ======================================================

import { auth } from "./firebase.js";

import {
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ======================================================
// ELEMENTS
// ======================================================

const loginSection =
    document.getElementById(
        "login-section"
    );


const dashboardSection =
    document.getElementById(
        "dashboard-section"
    );


const loggedUser =
    document.getElementById(
        "logged-user"
    );


const startupLogo =
    document.getElementById(
        "startup-logo"
    );


// ======================================================
// SETTINGS
// ======================================================

const settingsBtn =
    document.getElementById(
        "settings-btn"
    );


const settingsBtnMobile =
    document.getElementById(
        "settings-btn-mobile"
    );


const settingsMenu =
    document.getElementById(
        "settings-menu"
    );


const closeSettings =
    document.getElementById(
        "close-settings"
    );


// ======================================================
// MOBILE ELEMENTS
// ======================================================

const mobileLogoutBtn =
    document.getElementById(
        "mobile-logout-btn"
    );


const mobileNav =
    document.querySelector(
        ".mobile-nav"
    );


const fab =
    document.getElementById(
        "fab-new-loan"
    );


const footer =
    document.querySelector(
        ".app-footer"
    );


// ======================================================
// UTILITY
// ======================================================

function setHidden(
    element,
    hidden
) {

    if (!element) return;


    if (hidden) {

        element.classList.add(
            "hidden"
        );

    } else {

        element.classList.remove(
            "hidden"
        );

    }

}


// ======================================================
// SHOW AUTHENTICATED APP
// ======================================================

function showAuthenticatedApp(
    user
) {

    // Hide login
    setHidden(
        loginSection,
        true
    );


    // Show dashboard/application
    setHidden(
        dashboardSection,
        false
    );


    // Show mobile navigation
    setHidden(
        mobileNav,
        false
    );


    // Show floating action button
    setHidden(
        fab,
        false
    );


    // Show footer
    setHidden(
        footer,
        false
    );


    // Display logged-in user
    if (loggedUser) {

        loggedUser.textContent =
            user?.email || "";

    }


    // Close settings if it happened
    // to be open before authentication
    closeSettingsMenu();

}


// ======================================================
// SHOW LOGIN
// ======================================================

function showLogin() {

    // Hide application
    setHidden(
        dashboardSection,
        true
    );


    // Show login
    setHidden(
        loginSection,
        false
    );


    // Hide mobile navigation
    setHidden(
        mobileNav,
        true
    );


    // Hide FAB
    setHidden(
        fab,
        true
    );


    // Hide footer
    setHidden(
        footer,
        true
    );


    // Close settings
    closeSettingsMenu();

}


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
    auth,
    user => {

        // Startup logo has completed
        if (startupLogo) {

            startupLogo.style.display =
                "none";

        }


        if (user) {

            showAuthenticatedApp(
                user
            );


            // Return application to dashboard
            // after authentication.
            //
            // replaceState prevents the login
            // page from remaining in history.
            history.replaceState(
                {
                    tab: "dashboard"
                },
                "",
                "#dashboard"
            );


            // ui.js owns showTab().
            //
            // Use the global function if available.
            if (
                typeof window.showTab ===
                "function"
            ) {

                window.showTab(
                    "dashboard",
                    false
                );

            }

        } else {

            showLogin();

        }

    }
);


// ======================================================
// SETTINGS MENU
// ======================================================

function openSettingsMenu() {

    if (!settingsMenu) return;


    settingsMenu.classList.remove(
        "hidden"
    );


    // Prevent background scrolling
    document.body.style.overflow =
        "hidden";

}


function closeSettingsMenu() {

    if (!settingsMenu) return;


    settingsMenu.classList.add(
        "hidden"
    );


    // Restore scrolling
    document.body.style.overflow =
        "";

}


// Desktop settings button
if (settingsBtn) {

    settingsBtn.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openSettingsMenu();

        }
    );

}


// Mobile settings button
if (settingsBtnMobile) {

    settingsBtnMobile.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openSettingsMenu();

        }
    );

}


// Close settings button
if (closeSettings) {

    closeSettings.addEventListener(
        "click",
        event => {

            event.preventDefault();

            closeSettingsMenu();

        }
    );

}


// Click outside settings menu
if (settingsMenu) {

    settingsMenu.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                settingsMenu
            ) {

                closeSettingsMenu();

            }

        }
    );

}


// ======================================================
// LOGOUT
// ======================================================

async function logoutUser() {

    try {

        closeSettingsMenu();

        await signOut(
            auth
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );


        // Keep a simple fallback message
        // if the logout fails.
        alert(
            error?.message ||
            "Unable to log out. Please try again."
        );

    }

}


// Mobile logout
if (mobileLogoutBtn) {

    mobileLogoutBtn.addEventListener(
        "click",
        logoutUser
    );

}


// ======================================================
// GLOBAL MODAL CLOSING
// ======================================================
//
// Some modules may create modals after app.js
// has loaded. Event delegation therefore makes
// closing more reliable than binding only to
// existing buttons.

document.addEventListener(
    "click",
    event => {

        const closeButton =
            event.target.closest(
                ".close-modal"
            );


        if (!closeButton) return;


        const modal =
            closeButton.closest(
                ".modal"
            );


        if (!modal) return;


        modal.classList.add(
            "hidden"
        );


        document.body.style.overflow =
            "";

    }
);


// ======================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ======================================================

document.addEventListener(
    "click",
    event => {

        const modal =
            event.target.closest(
                ".modal"
            );


        if (!modal) return;


        if (
            event.target !== modal
        ) {

            return;

        }


        modal.classList.add(
            "hidden"
        );


        document.body.style.overflow =
            "";

    }
);


// ======================================================
// ESCAPE KEY
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        // Close settings
        closeSettingsMenu();


        // Close visible modal
        const openModal =
            document.querySelector(
                ".modal:not(.hidden)"
            );


        if (openModal) {

            openModal.classList.add(
                "hidden"
            );


            document.body.style.overflow =
                "";

        }


        // Close notification panel
        const notificationPanel =
            document.getElementById(
                "notification-panel"
            );


        notificationPanel?.classList.add(
            "hidden"
        );

    }
);


// ======================================================
// ANDROID BACK BUTTON
// ======================================================
//
// IMPORTANT:
// ui.js is responsible for tab history.
//
// app.js only handles UI overlays here.
// If a modal/settings panel is open, Android Back
// closes that overlay first.
//
// If nothing is open, ui.js receives the normal
// browser popstate event and handles tab navigation.

window.addEventListener(
    "popstate",
    () => {

        // Settings menu
        if (
            settingsMenu &&
            !settingsMenu.classList.contains(
                "hidden"
            )
        ) {

            closeSettingsMenu();

            return;

        }


        // Modal
        const openModal =
            document.querySelector(
                ".modal:not(.hidden)"
            );


        if (openModal) {

            openModal.classList.add(
                "hidden"
            );


            document.body.style.overflow =
                "";

            return;

        }


        // Notification panel
        const notificationPanel =
            document.getElementById(
                "notification-panel"
            );


        if (
            notificationPanel &&
            !notificationPanel.classList.contains(
                "hidden"
            )
        ) {

            notificationPanel.classList.add(
                "hidden"
            );

            return;

        }

        // Tab navigation is intentionally
        // NOT handled here.
        //
        // ui.js handles the browser history
        // and tab switching.

    }
);


// ======================================================
// PAGE VISIBILITY SAFETY
// ======================================================
//
// Prevent the application from becoming scroll-locked
// if a modal/settings panel was closed by another module.

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState !==
            "visible"
        ) {

            return;

        }


        const openModal =
            document.querySelector(
                ".modal:not(.hidden)"
            );


        const settingsOpen =
            settingsMenu &&
            !settingsMenu.classList.contains(
                "hidden"
            );


        if (
            !openModal &&
            !settingsOpen
        ) {

            document.body.style.overflow =
                "";

        }

    }
);


// ======================================================
// END OF FILE
// ======================================================