// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 5.0
// PART 1 OF 8
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ADMIN SETTINGS
// ==========================================

const ADMIN_EMAIL = "gayisi0901@gmail.com";

function isAdmin() {

    return (
        (localStorage.getItem("userEmail") || "")
        .toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
    );

}

// ==========================================
// DOM ELEMENTS
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
        item => !item.paid
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
// INITIALIZE DEFAULT DATE
// ==========================================

if (repaymentDate) {

    repaymentDate.value = today();

}

console.log("Repayments Version 5.0 loaded");

// ==========================================
// PART 2 OF 8
// LOAD LOANS & REPAYMENTS
// ==========================================

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

        (snapshot) => {

            loans = [];

            snapshot.forEach((docSnap) => {

                const loan = {

                    id: docSnap.id,
                    ...docSnap.data()

                };

                // Compatibility
                loan.repaymentSchedule ??= [];

                loan.amountPaid ??= 0;

                loan.balance ??=
                    Number(loan.totalRepayment || 0);

                loan.weeklyPayment ??=
                    Number(loan.weeklyPayment || loan.repayment || 0);

                loan.remainingInstallments ??=
                    loan.duration || 0;

                loans.push(loan);

            });

            populateLoanDropdown();

        },

        (error) => {

            console.error("Load Loans:", error);

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

        (snapshot) => {

            repayments = [];

            snapshot.forEach((docSnap) => {

                repayments.push({

                    id: docSnap.id,
                    ...docSnap.data()

                });

            });

            renderRepayments();

        },

        (error) => {

            console.error("Load Repayments:", error);

        }

    );

}// ==========================================
// PART 3 OF 8
// LOAN DROPDOWN & INSTALLMENT PREVIEW
// ==========================================

function populateLoanDropdown() {

    if (!repaymentLoan) return;

    repaymentLoan.innerHTML = `
        <option value="">
            Select Loan
        </option>
    `;

    loans

        .filter(loan => loan.status !== "Completed")

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

    const loan = getLoan(repaymentLoan.value);

    if (!loan) return;

    const installment = getNextInstallment(
        loan.repaymentSchedule
    );

    if (!installment) {

        repaymentAmount.value = "";

        alert("Loan already completed.");

        return;

    }

    repaymentAmount.value =
        calculateOutstanding(installment);

    repaymentAmount.readOnly = false;

    alert(

`CLIENT
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
calculateOutstanding(installment)
)}

Remaining Loan Balance

${currency(loan.balance)}

Enter any amount.
The system will automatically:

• apply partial payments

• complete the week automatically

• carry any extra money to the next week.`

    );

});// ==========================================
// PART 4 OF 8
// SAVE REPAYMENT
// Supports:
//
// ✔ Partial payments
// ✔ Overpayments
// ✔ Automatic carry forward
// ✔ Auto-complete installment
// ==========================================

if (repaymentForm) {

repaymentForm.addEventListener("submit", async (e) => {

e.preventDefault();

const loan = getLoan(repaymentLoan.value);

if (!loan) {

alert("Select a loan.");

return;

}

let amount = Number(repaymentAmount.value);

if (amount <= 0) {

alert("Enter a valid amount.");

return;

}

const schedule = [...loan.repaymentSchedule];

let remainingMoney = amount;

let paymentWeek = null;

for (const installment of schedule) {

if (remainingMoney <= 0) break;

if (installment.paid) continue;

if (!paymentWeek) {

paymentWeek = installment.week;

}

const outstanding =

Number(installment.amount) -

Number(installment.paidAmount || 0);

if (remainingMoney >= outstanding) {

installment.paidAmount =

Number(installment.amount);

installment.paid = true;

installment.paidDate = repaymentDate.value;

remainingMoney -= outstanding;

} else {

installment.paidAmount =

Number(installment.paidAmount || 0)

+ remainingMoney;

remainingMoney = 0;

}

}

const totalPaid =

schedule.reduce(

(sum, item) =>

sum + Number(item.paidAmount || 0),

0

);

const balance =

Math.max(

0,

loan.totalRepayment - totalPaid

);

const remainingInstallments =

schedule.filter(

item => !item.paid

).length;

const next =

schedule.find(

item => !item.paid

);

let status = "Approved";

if (balance === 0) {

status = "Completed";

}

try {

await addDoc(

collection(db, "repayments"),

{

loanId: loan.id,

loanNumber: loan.id.substring(0,8),

clientName: loan.clientName,

amount: amount,

paymentDate: repaymentDate.value,

installmentWeek: paymentWeek,

receivedBy:

localStorage.getItem("userName")

||

localStorage.getItem("userEmail")

||

"Officer",

notes:

repaymentNotes.value,

createdAt:

serverTimestamp()

}

);

await updateDoc(

doc(db,"loans",loan.id),

{

repaymentSchedule: schedule,

amountPaid: totalPaid,

balance: balance,

remainingInstallments,

nextRepaymentDate:

next

? next.dueDate

: null,

completed:

balance===0,

status,

updatedAt:

serverTimestamp()

}

);

alert(

`Payment received.

Paid:

${currency(amount)}

Remaining balance:

${currency(balance)}`

);

repaymentForm.reset();

repaymentDate.value = today();

repaymentModal.classList.add("hidden");

}

catch(error){

console.error(error);

alert(error.message);

}

});

}// ==========================================
// PART 5 OF 8
// VIEW REPAYMENTS
// CONFIRM PAYMENT
// ==========================================

