// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// ui.js
// VERSION 3.0
//
// UI SYSTEM
// ✔ Tab navigation
// ✔ Tab history creation
// ✔ Modal controls
// ✔ Notification panel
// ✔ Toast messages
// ✔ Loading overlay
// ✔ Confirmation modal
// ✔ Safe DOM handling
//
// IMPORTANT:
// app.js is the ONLY file that handles popstate.
//
// ui.js:
// • Shows tabs
// • Handles tab clicks
// • Creates tab history entries through app.js
//
// ======================================================


// ======================================================
// TAB ELEMENTS
// ======================================================

const tabButtons =
    document.querySelectorAll(
        ".tab-btn"
    );

const tabContents =
    document.querySelectorAll(
        ".tab-content"
    );


// ======================================================
// SHOW TAB
// ======================================================
//
// This function ONLY changes the visible tab.
//
// It does NOT modify browser history.
//
// History is handled by:
// • app.js
//
// ======================================================

function showTab(
    tabName
) {

    if (!tabName) {
        return;
    }


    // ==================================================
    // HIDE ALL TABS
    // ==================================================

    tabContents.forEach(
        tab => {

            tab.classList.add(
                "hidden"
            );

        }
    );


    // ==================================================
    // SHOW REQUESTED TAB
    // ==================================================

    const activeTab =
        document.getElementById(
            `${tabName}-tab`
        );


    if (activeTab) {

        activeTab.classList.remove(
            "hidden"
        );

    }


    // ==================================================
    // UPDATE ACTIVE NAVIGATION BUTTON
    // ==================================================

    tabButtons.forEach(
        button => {

            if (
                button.dataset.tab ===
                tabName
            ) {

                button.classList.add(
                    "active"
                );

            } else {

                button.classList.remove(
                    "active"
                );

            }

        }
    );

}


// ======================================================
// TAB CLICK EVENTS
// ======================================================
//
// IMPORTANT:
//
// We do NOT call showTab() directly here.
//
// We ask app.js to create a history entry.
//
// This produces:
//
// Dashboard
//    ↓
// Clients
//    ↓
// Loans
//
// Android BACK:
//
// Loans
//    ↓
// Clients
//    ↓
// Dashboard
//
// ======================================================

tabButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const tabName =
                    button.dataset.tab;


                if (!tabName) {
                    return;
                }


                /*
                 * If app.js is available,
                 * let it handle history.
                 */

                if (

                    window.GreymusApp &&

                    typeof
                    window.GreymusApp.navigateTab ===
                    "function"

                ) {

                    window.GreymusApp.navigateTab(
                        tabName
                    );

                    return;

                }


                /*
                 * Safe fallback.
                 *
                 * This should only happen if
                 * app.js has not loaded yet.
                 */

                showTab(
                    tabName
                );

            }
        );

    }
);


// ======================================================
// MODAL SYSTEM
// ======================================================

const modals =
    document.querySelectorAll(
        ".modal"
    );


// ======================================================
// CLOSE ALL MODALS
// ======================================================

function closeAllModals() {

    modals.forEach(
        modal => {

            modal.classList.add(
                "hidden"
            );

        }
    );


    document.body.style.overflow =
        "";

}


// ======================================================
// MODAL CLOSE BUTTONS
// ======================================================

document
    .querySelectorAll(
        ".modal-close-btn"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeAllModals();

                }
            );

        }
    );


// ======================================================
// SUPPORT BUTTONS USING .close-modal
// ======================================================

document
    .querySelectorAll(
        ".close-modal"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const modal =
                        button.closest(
                            ".modal"
                        );


                    if (modal) {

                        modal.classList.add(
                            "hidden"
                        );

                    }


                    document.body.style.overflow =
                        "";

                }
            );

        }
    );


// ======================================================
// SECONDARY BUTTONS
// ======================================================

document
    .querySelectorAll(
        ".secondary-btn"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const modal =
                        button.closest(
                            ".modal"
                        );


                    /*
                     * Only close the modal
                     * containing this button.
                     */

                    if (modal) {

                        modal.classList.add(
                            "hidden"
                        );

                    }


                    document.body.style.overflow =
                        "";

                }
            );

        }
    );


// ======================================================
// CLICK OUTSIDE MODAL TO CLOSE
// ======================================================

modals.forEach(
    modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    modal.classList.add(
                        "hidden"
                    );

                    document.body.style.overflow =
                        "";

                }

            }
        );

    }
);


// ======================================================
// NOTIFICATION PANEL
// ======================================================

const notificationBtn =
    document.getElementById(
        "notification-btn"
    );

const notificationPanel =
    document.getElementById(
        "notification-panel"
    );

const closeNotifications =
    document.getElementById(
        "close-notifications"
    );


// ======================================================
// OPEN / CLOSE NOTIFICATIONS
// ======================================================

