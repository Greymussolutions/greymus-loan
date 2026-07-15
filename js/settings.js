// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// settings.js
// VERSION 2.0
// PART 1 OF 8
// ==========================================

import { auth } from "./firebase.js";

import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("SETTINGS.JS LOADED");

// ==========================================
// TOAST NOTIFICATION
// ==========================================

function showToast(message, type = "success") {

    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);

}

// ==========================================
// COMMON ELEMENTS
// ==========================================

const profileModal = document.getElementById("profile-modal");
const profileForm = document.getElementById("profile-form");

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profilePhone = document.getElementById("profile-phone");

const profileBtn = document.getElementById("profile-settings-btn");

const closeProfileButtons =
    document.querySelectorAll(".close-profile");

const logoutBtn =
    document.getElementById("logout-btn");

const securityBtn =
    document.getElementById("security-settings-btn");

const themeSelect =
    document.getElementById("theme-select");

const addUserBtn =
    document.getElementById("add-user-btn");

const manageUsersBtn =
    document.getElementById("manage-users-btn");

// ==========================================
// SETTINGS STORAGE KEYS
// ==========================================

const STORAGE = {

    NAME: "userName",

    PHONE: "userPhone",

    THEME: "appTheme",

    INTEREST: "defaultInterest",

    DURATION: "defaultDuration",

    FEE: "defaultFee"

};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCurrentUser() {

    return auth.currentUser;

}

function loadProfile() {

    if (profileEmail && auth.currentUser) {

        profileEmail.value =
            auth.currentUser.email || "";

    }

    if (profileName) {

        profileName.value =
            localStorage.getItem(STORAGE.NAME) || "";

    }

    if (profilePhone) {

        profilePhone.value =
            localStorage.getItem(STORAGE.PHONE) || "";

    }

}

function saveProfile() {

    localStorage.setItem(
        STORAGE.NAME,
        profileName.value.trim()
    );

    localStorage.setItem(
        STORAGE.PHONE,
        profilePhone.value.trim()
    );

}// ==========================================
// THEME SETTINGS
// PART 2 OF 8
// ==========================================

function applyTheme(theme) {

    if (theme === "system") {

        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        document.documentElement.setAttribute(
            "data-theme",
            prefersDark ? "dark" : "light"
        );

        return;
    }

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

}

// Load saved theme
const savedTheme =
    localStorage.getItem(STORAGE.THEME) || "system";

applyTheme(savedTheme);

// Initialise theme selector
if (themeSelect) {

    themeSelect.value = savedTheme;

    themeSelect.addEventListener(
        "change",
        () => {

            const selectedTheme =
                themeSelect.value;

            localStorage.setItem(
                STORAGE.THEME,
                selectedTheme
            );

            applyTheme(selectedTheme);

            showToast(
                "Theme updated successfully",
                "success"
            );

        }
    );

}

// Automatically follow phone theme
window.matchMedia(
    "(prefers-color-scheme: dark)"
).addEventListener(
    "change",
    () => {

        const currentTheme =
            localStorage.getItem(STORAGE.THEME) || "system";

        if (currentTheme === "system") {

            applyTheme("system");

        }

    }
);

// ==========================================
// PROFILE MODAL
// ==========================================

profileBtn?.addEventListener(
    "click",
    () => {

        loadProfile();

        profileModal?.classList.remove("hidden");

    }
);

closeProfileButtons.forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            profileModal?.classList.add("hidden");

        }
    );

});

profileModal?.addEventListener(
    "click",
    (e) => {

        if (e.target === profileModal) {

            profileModal.classList.add("hidden");

        }

    }
);

profileForm?.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();

        saveProfile();

        profileModal?.classList.add("hidden");

        showToast(
            "Profile updated successfully",
            "success"
        );

    }
);// ==========================================
// CHANGE PASSWORD
// PART 3 OF 8
// ==========================================

securityBtn?.addEventListener(
    "click",
    () => {

        if (securityForm) {

            securityForm.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            currentPassword?.focus();

            return;
        }

        showToast(
            "Change Password page is not installed.",
            "error"
        );

    }
);

