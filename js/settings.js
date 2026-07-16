// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// settings.js
// VERSION 3.0
// PART 1 OF 20
// IMPORTS & CONSTANTS
// ==========================================

import { auth } from "./firebase.js";

import {
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("=================================");
console.log("GREYMUS SETTINGS MODULE LOADED");
console.log("Version 3.0");
console.log("=================================");


// ==========================================
// STORAGE KEYS
// ==========================================

const STORAGE = {

    USER_NAME: "userName",

    USER_PHONE: "userPhone",

    USER_ROLE: "userRole",

    THEME: "appTheme",

    DEFAULT_INTEREST: "defaultInterest",

    DEFAULT_DURATION: "defaultDuration",

    DEFAULT_FEE: "defaultFee"

};


// ==========================================
// ADMIN SETTINGS
// ==========================================

const ADMIN_EMAIL =
    "gayisi0901@gmail.com";

function isAdmin() {

    return (
        (auth.currentUser?.email || "")
            .toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
    );

}// ==========================================
// PART 2 OF 20
// DOM ELEMENTS
// ==========================================

// ---------- Profile ----------

const profileModal =
    document.getElementById("profile-modal");

const profileForm =
    document.getElementById("profile-form");

const profileBtn =
    document.getElementById("profile-settings-btn");

const profileName =
    document.getElementById("profile-name");

const profileEmail =
    document.getElementById("profile-email");

const profilePhone =
    document.getElementById("profile-phone");

const closeProfileButtons =
    document.querySelectorAll(".close-profile");


// ---------- Security ----------

const securityBtn =
    document.getElementById("security-settings-btn");

const securityForm =
    document.getElementById("security-form");

const currentPassword =
    document.getElementById("current-password");

const newPassword =
    document.getElementById("new-password");

const confirmPassword =
    document.getElementById("confirm-password");


// ---------- Logout ----------

const logoutBtn =
    document.getElementById("logout-btn");

const mobileLogoutBtn =
    document.getElementById("mobile-logout-btn");


// ---------- Theme ----------

const themeSelect =
    document.getElementById("theme-select");


// ---------- Loan Defaults ----------

const loanDefaultsForm =
    document.getElementById("loan-defaults-form");

const defaultInterest =
    document.getElementById("default-interest");

const defaultDuration =
    document.getElementById("default-duration");

const defaultFee =
    document.getElementById("default-fee");


// ---------- Add User ----------

const addUserBtn =
    document.getElementById("add-user-btn");

const addUserModal =
    document.getElementById("add-user-modal");

const addUserForm =
    document.getElementById("add-user-form");

const closeAddUserButtons =
    document.querySelectorAll(".close-add-user");


// ---------- Manage Users ----------

const manageUsersBtn =
    document.getElementById("manage-users-btn");


// ---------- Utilities ----------

const clearDataBtn =
    document.getElementById("clear-data-btn");

const exportDataBtn =
    document.getElementById("export-data-btn");

const settingsEmail =
    document.getElementById("settings-email");

const toast =
    document.getElementById("toast");

const settingsTab =
    document.getElementById("settings-tab");// ==========================================
// PART 3 OF 20
// TOAST & HELPER FUNCTIONS
// ==========================================

function showToast(message, type = "success") {

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
// CURRENT USER
// ==========================================

function getCurrentUser() {

    return auth.currentUser;

}


// ==========================================
// GET LOCAL VALUE
// ==========================================

function getStorage(key, defaultValue = "") {

    return localStorage.getItem(key) || defaultValue;

}


// ==========================================
// SAVE LOCAL VALUE
// ==========================================

function setStorage(key, value) {

    localStorage.setItem(key, value);

}


// ==========================================
// REMOVE LOCAL VALUE
// ==========================================

function removeStorage(key) {

    localStorage.removeItem(key);

}


// ==========================================
// LOAD PROFILE
// ==========================================

function loadProfile() {

    const user = getCurrentUser();

    if (profileEmail) {

        profileEmail.value =
            user?.email || "";

    }

    if (settingsEmail) {

        settingsEmail.value =
            user?.email || "";

    }

    if (profileName) {

        profileName.value =
            getStorage(STORAGE.USER_NAME);

    }

    if (profilePhone) {

        profilePhone.value =
            getStorage(STORAGE.USER_PHONE);

    }

}


// ==========================================
// SAVE PROFILE
// ==========================================

function saveProfile() {

    setStorage(

        STORAGE.USER_NAME,

        profileName?.value.trim() || ""

    );

    setStorage(

        STORAGE.USER_PHONE,

        profilePhone?.value.trim() || ""

    );

}// ==========================================
// PART 4 OF 20
// THEME SETTINGS
// ==========================================

function applyTheme(theme) {

    if (!theme) {

        theme = "system";

    }

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


// ==========================================
// LOAD SAVED THEME
// ==========================================

function loadTheme() {

    const savedTheme =

        getStorage(

            STORAGE.THEME,

            "system"

        );

    applyTheme(savedTheme);

    if (themeSelect) {

        themeSelect.value = savedTheme;

    }

}


// ==========================================
// SAVE THEME
// ==========================================

function saveTheme(theme) {

    setStorage(

        STORAGE.THEME,

        theme

    );

    applyTheme(theme);

    showToast(

        "Theme updated successfully.",

        "success"

    );

}


// ==========================================
// THEME CHANGE EVENT
// ==========================================

themeSelect?.addEventListener(

    "change",

    () => {

        saveTheme(

            themeSelect.value

        );

    }

);


// ==========================================
// FOLLOW PHONE THEME
// ==========================================

window.matchMedia(

    "(prefers-color-scheme: dark)"

).addEventListener(

    "change",

    () => {

        if (

            getStorage(

                STORAGE.THEME,

                "system"

            ) === "system"

        ) {

            applyTheme("system");

        }

    }

);


// ==========================================
// INITIALISE THEME
// ==========================================

loadTheme();// ==========================================
// PART 5 OF 20
// PROFILE MODAL & PROFILE MANAGEMENT
// ==========================================

// ==========================================
// OPEN PROFILE
// ==========================================

profileBtn?.addEventListener(
    "click",
    () => {

        loadProfile();

        profileModal?.classList.remove("hidden");

    }
);


// ==========================================
// CLOSE PROFILE BUTTONS
// ==========================================

closeProfileButtons.forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            profileModal?.classList.add("hidden");

        }
    );

});


