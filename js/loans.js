// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// PART 1
// ======================================================

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

// ======================================================
// ELEMENTS
// ======================================================

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

// ======================================================
// PREVIEW ELEMENTS
// ======================================================

const previewPrincipal = document.getElementById("preview-principal");
const previewInterest = document.getElementById("preview-interest");
const previewDuration = document.getElementById("preview-duration");
const previewMonthly = document.getElementById("preview-monthly");

// ======================================================
// DATA
// ======================================================

let loans = [];

// ======================================================
// FORMAT CURRENCY
// ======================================================

function currency(value) {

    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0
    }).format(value || 0);

}

// ======================================================
// LOAD CLIENTS
// ======================================================

function loadLoanClients() {

    const clientsRef = collection(db, "clients");

    onSnapshot(clientsRef, (snapshot) => {

        if (!loanClient) return;

        loanClient.innerHTML = `
            <option value="">Select Client</option>
        `;

        snapshot.forEach((item) => {

            const client = item.data();

            loanClient.innerHTML += `
                <option value="${item.id}">
                    ${client.name}
                </option>
            `;

        });

    });

}

// ======================================================
// WEEKLY LOAN CALCULATOR
// ======================================================

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

    if (previewPrincipal) {
        previewPrincipal.textContent = currency(amount);
    }

    if (previewInterest) {
        previewInterest.textContent = `${interest}%`;
    }

    if (previewDuration) {
        previewDuration.textContent = `${duration} Weeks`;
    }

    if (previewMonthly) {
        previewMonthly.textContent = currency(weeklyPayment);
    }

}

// ======================================================
// LIVE PREVIEW
// ======================================================

[
    loanAmount,
    loanInterest,
    loanDuration
].forEach(input => {

    if (input) {
        input.addEventListener("input", calculateLoan);
    }

});// ======================================================
// LOAD LOANS FROM FIRESTORE
// ======================================================

function loadLoans() {

    const loansRef = collection(db, "loans");

    onSnapshot(loansRef, (snapshot) => {

        loans = [];

        snapshot.forEach((item) => {

            loans.push({
                id: item.id,
                ...item.data()
            });

        });

        renderLoans(loans);

    });

}

// ======================================================
// RENDER LOANS TABLE
// ======================================================

function renderLoans(list) {

    if (!loansTableBody) return;

    loansTableBody.innerHTML = "";

    list.forEach((loan) => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${loan.id.slice(0,8)}</td>

            <td>${loan.clientName || "-"}</td>

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

            <td>

                <button
                    class="btn-icon btn-edit edit-loan"
                    data-id="${loan.id}"
                    title="Edit">
                    ✏️
                </button>

                <button
                    class="btn-icon btn-view approve-loan"
                    data-id="${loan.id}"
                    title="Approve">
                    ✓
                </button>

                <button
                    class="btn-icon btn-delete delete-loan"
                    data-id="${loan.id}"
                    title="Delete">
                    🗑️
                </button>

            </td>

        `;

        loansTableBody.appendChild(row);

    });

    attachLoanActions();

}// ======================================================
// SAVE OR UPDATE LOAN
// ======================================================

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
            loanClient.options[loanClient.selectedIndex]?.text || "";

        const data = {

            clientId: loanClient.value,
            clientName: selectedClient,

            amount: amount,

            processingFee: Number(
                loanProcessingFee.value || 0
            ),

            interest: interest,

            duration: duration,

            repayment: weeklyPayment,

            totalRepayment: totalRepayment,

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

            console.error("Loan Error:", error);

            alert(error.message);

        }

    });

}// ======================================================
// SEARCH & FILTER
// ======================================================

function filterLoans() {

    let result = [...loans];

    const search =
        loanSearch?.value.toLowerCase() || "";

    const status =
        loanFilter?.value || "ALL";

    result = result.filter((loan) => {

        const matchesSearch =

            (loan.clientName || "")
                .toLowerCase()
                .includes(search)

            ||

            loan.id
                .toLowerCase()
                .includes(search);

        const matchesStatus =

            status === "ALL"

            ||

            loan.status === status;

        return matchesSearch && matchesStatus;

    });

    renderLoans(result);

}

loanSearch?.addEventListener("input", filterLoans);
loanFilter?.addEventListener("change", filterLoans);

// ======================================================
// TABLE ACTIONS
// ======================================================

function attachLoanActions() {

    // DELETE

    document.querySelectorAll(".delete-loan").forEach(button => {

        button.onclick = async () => {

            if (!confirm("Delete this loan?")) return;

            try {

                await deleteDoc(
                    doc(db, "loans", button.dataset.id)
                );

            } catch (error) {

                console.error(error);

            }

        };

    });

    // APPROVE

    document.querySelectorAll(".approve-loan").forEach(button => {

        button.onclick = async () => {

            try {

                await updateDoc(
                    doc(db, "loans", button.dataset.id),
                    {
                        status: "Approved",
                        updatedAt: serverTimestamp()
                    }
                );

            } catch (error) {

                console.error(error);

            }

        };

    });

    // EDIT

    document.querySelectorAll(".edit-loan").forEach(button => {

        button.onclick = () => {

            const loan =
                loans.find(
                    item => item.id === button.dataset.id
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

        };

    });

}

// ======================================================
// CLOSE MODAL
// ======================================================

document.querySelectorAll(".close-modal").forEach(button => {

    button.addEventListener("click", () => {

        loanForm.reset();

        loanId.value = "";

        calculateLoan();

        loanModal.classList.add("hidden");

    });

});

// ======================================================
// START APP
// ======================================================

loadLoanClients();
loadLoans();
calculateLoan();

// ======================================================
// EXPORTS
// ======================================================

export {
    loadLoans,
    calculateLoan
};

// ======================================================
// END OF FILE
// ======================================================