securityForm?.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        const oldPassword =
            currentPassword.value.trim();

        const newPwd =
            newPassword.value.trim();

        const confirmPwd =
            confirmPassword.value.trim();

        if (newPwd !== confirmPwd) {

            showToast(
                "Passwords do not match.",
                "error"
            );

            return;

        }

        if (newPwd.length < 6) {

            showToast(
                "Password must be at least 6 characters.",
                "error"
            );

            return;

        }

        try {

            const user = auth.currentUser;

            if (!user || !user.email) {

                throw new Error(
                    "User not logged in."
                );

            }

            const credential =
                EmailAuthProvider.credential(
                    user.email,
                    oldPassword
                );

            await reauthenticateWithCredential(
                user,
                credential
            );

            await updatePassword(
                user,
                newPwd
            );

            securityForm.reset();

            showToast(
                "Password changed successfully.",
                "success"
            );

        }
        catch (error) {

            console.error(error);

            if (
                error.code === "auth/wrong-password"
            ) {

                showToast(
                    "Current password is incorrect.",
                    "error"
                );

            }
            else {

                showToast(
                    "Failed to change password.",
                    "error"
                );

            }

        }

    }
);// ==========================================
// LOGOUT
// PART 4 OF 8
// ==========================================

// Supports both the old mobile logout button
// and the new Settings page logout button.

const logoutButtons = [

    document.getElementById("logout-btn"),
    document.getElementById("mobile-logout-btn")

];

async function logoutUser() {

    try {

        await auth.signOut();

        localStorage.removeItem("userRole");

        sessionStorage.clear();

        showToast(
            "Logged out successfully.",
            "success"
        );

        setTimeout(() => {

            window.location.reload();

        }, 800);

    }
    catch (error) {

        console.error(
            "Logout Error:",
            error
        );

        showToast(
            "Logout failed.",
            "error"
        );

    }

}

logoutButtons.forEach((button) => {

    button?.addEventListener(
        "click",
        logoutUser
    );

});

// ==========================================
// ADD USER MODAL
// ==========================================

addUserBtn?.addEventListener(
    "click",
    () => {

        addUserModal?.classList.remove("hidden");

    }
);

closeAddUserButtons.forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            addUserModal?.classList.add("hidden");

        }
    );

});

addUserModal?.addEventListener(
    "click",
    (e) => {

        if (e.target === addUserModal) {

            addUserModal.classList.add("hidden");

        }

    }
);// ==========================================
// ADD USER FORM
// PART 5 OF 8
// ==========================================

addUserForm?.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        const name = document
            .getElementById("new-user-name")
            .value.trim();

        const email = document
            .getElementById("new-user-email")
            .value.trim();

        const password = document
            .getElementById("new-user-password")
            .value;

        const role = document
            .getElementById("new-user-role")
            .value;

        if (!name || !email || !password) {

            showToast(
                "Please complete all required fields.",
                "error"
            );

            return;

        }

        try {

            // Placeholder.
            // Firebase Admin/API implementation will be added later.

            console.log("Creating user...");

            console.table({
                name,
                email,
                role
            });

            showToast(
                `${name} created successfully.`,
                "success"
            );

            addUserForm.reset();

            addUserModal?.classList.add("hidden");

        }
        catch (error) {

            console.error(error);

            showToast(
                "Unable to create user.",
                "error"
            );

        }

    }
);

// ==========================================
// MANAGE USERS BUTTON
// ==========================================

manageUsersBtn?.addEventListener(
    "click",
    () => {

        showToast(
            "Manage Users module coming soon.",
            "success"
        );

    }
);

// ==========================================
// SETTINGS PAGE NAVIGATION
// ==========================================

const settingsTab = document.getElementById(
    "settings-tab"
);

document
    .querySelectorAll('[data-tab="settings"]')
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                settingsTab?.classList.remove("hidden");

            }
        );

    });// ==========================================
// SETTINGS INITIALIZATION
// PART 6 OF 8
// ==========================================

function initialiseSettings() {

    loadProfile();

    // Load saved loan defaults

    if (defaultInterest) {

        defaultInterest.value =
            localStorage.getItem(STORAGE.DEFAULT_INTEREST) || "20";

    }

    if (defaultDuration) {

        defaultDuration.value =
            localStorage.getItem(STORAGE.DEFAULT_DURATION) || "12";

    }

    if (defaultFee) {

        defaultFee.value =
            localStorage.getItem(STORAGE.DEFAULT_FEE) || "0";

    }

}