// ==========================================
// CLOSE WHEN CLICKING OUTSIDE
// ==========================================

profileModal?.addEventListener(
    "click",
    (e) => {

        if (e.target === profileModal) {

            profileModal.classList.add("hidden");

        }

    }
);


// ==========================================
// SAVE PROFILE
// ==========================================

profileForm?.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();

        saveProfile();

        profileModal?.classList.add("hidden");

        showToast(
            "Profile updated successfully.",
            "success"
        );

    }
);


// ==========================================
// REFRESH PROFILE
// ==========================================

function refreshProfile() {

    if (!auth.currentUser) return;

    loadProfile();

}


// ==========================================
// AUTO LOAD PROFILE
// ==========================================

auth.onAuthStateChanged((user) => {

    if (!user) return;

    refreshProfile();

});// ==========================================
// PART 6 OF 20
// CHANGE PASSWORD
// ==========================================

// ==========================================
// OPEN PASSWORD SECTION
// ==========================================

securityBtn?.addEventListener(
    "click",
    () => {

        if (!securityForm) {

            showToast(
                "Password settings are unavailable.",
                "error"
            );

            return;

        }

        securityForm.scrollIntoView({

            behavior: "smooth",

            block: "center"

        });

        currentPassword?.focus();

    }
);


// ==========================================
// CHANGE PASSWORD
// ==========================================

