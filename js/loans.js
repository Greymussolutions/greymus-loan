// ===============================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// ===============================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ===============================
// ELEMENTS
// ===============================

const loansTableBody = document.querySelector("#loans-table tbody");

const loanForm = document.getElementById("loan-form");
const loanModal = document.getElementById("loan-modal");

const loanSearch = document.getElementById("loan-search");
const loanFilter = document.getElementById("loan-filter");

const loanClient = document.getElementById("loan-client");
const loanId = document.getElementById("loan-id");

const loanAmount = document.getElementById("loan-amount");
const loanProcessingFee = document.getElementById("loan-processing-fee");
const loanInterest = document.getElementById("loan-interest");
const loanDuration = document.getElementById("loan-duration");
const loanDueDate = document.getElementById("loan-due-date");


// ===============================
// PREVIEW
// ===============================

const previewPrincipal = document.getElementById("preview-principal");
const previewInterest = document.getElementById("preview-interest");
const previewDuration = document.getElementById("preview-duration");
const previewMonthly = document.getElementById("preview-monthly");


// ===============================
// DATA
// ===============================

let loans = [];
let clients = [];


// ===============================
// FORMAT MONEY
// ===============================

function currency(value) {

    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0
    }).format(value || 0);

}


// ===============================
// LOAD CLIENTS
// ===============================

