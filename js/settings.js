// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// settings.js
// VERSION 3.2
// FULL REPLACEMENT FILE
// ==========================================

import { auth, db } from "./firebase.js";

import {
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("=================================");
console.log("GREYMUS SETTINGS MODULE LOADED");
console.log("Version 3.2");
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

}


// ==========================================
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
    document.getElementById("settings-tab");


// ---------- Activity Log ----------

const activityLogBtn =
    document.getElementById("activity-log-btn");

const activityLogModal =
    document.getElementById("activity-log-modal");

const closeActivityLog =
    document.getElementById("close-activity-log");

const activityLogBody =
    document.getElementById("activity-log-body");


// ---------- Import Settings ----------

const importDataBtn =
    document.getElementById("import-data-btn");

const importSettingsFile =
    document.getElementById("import-settings-file");


// ==========================================
// TOAST
// ==========================================

function showToast(message, type = "success") {

    if (!toast) {

        alert(message);

        return;

    }

    toast.textContent = message;

    toast.className =
        `toast ${type} show`;

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
// LOCAL STORAGE HELPERS
// ==========================================

function getStorage(key, defaultValue = "") {

    const value =
        localStorage.getItem(key);

    return value !== null
        ? value
        : defaultValue;

}


function setStorage(key, value) {

    localStorage.setItem(
        key,
        String(value)
    );

}


function removeStorage(key) {

    localStorage.removeItem(key);

}


// ==========================================
// PROFILE
// ==========================================

function loadProfile() {

    const user =
        getCurrentUser();

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
            getStorage(
                STORAGE.USER_NAME,
                ""
            );

    }

    if (profilePhone) {

        profilePhone.value =
            getStorage(
                STORAGE.USER_PHONE,
                ""
            );

    }

}


function saveProfile() {

    setStorage(
        STORAGE.USER_NAME,
        profileName?.value.trim() || ""
    );

    setStorage(
        STORAGE.USER_PHONE,
        profilePhone?.value.trim() || ""
    );

}


// ==========================================
// THEME SYSTEM
// ==========================================

/*
    Supported values:

    light
    dark
    system

    Saved in:

    localStorage:
    appTheme

    Theme is applied to:

    <html data-theme="dark">

    AND

    <body class="dark-theme">

    The body class is important because
    styles.css uses:

    body.dark-theme
*/


// ==========================================
// GET SYSTEM THEME
// ==========================================

function getSystemTheme() {

    try {

        return window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
            ? "dark"
            : "light";

    }
    catch (error) {

        console.error(
            "Unable to detect system theme:",
            error
        );

        return "light";

    }

}


// ==========================================
// APPLY THEME
// ==========================================

function applyTheme(theme) {

    // Only allow valid themes

    if (
        theme !== "light" &&
        theme !== "dark" &&
        theme !== "system"
    ) {

        theme = "system";

    }


    let actualTheme = theme;


    // System follows phone/browser theme

    if (theme === "system") {

        actualTheme =
            getSystemTheme();

    }


    // ======================================
    // APPLY TO HTML
    // ======================================

    document.documentElement.setAttribute(
        "data-theme",
        actualTheme
    );


    document.documentElement.dataset.theme =
        actualTheme;


    // ======================================
    // APPLY HTML THEME CLASS
    // ======================================

    document.documentElement.classList.remove(
        "theme-light",
        "theme-dark"
    );


    document.documentElement.classList.add(
        `theme-${actualTheme}`
    );


    // ======================================
    // APPLY BODY THEME CLASS
    // ======================================
    //
    // THIS FIXES THE DARK THEME ISSUE.
    //
    // styles.css uses:
    //
    // body.dark-theme
    //
    // so the class must be placed on BODY.
    //

    if (document.body) {

        document.body.classList.remove(
            "dark-theme",
            "light-theme"
        );


        if (actualTheme === "dark") {

            document.body.classList.add(
                "dark-theme"
            );

        }
        else {

            document.body.classList.add(
                "light-theme"
            );

        }

    }


    // ======================================
    // BROWSER COLOR SCHEME
    // ======================================

    document.documentElement.style.colorScheme =
        actualTheme;


    console.log(
        "Theme applied:",
        theme,
        "→",
        actualTheme
    );

}


// ==========================================
// LOAD SAVED THEME
// ==========================================

function loadTheme() {

    let savedTheme =
        getStorage(
            STORAGE.THEME,
            "system"
        );


    // Validate saved value

    if (
        savedTheme !== "light" &&
        savedTheme !== "dark" &&
        savedTheme !== "system"
    ) {

        savedTheme = "system";

        setStorage(
            STORAGE.THEME,
            savedTheme
        );

    }


    applyTheme(savedTheme);


    if (themeSelect) {

        themeSelect.value =
            savedTheme;

    }

}