securityForm?.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        try {

            const user = auth.currentUser;

            if (!user || !user.email) {

                throw new Error(
                    "You are not logged in."
                );

            }

            const oldPassword =
                currentPassword.value.trim();

            const newPwd =
                newPassword.value.trim();

            const confirmPwd =
                confirmPassword.value.trim();

            if (
                !oldPassword ||
                !newPwd ||
                !confirmPwd
            ) {

                showToast(
                    "Please complete all password fields.",
                    "error"
                );

                return;

            }

            if (newPwd !== confirmPwd) {

                showToast(
                    "New passwords do not match.",
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

            switch (error.code) {

                case "auth/wrong-password":

                    showToast(
                        "Current password is incorrect.",
                        "error"
                    );

                    break;

                case "auth/weak-password":

                    showToast(
                        "Choose a stronger password.",
                        "error"
                    );

                    break;

                case "auth/requires-recent-login":

                    showToast(
                        "Please log in again and retry.",
                        "error"
                    );

                    break;

                default:

                    showToast(
                        error.message ||
                        "Unable to change password.",
                        "error"
                    );

            }

        }

    }
);// ==========================================
// PART 7 OF 20
// LOGOUT
// ==========================================

// Support both desktop and mobile logout buttons

const logoutButtons = [

    logoutBtn,

    mobileLogoutBtn

].filter(Boolean);


// ==========================================
// LOGOUT FUNCTION
// ==========================================

async function logoutUser() {

    try {

        await signOut(auth);

        // Clear user session

        localStorage.removeItem(STORAGE.USER_ROLE);

        sessionStorage.clear();

        showToast(
            "Logged out successfully.",
            "success"
        );

        setTimeout(() => {

            // Return to login page

            window.location.href = "index.html";

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


// ==========================================
// ATTACH LOGOUT EVENTS
// ==========================================

logoutButtons.forEach((button) => {

    button.addEventListener(
        "click",
        logoutUser
    );

});


// ==========================================
// EXPOSE GLOBALLY
// ==========================================

window.logoutUser = logoutUser;// ==========================================
// PART 8 OF 20
// ADD USER MODAL
// ==========================================

// ==========================================
// OPEN ADD USER MODAL
// ==========================================

addUserBtn?.addEventListener(
    "click",
    () => {

        addUserForm?.reset();

        addUserModal?.classList.remove("hidden");

    }
);


// ==========================================
// CLOSE BUTTONS
// ==========================================

closeAddUserButtons.forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            addUserModal?.classList.add("hidden");

        }
    );

});


// ==========================================
// CLOSE WHEN CLICKING OUTSIDE
// ==========================================

addUserModal?.addEventListener(
    "click",
    (e) => {

        if (e.target === addUserModal) {

            addUserModal.classList.add("hidden");

        }

    }
);


// ==========================================
// ESC KEY CLOSE
// ==========================================

document.addEventListener(
    "keydown",
    (e) => {

        if (
            e.key === "Escape" &&
            addUserModal &&
            !addUserModal.classList.contains("hidden")
        ) {

            addUserModal.classList.add("hidden");

        }

    }
);


// ==========================================
// RESET WHEN CLOSED
// ==========================================

function closeAddUserModal() {

    addUserForm?.reset();

    addUserModal?.classList.add("hidden");

}// ==========================================
// PART 9 OF 20
// ADD USER FORM
// ==========================================

