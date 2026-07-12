// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 6.0
// PART A OF D
// Imports • Helpers • Load Data • Loan Dropdown
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ADMIN
// ==========================================

const ADMIN_EMAIL = "gayisi0901@gmail.com";

function isAdmin() {
    return (
        (localStorage.getItem("userEmail") || "")
            .toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );
}

// ==========================================
// DOM
// ==========================================

const repaymentsTableBody =
    document.querySelector("#repayments-table tbody");

const repaymentForm =
    document.getElementById("repayment-form");

const repaymentModal =
    document.getElementById("repayment-modal");

const repaymentLoan =
    document.getElementById("repayment-loan");

const repaymentAmount =
    document.getElementById("repayment-amount");

const repaymentDate =
    document.getElementById("repayment-date");

const repaymentNotes =
    document.getElementById("repayment-notes");

// ==========================================
// DATA
// ==========================================

let loans = [];
let repayments = [];

// ==========================================
// HELPERS
// ==========================================

function currency(value) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(Number(value) || 0);

}

function today() {

    return new Date()
        .toISOString()
        .split("T")[0];

}

function getLoan(id) {

    return loans.find(
        loan => loan.id === id
    );

}

function getNextInstallment(schedule = []) {

    return schedule.find(
        installment => !installment.paid
    ) || null;

}

function calculateOutstanding(installment) {

    return Math.max(
        0,
        Number(installment.amount || 0) -
        Number(installment.paidAmount || 0)
    );

}

// ==========================================
// DEFAULT DATE
// ==========================================

if (repaymentDate) {
    repaymentDate.value = today();
}

// ==========================================
// LOAD LOANS
// ==========================================

