// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// app.js
// VERSION 4.0
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
// • GLOBAL Android / phone BACK controller
// • Centralized browser history
//
// IMPORTANT:
// app.js is the ONLY file that listens for popstate.
//
// ui.js handles:
// • Tab display
// • Tab button clicks
// • Creating tab history entries
//
// app.js handles:
// • Android/browser BACK
// • Scroll-to-top priority
// • Overlay closing priority
// • Tab history navigation
//
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

    setHidden(
        loginSection,
        true
    );

    setHidden(
        dashboardSection,
        false
    );

    setHidden(
        mobileNav,
        false
    );

    setHidden(
        fab,
        false
    );

    setHidden(
        footer,
        false
    );


    if (loggedUser) {

        loggedUser.textContent =
            user?.email || "";

    }


    closeSettingsMenu();

}


// ======================================================
// SHOW LOGIN
// ======================================================

function showLogin() {

    setHidden(
        dashboardSection,
        true
    );

    setHidden(
        loginSection,
        false
    );

    setHidden(
        mobileNav,
        true
    );

    setHidden(
        fab,
        true
    );

    setHidden(
        footer,
        true
    );


    closeSettingsMenu();

}


// ======================================================
// HISTORY CONSTANTS
// ======================================================

const GREYMUS_HISTORY_CONTROLLER =
    "GREYMUS_HISTORY";

const GREYMUS_BACK_GUARD =
    "GREYMUS_BACK_GUARD";

let greymusBackBusy = false;


// ======================================================
// GET CURRENT TAB
// ======================================================

function getCurrentTab() {

    const activeTab =
        document.querySelector(
            ".tab-content:not(.hidden)"
        );


    if (
        activeTab &&
        activeTab.id
    ) {

        return activeTab.id.replace(
            "-tab",
            ""
        );

    }


    const hash =
        window.location.hash
            ? window.location.hash
                .replace("#", "")
            : "";


    return hash || "dashboard";

}


// ======================================================
// GET CURRENT GREYMUS HISTORY STATE
// ======================================================

function getGreymusHistoryState(
    tab = getCurrentTab()
) {

    return {

        controller:
            GREYMUS_HISTORY_CONTROLLER,

        tab:
            tab || "dashboard"

    };

}


// ======================================================
// SET / REPLACE CURRENT HISTORY STATE
// ======================================================

function replaceGreymusHistory(
    tab
) {

    const safeTab =
        tab || "dashboard";


    history.replaceState(
        getGreymusHistoryState(
            safeTab
        ),
        "",
        "#" + safeTab
    );

}


// ======================================================
// CREATE NEW TAB HISTORY ENTRY
// ======================================================
//
// Called by ui.js through the global helper.
//
// Example:
//
// navigateGreymusTab("clients")
//
// creates:
//
// Dashboard
//      ↓
// Clients
//
// Android BACK then returns to Dashboard.
//
// ======================================================

function navigateGreymusTab(
    tab
) {

    if (!tab) return;


    const currentTab =
        getCurrentTab();


    if (
        currentTab === tab
    ) {

        return;

    }


    history.pushState(
        getGreymusHistoryState(
            tab
        ),
        "",
        "#" + tab
    );


    if (
        window.GreymusUI &&
        typeof window.GreymusUI.showTab ===
        "function"
    ) {

        window.GreymusUI.showTab(
            tab
        );

    }


    /*
     * Every new tab starts at the top.
     */

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });


    if (mobileNav) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

    }


    lastScrollPosition = 0;

}


// ======================================================
// EXPOSE NAVIGATION TO ui.js
// ======================================================

window.GreymusApp = {

    navigateTab:
        navigateGreymusTab,

    getCurrentTab:
        getCurrentTab

};


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
    auth,
    user => {

        if (startupLogo) {

            startupLogo.style.display =
                "none";

        }


        if (user) {

            showAuthenticatedApp(
                user
            );


            /*
             * Start authenticated session
             * at Dashboard.
             *
             * Replace instead of push so
             * login does not create an
             * unwanted history entry.
             */

            replaceGreymusHistory(
                "dashboard"
            );


            /*
             * Make sure Dashboard is visible.
             */

            if (
                window.GreymusUI &&
                typeof window.GreymusUI.showTab ===
                "function"
            ) {

                window.GreymusUI.showTab(
                    "dashboard"
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


    document.body.style.overflow =
        "hidden";

}


function closeSettingsMenu() {

    if (!settingsMenu) return;


    settingsMenu.classList.add(
        "hidden"
    );


    document.body.style.overflow =
        "";

}


// ======================================================
// DESKTOP SETTINGS BUTTON
// ======================================================

if (settingsBtn) {

    settingsBtn.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openSettingsMenu();

        }
    );

}


// ======================================================
// MOBILE SETTINGS BUTTON
// ======================================================

if (settingsBtnMobile) {

    settingsBtnMobile.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openSettingsMenu();

        }
    );

}


