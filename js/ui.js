// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// ui.js
// VERSION 2.0
//
// UI SYSTEM
// ✔ Tab navigation
// ✔ Modal controls
// ✔ Notification panel
// ✔ Toast messages
// ✔ Loading overlay
// ✔ Confirmation modal
// ✔ Safe DOM handling
//
// NOTE:
// Main tab/history navigation is coordinated with app.js.
// ======================================================

// ======================================================
// TAB NAVIGATION
// ======================================================

const tabButtons =
document.querySelectorAll(".tab-btn");

const tabContents =
document.querySelectorAll(".tab-content");

function showTab(tabName) {

// Hide all tabs
tabContents.forEach(tab => {

    tab.classList.add("hidden");

});


// Show requested tab
const activeTab =
    document.getElementById(`${tabName}-tab`);


if (activeTab) {

    activeTab.classList.remove("hidden");

}


// Update active navigation button
tabButtons.forEach(button => {

    if (button.dataset.tab === tabName) {

        button.classList.add("active");

    } else {

        button.classList.remove("active");

    }

});

}

// ======================================================
// TAB CLICK EVENTS
// ======================================================

tabButtons.forEach(button => {

button.addEventListener("click", () => {

    const tabName =
        button.dataset.tab;

    if (tabName) {

        showTab(tabName);

    }

});

});

// ======================================================
// MODAL SYSTEM
// ======================================================

const modals =
document.querySelectorAll(".modal");

function closeAllModals() {

modals.forEach(modal => {

    modal.classList.add("hidden");

});

}

// ======================================================
// MODAL CLOSE BUTTONS
// ======================================================

document
.querySelectorAll(".modal-close-btn")
.forEach(button => {

    button.addEventListener("click", () => {

        closeAllModals();

    });

});

// Support buttons using .close-modal
document
.querySelectorAll(".close-modal")
.forEach(button => {

    button.addEventListener("click", () => {

        const modal =
            button.closest(".modal");

        if (modal) {

            modal.classList.add("hidden");

        }

    });

});

// ======================================================
// SECONDARY BUTTONS
// ======================================================

document
.querySelectorAll(".secondary-btn")
.forEach(button => {

    button.addEventListener("click", () => {

        const modal =
            button.closest(".modal");

        /*
         * Only close the modal containing the
         * secondary button.
         *
         * This prevents a Cancel button from
         * unexpectedly affecting unrelated UI.
         */

        if (modal) {

            modal.classList.add("hidden");

        }

    });

});

// ======================================================
// CLICK OUTSIDE MODAL TO CLOSE
// ======================================================

modals.forEach(modal => {

modal.addEventListener("click", event => {

    if (event.target === modal) {

        modal.classList.add("hidden");

    }

});

});

// ======================================================
// NOTIFICATION PANEL
// ======================================================

const notificationBtn =
document.getElementById("notification-btn");

const notificationPanel =
document.getElementById("notification-panel");

const closeNotifications =
document.getElementById("close-notifications");

if (notificationBtn && notificationPanel) {

notificationBtn.addEventListener("click", () => {

    notificationPanel.classList.toggle("hidden");

});

}

if (closeNotifications && notificationPanel) {

closeNotifications.addEventListener("click", () => {

    notificationPanel.classList.add("hidden");

});

}

// ======================================================
// CLOSE NOTIFICATION WHEN CLICKING OUTSIDE
// ======================================================

document.addEventListener("click", event => {

if (
    !notificationPanel ||
    !notificationBtn
) {

    return;

}


if (
    notificationPanel.classList.contains("hidden")
) {

    return;

}


if (
    !notificationPanel.contains(event.target) &&
    !notificationBtn.contains(event.target)
) {

    notificationPanel.classList.add("hidden");

}

});

// ======================================================
// TOAST SYSTEM
// ======================================================

let toastTimer = null;

function showToast(
message,
type = "success"
) {

const toast =
    document.getElementById("toast");


if (!toast) {

    return;

}


// Clear previous timer
if (toastTimer) {

    clearTimeout(toastTimer);

}


// Set message
toast.textContent =
    message;


// Reset classes
toast.className =
    "toast";


// Add type
toast.classList.add(type);


// Show
toast.classList.add("show");


// Hide after 3 seconds
toastTimer = setTimeout(() => {

    toast.classList.remove("show");

}, 3000);

}

// ======================================================
// LOADING OVERLAY
// ======================================================

function showLoading() {

const loader =
    document.getElementById("loading-overlay");


if (!loader) {

    return;

}


loader.classList.remove("hidden");

}

function hideLoading() {

const loader =
    document.getElementById("loading-overlay");


if (!loader) {

    return;

}


loader.classList.add("hidden");

}

// ======================================================
// CONFIRMATION MODAL
// ======================================================

let confirmCallback = null;

function confirmAction(
message,
callback
) {

const modal =
    document.getElementById("confirm-modal");

const text =
    document.getElementById("confirm-message");


if (!modal) {

    // If confirmation modal does not exist,
    // execute callback directly.
    if (typeof callback === "function") {

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


modal.classList.remove("hidden");

}

// ======================================================
// CONFIRM YES
// ======================================================

const confirmYes =
document.getElementById("confirm-yes");

if (confirmYes) {

confirmYes.addEventListener("click", () => {

    const callback =
        confirmCallback;


    // Clear first to prevent accidental
    // double execution.
    confirmCallback = null;


    if (typeof callback === "function") {

        callback();

    }


    const modal =
        document.getElementById("confirm-modal");


    if (modal) {

        modal.classList.add("hidden");

    }

});

}

// ======================================================
// CONFIRM NO
// ======================================================

const confirmNo =
document.getElementById("confirm-no");

if (confirmNo) {

confirmNo.addEventListener("click", () => {

    confirmCallback = null;


    const modal =
        document.getElementById("confirm-modal");


    if (modal) {

        modal.classList.add("hidden");

    }

});

}

// ======================================================
// ESCAPE KEY
// ======================================================

document.addEventListener("keydown", event => {

if (event.key !== "Escape") {

    return;

}


// Close all modals
closeAllModals();


// Close notification panel
notificationPanel?.classList.add("hidden");

});

// ======================================================
// DEFAULT TAB
// ======================================================
//
// Only set the dashboard if no tab is already
// being handled by app.js.
//

if (
document.getElementById("dashboard-tab") &&
!location.hash
) {

showTab("dashboard");

}

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
// END OF ui.js
// ======================================================