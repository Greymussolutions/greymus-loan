// js/loans.js

import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    formatCurrency,
    generateLoanNumber,
    showToast,
    renderEmptyRow,
    openModal,
    closeModal,
    confirmAction
} from "./utils.js";

import { refreshDashboard } from "./app.js";

// ======================================
// Collections
// ======================================

const loansCollection = collection(db, "loans");
const clientsCollection = collection(db, "clients");

// ======================================
// Local Data
// ======================================

let loans = [];
let clients = [];

// ======================================
// Initialize Module
// ======================================

export async function initializeLoans() {

    bindLoanEvents();

    await loadClients();

    await loadLoans();

}

// ======================================
// Bind Events
// ======================================

function bindLoanEvents() {

    const form = document.getElementById("loan-form");

    if (form && !form.dataset.bound) {

        form.dataset.bound = "true";

        form.addEventListener("submit", saveLoan);

    }

    const search = document.getElementById("loan-search");

    if (search && !search.dataset.bound) {

        search.dataset.bound = "true";

        search.addEventListener("input", filterLoans);

    }

    const filter = document.getElementById("loan-filter");

    if (filter && !filter.dataset.bound) {

        filter.dataset.bound = "true";

        filter.addEventListener("change", filterLoans);

    }

    const amount = document.getElementById("loan-amount");
    const interest = document.getElementById("loan-interest");
    const duration = document.getElementById("loan-duration");
    const fee = document.getElementById("loan-processing-fee");

    [amount, interest, duration, fee].forEach(input => {

        if (!input) return;

        input.addEventListener("input", updateLoanPreview);

    });

}

// ======================================
// Load Clients
// ======================================

async function loadClients() {

    try {

        const snapshot = await getDocs(clientsCollection);

        clients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        populateClientDropdown();

    } catch (error) {

        console.error(error);

        showToast("Unable to load clients", "error");

    }

}

// ======================================
// Client Dropdown
// ======================================

function populateClientDropdown() {

    const select = document.getElementById("loan-client");

    if (!select) return;

    select.innerHTML = `
        <option value="">Select Client</option>
    `;

    clients.forEach(client => {

        const option = document.createElement("option");

        option.value = client.id;

        option.textContent = client.name;

        select.appendChild(option);

    });

}

// ======================================
// Load Loans
// ======================================

export async function loadLoans() {

    try {

        const snapshot = await getDocs(loansCollection);

        loans = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderLoans(loans);

    } catch (error) {

        console.error(error);

        showToast("Unable to load loans", "error");

    }

}// ======================================
// Render Loans
// ======================================