// ======================================================
// CLOSE SETTINGS
// ======================================================

if (closeSettings) {

    closeSettings.addEventListener(
        "click",
        event => {

            event.preventDefault();

            closeSettingsMenu();

        }
    );

}


// ======================================================
// CLICK OUTSIDE SETTINGS
// ======================================================

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


if (mobileLogoutBtn) {

    mobileLogoutBtn.addEventListener(
        "click",
        logoutUser
    );

}


// ======================================================
// GLOBAL MODAL CLOSING
// ======================================================

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
// FIND WINDOW SCROLL POSITION
// ======================================================

function getWindowScrollTop() {

    return (

        window.scrollY ||

        window.pageYOffset ||

        document.documentElement
            .scrollTop ||

        document.body.scrollTop ||

        0

    );

}


// ======================================================
// FIND SCROLLABLE ELEMENTS
// ======================================================

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
                .querySelectorAll(
                    selector
                )
                .forEach(
                    element => {

                        if (!element) {
                            return;
                        }


                        const style =
                            window.getComputedStyle(
                                element
                            );


                        const canScroll =

                            element.scrollHeight >
                            element.clientHeight &&

                            (

                                style.overflowY ===
                                "auto" ||

                                style.overflowY ===
                                "scroll" ||

                                style.overflow ===
                                "auto" ||

                                style.overflow ===
                                "scroll"

                            );


                        if (
                            canScroll
                        ) {

                            if (
                                !elements.includes(
                                    element
                                )
                            ) {

                                elements.push(
                                    element
                                );

                            }

                        }

                    }
                );

        }
    );


    return elements;

}


// ======================================================
// SCROLL CURRENT SCREEN TO TOP
// ======================================================
//
// Returns:
//
// true  = something was scrolled
// false = already at top
//
// IMPORTANT:
// We use AUTO rather than SMOOTH here.
//
// Android BACK should feel immediate.
// ======================================================

function scrollCurrentScreenToTop() {

    let foundScrolledElement =
        null;


    /*
     * Window first.
     */

    if (
        getWindowScrollTop() >
        20
    ) {

        foundScrolledElement =
            window;

    }


    /*
     * Then internal containers.
     */

    if (
        !foundScrolledElement
    ) {

        const elements =
            getScrollableElements();


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

    if (
        !foundScrolledElement
    ) {

        return false;

    }


    /*
     * Window.
     */

    if (
        foundScrolledElement ===
        window
    ) {

        window.scrollTo({
            top: 0,
            behavior: "auto"
        });

    }


    /*
     * Internal scroll container.
     */

    else {

        foundScrolledElement.scrollTo({

            top: 0,

            behavior: "auto"

        });

    }


    /*
     * Show mobile navigation.
     */

    if (mobileNav) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

    }


    lastScrollPosition = 0;


    return true;

}


// ======================================================
// FIND OPEN GREYMUS OVERLAY
// ======================================================