addUserForm?.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        const name =
            document.getElementById("new-user-name")?.value.trim();

        const email =
            document.getElementById("new-user-email")?.value.trim();

        const password =
            document.getElementById("new-user-password")?.value;

        const role =
            document.getElementById("new-user-role")?.value || "Officer";

        if (!name || !email || !password) {

            showToast(
                "Please complete all required fields.",
                "error"
            );

            return;

        }

        if (password.length < 6) {

            showToast(
                "Password must be at least 6 characters.",
                "error"
            );

            return;

        }

        try {

            // ==================================
            // USER CREATION
            // ==================================
            // Firebase Admin SDK or Cloud Function
            // integration will be connected here.

            console.log("Creating user...");

            console.table({

                name,

                email,

                role

            });

            showToast(

                "User created successfully.",

                "success"

            );

            addUserForm.reset();

            closeAddUserModal();

        }
        catch (error) {

            console.error(error);

            showToast(

                "Unable to create user.",

                "error"

            );

        }

    }
);// ==========================================
// PART 10 OF 20
// MANAGE USERS
// ==========================================

// ==========================================
// OPEN MANAGE USERS
// ==========================================

manageUsersBtn?.addEventListener(
    "click",
    () => {

        if (!isAdmin()) {

            showToast(
                "Only the Administrator can manage users.",
                "error"
            );

            return;

        }

        openManageUsers();

    }
);


// ==========================================
// OPEN MODULE
// ==========================================

function openManageUsers() {

    const usersTab =
        document.getElementById("manage-users-modal");

    if (!usersTab) {

        showToast(
            "Manage Users module is not installed.",
            "error"
        );

        return;

    }

    usersTab.classList.remove("hidden");

    loadUsers();

}


// ==========================================
// LOAD USERS
// ==========================================

function loadUsers() {

    const usersTableBody =
        document.getElementById("users-table-body");

    if (!usersTableBody) return;

    usersTableBody.innerHTML = `

        <tr>

            <td colspan="5"
                style="text-align:center">

                User management will be connected
                to Firebase in the next version.

            </td>

        </tr>

    `;

}


// ==========================================
// CLOSE MANAGE USERS
// ==========================================

document
    .querySelectorAll(".close-manage-users")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                document
                    .getElementById("manage-users-modal")
                    ?.classList.add("hidden");

            }
        );

    });


// ==========================================
// CLICK OUTSIDE TO CLOSE
// ==========================================

document
    .getElementById("manage-users-modal")
    ?.addEventListener(
        "click",
        (e) => {

            if (
                e.target.id ===
                "manage-users-modal"
            ) {

                e.target.classList.add("hidden");

            }

        }
    );// ==========================================
// PART 11 OF 20
// LOAN DEFAULT SETTINGS
// ==========================================

// ==========================================
// LOAD LOAN DEFAULTS
// ==========================================

function loadLoanDefaults() {

    if (defaultInterest) {

        defaultInterest.value =
            getStorage(
                STORAGE.DEFAULT_INTEREST,
                "20"
            );

    }

    if (defaultDuration) {

        defaultDuration.value =
            getStorage(
                STORAGE.DEFAULT_DURATION,
                "12"
            );

    }

    if (defaultFee) {

        defaultFee.value =
            getStorage(
                STORAGE.DEFAULT_FEE,
                "0"
            );

    }

}


// ==========================================
// SAVE LOAN DEFAULTS
// ==========================================

loanDefaultsForm?.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();

        setStorage(
            STORAGE.DEFAULT_INTEREST,
            defaultInterest?.value || "20"
        );

        setStorage(
            STORAGE.DEFAULT_DURATION,
            defaultDuration?.value || "12"
        );

        setStorage(
            STORAGE.DEFAULT_FEE,
            defaultFee?.value || "0"
        );

        showToast(
            "Loan defaults saved successfully.",
            "success"
        );

    }
);


// ==========================================
// RESET LOAN DEFAULTS
// ==========================================

document
    .getElementById("reset-defaults-btn")
    ?.addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Reset loan defaults to system values?"
                )
            ) {

                return;

            }

            setStorage(
                STORAGE.DEFAULT_INTEREST,
                "20"
            );

            setStorage(
                STORAGE.DEFAULT_DURATION,
                "12"
            );

            setStorage(
                STORAGE.DEFAULT_FEE,
                "0"
            );

            loadLoanDefaults();

            showToast(
                "Loan defaults restored.",
                "success"
            );

        }
    );


