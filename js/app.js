// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// app.js
// VERSION 3.0
//
// APP CONTROLLER
// • Firebase authentication
// • Login / dashboard visibility
// • Startup logo
// • Settings menu
// • Mobile navigation visibility
// • Mobile navigation auto-hide on scroll
// • Logout
// • Global modal closing
// • Android back-button support
//
// NOTE:
// Tab navigation and tab history are handled by ui.js.
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


    // Show application
    setHidden(
        dashboardSection,
        false
    );


    // Show mobile navigation
    setHidden(
        mobileNav,
        false
    );


    // Show FAB
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


    // Close settings
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

        // Startup logo completed
        if (startupLogo) {

            startupLogo.style.display =
                "none";

        }


        if (user) {

            showAuthenticatedApp(
                user
            );


            // Start authenticated user
            // at Dashboard.
            history.replaceState(
                {
                    tab: "dashboard"
                },
                "",
                "#dashboard"
            );

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


// Close settings
if (closeSettings) {

    closeSettings.addEventListener(
        "click",
        event => {

            event.preventDefault();

            closeSettingsMenu();

        }
    );

}


// Click outside settings
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
// Event delegation allows this to work even when
// modules create modals dynamically.

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


        // Close modal
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


        // Close notifications
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
// ANDROID BACK BUTTON SUPPORT
// ======================================================
//
// ui.js controls tab history.
//
// app.js only closes overlays that are open.
// ======================================================

window.addEventListener(
    "popstate",
    () => {

        // Close settings if open
        if (
            settingsMenu &&
            !settingsMenu.classList.contains(
                "hidden"
            )
        ) {

            closeSettingsMenu();

            return;

        }


        // Close modal if open
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


        // Close notification panel
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

    }
);


// ======================================================
// MOBILE BOTTOM NAVIGATION
// AUTO-HIDE WHEN SCROLLING DOWN
// SHOW WHEN SCROLLING UP
// ======================================================

let lastScrollPosition = 0;

let scrollTicking = false;


function handleMobileNavigationScroll() {

    if (!mobileNav) return;


    // Only apply on mobile-sized screens
    if (
        window.innerWidth > 768
    ) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

        return;

    }


    const currentScroll =
        window.scrollY ||
        window.pageYOffset ||
        0;


    // Always show navigation near the top
    if (currentScroll <= 20) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

        lastScrollPosition =
            currentScroll;

        return;

    }


    // Scrolling down
    if (
        currentScroll >
        lastScrollPosition
    ) {

        mobileNav.classList.add(
            "nav-hidden"
        );

    }

    // Scrolling up
    else if (
        currentScroll <
        lastScrollPosition
    ) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

    }


    lastScrollPosition =
        currentScroll;

}


window.addEventListener(
    "scroll",
    () => {

        if (!scrollTicking) {

            window.requestAnimationFrame(
                () => {

                    handleMobileNavigationScroll();

                    scrollTicking =
                        false;

                }
            );

            scrollTicking =
                true;

        }

    },
    {
        passive: true
    }
);


// ======================================================
// RESET MOBILE NAVIGATION ON RESIZE
// ======================================================

window.addEventListener(
    "resize",
    () => {

        if (!mobileNav) return;


        if (
            window.innerWidth > 768
        ) {

            mobileNav.classList.remove(
                "nav-hidden"
            );

        }

    }
);


// ======================================================
// PAGE VISIBILITY SAFETY
// ======================================================

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