// ==========================================
// SAVE THEME
// ==========================================

function saveTheme(theme) {

    // Validate

    if (
        theme !== "light" &&
        theme !== "dark" &&
        theme !== "system"
    ) {

        theme = "system";

    }


    // Save immediately

    setStorage(
        STORAGE.THEME,
        theme
    );


    // Apply immediately

    applyTheme(theme);


    // Keep dropdown synchronized

    if (themeSelect) {

        themeSelect.value =
            theme;

    }


    showToast(
        `Theme changed to ${
            theme === "system"
                ? "System"
                : theme === "light"
                    ? "Light"
                    : "Dark"
        }.`,
        "success"
    );

}


// ==========================================
// THEME CHANGE EVENT
// ==========================================

themeSelect?.addEventListener(
    "change",
    () => {

        const selectedTheme =
            themeSelect.value;

        saveTheme(
            selectedTheme
        );

    }
);


// ==========================================
// FOLLOW PHONE / SYSTEM THEME
// ==========================================

const systemThemeMedia =
    window.matchMedia(
        "(prefers-color-scheme: dark)"
    );


function handleSystemThemeChange() {

    const savedTheme =
        getStorage(
            STORAGE.THEME,
            "system"
        );

    if (savedTheme === "system") {

        applyTheme("system");

    }

}


// Modern browsers

if (
    systemThemeMedia &&
    typeof systemThemeMedia.addEventListener ===
        "function"
) {

    systemThemeMedia.addEventListener(
        "change",
        handleSystemThemeChange
    );

}
else if (
    systemThemeMedia &&
    typeof systemThemeMedia.addListener ===
        "function"
) {

    systemThemeMedia.addListener(
        handleSystemThemeChange
    );

}


// ==========================================
// INITIALIZE THEME IMMEDIATELY
// ==========================================

loadTheme();


// ==========================================
// PROFILE MODAL
// ==========================================

profileBtn?.addEventListener(
    "click",
    () => {

        loadProfile();

        profileModal?.classList.remove(
            "hidden"
        );

    }
);


closeProfileButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                profileModal?.classList.add(
                    "hidden"
                );

            }
        );

    }
);


profileModal?.addEventListener(
    "click",
    (e) => {

        if (
            e.target === profileModal
        ) {

            profileModal.classList.add(
                "hidden"
            );

        }

    }
);


profileForm?.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();

        saveProfile();

        profileModal?.classList.add(
            "hidden"
        );

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
// CHANGE PASSWORD
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


securityForm?.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        try {

            const user =
                auth.currentUser;

            if (
                !user ||
                !user.email
            ) {

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


            if (
                newPwd !== confirmPwd
            ) {

                showToast(
                    "New passwords do not match.",
                    "error"
                );

                return;

            }


            if (
                newPwd.length < 6
            ) {

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
                case "auth/invalid-credential":

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
);


// ==========================================
// LOGOUT
// ==========================================

const logoutButtons = [

    logoutBtn,
    mobileLogoutBtn

].filter(Boolean);


async function logoutUser() {

    try {

        await signOut(auth);

        localStorage.removeItem(
            STORAGE.USER_ROLE
        );

        sessionStorage.clear();


        showToast(
            "Logged out successfully.",
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "index.html";

            },
            800
        );

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


logoutButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            logoutUser
        );

    }
);


window.logoutUser =
    logoutUser;


// ==========================================
// ADD USER MODAL
// ==========================================

addUserBtn?.addEventListener(
    "click",
    () => {

        if (!isAdmin()) {

            showToast(
                "Only the Administrator can add users.",
                "error"
            );

            return;

        }

        addUserForm?.reset();

        addUserModal?.classList.remove(
            "hidden"
        );

    }
);


closeAddUserButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                addUserModal?.classList.add(
                    "hidden"
                );

            }
        );

    }
);


addUserModal?.addEventListener(
    "click",
    (e) => {

        if (
            e.target === addUserModal
        ) {

            addUserModal.classList.add(
                "hidden"
            );

        }

    }
);


document.addEventListener(
    "keydown",
    (e) => {

        if (
            e.key === "Escape" &&
            addUserModal &&
            !addUserModal.classList.contains(
                "hidden"
            )
        ) {

            addUserModal.classList.add(
                "hidden"
            );

        }

    }
);