// ==========================================
// INITIALIZE DEFAULTS
// ==========================================

loadLoanDefaults();// ==========================================
// PART 12 OF 20
// CLEAR LOCAL DATA
// ==========================================

clearDataBtn?.addEventListener(
    "click",
    () => {

        const confirmed = confirm(

            "This will clear locally saved settings only.\n\nContinue?"

        );

        if (!confirmed) {

            return;

        }

        try {

            // ==================================
            // REMOVE SAVED SETTINGS
            // ==================================

            removeStorage(STORAGE.USER_NAME);

            removeStorage(STORAGE.USER_PHONE);

            removeStorage(STORAGE.DEFAULT_INTEREST);

            removeStorage(STORAGE.DEFAULT_DURATION);

            removeStorage(STORAGE.DEFAULT_FEE);

            removeStorage(STORAGE.THEME);

            // ==================================
            // RELOAD DEFAULT VALUES
            // ==================================

            loadProfile();

            loadLoanDefaults();

            applyTheme("system");

            if (themeSelect) {

                themeSelect.value = "system";

            }

            showToast(

                "Local settings cleared successfully.",

                "success"

            );

        }
        catch (error) {

            console.error(error);

            showToast(

                "Failed to clear local settings.",

                "error"

            );

        }

    }
);// ==========================================
// PART 13 OF 20
// EXPORT SETTINGS
// ==========================================

