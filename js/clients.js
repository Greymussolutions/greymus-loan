// js/clients.js

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    showToast,
    openModal,
    closeModal,
    confirmAction,
    renderEmptyRow
} from "./utils.js";

const clientsCollection = collection(db, "clients");

let clients = [];

// ======================================
// Initialize
// ======================================

export async function initializeClients() {

    bindEvents();

    await loadClients();

}

// ======================================
// Events
// ======================================

function bindEvents() {

    const form = document.getElementById("client-form");

    if (form && !form.dataset.bound) {

        form.dataset.bound = "true";

        form.addEventListener("submit", saveClient);

    }

    const search = document.getElementById("client-search");

    if (search && !search.dataset.bound) {

        search.dataset.bound = "true";

        search.addEventListener("input", filterClients);

    }

}

// ======================================
// Load Clients
// ======================================

export async function loadClients() {

    try {

        const snapshot = await getDocs(clientsCollection);

        clients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderClients(clients);

    } catch (error) {

        console.error(error);

        showToast("Failed to load clients", "error");

    }

}

// ======================================
// Render
// ======================================

function renderClients(data) {

    const tbody = document.querySelector("#clients-table tbody");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {

        renderEmptyRow(
            tbody,
            "No clients found.",
            7
        );

        return;

    }

    data.forEach(client => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${client.name || ""}</td>

            <td>${client.phone || ""}</td>

            <td>${client.idNumber || ""}</td>

            <td>${client.occupation || "-"}</td>

            <td>${client.guarantor || "-"}</td>

            <td>${client.registeredBy || "-"}</td>
