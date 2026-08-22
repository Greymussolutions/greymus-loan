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
// FULL GLOBAL ANDROID / PHONE BACK BUTTON
// GREYMUS LOAN FINANCIAL HUB
//
// BACK PRIORITY:
//
// 1. If the current page/list is scrolled down:
//      → Go to the TOP first.
//
// 2. If an overlay/modal/panel is open:
//      → Close it.
//
// 3. If inside a secondary screen:
//      → Return through browser/app history.
//
// 4. If already at the root/top:
//      → Allow normal Android/browser BACK.
//
// IMPORTANT:
// This is intentionally centralized in app.js.
// Do NOT create another global popstate handler
// in individual modules.
// ======================================================


const GREYMUS_BACK_STATE =
    "GREYMUS_BACK_CONTROLLER";


let greymusBackBusy = false;


/* ======================================================
   FIND THE CURRENT SCROLL POSITION
   ====================================================== */

function getWindowScrollTop() {

    return (
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
    );

}


/* ======================================================
   SCROLL WINDOW TO TOP
   ====================================================== */

function scrollWindowToTop() {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ======================================================
   FIND SCROLLABLE ELEMENTS
   ====================================================== */

function getScrollableElements() {

    const elements = [];

    const selectors = [

        ".main-content",

        ".tab-content",

        ".table-wrapper",

        ".modal",

        ".modal-content",

        ".schedule-modal",

        ".loan-details",

        ".client-details",

        ".history-details",

        ".settings-page",

        ".today-due-list",

        ".arrears-card",

        ".dashboard-layout"

    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(selector)
                .forEach(element => {

                    if (!element) return;

                    const style =
                        window.getComputedStyle(
                            element
                        );

                    const canScroll =
                        (
                            element.scrollHeight >
                            element.clientHeight
                        ) &&
                        (
                            style.overflowY === "auto" ||
                            style.overflowY === "scroll" ||
                            style.overflow === "auto" ||
                            style.overflow === "scroll"
                        );


                    if (canScroll) {

                        elements.push(
                            element
                        );

                    }

                });

        }
    );


    return elements;

}


/* ======================================================
   CHECK / RESET INNER SCROLL
   ====================================================== */

function scrollCurrentScreenToTop() {

    let foundScrolledElement = null;

    const elements =
        getScrollableElements();


    /*
     * Check window first.
     */

    if (
        getWindowScrollTop() >
        20
    ) {

        foundScrolledElement =
            window;

    }


    /*
     * Check every internal scroll
     * container.
     */

    if (!foundScrolledElement) {

        for (
            const element of elements
        ) {

            if (
                element.scrollTop >
                20
            ) {

                foundScrolledElement =
                    element;

                break;

            }

        }

    }


    /*
     * Nothing is scrolled.
     */

    if (!foundScrolledElement) {

        return false;

    }


    /*
     * Scroll window.
     */

    if (
        foundScrolledElement ===
        window
    ) {

        scrollWindowToTop();

    }

    /*
     * Scroll internal container.
     */

    else {

        foundScrolledElement.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }


    /*
     * Make mobile navigation
     * visible again.
     */

    if (mobileNav) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

    }


    lastScrollPosition = 0;


    return true;

}


/* ======================================================
   FIND OPEN OVERLAY
   ====================================================== */

function getOpenGreymusOverlay() {

    /*
     * Settings menu
     */

    if (
        settingsMenu &&
        !settingsMenu.classList.contains(
            "hidden"
        )
    ) {

        return {
            type: "settings",
            element: settingsMenu
        };

    }


    /*
     * Standard modal
     */

    const modal =
        document.querySelector(
            ".modal:not(.hidden)"
        );


    if (modal) {

        return {
            type: "modal",
            element: modal
        };

    }


    /*
     * Notification panel
     */

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

        return {
            type: "notification",
            element:
                notificationPanel
        };

    }


    /*
     * Global overlay
     */

    const globalOverlay =
        document.getElementById(
            "global-overlay"
        );


    if (
        globalOverlay &&
        !globalOverlay.classList.contains(
            "hidden"
        )
    ) {

        return {
            type: "global-overlay",
            element:
                globalOverlay
        };

    }


    /*
     * FAB actions
     */

    const fabActions =
        document.getElementById(
            "fab-actions"
        );


    if (
        fabActions &&
        fabActions.classList.contains(
            "show"
        )
    ) {

        return {
            type: "fab",
            element: fabActions
        };

    }


    return null;

}


/* ======================================================
   CLOSE ANY OPEN OVERLAY
   ====================================================== */