initialiseSettings();


// ==========================================
// SAVE LOAN DEFAULTS
// ==========================================

loanDefaultsForm?.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();

        localStorage.setItem(
            STORAGE.DEFAULT_INTEREST,
            defaultInterest.value
        );

        localStorage.setItem(
            STORAGE.DEFAULT_DURATION,
            defaultDuration.value
        );

        localStorage.setItem(
            STORAGE.DEFAULT_FEE,
            defaultFee.value
        );

        showToast(
            "Loan defaults saved successfully.",
            "success"
        );

    }
);


// ==========================================
// CLEAR LOCAL DATA
// ==========================================

clearDataBtn?.addEventListener(
    "click",
    () => {

        const confirmed = confirm(
            "Clear all locally saved settings?"
        );

        if (!confirmed) return;

        localStorage.removeItem(STORAGE.USER_NAME);
        localStorage.removeItem(STORAGE.USER_PHONE);
        localStorage.removeItem(STORAGE.DEFAULT_INTEREST);
        localStorage.removeItem(STORAGE.DEFAULT_DURATION);
        localStorage.removeItem(STORAGE.DEFAULT_FEE);

        loadProfile();

        showToast(
            "Local settings cleared.",
            "success"
        );

    }
);// ==========================================
// EXPORT SETTINGS
// PART 7 OF 8
// ==========================================

exportDataBtn?.addEventListener(
    "click",
    () => {

        try {

            const data = {

                userName:
                    localStorage.getItem(STORAGE.USER_NAME),

                userPhone:
                    localStorage.getItem(STORAGE.USER_PHONE),

                defaultInterest:
                    localStorage.getItem(STORAGE.DEFAULT_INTEREST),

                defaultDuration:
                    localStorage.getItem(STORAGE.DEFAULT_DURATION),

                defaultFee:
                    localStorage.getItem(STORAGE.DEFAULT_FEE),

                theme:
                    localStorage.getItem(STORAGE.THEME),

                exportDate:
                    new Date().toLocaleString()

            };

            const blob = new Blob(
                [
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                ],
                {
                    type:
                    "application/json"
                }
            );

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                "greymus-settings.json";

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            showToast(
                "Settings exported successfully.",
                "success"
            );

        }
        catch (error) {

            console.error(error);

            showToast(
                "Failed to export settings.",
                "error"
            );

        }

    }
);


// ==========================================
// AUTH STATE LISTENER
// ==========================================

auth.onAuthStateChanged((user) => {

    if (user) {

        if (settingsEmail) {

            settingsEmail.value =
                user.email || "";

        }

        loadProfile();

    }
    else {

        console.log(
            "User is signed out."
        );

    }

});


// ==========================================
// SETTINGS PAGE READY
// ==========================================

console.log(
    "Settings page initialized successfully."
);// ==========================================
// FINAL INITIALIZATION
// PART 8 OF 8
// ==========================================

// Refresh profile whenever the page becomes visible
document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState === "visible" &&
            auth.currentUser
        ) {

            loadProfile();

        }

    }
);


// Refresh profile after login
auth.onAuthStateChanged((user) => {

    if (!user) return;

    if (settingsEmail) {

        settingsEmail.value =
            user.email || "";

    }

    loadProfile();

});


// ==========================================
// EXPOSE UTILITIES
// ==========================================

window.showToast = showToast;
window.loadProfile = loadProfile;
window.saveProfile = saveProfile;
window.logoutUser = logoutUser;


// ==========================================
// START SETTINGS MODULE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "=================================="
        );

        console.log(
            "GREYMUS SETTINGS MODULE READY"
        );

        console.log(
            "Theme:",
            localStorage.getItem(STORAGE.THEME) || "system"
        );

        console.log(
            "Current User:",
            auth.currentUser?.email || "None"
        );

        console.log(
            "=================================="
        );

        initialiseSettings();

    }
);


// ==========================================
// EXPORTS
// ==========================================

export {

    showToast,
    loadProfile,
    saveProfile,
    logoutUser

};

// ==========================================
// END OF SETTINGS.JS
// VERSION 2.0
// FINISHED
// ==========================================