function closeAddUserModal() {

    addUserForm?.reset();

    addUserModal?.classList.add(
        "hidden"
    );

}


// ==========================================
// ADD USER
// ==========================================

addUserForm?.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();


        const name =
            document
                .getElementById(
                    "new-user-name"
                )
                ?.value
                .trim();


        const email =
            document
                .getElementById(
                    "new-user-email"
                )
                ?.value
                .trim();


        const password =
            document
                .getElementById(
                    "new-user-password"
                )
                ?.value;


        const role =
            document
                .getElementById(
                    "new-user-role"
                )
                ?.value ||
            "Officer";


        if (
            !name ||
            !email ||
            !password
        ) {

            showToast(
                "Please complete all required fields.",
                "error"
            );

            return;

        }


        if (
            password.length < 6
        ) {

            showToast(
                "Password must be at least 6 characters.",
                "error"
            );

            return;

        }


        try {

            await addDoc(
                collection(
                    db,
                    "Users"
                ),
                {
                    name,
                    email,
                    role,
                    status: "Active",

                    createdAt:
                        serverTimestamp(),

                    createdBy:
                        auth.currentUser?.email ||
                        "Unknown"
                }
            );


            showToast(
                "User saved successfully.",
                "success"
            );


            addUserForm.reset();

            closeAddUserModal();

            loadUsers();

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
// MANAGE USERS
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


function openManageUsers() {

    const usersTab =
        document.getElementById(
            "manage-users-modal"
        );


    if (!usersTab) {

        showToast(
            "Manage Users module is not installed.",
            "error"
        );

        return;

    }


    usersTab.classList.remove(
        "hidden"
    );


    loadUsers();

}


let usersUnsubscribe = null;


function loadUsers() {

    const usersTableBody =
        document.getElementById(
            "users-table-body"
        );


    if (!usersTableBody) return;


    if (usersUnsubscribe) {

        usersUnsubscribe();

        usersUnsubscribe = null;

    }


    const usersRef =
        collection(
            db,
            "Users"
        );


    usersUnsubscribe =
        onSnapshot(
            usersRef,
            (snapshot) => {

                if (
                    snapshot.empty
                ) {

                    usersTableBody.innerHTML = `
                        <tr>
                            <td
                                colspan="5"
                                style="text-align:center"
                            >
                                No users found.
                            </td>
                        </tr>
                    `;

                    return;

                }


                usersTableBody.innerHTML =
                    "";


                snapshot.forEach(
                    (userDoc) => {

                        const user =
                            userDoc.data();


                        usersTableBody.innerHTML += `
                            <tr>

                                <td>
                                    ${user.name || "-"}
                                </td>

                                <td>
                                    ${user.email || "-"}
                                </td>

                                <td>
                                    ${user.role || "Officer"}
                                </td>

                                <td>
                                    ${user.status || "Active"}
                                </td>

                                <td>

                                    <button
                                        class="edit-user-btn"
                                        data-id="${userDoc.id}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        class="delete-user-btn"
                                        data-id="${userDoc.id}"
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>
                        `;

                    }
                );

            },
            (error) => {

                console.error(
                    "Users listener error:",
                    error
                );

                showToast(
                    "Unable to load users.",
                    "error"
                );

            }
        );

}


// ==========================================
// DELETE USER
// ==========================================

document.addEventListener(
    "click",
    async (e) => {

        if (
            !e.target.classList.contains(
                "delete-user-btn"
            )
        ) {

            return;

        }


        if (!isAdmin()) {

            showToast(
                "Only the Administrator can delete users.",
                "error"
            );

            return;

        }


        const userId =
            e.target.dataset.id;


        const confirmed =
            confirm(
                "Delete this user?"
            );


        if (!confirmed) return;


        try {

            await deleteDoc(
                doc(
                    db,
                    "Users",
                    userId
                )
            );


            showToast(
                "User deleted successfully.",
                "success"
            );

        }
        catch (error) {

            console.error(error);

            showToast(
                "Unable to delete user.",
                "error"
            );

        }

    }
);


// ==========================================
// EDIT USER
// ==========================================

document.addEventListener(
    "click",
    async (e) => {

        if (
            !e.target.classList.contains(
                "edit-user-btn"
            )
        ) {

            return;

        }


        if (!isAdmin()) {

            showToast(
                "Only the Administrator can edit users.",
                "error"
            );

            return;

        }


        const userId =
            e.target.dataset.id;


        const row =
            e.target.closest("tr");


        if (!row) return;


        const currentName =
            row.children[0]
                .textContent
                .trim();


        const currentRole =
            row.children[2]
                .textContent
                .trim();


        const currentStatus =
            row.children[3]
                .textContent
                .trim();


        const newName =
            prompt(
                "User Name:",
                currentName
            );


        if (newName === null) return;


        const newRole =
            prompt(
                "Role (Admin or Officer):",
                currentRole
            );


        if (newRole === null) return;


        const newStatus =
            prompt(
                "Status (Active or Disabled):",
                currentStatus
            );


        if (newStatus === null) return;


        try {

            await updateDoc(
                doc(
                    db,
                    "Users",
                    userId
                ),
                {
                    name:
                        newName.trim(),

                    role:
                        newRole.trim(),

                    status:
                        newStatus.trim()
                }
            );


            showToast(
                "User updated successfully.",
                "success"
            );

        }
        catch (error) {

            console.error(error);

            showToast(
                "Unable to update user.",
                "error"
            );

        }

    }
);


// ==========================================
// CLOSE MANAGE USERS
// ==========================================

document
    .querySelectorAll(
        ".close-manage-users"
    )
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "manage-users-modal"
                        )
                        ?.classList.add(
                            "hidden"
                        );

                }
            );

        }
    );


