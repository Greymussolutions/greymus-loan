// =====================================================
// GREYMUS LOAN FINANCIAL HUB
// js/ui.js
// VERSION 2.0
//
// UI SYSTEM
// • Tab navigation
// • Browser/Android back-button support
// • Modal control
// • Notifications
// • Toast messages
// • Loading overlay
// • Confirmation modal
// • Expandable cards
// =====================================================


// =====================================================
// TAB NAVIGATION
// =====================================================

const tabButtons =
    document.querySelectorAll(".tab-btn");

const tabContents =
    document.querySelectorAll(".tab-content");


// Track the currently displayed tab
let currentTab = null;


// Prevent duplicate history entries
let isNavigatingFromHistory = false;


// =====================================================
// SHOW TAB
// =====================================================

function showTab(tabName, addToHistory = true) {

    if (!tabName) return;


    const activeTab =
        document.getElementById(
            `${tabName}-tab`
        );


    // If the requested tab does not exist,
    // do nothing.
    if (!activeTab) return;


    // Hide every tab
    tabContents.forEach(tab => {

        tab.classList.add("hidden");

    });


    // Show requested tab
    activeTab.classList.remove("hidden");


    // Update navigation buttons
    tabButtons.forEach(button => {

        if (
            button.dataset.tab === tabName
        ) {

            button.classList.add("active");

            button.setAttribute(
                "aria-current",
                "page"
            );

        } else {

            button.classList.remove("active");

            button.removeAttribute(
                "aria-current"
            );

        }

    });


    // Remember current tab
    const previousTab = currentTab;

    currentTab = tabName;


    // Browser / Android back-button support
    //
    // Only create a new history entry when
    // the user actually navigates to another tab.
    if (
        addToHistory &&
        !isNavigatingFromHistory &&
        previousTab !== tabName
    ) {

        history.pushState(
            {
                tab: tabName
            },
            "",
            `#${tabName}`
        );

    }


    // Return to top when opening a new page/tab
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =====================================================
// TAB CLICK EVENTS
// =====================================================

tabButtons.forEach(button => {

    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            const tabName =
                button.dataset.tab;

            if (!tabName) return;

            showTab(tabName);

        }
    );

});


// =====================================================
// BROWSER / ANDROID BACK BUTTON
// =====================================================

window.addEventListener(
    "popstate",
    event => {

        isNavigatingFromHistory = true;


        const historyTab =
            event.state?.tab;


        // If history contains a tab,
        // return to that tab.
        if (historyTab) {

            showTab(
                historyTab,
                false
            );

        } else {

            // If there is no tab in history,
            // return to dashboard.
            showTab(
                "dashboard",
                false
            );

        }


        isNavigatingFromHistory = false;

    }
);


// =====================================================
// INITIAL TAB
// =====================================================

function initializeTabs() {

    const hash =
        window.location.hash
        .replace("#", "")
        .trim();


    // Open tab from URL hash if valid
    if (
        hash &&
        document.getElementById(
            `${hash}-tab`
        )
    ) {

        showTab(
            hash,
            false
        );

        return;

    }


    // Otherwise dashboard
    if (
        document.getElementById(
            "dashboard-tab"
        )
    ) {

        showTab(
            "dashboard",
            false
        );

    }

}


// =====================================================
// MODAL CONTROL
// =====================================================

const modals =
    document.querySelectorAll(".modal");


// =====================================================
// CLOSE ALL MODALS
// =====================================================

function closeAllModals() {

    modals.forEach(modal => {

        modal.classList.add(
            "hidden"
        );

    });


    // Clear confirmation callback
    confirmCallback = null;


    // Restore body scrolling
    document.body.style.overflow = "";

}


// =====================================================
// CLOSE INDIVIDUAL MODAL
// =====================================================

function closeModal(modal) {

    if (!modal) return;


    modal.classList.add(
        "hidden"
    );


    // If no other modal is visible,
    // restore body scrolling.
    const visibleModal =
        document.querySelector(
            ".modal:not(.hidden)"
        );


    if (!visibleModal) {

        document.body.style.overflow = "";

    }

}


// =====================================================
// OPEN MODAL
// =====================================================

function openModal(modal) {

    if (!modal) return;


    modal.classList.remove(
        "hidden"
    );


    // Prevent background scrolling
    document.body.style.overflow = "hidden";

}


// =====================================================
// CLOSE BUTTONS
// =====================================================

document
    .querySelectorAll(".modal-close-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const modal =
                    button.closest(".modal");


                if (modal) {

                    closeModal(modal);

                } else {

                    closeAllModals();

                }

            }
        );

    });


// =====================================================
// SECONDARY BUTTONS
// =====================================================
//
// Only close a modal when the secondary button
// is actually inside a modal.
//
// This prevents unrelated secondary buttons
// elsewhere in the application from accidentally
// closing every modal.

