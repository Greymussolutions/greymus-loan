// ======================================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// Version 1.1
// PART 1A
// ======================================================

import { db } from "./firebase.js";

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ======================================================
// ELEMENTS
// ======================================================

const repaymentsTableBody =
    document.getElementById("repayments-table-body");

const repaymentForm =
    document.getElementById("repayment-form");

const repaymentModal =
    document.getElementById("repayment-modal");

const repaymentId =
    document.getElementById("repayment-id");

const repaymentLoan =
    document.getElementById("repayment-loan");

const repaymentAmount =
    document.getElementById("repayment-amount");

const repaymentMethod =
    document.getElementById("repayment-method");

const repaymentTransactionId =
    document.getElementById("repayment-transaction-id");

const repaymentRemarks =
    document.getElementById("repayment-remarks");

const repaymentDate =
    document.getElementById("repayment-date");

const repaymentSearch =
    document.getElementById("repayment-search");


// ======================================================
// DATA
// ======================================================

let loans = [];
let repayments = [];


// ======================================================
// FORMAT MONEY
// ======================================================

function currency(value) {

    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0
    }).format(Number(value || 0));

}


// ======================================================
// TODAY
// ======================================================

function today() {

    return new Date()
        .toISOString()
        .split("T")[0];

}


// ======================================================
// MONTH KEY
// Example: 2026-07
// ======================================================

function monthKey(dateString = today()) {

    return dateString.substring(0, 7);

}


// ======================================================
// SET DEFAULT DATE
// ======================================================

if (repaymentDate) {

    repaymentDate.value = today();

}


// ======================================================
// FIND LOAN
// ======================================================

function findLoan(id) {

    return loans.find(
        loan => loan.id === id
    );

}


// ======================================================
// CALCULATE INTEREST PORTION
// ======================================================

function calculateInterest(loan) {

    if (!loan) return 0;

    const totalInterest =
        (Number(loan.amount || 0) *
        Number(loan.interest || 0)) / 100;

    const weeks =
        Number(loan.duration || 1);

    return totalInterest / weeks;

}


// ======================================================
// CALCULATE PRINCIPAL PORTION
// ======================================================

function calculatePrincipal(loan) {

    if (!loan) return 0;

    return Number(loan.repayment || 0)
        - calculateInterest(loan);

}


// ======================================================
// END OF PART 1A
// ======================================================// ======================================================
// PART 1B
// LOAD LOANS & REPAYMENTS
// ======================================================


// ------------------------------------------------------
// POPULATE LOAN DROPDOWN
// ------------------------------------------------------

function populateLoanDropdown() {

    if (!repaymentLoan) return;

    repaymentLoan.innerHTML = `
        <option value="">
            Select Loan
        </option>
    `;

    loans
        .filter(loan => loan.status === "Approved")
        .forEach((loan) => {

            repaymentLoan.innerHTML += `
                <option value="${loan.id}">
                    ${loan.clientName}
                    - ${currency(loan.repayment)}
                    / Week
                </option>
            `;

        });

}


// ------------------------------------------------------
// LOAD LOANS
// ------------------------------------------------------

function loadLoans() {

    const loansRef =
        collection(db, "loans");

    onSnapshot(loansRef, (snapshot) => {

        loans = [];

        snapshot.forEach((docSnap) => {

            loans.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });

        populateLoanDropdown();

    });

}


// ------------------------------------------------------
// LOAD REPAYMENTS
// ------------------------------------------------------

function loadRepayments() {

    const repaymentsRef =
        collection(db, "repayments");

    onSnapshot(repaymentsRef, (snapshot) => {

        repayments = [];

        snapshot.forEach((docSnap) => {

            repayments.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });

        renderRepayments(repayments);

    });

}


// ------------------------------------------------------
// AUTO-FILL WEEKLY PAYMENT
// ------------------------------------------------------

