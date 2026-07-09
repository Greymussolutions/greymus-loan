// js/app.js

import { showToast } from "./utils.js";

let currentUser = null;

// ==========================================
// Initialize Application
// ==========================================

export async function initializeApp(user) {

    currentUser = user;

    console.log("Greymus Loan Financial Hub");
    console.log("Logged in as:", user.email);

    await initializeDashboard();
    await initializeClientModule();
    await initializeLoanModule();

}

// ==========================================
// Dashboard
// ==========================================

async function initializeDashboard() {

    try {

        const dashboard = await import("./dashboard.js");

        if (dashboard.loadDashboard) {

            await dashboard.loadDashboard();

        }

    } catch (error) {

        console.error(error);

        showToast("Dashboard failed to load", "error");

    }

}

// ==========================================
// Clients
// ==========================================

async function initializeClientModule() {

    try {

        const clients = await import("./clients.js");

        if (clients.initializeClients) {

            await clients.initializeClients();

        }

    } catch (error) {

        console.error(error);

        showToast("Clients failed to load", "error");

    }

}

// ==========================================
// Loans
// ==========================================

async function initializeLoanModule() {

    try {

        const loans = await import("./loans.js");

        if (loans.initializeLoans) {

            await loans.initializeLoans();

        }

    } catch (error) {

        console.error(error);

        showToast("Loans failed to load", "error");

    }

}

// ==========================================
// Refresh Everything
// ==========================================

export async function refreshApp() {

    await initializeDashboard();
    await initializeClientModule();
    await initializeLoanModule();

}

// ==========================================
// Current User
// ==========================================

export function getCurrentUser() {

    return currentUser;

}

// ==========================================
// Refresh Dashboard
// ==========================================

export async function refreshDashboard() {

    const dashboard = await import("./dashboard.js");

    if (dashboard.loadDashboard) {

        await dashboard.loadDashboard();

    }

}

// ==========================================
// Refresh Clients
// ==========================================

export async function refreshClients() {

    const clients = await import("./clients.js");

    if (clients.loadClients) {

        await clients.loadClients();

    }

}

// ==========================================
// Refresh Loans
// ==========================================

export async function refreshLoans() {

    const loans = await import("./loans.js");

    if (loans.loadLoans) {

        await loans.loadLoans();

    }

}
