// js/settings.js

import { auth } from "./firebase.js";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// SETTINGS PAGE FUNCTIONALITY

// Profile Settings
const profileForm = document.getElementById("profile-form");
const settingsName = document.getElementById("settings-name");
const settingsEmail = document.getElementById("settings-email");
const settingsPhone = document.getElementById("settings-phone");

if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        try {
            const name = settingsName.value.trim();
            const phone = settingsPhone.value.trim();
            
            localStorage.setItem("userName", name);
            localStorage.setItem("userPhone", phone);
            
            showToast("Profile updated successfully", "success");
            
        } catch (error) {
            console.error("Profile update error:", error);
            showToast("Failed to update profile", "error");
        }
    });
    
    // Load saved profile data
    if (auth.currentUser) {
        settingsEmail.value = auth.currentUser.email || "";
    }
    
    settingsName.value = localStorage.getItem("userName") || "";
    settingsPhone.value = localStorage.getItem("userPhone") || "";
}

// Loan Defaults
const loanDefaultsForm = document.getElementById("loan-defaults-form");
const defaultInterest = document.getElementById("default-interest");
const defaultDuration = document.getElementById("default-duration");
const defaultFee = document.getElementById("default-fee");

if (loanDefaultsForm) {
    loanDefaultsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        localStorage.setItem("defaultInterest", defaultInterest.value);
        localStorage.setItem("defaultDuration", defaultDuration.value);
        localStorage.setItem("defaultFee", defaultFee.value);
        
        showToast("Loan defaults saved successfully", "success");
    });
    
    // Load saved defaults
    defaultInterest.value = localStorage.getItem("defaultInterest") || "";
    defaultDuration.value = localStorage.getItem("defaultDuration") || "";
    defaultFee.value = localStorage.getItem("defaultFee") || "";
}

// Security - Change Password
const securityForm = document.getElementById("security-form");
const currentPassword = document.getElementById("current-password");
const newPassword = document.getElementById("new-password");
const confirmPassword = document.getElementById("confirm-password");

if (securityForm) {
    securityForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const currentPwd = currentPassword.value;
        const newPwd = newPassword.value;
        const confirmPwd = confirmPassword.value;
        
        if (newPwd !== confirmPwd) {
            showToast("Passwords do not match", "error");
            return;
        }
        
        if (newPwd.length < 6) {
            showToast("New password must be at least 6 characters", "error");
            return;
        }
        
        try {
            const user = auth.currentUser;
            
            if (!user || !user.email) {
                showToast("User not authenticated", "error");
                return;
            }
            
            // Reauthenticate
            const credential = EmailAuthProvider.credential(user.email, currentPwd);
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPwd);
            
            securityForm.reset();
            showToast("Password changed successfully", "success");
            
        } catch (error) {
            console.error("Password change error:", error);
            
            if (error.code === "auth/wrong-password") {
                showToast("Current password is incorrect", "error");
            } else {
                showToast("Failed to change password", "error");
            }
        }
    });
}

// Danger Zone
const clearDataBtn = document.getElementById("clear-data-btn");
const exportDataBtn = document.getElementById("export-data-btn");

if (clearDataBtn) {
    clearDataBtn.addEventListener("click", () => {
        if (confirm("Are you sure? This will clear all local data and cannot be undone.")) {
            localStorage.clear();
            sessionStorage.clear();
            showToast("All data cleared", "success");
        }
    });
}

if (exportDataBtn) {
    exportDataBtn.addEventListener("click", async () => {
        try {
            const data = {
                userName: localStorage.getItem("userName"),
                userPhone: localStorage.getItem("userPhone"),
                userRole: localStorage.getItem("userRole"),
                defaultInterest: localStorage.getItem("defaultInterest"),
                defaultDuration: localStorage.getItem("defaultDuration"),
                defaultFee: localStorage.getItem("defaultFee"),
                exportDate: new Date().toISOString()
            };
            
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement("a");
            a.href = url;
            a.download = `greymus-settings-${Date.now()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showToast("Data exported successfully", "success");
            
        } catch (error) {
            console.error("Export error:", error);
            showToast("Failed to export data", "error");
        }
    });
}

// Toast utility (if not imported from ui.js)
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    
    if (!toast) {
        alert(message);
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ==========================================
// THEME SETTINGS
// Light / Dark / System Default
// ==========================================

const themeSelect = document.getElementById("theme-select");

function applyTheme(theme) {

    if (theme === "system") {

        const systemDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        document.documentElement.setAttribute(
            "data-theme",
            systemDark ? "dark" : "light"
        );

    } else {

        document.documentElement.setAttribute(
            "data-theme",
            theme
        );
    }
}


// Load saved theme
const savedTheme = localStorage.getItem("appTheme") || "system";

applyTheme(savedTheme);


if (themeSelect) {

    themeSelect.value = savedTheme;

    themeSelect.addEventListener("change", () => {

        const selectedTheme = themeSelect.value;

        localStorage.setItem(
            "appTheme",
            selectedTheme
        );

        applyTheme(selectedTheme);

        showToast(
            "Theme updated successfully",
            "success"
        );

    });
}


// Follow phone theme changes when System Default is selected
window.matchMedia(
    "(prefers-color-scheme: dark)"
).addEventListener(
    "change",
    () => {

        const currentTheme =
            localStorage.getItem("appTheme");

        if (currentTheme === "system") {
            applyTheme("system");
        }

    }
);

// ==========================================
// SETTINGS MENU OPEN / CLOSE
// ==========================================

const settingsBtn = document.getElementById("settings-btn");
const settingsBtnMobile = document.getElementById("settings-btn-mobile");

const settingsMenu = document.getElementById("settings-menu");
const closeSettings = document.getElementById("close-settings");


function openSettings(){

    if(settingsMenu){
        settingsMenu.classList.remove("hidden");
    }

}


function closeSettingsMenu(){

    if(settingsMenu){
        settingsMenu.classList.add("hidden");
    }

}


settingsBtn?.addEventListener(
    "click",
    openSettings
);


settingsBtnMobile?.addEventListener(
    "click",
    openSettings
);


closeSettings?.addEventListener(
    "click",
    closeSettingsMenu
);


// Close when clicking outside card

settingsMenu?.addEventListener(
    "click",
    (e)=>{

        if(e.target === settingsMenu){

            closeSettingsMenu();

        }

    }
);


// Logout button

const logoutBtn = document.getElementById(
    "mobile-logout-btn"
);


logoutBtn?.addEventListener(
    "click",
    async()=>{

        try{

            await auth.signOut();

            location.reload();

        }
        catch(error){

            console.error(
                "Logout error:",
                error
            );

            showToast(
                "Logout failed",
                "error"
            );

        }

    }
);

// ==========================================
// PROFILE MODAL
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const profileBtn = document.getElementById(
        "profile-settings-btn"
    );

    const profileModal = document.getElementById(
        "profile-modal"
    );

    const closeButtons = document.querySelectorAll(
        ".close-profile"
    );


    if(profileBtn && profileModal){

        profileBtn.addEventListener(
            "click",
            () => {

                profileModal.classList.remove(
                    "hidden"
                );

            }
        );

    }


    closeButtons.forEach((btn)=>{

        btn.addEventListener(
            "click",
            ()=>{

                profileModal.classList.add(
                    "hidden"
                );

            }
        );

    });


    if(profileModal){

        profileModal.addEventListener(
            "click",
            (event)=>{

                if(event.target === profileModal){

                    profileModal.classList.add(
                        "hidden"
                    );

                }

            }
        );

    }

});

export { showToast };