document
    .querySelectorAll(
        ".modal .secondary-btn"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const modal =
                    button.closest(".modal");


                if (modal) {

                    closeModal(modal);

                }

            }
        );

    });


// =====================================================
// CLICK OUTSIDE MODAL TO CLOSE
// =====================================================

modals.forEach(modal => {

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeModal(modal);

            }

        }
    );

});


// =====================================================
// ESCAPE KEY
// =====================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Escape"
        ) {

            return;

        }


        const visibleModal =
            document.querySelector(
                ".modal:not(.hidden)"
            );


        if (visibleModal) {

            closeModal(
                visibleModal
            );

            return;

        }


        // Close notification panel
        notificationPanel?.classList.add(
            "hidden"
        );

    }
);


// =====================================================
// NOTIFICATION PANEL
// =====================================================

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


// Open / close notification panel
if (notificationBtn) {

    notificationBtn.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            notificationPanel?.classList.toggle(
                "hidden"
            );

        }
    );

}


// Close notifications button
if (closeNotifications) {

    closeNotifications.addEventListener(
        "click",
        () => {

            notificationPanel?.classList.add(
                "hidden"
            );

        }
    );

}


// Click outside notification panel
document.addEventListener(
    "click",
    event => {

        if (
            !notificationPanel ||
            notificationPanel.classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        if (
            notificationPanel.contains(
                event.target
            ) ||
            notificationBtn?.contains(
                event.target
            )
        ) {

            return;

        }


        notificationPanel.classList.add(
            "hidden"
        );

    }
);


// =====================================================
// TOAST SYSTEM
// =====================================================

let toastTimer = null;


function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) return;


    // Clear previous timer
    if (toastTimer) {

        clearTimeout(
            toastTimer
        );

    }


    toast.textContent =
        message;


    // Reset classes
    toast.className =
        "toast";


    // Add message type
    if (type) {

        toast.classList.add(
            type
        );

    }


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


// =====================================================
// LOADING OVERLAY
// =====================================================

function showLoading() {

    const loader =
        document.getElementById(
            "loading-overlay"
        );


    if (!loader) return;


    loader.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";

}


function hideLoading() {

    const loader =
        document.getElementById(
            "loading-overlay"
        );


    if (!loader) return;


    loader.classList.add(
        "hidden"
    );


    document.body.style.overflow =
        "";

}


// =====================================================
// CONFIRMATION MODAL
// =====================================================

let confirmCallback = null;


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

        // Fallback if confirmation modal
        // does not exist.
        if (
            typeof callback === "function"
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
        typeof callback === "function"
            ? callback
            : null;


    openModal(
        modal
    );

}


// =====================================================
// CONFIRM YES
// =====================================================

const confirmYes =
    document.getElementById(
        "confirm-yes"
    );


if (confirmYes) {

    confirmYes.addEventListener(
        "click",
        () => {

            const callback =
                confirmCallback;


            confirmCallback =
                null;


            closeAllModals();


            if (
                typeof callback === "function"
            ) {

                callback();

            }

        }
    );

}


// =====================================================
// CONFIRM NO
// =====================================================

const confirmNo =
    document.getElementById(
        "confirm-no"
    );


if (confirmNo) {

    confirmNo.addEventListener(
        "click",
        () => {

            confirmCallback =
                null;

            closeAllModals();

        }
    );

}


// =====================================================
// EXPANDABLE TOTAL LOANS CARD
// =====================================================

document
    .querySelectorAll(
        ".expand-btn"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                const contentId =
                    button.dataset.target;


                // Default target used by the
                // existing Total Loans card.
                const targetId =
                    contentId ||
                    "loan-summary-content";


                const content =
                    document.getElementById(
                        targetId
                    );


                if (!content) return;


                const isHidden =
                    content.classList.contains(
                        "hidden"
                    );


                if (isHidden) {

                    content.classList.remove(
                        "hidden"
                    );

                    button.classList.add(
                        "open"
                    );

                    button.setAttribute(
                        "aria-expanded",
                        "true"
                    );

                } else {

                    content.classList.add(
                        "hidden"
                    );

                    button.classList.remove(
                        "open"
                    );

                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );

    });


// =====================================================
// EXPANDABLE HEADER SUPPORT
// =====================================================

document
    .querySelectorAll(
        ".expandable-header"
    )
    .forEach(header => {

        header.addEventListener(
            "click",
            event => {

                // Do not trigger twice when
                // the actual button was clicked.
                if (
                    event.target.closest(
                        ".expand-btn"
                    )
                ) {

                    return;

                }


                const button =
                    header.querySelector(
                        ".expand-btn"
                    );


                if (button) {

                    button.click();

                }

            }
        );

    });


// =====================================================
// INITIALIZE UI
// =====================================================

initializeTabs();


// =====================================================
// EXPORTS
// =====================================================

export {

    showTab,

    showToast,

    showLoading,

    hideLoading,

    confirmAction,

    closeAllModals,

    closeModal,

    openModal

};