exportDataBtn?.addEventListener(
    "click",
    () => {

        try {

            const settings = {

                userName:
                    getStorage(STORAGE.USER_NAME),

                userPhone:
                    getStorage(STORAGE.USER_PHONE),

                userRole:
                    getStorage(STORAGE.USER_ROLE),

                defaultInterest:
                    getStorage(STORAGE.DEFAULT_INTEREST),

                defaultDuration:
                    getStorage(STORAGE.DEFAULT_DURATION),

                defaultFee:
                    getStorage(STORAGE.DEFAULT_FEE),

                theme:
                    getStorage(
                        STORAGE.THEME,
                        "system"
                    ),

                exportedAt:
                    new Date().toISOString()

            };

            const json = JSON.stringify(
                settings,
                null,
                2
            );

            const blob = new Blob(
                [json],
                {
                    type: "application/json"
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
);// ==========================================
// PART 14 OF 20
// IMPORT / RESTORE SETTINGS
// ==========================================

const importDataBtn =
    document.getElementById("import-data-btn");

const importSettingsFile =
    document.getElementById("import-settings-file");


// ==========================================
// OPEN FILE PICKER
// ==========================================

importDataBtn?.addEventListener(
    "click",
    () => {

        importSettingsFile?.click();

    }
);


// ==========================================
// IMPORT SETTINGS
// ==========================================

importSettingsFile?.addEventListener(
    "change",
    async (e) => {

        const file = e.target.files?.[0];

        if (!file) return;

        try {

            const text =
                await file.text();

            const settings =
                JSON.parse(text);

            if (settings.userName) {

                setStorage(
                    STORAGE.USER_NAME,
                    settings.userName
                );

            }

            if (settings.userPhone) {

                setStorage(
                    STORAGE.USER_PHONE,
                    settings.userPhone
                );

            }

            if (settings.theme) {

                setStorage(
                    STORAGE.THEME,
                    settings.theme
                );

            }

            if (settings.defaultInterest) {

                setStorage(
                    STORAGE.DEFAULT_INTEREST,
                    settings.defaultInterest
                );

            }

            if (settings.defaultDuration) {

                setStorage(
                    STORAGE.DEFAULT_DURATION,
                    settings.defaultDuration
                );

            }

            if (settings.defaultFee) {

                setStorage(
                    STORAGE.DEFAULT_FEE,
                    settings.defaultFee
                );

            }

            loadProfile();

            loadLoanDefaults();

            loadTheme();

            showToast(
                "Settings imported successfully.",
                "success"
            );

        }
        catch (error) {

            console.error(error);

            showToast(
                "Invalid settings file.",
                "error"
            );

        }

        importSettingsFile.value = "";

    }
);// ==========================================
// PART 15 OF 20
// AUTHENTICATION STATE LISTENER
// ==========================================

auth.onAuthStateChanged((user) => {

    if (!user) {

        console.log("No authenticated user.");

        return;

    }

    console.log(
        "Logged in as:",
        user.email
    );

    // Update profile email

    if (profileEmail) {

        profileEmail.value =
            user.email || "";

    }

    // Refresh locally stored profile

    loadProfile();

    // Reload loan defaults

    loadLoanDefaults();

    // Reload theme

    loadTheme();

});


// ==========================================
// REFRESH PROFILE WHEN TAB BECOMES ACTIVE
// ==========================================

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


// ==========================================
// REFRESH AFTER WINDOW GAINS FOCUS
// ==========================================

window.addEventListener(
    "focus",
    () => {

        if (auth.currentUser) {

            loadProfile();

        }

    }
);


// ==========================================
// KEEP PROFILE SYNCHRONIZED
// ==========================================

setInterval(() => {

    if (auth.currentUser) {

        loadProfile();

    }

}, 60000);// ==========================================
// PART 16 OF 20
// SETTINGS INITIALIZATION
// ==========================================

function initialiseSettings() {

    console.log("Initialising Settings...");

    // Load user profile
    loadProfile();

    // Load application theme
    loadTheme();

    // Load saved loan defaults
    loadLoanDefaults();

    // Ensure profile modal is closed
    profileModal?.classList.add("hidden");

    // Ensure add-user modal is closed
    addUserModal?.classList.add("hidden");

    // Ensure manage-users modal is closed
    manageUsersModal?.classList.add("hidden");

    // Ensure security modal is closed
    securityModal?.classList.add("hidden");

    console.log("Settings initialised successfully.");

}


// ==========================================
// START SETTINGS MODULE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initialiseSettings();

    }
);


// ==========================================
// REGISTER BUTTON EVENTS
// ==========================================

profileBtn?.addEventListener(
    "click",
    openProfileModal
);

securityBtn?.addEventListener(
    "click",
    openSecurityModal
);

logoutBtn?.addEventListener(
    "click",
    logoutUser
);

addUserBtn?.addEventListener(
    "click",
    openAddUserModal
);

manageUsersBtn?.addEventListener(
    "click",
    openManageUsersModal
);


// ==========================================
// REGISTER FORM EVENTS
// ==========================================

profileForm?.addEventListener(
    "submit",
    saveProfile
);

securityForm?.addEventListener(
    "submit",
    changePassword
);

addUserForm?.addEventListener(
    "submit",
    createUser
);


// ==========================================
// SETTINGS MODULE READY
// ==========================================

console.log("====================================");
console.log("GREYMUS SETTINGS MODULE READY");
console.log("Version 3.0");
console.log("====================================");// ==========================================
// PART 17 OF 20
// THEME & LOAN DEFAULTS
// ==========================================

// Apply saved theme
function loadTheme() {

    const savedTheme =
        localStorage.getItem(STORAGE.THEME) || "system";

    if (themeSelect) {

        themeSelect.value = savedTheme;

    }

    applyTheme(savedTheme);

}


// ==========================================
// SAVE THEME
// ==========================================

themeSelect?.addEventListener(
    "change",
    () => {

        const theme = themeSelect.value;

        localStorage.setItem(
            STORAGE.THEME,
            theme
        );

        applyTheme(theme);

        showToast(
            "Theme updated successfully."
        );

    }
);


// ==========================================
// LOAD LOAN DEFAULTS
// ==========================================

function loadLoanDefaults() {

    if (defaultInterest) {

        defaultInterest.value =
            localStorage.getItem(STORAGE.INTEREST) || "20";

    }

    if (defaultDuration) {

        defaultDuration.value =
            localStorage.getItem(STORAGE.DURATION) || "12";

    }

    if (defaultFee) {

        defaultFee.value =
            localStorage.getItem(STORAGE.FEE) || "0";

    }

}


// ==========================================
// SAVE LOAN DEFAULTS
// ==========================================

loanDefaultsForm?.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();

        localStorage.setItem(
            STORAGE.INTEREST,
            defaultInterest.value
        );

        localStorage.setItem(
            STORAGE.DURATION,
            defaultDuration.value
        );

        localStorage.setItem(
            STORAGE.FEE,
            defaultFee.value
        );

        showToast(
            "Loan defaults saved successfully."
        );

    }
);