document
    .getElementById(
        "manage-users-modal"
    )
    ?.addEventListener(
        "click",
        (e) => {

            if (
                e.target.id ===
                "manage-users-modal"
            ) {

                e.target.classList.add(
                    "hidden"
                );

            }

        }
    );


// ==========================================
// LOAN DEFAULT SETTINGS
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


loanDefaultsForm?.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();


        setStorage(
            STORAGE.DEFAULT_INTEREST,
            defaultInterest?.value ||
            "20"
        );


        setStorage(
            STORAGE.DEFAULT_DURATION,
            defaultDuration?.value ||
            "12"
        );


        setStorage(
            STORAGE.DEFAULT_FEE,
            defaultFee?.value ||
            "0"
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
    .getElementById(
        "reset-defaults-btn"
    )
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


loadLoanDefaults();


// ==========================================
// CLEAR LOCAL DATA
// ==========================================

clearDataBtn?.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "This will clear locally saved settings only.\n\nContinue?"
            );


        if (!confirmed) return;


        try {

            removeStorage(
                STORAGE.USER_NAME
            );

            removeStorage(
                STORAGE.USER_PHONE
            );

            removeStorage(
                STORAGE.DEFAULT_INTEREST
            );

            removeStorage(
                STORAGE.DEFAULT_DURATION
            );

            removeStorage(
                STORAGE.DEFAULT_FEE
            );

            removeStorage(
                STORAGE.THEME
            );


            loadProfile();

            loadLoanDefaults();


            // Reset theme to System

            setStorage(
                STORAGE.THEME,
                "system"
            );

            applyTheme(
                "system"
            );


            if (themeSelect) {

                themeSelect.value =
                    "system";

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
);


// ==========================================
// EXPORT SETTINGS
// ==========================================

exportDataBtn?.addEventListener(
    "click",
    () => {

        try {

            const settings = {

                userName:
                    getStorage(
                        STORAGE.USER_NAME
                    ),

                userPhone:
                    getStorage(
                        STORAGE.USER_PHONE
                    ),

                userRole:
                    getStorage(
                        STORAGE.USER_ROLE
                    ),

                defaultInterest:
                    getStorage(
                        STORAGE.DEFAULT_INTEREST
                    ),

                defaultDuration:
                    getStorage(
                        STORAGE.DEFAULT_DURATION
                    ),

                defaultFee:
                    getStorage(
                        STORAGE.DEFAULT_FEE
                    ),

                theme:
                    getStorage(
                        STORAGE.THEME,
                        "system"
                    ),

                exportedAt:
                    new Date()
                        .toISOString()

            };


            const json =
                JSON.stringify(
                    settings,
                    null,
                    2
                );


            const blob =
                new Blob(
                    [json],
                    {
                        type:
                            "application/json"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href = url;

            link.download =
                "greymus-settings.json";


            document.body.appendChild(
                link
            );


            link.click();


            document.body.removeChild(
                link
            );


            URL.revokeObjectURL(
                url
            );


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
// IMPORT SETTINGS
// ==========================================

importDataBtn?.addEventListener(
    "click",
    () => {

        importSettingsFile?.click();

    }
);


importSettingsFile?.addEventListener(
    "change",
    async (e) => {

        const file =
            e.target.files?.[0];


        if (!file) return;


        try {

            const text =
                await file.text();


            const settings =
                JSON.parse(text);


            if (
                settings.userName !==
                undefined
            ) {

                setStorage(
                    STORAGE.USER_NAME,
                    settings.userName
                );

            }


            if (
                settings.userPhone !==
                undefined
            ) {

                setStorage(
                    STORAGE.USER_PHONE,
                    settings.userPhone
                );

            }


            if (
                settings.theme ===
                    "light" ||
                settings.theme ===
                    "dark" ||
                settings.theme ===
                    "system"
            ) {

                setStorage(
                    STORAGE.THEME,
                    settings.theme
                );

            }


            if (
                settings.defaultInterest !==
                undefined
            ) {

                setStorage(
                    STORAGE.DEFAULT_INTEREST,
                    settings.defaultInterest
                );

            }


            if (
                settings.defaultDuration !==
                undefined
            ) {

                setStorage(
                    STORAGE.DEFAULT_DURATION,
                    settings.defaultDuration
                );

            }


            if (
                settings.defaultFee !==
                undefined
            ) {

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


        importSettingsFile.value =
            "";

    }
);


// ==========================================
// AUTHENTICATION STATE
// ==========================================

auth.onAuthStateChanged(
    (user) => {

        if (!user) {

            console.log(
                "No authenticated user."
            );

            return;

        }


        console.log(
            "Logged in as:",
            user.email
        );


        if (profileEmail) {

            profileEmail.value =
                user.email || "";

        }


        loadProfile();

        loadLoanDefaults();

        loadTheme();

    }
);


// ==========================================
// REFRESH PROFILE WHEN TAB ACTIVE
// ==========================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
                "visible" &&
            auth.currentUser
        ) {

            loadProfile();

            loadTheme();

        }

    }
);


// ==========================================
// REFRESH AFTER WINDOW FOCUS
// ==========================================

window.addEventListener(
    "focus",
    () => {

        if (auth.currentUser) {

            loadProfile();

            loadTheme();

        }

    }
);


// ==========================================
// KEEP PROFILE SYNCHRONIZED
// ==========================================

setInterval(
    () => {

        if (auth.currentUser) {

            loadProfile();

        }

    },
    60000
);


// ==========================================
// ACTIVITY LOG MODAL
// ==========================================

// Open

activityLogBtn?.addEventListener(
    "click",
    () => {

        activityLogModal?.classList.remove(
            "hidden"
        );

    }
);


// Close

closeActivityLog?.addEventListener(
    "click",
    () => {

        activityLogModal?.classList.add(
            "hidden"
        );

    }
);


// Click outside

activityLogModal?.addEventListener(
    "click",
    (e) => {

        if (
            e.target ===
            activityLogModal
        ) {

            activityLogModal.classList.add(
                "hidden"
            );

        }

    }
);


// Escape

document.addEventListener(
    "keydown",
    (e) => {

        if (
            e.key === "Escape" &&
            activityLogModal &&
            !activityLogModal.classList.contains(
                "hidden"
            )
        ) {

            activityLogModal.classList.add(
                "hidden"
            );

        }

    }
);


// ==========================================
// ACTIVITY LOG
// ==========================================

const activityQuery =
    query(
        collection(
            db,
            "activityLogs"
        ),
        orderBy(
            "timestamp",
            "desc"
        )
    );


onSnapshot(
    activityQuery,
    (snapshot) => {

        if (!activityLogBody) return;


        if (snapshot.empty) {

            activityLogBody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        style="text-align:center"
                    >
                        No activity recorded.
                    </td>
                </tr>
            `;

            return;

        }


        activityLogBody.innerHTML =
            "";


        snapshot.forEach(
            (activityDoc) => {

                const item =
                    activityDoc.data();


                const date =
                    item.timestamp
                        ? item.timestamp
                            .toDate()
                            .toLocaleDateString()
                        : "-";


                const time =
                    item.timestamp
                        ? item.timestamp
                            .toDate()
                            .toLocaleTimeString(
                                [],
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: false
                                }
                            )
                        : "-";


                activityLogBody.innerHTML += `
                    <tr>

                        <td>
                            ${date}
                        </td>

                        <td>
                            ${time}
                        </td>

                        <td>
                            ${item.officer || "-"}
                        </td>

                        <td>
                            ${item.action || "-"}
                        </td>

                        <td>
                            ${item.details || "-"}
                        </td>

                    </tr>
                `;

            }
        );

    },
    (error) => {

        console.error(
            "Activity log error:",
            error
        );

    }
);


// ==========================================
// FINAL THEME CHECK
// ==========================================

// Make sure the saved theme is applied
// after the complete settings module loads.

loadTheme();


console.log(
    "Greymus Settings initialization complete."
);