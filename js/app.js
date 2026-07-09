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

    initializeDashboard();

    initializeClientModule();

    initializeLoanModule();

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

    }

}

// ==========================================
// Loans
// ==========================================

async function initializeLoanModule() {

    try {

        const loans = await import("./loans.js");

        if (loans.initializeLoans) {

            await loans.initialize