if (repaymentLoan) {

    repaymentLoan.addEventListener("change", () => {

        const loan =
            findLoan(repaymentLoan.value);

        if (!loan) return;

        if (repaymentAmount) {

            repaymentAmount.value =
                Number(loan.repayment || 0);

        }

    });

}


// ------------------------------------------------------
// SEARCH REPAYMENTS
// ------------------------------------------------------

if (repaymentSearch) {

    repaymentSearch.addEventListener("input", () => {

        const search =
            repaymentSearch.value
            .toLowerCase();

        const filtered =
            repayments.filter((payment) => {

                return (

                    (payment.clientName || "")
                    .toLowerCase()
                    .includes(search)

                    ||

                    (payment.transactionId || "")
                    .toLowerCase()
                    .includes(search)

                );

            });

        renderRepayments(filtered);

    });

}


// ======================================================
// END OF PART 1B
// ======================================================// ======================================================
// PART 1C
// SAVE REPAYMENT
// ======================================================

if (repaymentForm) {

    repaymentForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        try {

            const loan = findLoan(repaymentLoan.value);

            if (!loan) {

                alert("Please select a valid loan.");

                return;

            }

            const amount =
                Number(repaymentAmount.value || 0);

            if (amount <= 0) {

                alert("Enter a valid repayment amount.");

                return;

            }

            const interestPaid =
                calculateInterest(loan);

            const principalPaid =
                calculatePrincipal(loan);

            const totalPaid =
                Number(loan.totalPaid || 0) + amount;

            const remainingBalance =
                Math.max(
                    Number(loan.totalRepayment || 0) - totalPaid,
                    0
                );

            const weeksPaid =
                Number(loan.weeksPaid || 0) + 1;

            const weeksRemaining =
                Math.max(
                    Number(loan.duration || 0) - weeksPaid,
                    0
                );

            // --------------------------------------------------
            // SAVE REPAYMENT
            // --------------------------------------------------

            await addDoc(
                collection(db, "repayments"),
                {

                    loanId: loan.id,

                    clientId: loan.clientId,

                    clientName: loan.clientName,

                    repaymentAmount: amount,

                    principalPaid,

                    interestPaid,

                    remainingBalance,

                    weeksPaid,

                    weeksRemaining,

                    paymentMethod:
                        repaymentMethod.value,

                    transactionId:
                        repaymentTransactionId.value.trim(),

                    remarks:
                        repaymentRemarks.value.trim(),

                    paymentDate:
                        repaymentDate.value,

                    createdAt:
                        serverTimestamp()

                }
            );

            // --------------------------------------------------
            // UPDATE LOAN
            // --------------------------------------------------

            await updateDoc(
                doc(db, "loans", loan.id),
                {

                    totalPaid,

                    balance: remainingBalance,

                    weeksPaid,

                    weeksRemaining,

                    updatedAt: serverTimestamp()

                }
            );

            // --------------------------------------------------
            // RESET FORM
            // --------------------------------------------------

            repaymentForm.reset();

            repaymentDate.value = today();

            repaymentModal?.classList.add("hidden");

        }

        catch (error) {

            console.error(error);

            alert(error.message);

        }

    });

}

// ======================================================
// END PART 1C
// ======================================================// ======================================================
// PART 1D
// MONTHLY INCOME & LOAN STATUS
// ======================================================