// ==========================================
// RESET LOAN DEFAULTS
// ==========================================

resetLoanDefaultsBtn?.addEventListener(
    "click",
    () => {

        if (
            !confirm(
                "Reset loan defaults to system values?"
            )
        ) return;

        localStorage.removeItem(STORAGE.INTEREST);
        localStorage.removeItem(STORAGE.DURATION);
        localStorage.removeItem(STORAGE.FEE);

        loadLoanDefaults();

        showToast(
            "Loan defaults reset."
        );

    }
);// ==========================================
// PART 18 OF 20
// CLEAR LOCAL DATA
// ==========================================

clearDataBtn?.addEventListener(
    "click",
    () => {

        const confirmed = confirm(
            "This will remove all locally saved settings.\n\nContinue?"
        );

        if (!confirmed) return;

        // User Profile
        localStorage.removeItem(STORAGE.USER_NAME);
        localStorage.removeItem(STORAGE.USER_PHONE);

        // Loan Defaults
        localStorage.removeItem(STORAGE.INTEREST);
        localStorage.removeItem(STORAGE.DURATION);
        localStorage.removeItem(STORAGE.FEE);

        // Theme
        localStorage.removeItem(STORAGE.THEME);

        // Reload defaults
        loadProfile();
        loadLoanDefaults();
        loadTheme();

        showToast(
            "Local settings cleared successfully.",
            "success"
        );

    }
);


// ==========================================
// RESET APPLICATION SETTINGS
// ==========================================

resetSettingsBtn?.addEventListener(
    "click",
    () => {

        const confirmed = confirm(
            "Restore all settings to factory defaults?"
        );

        if (!confirmed) return;

        // Theme
        localStorage.setItem(
            STORAGE.THEME,
            "system"
        );

        // Loan Defaults
        localStorage.setItem(
            STORAGE.INTEREST,
            "20"
        );

        localStorage.setItem(
            STORAGE.DURATION,
            "12"
        );

        localStorage.setItem(
            STORAGE.FEE,
            "0"
        );

        loadTheme();
        loadLoanDefaults();

        showToast(
            "Application settings restored.",
            "success"
        );

    }
);


// ==========================================
// REFRESH SETTINGS
// ==========================================

refreshSettingsBtn?.addEventListener(
    "click",
    () => {

        initialiseSettings();

        showToast(
            "Settings refreshed.",
            "success"
        );

    }
);


// ==========================================
// CLOSE ALL OPEN MODALS
// ==========================================

function closeAllSettingsModals() {

    profileModal?.classList.add("hidden");
    securityModal?.classList.add("hidden");
    addUserModal?.classList.add("hidden");
    manageUsersModal?.classList.add("hidden");

}// ==========================================
// PART 19 OF 20
// UTILITY FUNCTIONS & GLOBAL HANDLERS
// ==========================================

// ==========================================
// REFRESH PROFILE
// ==========================================

function refreshProfile() {

    loadProfile();

    loadLoanDefaults();

    loadTheme();

}


// ==========================================
// REFRESH SETTINGS
// ==========================================

function refreshSettings() {

    refreshProfile();

    console.log("Settings refreshed.");

}


// ==========================================
// DEBUG INFORMATION
// ==========================================