function closeGreymusOverlay() {

    const overlay =
        getOpenGreymusOverlay();


    if (!overlay) {

        return false;

    }


    /*
     * SETTINGS
     */

    if (
        overlay.type ===
        "settings"
    ) {

        closeSettingsMenu();

        return true;

    }


    /*
     * MODAL
     */

    if (
        overlay.type ===
        "modal"
    ) {

        overlay.element.classList.add(
            "hidden"
        );

        document.body.style.overflow =
            "";

        return true;

    }


    /*
     * NOTIFICATIONS
     */

    if (
        overlay.type ===
        "notification"
    ) {

        overlay.element.classList.add(
            "hidden"
        );

        return true;

    }


    /*
     * GLOBAL OVERLAY
     */

    if (
        overlay.type ===
        "global-overlay"
    ) {

        overlay.element.classList.add(
            "hidden"
        );

        return true;

    }


    /*
     * FAB MENU
     */

    if (
        overlay.type ===
        "fab"
    ) {

        overlay.element.classList.remove(
            "show"
        );


        if (fab) {

            fab.classList.remove(
                "open"
            );

            fab.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        return true;

    }


    return false;

}


/* ======================================================
   DETERMINE WHETHER THE APP IS AT ROOT
   ====================================================== */

function isGreymusRootScreen() {

    const visibleTab =
        document.querySelector(
            ".tab-content:not(.hidden)"
        );


    if (!visibleTab) {

        return true;

    }


    return (
        visibleTab.id ===
        "dashboard-tab"
    );

}


/* ======================================================
   CURRENT BACK STATE
   ====================================================== */

function getGreymusBackState() {

    return {

        controller:
            GREYMUS_BACK_STATE,

        tab:
            window.location.hash
                ? window.location.hash
                    .replace("#", "")
                : "dashboard"

    };

}


/* ======================================================
   ANDROID / PHONE BACK HANDLER
   ====================================================== */

window.addEventListener(
    "popstate",
    event => {

        /*
         * Prevent multiple Back events from
         * firing at the same time.
         */

        if (greymusBackBusy) {

            return;

        }


        greymusBackBusy =
            true;


        try {

            /*
             * ==========================================
             * PRIORITY 1
             *
             * If user is somewhere down a page/list,
             * BACK goes to the TOP first.
             * ==========================================
             */

            if (
                scrollCurrentScreenToTop()
            ) {

                /*
                 * Restore a history entry so the
                 * next Back press can continue
                 * navigating normally.
                 */

                if (
                    !window.history.state ||
                    window.history.state.controller !==
                    GREYMUS_BACK_STATE
                ) {

                    window.history.pushState(
                        getGreymusBackState(),
                        "",
                        window.location.href
                            .split("#")[0] +
                        (
                            window.location.hash ||
                            "#dashboard"
                        )
                    );

                }


                return;

            }


            /*
             * ==========================================
             * PRIORITY 2
             *
             * Close modal / settings / notification /
             * FAB / overlay.
             * ==========================================
             */

            if (
                closeGreymusOverlay()
            ) {

                return;

            }


            /*
             * ==========================================
             * PRIORITY 3
             *
             * If another module already controls the
             * tab history, let that navigation happen.
             *
             * We intentionally do NOT force a tab change
             * here because ui.js owns tab history.
             * ==========================================
             */

            if (
                event.state &&
                event.state.tab
            ) {

                return;

            }


            /*
             * ==========================================
             * PRIORITY 4
             *
             * Root screen.
             *
             * Nothing else is open and nothing is
             * scrolled, so normal browser/Android
             * Back behavior is allowed.
             * ==========================================
             */

        }
        finally {

            /*
             * Release after the current Back
             * operation has completed.
             */

            setTimeout(
                () => {

                    greymusBackBusy =
                        false;

                },
                120
            );

        }

    }
);


/* ======================================================
   INITIAL BACK STATE
   ====================================================== */

if (
    !window.history.state ||
    window.history.state.controller !==
    GREYMUS_BACK_STATE
) {

    window.history.replaceState(
        getGreymusBackState(),
        "",
        window.location.href
    );

}


/* ======================================================
   ALSO SUPPORT KEYBOARD BACK
   ESCAPE = CLOSE OVERLAY ONLY
   ====================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        /*
         * Close overlay first.
         */

        if (
            closeGreymusOverlay()
        ) {

            event.preventDefault();

            return;

        }


        /*
         * Otherwise scroll to top.
         */

        if (
            scrollCurrentScreenToTop()
        ) {

            event.preventDefault();

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