if (
    notificationBtn &&
    notificationPanel
) {

    notificationBtn.addEventListener(
        "click",
        event => {

            event.preventDefault();

            notificationPanel.classList.toggle(
                "hidden"
            );

        }
    );

}


if (
    closeNotifications &&
    notificationPanel
) {

    closeNotifications.addEventListener(
        "click",
        event => {

            event.preventDefault();

            notificationPanel.classList.add(
                "hidden"
            );

        }
    );

}


// ======================================================
// CLOSE NOTIFICATION WHEN CLICKING OUTSIDE
// ======================================================

document.addEventListener(
    "click",
    event => {

        if (
            !notificationPanel ||
            !notificationBtn
        ) {

            return;

        }


        if (
            notificationPanel.classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        if (

            !notificationPanel.contains(
                event.target
            ) &&

            !notificationBtn.contains(
                event.target
            )

        ) {

            notificationPanel.classList.add(
                "hidden"
            );

        }

    }
);


// ======================================================
// TOAST SYSTEM
// ======================================================

let toastTimer =
    null;


function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    // Clear previous timer

    if (toastTimer) {

        clearTimeout(
            toastTimer
        );

    }


    // Set message

    toast.textContent =
        message;


    // Reset classes

    toast.className =
        "toast";


    // Add type

    toast.classList.add(
        type
    );


    // Show

    toast.classList.add(
        "show"
    );


    // Hide after 3 seconds

    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


// ======================================================
// LOADING OVERLAY
// ======================================================

function showLoading() {

    const loader =
        document.getElementById(
            "loading-overlay"
        );


    if (!loader) {
        return;
    }


    loader.classList.remove(
        "hidden"
    );

}


function hideLoading() {

    const loader =
        document.getElementById(
            "loading-overlay"
        );


    if (!loader) {
        return;
    }


    loader.classList.add(
        "hidden"
    );

}


// ======================================================
// CONFIRMATION MODAL
// ======================================================

let confirmCallback =
    null;


function confirmAction(
    message,
    callback
) {

    const modal =
        document.getElementById(
            "confirm-modal"
        );

    const text =
        document.getElementById(
            "confirm-message"
        );


    if (!modal) {

        if (
            typeof callback ===
            "function"
        ) {

            callback();

        }

        return;

    }


    if (text) {

        text.textContent =
            message;

    }


    confirmCallback =

        typeof callback ===
        "function"

            ? callback

            : null;


    modal.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";

}


// ======================================================
// CONFIRM YES
// ======================================================

const confirmYes =
    document.getElementById(
        "confirm-yes"
    );


if (confirmYes) {

    confirmYes.addEventListener(
        "click",
        event => {

            event.preventDefault();


            const callback =
                confirmCallback;


            /*
             * Clear first to prevent
             * accidental double execution.
             */

            confirmCallback =
                null;


            if (
                typeof callback ===
                "function"
            ) {

                callback();

            }


            const modal =
                document.getElementById(
                    "confirm-modal"
                );


            if (modal) {

                modal.classList.add(
                    "hidden"
                );

            }


            document.body.style.overflow =
                "";

        }
    );

}


// ======================================================
// CONFIRM NO
// ======================================================

const confirmNo =
    document.getElementById(
        "confirm-no"
    );


if (confirmNo) {

    confirmNo.addEventListener(
        "click",
        event => {

            event.preventDefault();


            confirmCallback =
                null;


            const modal =
                document.getElementById(
                    "confirm-modal"
                );


            if (modal) {

                modal.classList.add(
                    "hidden"
                );

            }


            document.body.style.overflow =
                "";

        }
    );

}


// ======================================================
// ESCAPE KEY
// ======================================================
//
// IMPORTANT:
//
// app.js owns the global Escape priority.
//
// This listener only exists as a fallback for
// modal/notification cleanup.
//
// It does NOT touch browser history.
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


        /*
         * Close all modals.
         */

        closeAllModals();


        /*
         * Close notifications.
         */

        notificationPanel?.classList.add(
            "hidden"
        );

    }
);


// ======================================================
// DEFAULT TAB
// ======================================================
//
// If there is no hash and app.js has not yet
// initialized history, show Dashboard.
//
// ======================================================

if (

    document.getElementById(
        "dashboard-tab"
    ) &&

    !window.location.hash

) {

    showTab(
        "dashboard"
    );

}


// ======================================================
// EXPOSE UI FUNCTIONS
// ======================================================
//
// app.js uses this instead of importing showTab.
//
// This avoids circular module dependencies.
//
// ======================================================

window.GreymusUI = {

    showTab,

    closeAllModals,

    showToast,

    showLoading,

    hideLoading,

    confirmAction

};


// ======================================================
// EXPORTS
// ======================================================

export {

    showTab,

    closeAllModals,

    showToast,

    showLoading,

    hideLoading,

    confirmAction

};


// ======================================================
// END OF FILE
// ======================================================