function renderLoans(data) {

    const tbody = document.querySelector("#loans-table tbody");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {

        renderEmptyRow(
            tbody,
            "No loans found.",
            10
        );

        return;

    }

    data.forEach(loan => {

        const client = clients.find(c => c.id === loan.clientId);

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${loan.loanNumber || "-"}</td>

            <td>${client ? client.name : "-"}</td>

            <td>${formatCurrency(loan.amount || 0)}</td>

            <td>${loan.interest || 0}%</td>

            <td>${loan.duration || 0} Months</td>

            <td>${formatCurrency(loan.totalRepayment || 0)}</td>

            <td>${loan.dueDate || "-"}</td>

            <td>${statusBadge(loan.status || "Pending")}</td>

            <td>${loan.officer || "-"}</td>

            <td>

                <div class="action-buttons">

                    <button
                        class="btn-icon btn-edit"
                        data-id="${loan.id}"
                        title="Edit">

                        ✏️

                    </button>

                    <button
                        class="btn-icon btn-delete"
                        data-id="${loan.id}"
                        title="Delete">

                        🗑️

                    </button>

                </div>

            </td>

        `;

        tbody.appendChild(row);

    });

    attachLoanEvents();

}

// ======================================
// Status Badge
// ======================================

function statusBadge(status) {

    const value = (status || "").toLowerCase();

    switch (value) {

        case "approved":

            return `<span class="status approved">Approved</span>`;

        case "rejected":

            return `<span class="status rejected">Rejected</span>`;

        case "arrears":

            return `<span class="status arrears">Arrears</span>`;

        default:

            return `<span class="status pending">Pending</span>`;

    }

}

// ======================================
// Search + Filter
// ======================================

function filterLoans() {

    const keyword =
        document
            .getElementById("loan-search")
            ?.value
            .toLowerCase()
            .trim() || "";

    const status =
        document
            .getElementById("loan-filter")
            ?.value || "ALL";

    const filtered = loans.filter(loan => {

        const client = clients.find(c => c.id === loan.clientId);

        const matchesKeyword =

            (loan.loanNumber || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (client?.name || "")
                .toLowerCase()
                .includes(keyword);

        const matchesStatus =

            status === "ALL"

            ||

            loan.status === status;

        return matchesKeyword && matchesStatus;

    });

    renderLoans(filtered);

}

// ======================================
// Table Button Events
// ======================================

function attachLoanEvents() {

    document.querySelectorAll(".btn-edit").forEach(button => {

        button.onclick = () => {

            editLoan(button.dataset.id);

        };

    });

    document.querySelectorAll(".btn-delete").forEach(button => {

        button.onclick = () => {

            deleteLoan(button.dataset.id);

        };

    });

          }// ======================================
// Save Loan
// ======================================

async function saveLoan(e) {

    e.preventDefault();

    const loanId = document.getElementById("loan-id").value;

    const amount =
        Number(document.getElementById("loan-amount").value) || 0;

    const interest =
        Number(document.getElementById("loan-interest").value) || 0;

    const duration =
        Number(document.getElementById("loan-duration").value) || 0;

    const processingFee =
        Number(document.getElementById("loan-processing-fee").value) || 0;

    const interestAmount =
        amount * (interest / 100);

    const totalRepayment =
        amount + interestAmount + processingFee;

    const monthlyRepayment =
        duration > 0
            ? totalRepayment / duration
            : totalRepayment;

    const data = {

        clientId:
            document.getElementById("loan-client").value,

        loanNumber:
            loanId
                ? loans.find(l => l.id === loanId)?.loanNumber
                : generateLoanNumber(),

        amount,

        processingFee,

        interest,

        interestAmount,

        duration,

        totalRepayment,

        monthlyRepayment,

        dueDate:
            document.getElementById("loan-due-date").value,

        status:
            "Pending",

        officer:
            "Admin",

        createdAt:
            new Date().toISOString()

    };

    if (!data.clientId) {

        showToast("Select a client", "error");

        return;

    }

    if (amount <= 0) {

        showToast("Invalid loan amount", "error");

        return;

    }

    if (duration <= 0) {

        showToast("Invalid loan duration", "error");

        return;

    }

    try {

        if (loanId) {

            await updateExistingLoan(loanId, data);

        } else {

            await createLoan(data);

        }

    } catch (error) {

        console.error(error);

        showToast("Unable to save loan", "error");

    }

}

// ======================================
// Loan Preview
// ======================================

function updateLoanPreview() {

    const amount =
        Number(document.getElementById("loan-amount").value) || 0;

    const interest =
        Number(document.getElementById("loan-interest").value) || 0;

    const duration =
        Number(document.getElementById("loan-duration").value) || 0;

    const fee =
        Number(document.getElementById("loan-processing-fee").value) || 0;

    const interestAmount =
        amount * (interest / 100);

    const total =
        amount + interestAmount + fee;

    const monthly =
        duration > 0
            ? total / duration
            : total;

    const principal =
        document.getElementById("preview-principal");

    const interestLabel =
        document.getElementById("preview-interest");

    const durationLabel =
        document.getElementById("preview-duration");

    if (principal)
        principal.textContent = formatCurrency(amount);

    if (interestLabel)
        interestLabel.textContent =
            `${interest}% (${formatCurrency(interestAmount)})`;

    if (durationLabel)
        durationLabel.textContent =
            `${duration} Month(s)`;

    const monthlyLabel =
        document.getElementById("preview-monthly");

    if (monthlyLabel)
        monthlyLabel.textContent =
            formatCurrency(monthly);

}

// ======================================
// Edit Loan
// ======================================

function editLoan(id) {

    const loan = loans.find(l => l.id === id);

    if (!loan) return;

    document.getElementById("loan-id").value =
        loan.id;

    document.getElementById("loan-client").value =
        loan.clientId;

    document.getElementById("loan-amount").value =
        loan.amount;

    document.getElementById("loan-processing-fee").value =
        loan.processingFee || 0;

    document.getElementById("loan-interest").value =
        loan.interest;

    document.getElementById("loan-duration").value =
        loan.duration;

    document.getElementById("loan-due-date").value =
        loan.dueDate;

    document.getElementById("loan-modal-title").textContent =
        "Edit Loan";

    updateLoanPreview();

    openModal("loan-modal");

}// ======================================
// Create Loan
// ======================================

async function createLoan(data) {

    await addDoc(loansCollection, data);

    showToast("Loan created successfully");

    document.getElementById("loan-form").reset();

    document.getElementById("loan-id").value = "";

    closeModal("loan-modal");

    await loadLoans();

    await refreshDashboard();

}

// ======================================
// Update Loan
// ======================================

async function updateExistingLoan(id, data) {

    await updateDoc(
        doc(db, "loans", id),
        data
    );

    showToast("Loan updated successfully");

    document.getElementById("loan-form").reset();

    document.getElementById("loan-id").value = "";

    closeModal("loan-modal");

    await loadLoans();

    await refreshDashboard();

}

// ======================================
// Delete Loan
// ======================================

function deleteLoan(id) {

    confirmAction(

        "Delete this loan permanently?",

        async () => {

            try {

                await deleteDoc(
                    doc(db, "loans", id)
                );

                showToast("Loan deleted");

                await loadLoans();

                await refreshDashboard();

            } catch (error) {

                console.error(error);

                showToast(
                    "Unable to delete loan",
                    "error"
                );

            }

        }

    );

}

// ======================================
// Reset Loan Form
// ======================================

function resetLoanForm() {

    const form = document.getElementById("loan-form");

    if (form) {

        form.reset();

    }

    const id = document.getElementById("loan-id");

    if (id) {

        id.value = "";

    }

    const title = document.getElementById("loan-modal-title");

    if (title) {

        title.textContent = "New Loan";

    }

    updateLoanPreview();

}

// ======================================
// Auto Reset When Modal Closes
// ======================================

const loanModal = document.getElementById("loan-modal");

if (loanModal) {

    loanModal.addEventListener("click", (e) => {

        if (e.target === loanModal) {

            resetLoanForm();

        }

    });

}

document.querySelectorAll("#loan-modal .close-modal").forEach(button => {

    button.addEventListener("click", () => {

        resetLoanForm();

    });

});// ======================================
// Find Loan
// ======================================

function getLoanById(id) {

    return loans.find(loan => loan.id === id);

}

// ======================================
// Find Client
// ======================================

function getClientName(clientId) {

    const client = clients.find(c => c.id === clientId);

    return client ? client.name : "-";

}

// ======================================
// Refresh Loan Module
// ======================================

export async function refreshLoans() {

    await loadClients();

    await loadLoans();

}

// ======================================
// Public Helpers
// ======================================

export function getAllLoans() {

    return loans;

}

export function getAllClients() {

    return clients;

}

// ======================================
// Loan Statistics
// ======================================

export function getLoanStatistics() {

    return {

        total: loans.length,

        pending: loans.filter(
            loan => loan.status === "Pending"
        ).length,

        approved: loans.filter(
            loan => loan.status === "Approved"
        ).length,

        rejected: loans.filter(
            loan => loan.status === "Rejected"
        ).length,

        arrears: loans.filter(
            loan => loan.status === "Arrears"
        ).length,

        portfolio: loans.reduce(
            (sum, loan) => sum + Number(loan.amount || 0),
            0
        ),

        repayment: loans.reduce(
            (sum, loan) => sum + Number(loan.totalRepayment || 0),
            0
        )

    };

}

// ======================================
// Open New Loan Modal
// ======================================

export function newLoan() {

    resetLoanForm();

    openModal("loan-modal");

}

// ======================================
// Close Loan Modal
// ======================================

export function closeLoanModal() {

    resetLoanForm();

    closeModal("loan-modal");

}

// ======================================
// Initialize Preview
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    updateLoanPreview();

});

// ======================================
// Module Ready
// ======================================

console.log("Loans module loaded.");
