// js/dashboard.js

import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { formatCurrency } from "./utils.js";

// ======================================
// Dashboard Loader
// ======================================

export async function loadDashboard() {

    try {

        const clients = await getClients();

        const loans = await getLoans();

        updateDashboard(clients, loans);

    } catch (error) {

        console.error("Dashboard Error:", error);

    }

}

// ======================================
// Firestore Reads
// ======================================

async function getClients() {

    try {

        const snapshot = await getDocs(collection(db, "clients"));

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    } catch (error) {

        console.error(error);

        return [];

    }

}

async function getLoans() {

    try {

        const snapshot = await getDocs(collection(db, "loans"));

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    } catch (error) {

        console.error(error);

        return [];

    }

}

// ======================================
// Dashboard Calculations
// ======================================

function updateDashboard(clients, loans) {

    const portfolio =
        loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);

    const revenue =
        loans.reduce((sum, loan) => {

            return sum + Number(loan.processingFee || 0);

        }, 0);

    const pending =
        loans.filter(l => l.status === "Pending