async function updateMonthlyIncome(loan, interestEarned) {

    try {

        const month = monthKey();

        const incomeRef =
            doc(db, "monthlyIncome", month);

        const incomeSnap =
            await getDoc(incomeRef);

        // Processing fee should only be added once
        let processingFee = 0;

        if (!loan.processingFeeAdded) {

            processingFee =
                Number(loan.processingFee || 0);

            await updateDoc(
                doc(db, "loans", loan.id),
                {
                    processingFeeAdded: true
                }
            );

        }

        if (!incomeSnap.exists()) {

            await addDoc(
                collection(db, "monthlyIncome"),
                {
                    month,

                    processingFees: processingFee,

                    interestIncome:
                        Number(interestEarned || 0),

                    totalIncome:
                        processingFee +
                        Number(interestEarned || 0),

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }
            );

        } else {

            await updateDoc(
                incomeRef,
                {

                    processingFees:
                        increment(processingFee),

                    interestIncome:
                        increment(
                            Number(
                                interestEarned || 0
                            )
                        ),

                    totalIncome:
                        increment(
                            processingFee +
                            Number(
                                interestEarned || 0
                            )
                        ),

                    updatedAt:
                        serverTimestamp()

                }
            );

        }

    } catch (error) {

        console.error(
            "Income Update Error:",
            error
        );

    }

}


// ======================================================
// COMPLETE LOAN
// ======================================================

async function completeLoan(loan) {

    await updateDoc(
        doc(db, "loans", loan.id),
        {

            status: "Completed",

            balance: 0,

            weeksRemaining: 0,

            completedDate: today(),

            updatedAt: serverTimestamp()

        }

    );

}


// ======================================================
// CHECK ARREARS
// ======================================================

async function checkLoanStatus(loan) {

    if (!loan.dueDate) return;

    const todayDate =
        new Date(today());

    const due =
        new Date(loan.dueDate);

    if (

        todayDate > due &&

        Number(loan.balance || 0) > 0 &&

        loan.status !== "Completed"

    ) {

        await updateDoc(
            doc(db, "loans", loan.id),
            {

                status: "Arrears",

                updatedAt:
                    serverTimestamp()

            }

        );

    }

}


// ======================================================
// AFTER REPAYMENT
// ======================================================

async function processLoanAfterPayment(
    loan,
    remainingBalance,
    interestPaid
) {

    await updateMonthlyIncome(
        loan,
        interestPaid
    );

    if (remainingBalance <= 0) {

        await completeLoan(loan);

    } else {

        await checkLoanStatus(loan);

    }

}


// ======================================================
// END PART 1D
// ======================================================// ======================================================
// PART 2A
// RENDER REPAYMENTS TABLE
// ======================================================