function getOpenGreymusOverlay() {

    /*
     * SETTINGS
     */

    if (

        settingsMenu &&

        !settingsMenu.classList.contains(
            "hidden"
        )

    ) {

        return {

            type: "settings",

            element:
                settingsMenu

        };

    }


    /*
     * STANDARD MODAL
     */

    const modal =
        document.querySelector(
            ".modal:not(.hidden)"
        );


    if (modal) {

        return {

            type: "modal",

            element:
                modal

        };

    }


    /*
     * NOTIFICATION PANEL
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

            type:
                "notification",

            element:
                notificationPanel

        };

    }


    /*
     * GLOBAL OVERLAY
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

            type:
                "global-overlay",

            element:
                globalOverlay

        };

    }


    /*
     * FAB ACTIONS
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

            type:
                "fab",

            element:
                fabActions

        };

    }


    return null;

}


// ======================================================
// CLOSE GREYMUS OVERLAY
// ======================================================

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
     * NOTIFICATION
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
     * FAB
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


// ======================================================
// RESTORE HISTORY AFTER INTERCEPTING BACK
// ======================================================
//
// Android/browser Back has already moved one history
// step backward by the time popstate fires.
//
// If Greymus consumes that Back press for:
// • scroll-to-top
// • close-overlay
//
// we immediately create the current state again.
//
// This means:
//
// FIRST BACK
//     ↓
// Greymus handles it
//
// SECOND BACK
//     ↓
// History navigation can continue.
//
// ======================================================

function restoreCurrentHistoryState() {

    const currentTab =
        getCurrentTab();


    history.pushState(

        {

            controller:
                GREYMUS_BACK_GUARD,

            tab:
                currentTab,

            guard:
                true

        },

        "",

        "#" + currentTab

    );

}


// ======================================================
// POPSTATE
// ======================================================
//
// THIS IS THE ONLY GLOBAL popstate HANDLER
// IN GREYMUS.
//
// ui.js does NOT register popstate.
//
// ======================================================

window.addEventListener(
    "popstate",
    event => {

        if (
            greymusBackBusy
        ) {

            return;

        }


        greymusBackBusy =
            true;


        try {

            /*
             * ==========================================
             * PRIORITY 1
             *
             * SCROLLED SCREEN
             *
             * Android Back:
             *
             *      ↓
             *
             * Scroll to top
             *
             * Stay on current screen.
             * ==========================================
             */

            if (
                scrollCurrentScreenToTop()
            ) {

                restoreCurrentHistoryState();

                return;

            }


            /*
             * ==========================================
             * PRIORITY 2
             *
             * OPEN OVERLAY
             *
             * Android Back:
             *
             *      ↓
             *
             * Close overlay
             *
             * Stay on current screen.
             * ==========================================
             */

            if (
                closeGreymusOverlay()
            ) {

                restoreCurrentHistoryState();

                return;

            }


            /*
             * ==========================================
             * PRIORITY 3
             *
             * TAB HISTORY
             *
             * If the history state points to a
             * Greymus tab, show that tab.
             * ==========================================
             */

            const state =
                event.state;


            if (

                state &&

                state.controller ===
                GREYMUS_HISTORY_CONTROLLER &&

                state.tab

            ) {

                if (
                    window.GreymusUI &&
                    typeof window.GreymusUI.showTab ===
                    "function"
                ) {

                    window.GreymusUI.showTab(
                        state.tab
                    );

                }


                window.scrollTo({
                    top: 0,
                    behavior: "auto"
                });


                if (mobileNav) {

                    mobileNav.classList.remove(
                        "nav-hidden"
                    );

                }


                lastScrollPosition =
                    0;


                return;

            }


            /*
             * ==========================================
             * PRIORITY 4
             *
             * UNKNOWN / EXTERNAL HISTORY
             *
             * Nothing in Greymus needs to consume
             * this Back event.
             *
             * Browser/Android has already navigated.
             * ==========================================
             */

        }
        finally {

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


// ======================================================
// INITIAL HISTORY STATE
// ======================================================
//
// Do NOT push an extra history entry.
//
// Replace the current entry only.
//
// ======================================================

(function initializeGreymusHistory() {

    const existingState =
        window.history.state;


    /*
     * Preserve a valid Greymus state.
     */

    if (

        existingState &&

        (

            existingState.controller ===
            GREYMUS_HISTORY_CONTROLLER ||

            existingState.controller ===
            GREYMUS_BACK_GUARD

        )

    ) {

        return;

    }


    const initialTab =
        window.location.hash
            ? window.location.hash
                .replace("#", "")
            : "dashboard";


    history.replaceState(

        getGreymusHistoryState(
            initialTab
        ),

        "",

        "#" + initialTab

    );

})();


// ======================================================
// ESCAPE KEY
// ======================================================
//
// ESC priority:
//
// 1. Close overlay
// 2. Scroll to top
//
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


        if (
            closeGreymusOverlay()
        ) {

            event.preventDefault();

            return;

        }


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


    /*
     * Desktop:
     * always show navigation.
     */

    if (
        window.innerWidth > 768
    ) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

        return;

    }


    const currentScroll =
        getWindowScrollTop();


    /*
     * Near top:
     * always show navigation.
     */

    if (
        currentScroll <= 20
    ) {

        mobileNav.classList.remove(
            "nav-hidden"
        );

        lastScrollPosition =
            currentScroll;

        return;

    }


    /*
     * Scrolling down.
     */

    if (
        currentScroll >
        lastScrollPosition
    ) {

        mobileNav.classList.add(
            "nav-hidden"
        );

    }


    /*
     * Scrolling up.
     */

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

        if (
            !scrollTicking
        ) {

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