function debugSettings() {

    console.group("GREYMUS SETTINGS");

    console.log(
        "Current User:",
        auth.currentUser?.email || "None"
    );

    console.log(
        "Theme:",
        localStorage.getItem(STORAGE.THEME)
    );

    console.log(
        "User Name:",
        localStorage.getItem(STORAGE.NAME)
    );

    console.log(
        "User Phone:",
        localStorage.getItem(STORAGE.PHONE)
    );

    console.log(
        "Default Interest:",
        localStorage.getItem(STORAGE.INTEREST)
    );

    console.log(
        "Default Duration:",
        localStorage.getItem(STORAGE.DURATION)
    );

    console.log(
        "Default Processing Fee:",
        localStorage.getItem(STORAGE.FEE)
    );

    console.groupEnd();

}


// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

document.addEventListener(
    "keydown",
    (e) => {

        // ESC closes all settings modals

        if (e.key === "Escape") {

            closeAllSettingsModals();

        }

        // Ctrl + Shift + R refreshes settings

        if (
            e.ctrlKey &&
            e.shiftKey &&
            e.key.toLowerCase() === "r"
        ) {

            e.preventDefault();

            refreshSettings();

            showToast(
                "Settings refreshed.",
                "success"
            );

        }

    }
);


// ==========================================
// WINDOW EVENTS
// ==========================================

window.addEventListener(
    "focus",
    refreshProfile
);

window.addEventListener(
    "online",
    () => {

        showToast(
            "Internet connection restored.",
            "success"
        );

    }
);

window.addEventListener(
    "offline",
    () => {

        showToast(
            "You are offline.",
            "error"
        );

    }
);


// ==========================================
// EXPOSE GLOBAL FUNCTIONS
// ==========================================

window.refreshSettings = refreshSettings;
window.debugSettings = debugSettings;
window.closeAllSettingsModals = closeAllSettingsModals;// ==========================================
// PART 20 OF 20
// FINAL INITIALIZATION & EXPORTS
// ==========================================

// ==========================================
// START SETTINGS MODULE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log("================================");
        console.log("GREYMUS SETTINGS MODULE STARTED");
        console.log("Version 3.0");
        console.log("================================");

        initialiseSettings();

        loadProfile();

        loadTheme();

        loadLoanDefaults();

        console.log(
            "Logged In User:",
            auth.currentUser?.email || "None"
        );

    }
);


// ==========================================
// AUTH STATE LISTENER
// ==========================================

auth.onAuthStateChanged((user) => {

    if (user) {

        console.log(
            "Authenticated:",
            user.email
        );

        loadProfile();

    } else {

        console.log(
            "User signed out."
        );

    }

});


// ==========================================
// GLOBAL UTILITIES
// ==========================================

window.showToast = showToast;
window.loadProfile = loadProfile;
window.saveProfile = saveProfile;
window.logoutUser = logoutUser;
window.loadTheme = loadTheme;
window.loadLoanDefaults = loadLoanDefaults;
window.initialiseSettings = initialiseSettings;


// ==========================================
// EXPORTS
// ==========================================

export {

    showToast,

    loadProfile,

    saveProfile,

    logoutUser,

    loadTheme,

    loadLoanDefaults,

    initialiseSettings,

    refreshSettings,

    debugSettings

};


// ==========================================
// END OF FILE
// ==========================================
//
// GREYMUS LOAN FINANCIAL HUB
//
// settings.js
// VERSION 3.0
//
// ✔ Profile Management
// ✔ Theme Settings
// ✔ Password Change
// ✔ Logout
// ✔ Loan Default Settings
// ✔ Add User
// ✔ Manage Users
// ✔ Import Settings
// ✔ Export Settings
// ✔ Local Data Reset
// ✔ Authentication Listener
// ✔ Auto Initialization
// ✔ Debug Utilities
//
// STATUS: FINISHED
// ==========================================