function renderRepayments(list) {

    if (!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML = "";

    if (list.length === 0) {

        repaymentsTableBody.innerHTML = `

            <tr>

                <td colspan="10" class="text-center">

                    No repayments found.

                </td>

            </tr>

        `;

        return;

    }

    list.forEach((payment) => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${payment.clientName || "-"}</td>

            <td>${payment.paymentDate || "-"}</td>

            <td>${currency(payment.repaymentAmount)}</td>

            <td>${currency(payment.principalPaid)}</td>

            <td>${currency(payment.interestPaid)}</td>

            <td>${currency(payment.remainingBalance)}</td>

            <td>${payment.paymentMethod || "-"}</td>

            <td>${payment.transactionId || "-"}</td>

            <td>${payment.remarks || "-"}</td>

            <td>

                <button
                    class="btn-icon btn-delete delete-repayment"
                    data-id="${payment.id}"
                    title="Delete">

                    🗑️

                </button>

            </td>

        `;

        repaymentsTableBody.appendChild(row);

    });

    attachRepaymentActions();

}


// ======================================================
// DELETE BUTTONS
// ======================================================

function attachRepaymentActions() {

    document
        .querySelectorAll(".delete-repayment")
        .forEach((button) => {

            button.addEventListener("click", async () => {

                const confirmed =
                    confirm(
                        "Delete this repayment?"
                    );

                if (!confirmed) return;

                try {

                    await deleteDoc(
                        doc(
                            db,
                            "repayments",
                            button.dataset.id
                        )
                    );

                }

                catch (error) {

                    console.error(error);

                    alert(error.message);

                }

            });

        });

}


// ======================================================
// REFRESH TABLE
// ======================================================

function refreshRepaymentTable() {

    renderRepayments(repayments);

}


// ======================================================
// END PART 2A
// ======================================================// ======================================================
// PART 2B
// SEARCH, FILTER & SORT REPAYMENTS
// ======================================================


// ------------------------------------------------------
// FILTER REPAYMENTS
// ------------------------------------------------------

function filterRepayments() {

    let result = [...repayments];

    const search =
        repaymentSearch?.value
            .toLowerCase()
            .trim() || "";

    if (search !== "") {

        result = result.filter((payment) => {

            return (

                (payment.clientName || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (payment.transactionId || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (payment.paymentMethod || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (payment.loanId || "")
                    .toLowerCase()
                    .includes(search)

            );

        });

    }

    // Latest payments first
    result.sort((a, b) => {

        return new Date(b.paymentDate)
            - new Date(a.paymentDate);

    });

    renderRepayments(result);

}


// ------------------------------------------------------
// SEARCH EVENT
// ------------------------------------------------------

if (repaymentSearch) {

    repaymentSearch.addEventListener(

        "input",

        filterRepayments

    );

}


// ------------------------------------------------------
// VIEW REPAYMENT HISTORY
// ------------------------------------------------------

function getLoanRepayments(loanId) {

    return repayments

        .filter(payment =>

            payment.loanId === loanId

        )

        .sort((a, b) =>

            new Date(a.paymentDate)
            - new Date(b.paymentDate)

        );

}


// ------------------------------------------------------
// CALCULATE TOTAL PAID
// ------------------------------------------------------

function totalPaidForLoan(loanId) {

    return getLoanRepayments(loanId)

        .reduce((total, payment) => {

            return total +

                Number(
                    payment.repaymentAmount || 0
                );

        }, 0);

}


// ------------------------------------------------------
// CALCULATE TOTAL INTEREST PAID
// ------------------------------------------------------

function totalInterestForLoan(loanId) {

    return getLoanRepayments(loanId)

        .reduce((total, payment) => {

            return total +

                Number(
                    payment.interestPaid || 0
                );

        }, 0);

}


// ------------------------------------------------------
// CALCULATE REMAINING BALANCE
// ------------------------------------------------------

function remainingBalanceForLoan(loan) {

    return Math.max(

        Number(loan.totalRepayment || 0)

        -

        totalPaidForLoan(loan.id),

        0

    );

}


// ------------------------------------------------------
// REFRESH LIST
// ------------------------------------------------------

function refreshRepayments() {

    filterRepayments();

}


// ======================================================
// END PART 2B
// ======================================================// ======================================================
// PART 2C
// EDIT & DELETE REPAYMENTS
// ======================================================


// ------------------------------------------------------
// EDIT REPAYMENT
// ------------------------------------------------------

function editRepayment(id) {

    const payment =
        repayments.find(r => r.id === id);

    if (!payment) return;

    repaymentId.value = payment.id;

    repaymentLoan.value = payment.loanId;

    repaymentAmount.value =
        payment.repaymentAmount;

    repaymentMethod.value =
        payment.paymentMethod || "Cash";

    repaymentTransactionId.value =
        payment.transactionId || "";

    repaymentRemarks.value =
        payment.remarks || "";

    repaymentDate.value =
        payment.paymentDate || today();

    repaymentModal.classList.remove("hidden");

}


// ------------------------------------------------------
// UPDATE REPAYMENT
// ------------------------------------------------------

async function updateRepayment() {

    const payment =
        repayments.find(r => r.id === repaymentId.value);

    if (!payment) return;

    const loan = findLoan(payment.loanId);

    if (!loan) return;

    const amount =
        Number(repaymentAmount.value);

    const interestPaid =
        calculateInterest(loan);

    const principalPaid =
        amount - interestPaid;

    await updateDoc(

        doc(db, "repayments", payment.id),

        {

            repaymentAmount: amount,

            principalPaid,

            interestPaid,

            paymentMethod:
                repaymentMethod.value,

            transactionId:
                repaymentTransactionId.value.trim(),

            remarks:
                repaymentRemarks.value.trim(),

            paymentDate:
                repaymentDate.value,

            updatedAt:
                serverTimestamp()

        }

    );

    repaymentModal.classList.add("hidden");

    repaymentForm.reset();

    repaymentId.value = "";

}


// ------------------------------------------------------
// RESTORE LOAN AFTER DELETE
// ------------------------------------------------------

async function restoreLoan(payment) {

    const loan =
        findLoan(payment.loanId);

    if (!loan) return;

    const totalPaid =
        Math.max(
            Number(loan.totalPaid || 0)
            -
            Number(payment.repaymentAmount || 0),
            0
        );

    const balance =
        Number(loan.totalRepayment || 0)
        -
        totalPaid;

    const weeksPaid =
        Math.max(
            Number(loan.weeksPaid || 0) - 1,
            0
        );

    const weeksRemaining =
        Number(loan.duration || 0)
        -
        weeksPaid;

    await updateDoc(

        doc(db, "loans", loan.id),

        {

            totalPaid,

            balance,

            weeksPaid,

            weeksRemaining,

            status:
                balance <= 0
                ? "Completed"
                : "Approved",

            updatedAt:
                serverTimestamp()

        }

    );

}


// ------------------------------------------------------
// DELETE REPAYMENT
// ------------------------------------------------------

async function deleteRepayment(id) {

    const payment =
        repayments.find(r => r.id === id);

    if (!payment) return;

    const confirmed =
        confirm(
            "Delete this repayment?"
        );

    if (!confirmed) return;

    await restoreLoan(payment);

    await deleteDoc(

        doc(db, "repayments", id)

    );

}


// ------------------------------------------------------
// ATTACH BUTTONS
// ------------------------------------------------------

function attachRepaymentButtons() {

    document
        .querySelectorAll(".edit-repayment")
        .forEach(btn => {

            btn.onclick = () =>

                editRepayment(
                    btn.dataset.id
                );

        });

    document
        .querySelectorAll(".delete-repayment")
        .forEach(btn => {

            btn.onclick = () =>

                deleteRepayment(
                    btn.dataset.id
                );

        });

}


// ======================================================
// END PART 2C
// ======================================================// ======================================================
// PART 2D
// INITIALIZATION & EXPORTS
// ======================================================


// ------------------------------------------------------
// UPDATE / SAVE
// ------------------------------------------------------

if (repaymentForm) {

    repaymentForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        if (repaymentId.value) {

            await updateRepayment();

        } else {

            // Part 1C handles new repayments

        }

    });

}


// ------------------------------------------------------
// CLOSE MODAL
// ------------------------------------------------------

document.querySelectorAll(".close-modal").forEach((button) => {

    button.addEventListener("click", () => {

        if (repaymentModal) {

            repaymentModal.classList.add("hidden");

        }

        repaymentForm?.reset();

        repaymentId.value = "";

        if (repaymentDate) {

            repaymentDate.value = today();

        }

    });

});


// ------------------------------------------------------
// ESC KEY
// ------------------------------------------------------

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        repaymentModal?.classList.add("hidden");

    }

});


// ------------------------------------------------------
// CLICK OUTSIDE MODAL
// ------------------------------------------------------

if (repaymentModal) {

    repaymentModal.addEventListener("click", (e) => {

        if (e.target === repaymentModal) {

            repaymentModal.classList.add("hidden");

        }

    });

}


// ------------------------------------------------------
// INITIALIZE
// ------------------------------------------------------

loadLoans();

loadRepayments();

refreshRepayments();


// ------------------------------------------------------
// EXPORTS
// ------------------------------------------------------

export {

    loadRepayments,

    renderRepayments,

    refreshRepayments,

    getLoanRepayments,

    totalPaidForLoan,

    totalInterestForLoan,

    remainingBalanceForLoan

};


// ======================================================
// END OF FILE
// repayments.js
// Version 1.1 Stable
// ======================================================