function loadClients() {

    const clientsRef = collection(db, "clients");

    onSnapshot(clientsRef, (snapshot) => {

        clients = [];

        snapshot.forEach((docSnap) => {

            clients.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

        populateClientDropdown();

        renderLoans(loans);

    });

}


// ===============================
// CLIENT DROPDOWN
// ===============================

function populateClientDropdown() {

    if (!loanClient) return;

    loanClient.innerHTML = `
        <option value="">
            Select Client
        </option>
    `;

    clients.forEach((client) => {

        loanClient.innerHTML += `
            <option value="${client.id}">
                ${client.name}
            </option>
        `;

    });

}


// ===============================
// WEEKLY LOAN CALCULATOR
// ===============================

function calculateLoan() {

    const amount = Number(loanAmount?.value || 0);
    const interest = Number(loanInterest?.value || 0);
    const duration = Number(loanDuration?.value || 0);

    const totalRepayment =
        amount + (amount * interest / 100);

    const weeklyPayment =
        duration > 0
            ? totalRepayment / duration
            : 0;

    if (previewPrincipal)
        previewPrincipal.textContent = currency(amount);

    if (previewInterest)
        previewInterest.textContent = `${interest}%`;

    if (previewDuration)
        previewDuration.textContent = `${duration} Weeks`;

    if (previewMonthly)
        previewMonthly.textContent = currency(weeklyPayment);

}


// ===============================
// UPDATE PREVIEW
// ===============================

[
    loanAmount,
    loanInterest,
    loanDuration
].forEach((input) => {

    if (input) {

        input.addEventListener(
            "input",
            calculateLoan
        );

    }

});


// ===============================
// RENDER LOANS TABLE
// ===============================

function renderLoans(list) {

    if (!loansTableBody) return;
    loansTableBody.innerHTML = "";

    list.forEach((loan) => {

        const client = clients.find(
            c => c.id === loan.clientId
        );

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${loan.id.slice(0,8)}</td>

            <td>${loan.clientName || client?.name || "Unknown Client"}</td>

            <td>${currency(loan.amount)}</td>

            <td>${loan.interest || 0}%</td>

            <td>${loan.duration || 0} Weeks</td>

            <td>${currency(loan.repayment)}</td>

            <td>${loan.dueDate || "-"}</td>

            <td>
                <span class="status ${String(loan.status || "Pending").toLowerCase()}">
                    ${loan.status || "Pending"}
                </span>
            </td>

            <td>${loan.officer || "-"}</td>

            <td class="loan-actions">

                <button
                    class="btn-icon btn-view view-loan"
                    data-id="${loan.id}"
                    title="View Loan">
                    👁️
                </button>

                <button
                    class="btn-icon btn-edit edit-loan"
                    data-id="${loan.id}"
                    title="Edit Loan">
                    ✏️
                </button>

                <button
                    class="btn-icon btn-success approve-loan"
                    data-id="${loan.id}"
                    title="Approve Loan">
                    ✔
                </button>

                <button
                    class="btn-icon btn-delete delete-loan"
                    data-id="${loan.id}"
                    title="Delete Loan">
                    🗑️
                </button>

            </td>

        `;

        loansTableBody.appendChild(row);

    });

    attachLoanActions();

}


// ===============================
// LOAD LOANS
// ===============================

function loadLoans() {

    const loansRef = collection(db, "loans");

    onSnapshot(loansRef, (snapshot) => {

        loans = [];

        snapshot.forEach((docSnap) => {

            loans.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

        renderLoans(loans);

    });

}


// ===============================
// SAVE / UPDATE LOAN
// ===============================

if (loanForm) {
    loanForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const amount = Number(loanAmount.value || 0);
        const interest = Number(loanInterest.value || 0);
        const duration = Number(loanDuration.value || 0);

        const totalRepayment =
            amount + (amount * interest / 100);

        const weeklyPayment =
            duration > 0
                ? totalRepayment / duration
                : 0;

        const selectedClient =
            clients.find(
                c => c.id === loanClient.value
            );

        const data = {

            clientId: loanClient.value,

            clientName:
                selectedClient
                    ? selectedClient.name
                    : "",

            amount,

            processingFee:
                Number(
                    loanProcessingFee.value || 0
                ),

            interest,

            duration,

            repayment: weeklyPayment,

            totalRepayment,

            dueDate: loanDueDate.value,

            status: "Pending",

            officer:
                localStorage.getItem("userRole") || "User",

            updatedAt: serverTimestamp()

        };

        try {

            if (loanId.value) {

                await updateDoc(
                    doc(db, "loans", loanId.value),
                    data
                );

            } else {

                await addDoc(
                    collection(db, "loans"),
                    {
                        ...data,
                        createdAt: serverTimestamp()
                    }
                );

            }

            loanForm.reset();

            loanId.value = "";

            calculateLoan();

            loanModal.classList.add("hidden");

        } catch (error) {

            console.error(
                "Loan save error:",
                error
            );

        }

    });

}


// ===============================
// SEARCH & FILTER
// ===============================

function filterLoans() {

    let result = [...loans];

    const search =
        loanSearch?.value.toLowerCase() || "";

    const status =
        loanFilter?.value || "ALL";

    result = result.filter((loan) => {

        const client =
            clients.find(c => c.id === loan.clientId);

        const clientName =
            (loan.clientName ||
            client?.name ||
            "").toLowerCase();

        const matchesSearch =

            clientName.includes(search) ||

            loan.id.toLowerCase().includes(search);

        const matchesStatus =

            status === "ALL" ||

            loan.status === status;

        return matchesSearch && matchesStatus;

    });

    renderLoans(result);

}

if (loanSearch)
    loanSearch.addEventListener("input", filterLoans);

if (loanFilter)
    loanFilter.addEventListener("change", filterLoans);


// ===============================
// TABLE ACTIONS
// ===============================

function attachLoanActions() {

    // VIEW
    document.querySelectorAll(".view-loan").forEach((button) => {

        button.addEventListener("click", () => {

            const loan = loans.find(
                l => l.id === button.dataset.id
            );

            if (!loan) return;

            alert(
`CLIENT: ${loan.clientName}
AMOUNT: ${currency(loan.amount)}
INTEREST: ${loan.interest}%
DURATION: ${loan.duration} Weeks
WEEKLY PAYMENT: ${currency(loan.repayment)}
STATUS: ${loan.status}`
            );

        });

    });

    // DELETE
    document.querySelectorAll(".delete-loan").forEach((button) => {

        button.addEventListener("click", async () => {

            if (!confirm("Delete this loan?")) return;

            await deleteDoc(
                doc(db, "loans", button.dataset.id)
            );

        });

    });

    // APPROVE
    document.querySelectorAll(".approve-loan").forEach((button) => {

        button.addEventListener("click", async () => {

            await updateDoc(
                doc(db, "loans", button.dataset.id),
                {
                    status: "Approved",
                    updatedAt: serverTimestamp()
                }
            );

        });

    });

    // EDIT
    document.querySelectorAll(".edit-loan").forEach((button) => {

        button.addEventListener("click", () => {

            const loan =
                loans.find(
                    l => l.id === button.dataset.id
                );

            if (!loan) return;

            loanId.value = loan.id;
            loanClient.value = loan.clientId;
            loanAmount.value = loan.amount;
            loanProcessingFee.value = loan.processingFee || 0;
            loanInterest.value = loan.interest;
            loanDuration.value = loan.duration;
            loanDueDate.value = loan.dueDate;

            calculateLoan();

            loanModal.classList.remove("hidden");

        });

            });

}

// ===============================
// CLOSE MODAL
// ===============================
document.querySelectorAll(".close-modal").forEach((button) => {

    button.addEventListener("click", () => {

        loanModal.classList.add("hidden");

        if (loanForm) {
            loanForm.reset();
        }

        if (loanId) {
            loanId.value = "";
        }

        calculateLoan();

    });

});


// ===============================
// INITIAL CALCULATION
// ===============================

calculateLoan();


// ===============================
// START APPLICATION
// ===============================

loadClients();
loadLoans();


// ===============================
// EXPORTS
// ===============================

export {

    loadLoans,

    calculateLoan,

    renderLoans

};