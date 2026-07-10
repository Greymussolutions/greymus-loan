// ================================
// Greymus Loan Financial Hub
// app.js
// FINISHED
// ================================

import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("Greymus Loan Financial Hub started");

// -----------------------------
// AUTH STATE
// -----------------------------

function watchAuth() {
    onAuthStateChanged(auth, (user) => {

        const loginSection = document.getElementById("login-section");
        const dashboardSection = document.getElementById("dashboard-section");
        const loggedUser = document.getElementById("logged-user");

        if (user) {
            console.log("Active user:", user.email);

            if (loginSection) {
                loginSection.classList.add("hidden");
            }

            if (dashboardSection) {
                dashboardSection.classList.remove("hidden");
            }

            if (loggedUser) {
                const role = localStorage.getItem("userRole") || "Field Officer";
                loggedUser.textContent = `${user.email} (${role})`;
            }

        } else {

            console.log("No active user");

            if (dashboardSection) {
                dashboardSection.classList.add("hidden");
            }

            if (loginSection) {
                loginSection.classList.remove("hidden");
            }

            if (loggedUser) {
                loggedUser.textContent = "";
            }
        }

    });
}

// -----------------------------
// TAB NAVIGATION
// -----------------------------

function initializeTabs() {

    const buttons = document.querySelectorAll(".tab-btn");
    const tabs = document.querySelectorAll(".tab-content");

    buttons.forEach((button) => {

        button.addEventListener("click", () => {

            const tab = button.dataset.tab;

            buttons.forEach((btn) =>
                btn.classList.remove("active")
            );

            button.classList.add("active");

            tabs.forEach((section) =>
                section.classList.add("hidden")
            );

            const activeTab =
                document.getElementById(`${tab}-tab`);

            if (activeTab) {
                activeTab.classList.remove("hidden");
            }

        });

    });

}

// -----------------------------
// MODAL CLOSE
// -----------------------------

function initializeModals() {

    document.querySelectorAll(".close-modal").forEach((btn) => {

        btn.addEventListener("click", () => {

            btn.closest(".modal")?.classList.add("hidden");

        });

    });

    document.querySelectorAll(".modal").forEach((modal) => {

        modal.addEventListener("click", (e) => {

            if (e.target === modal) {
                modal.classList.add("hidden");
            }

        });

    });

}

// -----------------------------
// ESC KEY
// -----------------------------

function initializeEscapeKey() {

    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {

            document.querySelectorAll(".modal").forEach((modal) => {
                modal.classList.add("hidden");
            });

            const notifications =
                document.getElementById("notification-panel");

            if (notifications) {
                notifications.classList.add("hidden");
            }

        }

    });

}

// -----------------------------
// NOTIFICATIONS
// -----------------------------

function initializeNotifications() {

    const openBtn =
        document.getElementById("notification-btn");

    const closeBtn =
        document.getElementById("close-notifications");

    const panel =
        document.getElementById("notification-panel");

    if (openBtn && panel) {

        openBtn.addEventListener("click", () => {

            panel.classList.toggle("hidden");

        });

    }

    if (closeBtn && panel) {

        closeBtn.addEventListener("click", () => {

            panel.classList.add("hidden");

        });

    }

}

// -----------------------------
// PREVENT DOUBLE SUBMIT
// -----------------------------

function preventDoubleSubmit() {

    document.querySelectorAll("form").forEach((form) => {

        form.addEventListener("submit", () => {

            const button =
                form.querySelector("button[type='submit']");

            if (!button) return;

            button.disabled = true;

            setTimeout(() => {
                button.disabled = false;
            }, 1500);

        });

    });

}

// -----------------------------
// START APPLICATION
// -----------------------------

function initializeApp() {

    watchAuth();

    initializeTabs();

    initializeModals();

    initializeEscapeKey();

    initializeNotifications();

    preventDoubleSubmit();

}

document.addEventListener("DOMContentLoaded", initializeApp);