function attachRepaymentActions() {

document.querySelectorAll(".view-payment").forEach(button => {

button.onclick = () => {

const payment = repayments.find(

p => p.id === button.dataset.id

);

if (!payment) return;

const confirmed = payment.confirmed === true;

let action = "";

if (confirmed) {

if (isAdmin()) {

action =
"\n\n↩ Only the Administrator can reverse this payment.";

} else {

action =
"\n\n✓ Payment has been confirmed.";

}

} else {

action =
"\n\n☐ Payment awaiting confirmation.";

}

alert(

`REPAYMENT DETAILS

Client:
${payment.clientName}

Loan:
${payment.loanNumber}

Week:
${payment.installmentWeek}

Amount:
${currency(payment.amount)}

Date:
${payment.paymentDate}

Officer:
${payment.receivedBy}

Status:
${confirmed ? "CONFIRMED" : "PENDING"}

${action}`

);

};

});

}

// ==========================================
// PART 6 OF 8
// RENDER REPAYMENTS TABLE
// ==========================================

function renderRepayments() {

    if (!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML = "";

    if (repayments.length === 0) {

        repaymentsTableBody.innerHTML = `

            <tr>

                <td colspan="9" style="text-align:center;">

                    No repayments found.

                </td>

            </tr>

        `;

        return;

    }

    repayments.forEach(payment => {

        const confirmed =
            payment.confirmed === true;

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${payment.clientName}</td>

            <td>${payment.loanNumber || "-"}</td>

            <td>Week ${payment.installmentWeek}</td>

            <td>${currency(payment.amount)}</td>

            <td>${payment.paymentDate}</td>

            <td>${payment.receivedBy || "-"}</td>

            <td>

                ${
                    confirmed
                    ? "<span class='status completed'>✔ Confirmed</span>"
                    : "<span class='status pending'>Pending</span>"
                }

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

function searchRepayments(keyword){

    keyword = keyword.toLowerCase().trim();

    const filtered = repayments.filter(payment=>{

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

        );

    });

    repaymentsTableBody.innerHTML="";

    filtered.forEach(payment=>{

        const confirmed =
            payment.confirmed === true;

        const row=document.createElement("tr");

        row.innerHTML=`

            <td>${payment.clientName}</td>

            <td>${payment.loanNumber}</td>

            <td>Week ${payment.installmentWeek}</td>

            <td>${currency(payment.amount)}</td>

            <td>${payment.paymentDate}</td>

            <td>${payment.receivedBy}</td>

            <td>

                ${
                    confirmed
                    ? "✔ Confirmed"
                    : "Pending"
                }

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

}// ==========================================
// PART 8 OF 8
// INITIALIZATION & ADMIN PAYMENT CONFIRMATION
// VERSION 5.0
// ==========================================



// ==========================================
// ADMIN CONFIRM / REVERSE PAYMENT
// ==========================================

async function confirmPayment(paymentId, confirm = true) {

    if (!isAdmin()) {

        alert("Only the Administrator can change payment confirmation.");

        return;

    }

    try {

        await updateDoc(

            doc(db, "repayments", paymentId),

            {

                confirmed: confirm,

                confirmedBy:
                    localStorage.getItem("userEmail"),

                confirmedAt:
                    serverTimestamp()

            }

        );

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}

// ==========================================
// INITIALIZE
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

document.addEventListener(

    "DOMContentLoaded",

    initializeRepayments

);


// ==========================================
// EXPORTS
// ==========================================

export {

    loadLoans,

    loadRepayments,

    getLoan,

    getNextInstallment,

    calculateOutstanding,

    currency,

    today,

    confirmPayment

};

// ==========================================
// END OF FILE
// repayments.js VERSION 5.0
// ==========================================