function loadLoans() {

    const loansQuery = query(
        collection(db, "loans"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(

        loansQuery,

        snapshot => {

            loans = [];

            snapshot.forEach(docSnap => {

                const loan = {

                    id: docSnap.id,
                    ...docSnap.data()

                };

                loan.repaymentSchedule ??= [];
                loan.amountPaid ??= 0;
                loan.balance ??=
                    Number(loan.totalRepayment || 0);

                loan.remainingInstallments ??=
                    loan.duration || 0;

                loan.weeklyPayment ??=
                    Number(
                        loan.weeklyPayment ||
                        loan.repayment ||
                        0
                    );

                loans.push(loan);

            });

            populateLoanDropdown();

        },

        error => {

            console.error(
                "Error loading loans:",
                error
            );

        }

    );

}

// ==========================================
// LOAD REPAYMENTS
// ==========================================

function loadRepayments() {

    const repaymentsQuery = query(
        collection(db, "repayments"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(

        repaymentsQuery,

        snapshot => {

            repayments = [];

            snapshot.forEach(docSnap => {

                repayments.push({

                    id: docSnap.id,
                    ...docSnap.data()

                });

            });

            renderRepayments();

        },

        error => {

            console.error(
                "Error loading repayments:",
                error
            );

        }

    );

}

// ==========================================
// POPULATE LOAN DROPDOWN
// ==========================================

function populateLoanDropdown() {

    if (!repaymentLoan) return;

    repaymentLoan.innerHTML = `
        <option value="">
            Select Loan
        </option>
    `;

    loans
        .filter(
            loan => loan.status !== "Completed"
        )
        .forEach(loan => {

            repaymentLoan.innerHTML += `
                <option value="${loan.id}">
                    ${loan.clientName}
                    •
                    ${currency(loan.balance)}
                </option>
            `;

        });

}

// ==========================================
// LOAN SELECTED
// ==========================================

repaymentLoan?.addEventListener("change", () => {

    const loan = getLoan(
        repaymentLoan.value
    );

    if (!loan) return;

    const installment =
        getNextInstallment(
            loan.repaymentSchedule
        );

    if (!installment) {

        repaymentAmount.value = "";

        alert("Loan already completed.");

        return;

    }

    repaymentAmount.value =
        calculateOutstanding(
            installment
        );

    repaymentAmount.readOnly = false;

    alert(`CLIENT
${loan.clientName}

CURRENT WEEK
${installment.week}

DUE DATE
${installment.dueDate}

WEEKLY PAYMENT
${currency(installment.amount)}

ALREADY PAID
${currency(installment.paidAmount)}

BALANCE THIS WEEK
${currency(
calculateOutstanding(
installment
)
)}

REMAINING LOAN
${currency(loan.balance)}

Enter any amount.
Partial and overpayments
are supported automatically.`);

});

console.log("repayments.js Part A loaded");// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 6.0
// PART B OF D
// Smart Payment Engine + Save Repayment
// ==========================================

// ==========================================
// SMART PAYMENT ENGINE
// ==========================================

async function processRepayment(loan, paymentAmount) {

    let remaining = Number(paymentAmount);

    const schedule = [...loan.repaymentSchedule];

    let firstWeek = null;

    for (const installment of schedule) {

        if (remaining <= 0) break;

        if (installment.paid) continue;

        if (firstWeek === null) {
            firstWeek = installment.week;
        }

        installment.paidAmount =
            Number(installment.paidAmount || 0);

        const outstanding =
            Number(installment.amount) -
            installment.paidAmount;

        if (remaining >= outstanding) {

            installment.paidAmount =
                Number(installment.amount);

            installment.paid = true;

            installment.paidDate =
                repaymentDate.value;

            remaining -= outstanding;

        } else {

            installment.paidAmount += remaining;

            remaining = 0;

        }

    }

    const totalPaid = schedule.reduce(

        (sum, item) =>

            sum + Number(item.paidAmount || 0),

        0

    );

    const balance = Math.max(

        0,

        Number(loan.totalRepayment) -

        totalPaid

    );

    const remainingInstallments =

        schedule.filter(

            item => !item.paid

        ).length;

    const nextInstallment =

        schedule.find(

            item => !item.paid

        );

    await updateDoc(

        doc(db, "loans", loan.id),

        {

            repaymentSchedule: schedule,

            amountPaid: totalPaid,

            balance,

            remainingInstallments,

            nextRepaymentDate:

                nextInstallment

                    ? nextInstallment.dueDate

                    : null,

            completed: balance === 0,

            status:

                balance === 0

                    ? "Completed"

                    : "Approved",

            updatedAt:

                serverTimestamp()

        }

    );

    return {

        schedule,

        totalPaid,

        balance,

        paymentWeek: firstWeek,

        carriedForward: remaining

    };

}

// ==========================================
// SAVE REPAYMENT
// ==========================================

if (repaymentForm) {

    repaymentForm.addEventListener(

        "submit",

        async (e) => {

            e.preventDefault();

            const loan = getLoan(

                repaymentLoan.value

            );

            if (!loan) {

                alert("Select a loan.");

                return;

            }

            const amount = Number(

                repaymentAmount.value

            );

            if (amount <= 0) {

                alert(

                    "Enter a valid payment amount."

                );

                return;

            }

            try {

                const result =

                    await processRepayment(

                        loan,

                        amount

                    );

                await addDoc(

                    collection(

                        db,

                        "repayments"

                    ),

                    {

                        loanId: loan.id,

                        loanNumber:

                            loan.id.substring(0, 8),

                        clientName:

                            loan.clientName,

                        amount,

                        paymentDate:

                            repaymentDate.value,

                        installmentWeek:

                            result.paymentWeek,

                        receivedBy:

                            localStorage.getItem("userName") ||

                            localStorage.getItem("userEmail") ||

                            "Officer",

                        notes:

                            repaymentNotes.value || "",

                        confirmed: false,

                        createdAt:

                            serverTimestamp()

                    }

                );

                alert(

`Payment saved successfully.

Paid:
${currency(amount)}

Remaining Balance:
${currency(result.balance)}`

                );

                repaymentForm.reset();

                repaymentDate.value = today();

                if (repaymentModal) {

                    repaymentModal.classList.add("hidden");

                }

            }

            catch (error) {

                console.error(error);

                alert(error.message);

            }

        }

    );

}

console.log("repayments.js Part B loaded");// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 6.0
// PART C OF D
// Repayments Table • Search • View Payment
// ==========================================

// ==========================================
// VIEW PAYMENT DETAILS
// ==========================================

function attachRepaymentActions() {

    document
        .querySelectorAll(".view-payment")
        .forEach(button => {

            button.onclick = () => {

                const payment = repayments.find(

                    p => p.id === button.dataset.id

                );

                if (!payment) return;

                const confirmed =
                    payment.confirmed === true;

                alert(

`REPAYMENT DETAILS

Client:
${payment.clientName}

Loan:
${payment.loanNumber}

Installment:
Week ${payment.installmentWeek}

Amount:
${currency(payment.amount)}

Payment Date:
${payment.paymentDate}

Received By:
${payment.receivedBy}

Status:
${confirmed ? "CONFIRMED" : "PENDING"}

Notes:
${payment.notes || "-"}`

                );

            };

        });

}

// ==========================================
// RENDER REPAYMENTS TABLE
// ==========================================

function renderRepayments(list = repayments) {

    if (!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML = "";

    if (!list.length) {

        repaymentsTableBody.innerHTML = `

            <tr>

                <td colspan="8" style="text-align:center;">

                    No repayments found.

                </td>

            </tr>

        `;

        return;

    }

    list.forEach(payment => {

        const confirmed =
            payment.confirmed === true;

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>${payment.clientName}</td>

            <td>${payment.loanNumber || "-"}</td>

            <td>Week ${payment.installmentWeek}</td>

            <td>${currency(payment.amount)}</td>

            <td>${payment.paymentDate}</td>

            <td>${payment.receivedBy || "-"}</td>

            <td>

                <span class="status ${confirmed ? "completed" : "pending"}">

                    ${confirmed ? "✔ Confirmed" : "Pending"}

                </span>

            </td>

            <td>

                <button
                    class="view-payment"
                    data-id="${payment.id}">

                    View

                </button>

            </td>

        `;

        repaymentsTableBody.appendChild(row);

    });

    attachRepaymentActions();

}

// ==========================================
// SEARCH REPAYMENTS
// ==========================================

function searchRepayments(keyword = "") {

    keyword = keyword
        .toLowerCase()
        .trim();

    if (keyword === "") {

        renderRepayments();

        return;

    }

    const filtered = repayments.filter(payment => {

        return (

            payment.clientName
                ?.toLowerCase()
                .includes(keyword)

            ||

            payment.loanNumber
                ?.toLowerCase()
                .includes(keyword)

            ||

            payment.receivedBy
                ?.toLowerCase()
                .includes(keyword)

            ||

            String(payment.installmentWeek)
                .includes(keyword)

        );

    });

    renderRepayments(filtered);

}

// ==========================================
// OPTIONAL SEARCH INPUT
// ==========================================

const repaymentSearch =

    document.getElementById(
        "repayment-search"
    );

if (repaymentSearch) {

    repaymentSearch.addEventListener(

        "input",

        e => {

            searchRepayments(e.target.value);

        }

    );

}

console.log("repayments.js Part C loaded");// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 6.0
// PART D OF D
// Initialization • Admin • Exports
// ==========================================

// ==========================================
// ADMIN CONFIRM / REVERSE PAYMENT
// ==========================================

async function confirmPayment(paymentId, confirm = true) {

    if (!isAdmin()) {

        alert("Only the Administrator can confirm or reverse payments.");

        return;

    }

    try {

        await updateDoc(

            doc(db, "repayments", paymentId),

            {

                confirmed: confirm,

                confirmedBy:
                    localStorage.getItem("userEmail") || "",

                confirmedAt:
                    serverTimestamp()

            }

        );

        alert(

            confirm
                ? "Payment confirmed successfully."
                : "Payment confirmation removed."

        );

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}

// ==========================================
// INITIALIZATION
// ==========================================

function initializeRepayments() {

    loadLoans();

    loadRepayments();

    if (repaymentDate) {

        repaymentDate.value = today();

    }

    if (repaymentAmount) {

        repaymentAmount.placeholder =
            "Enter amount received";

        repaymentAmount.readOnly = false;

    }

}

// ==========================================
// DOM READY
// ==========================================

document.addEventListener(

    "DOMContentLoaded",

    initializeRepayments

);

// ==========================================
// OPTIONAL AUTO REFRESH
// ==========================================

setInterval(() => {

    renderRepayments();

}, 30000);

// ==========================================
// EXPORTS
// ==========================================

export {

    loadLoans,

    loadRepayments,

    getLoan,

    getNextInstallment,

    calculateOutstanding,

    searchRepayments,

    renderRepayments,

    confirmPayment,

    currency,

    today

};

// ==========================================
// END OF FILE
// repayments.js VERSION 6.0
// ==========================================

console.log("repayments.js Version 6.0 loaded successfully.");