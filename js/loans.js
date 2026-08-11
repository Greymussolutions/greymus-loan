// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 7.1
//
// ✔ Loan row -> TRUE FULL-SCREEN LOAN DETAILS PAGE
// ✔ Details page is NOT placed below the table
// ✔ Details page is attached directly to document.body
// ✔ NO expanding row
// ✔ Mobile-friendly loan details
// ✔ Back button returns to Loans
// ✔ Android/browser back button supported
// ✔ Receive Repayment opens correctly
// ✔ Edit Loan
// ✔ Approve Loan
// ✔ Admin-only Delete Loan
// ✔ Mobile repayment schedule cards
// ✔ Admin-only repayment deletion
// ✔ Weekly repayments
// ✔ Loan calculator
// ✔ Historical loans
// ✔ Officer tracking
// ✔ Automatic arrears detection
// ✔ Automatic status updates
// ✔ Firestore realtime sync
// ✔ Search & filters
// ✔ History logging
// ✔ FAB opens ADD REPAYMENT
// ✔ Repayment recalls clients from Firestore
// ✔ Client must be selected — NO manual client entry
// ✔ Outstanding loan loads automatically after client selection
// ✔ Repayment modal forced above loan details page
// ✔ Repayment modal close handling
// ✔ Duplicate repayment protection
//
// VERSION 7.0
// ✔ Approved status replaced by Active
// ✔ Pending -> Active when approved
// ✔ Loans list shows only Pending, Active and Arrears
// ✔ Completed loans hidden from main Loans list
// ✔ Completed loans remain in Firestore
// ✔ Previous Loans clickable card in Loan Details
// ✔ Previous Loans shows this client's complete loan history
// ✔ Previous loan records are clickable
// ✔ Current loan is excluded from Previous Loans
//
// NEW VERSION 7.1
// ✔ Loan Details -> Receive Repayment no longer shows a
//   Client selector (loan row already identifies the client)
// ✔ Delete Repayment button on the loan details schedule
//   only appears within 24 hours of the repayment being made
// ==========================================

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

const loanForm =
    document.getElementById("loan-form");

const loanModal =
    document.getElementById("loan-modal");

const loansTableBody =
    document.getElementById("loans-table-body");

const loanSearch =
    document.getElementById("loan-search");

const loanFilter =
    document.getElementById("loan-filter");

const loanMonthFilter =
    document.getElementById("loan-month-filter");

const loanYearFilter =
    document.getElementById("loan-year-filter");

const loanId =
    document.getElementById("loan-id");

const loanClient =
    document.getElementById("loan-client");

const loanAmount =
    document.getElementById("loan-amount");

const loanProcessingFee =
    document.getElementById("loan-processing-fee");

const loanPaid =
    document.getElementById("loan-paid");

const loanBalance =
    document.getElementById("loan-balance");

const loanType =
    document.getElementById("loan-type");

const loanInterest =
    document.getElementById("loan-interest");

const loanDuration =
    document.getElementById("loan-duration");

const loanDueDate =
    document.getElementById("loan-due-date");

const loanStartDate =
    document.getElementById("loan-start-date");


// ==========================================
// REPAYMENT MODAL
// ==========================================

const repaymentModal =
    document.getElementById("repayment-modal");

const repaymentForm =
    document.getElementById("repayment-form");

const repaymentLoanId =
    document.getElementById("repayment-loan-id");

const repaymentClient =
    document.getElementById("repayment-client");

const repaymentBalance =
    document.getElementById("repayment-balance");

const repaymentAmount =
    document.getElementById("repayment-amount");

const repaymentDate =
    document.getElementById("repayment-date");

const repaymentNotes =
    document.getElementById("repayment-notes");


// ==========================================
// OLD SCHEDULE MODAL
// ==========================================

const scheduleModal =
    document.getElementById("schedule-modal");

const scheduleClient =
    document.getElementById("schedule-client");

const scheduleBalance =
    document.getElementById("schedule-balance");

const scheduleTableBody =
    document.getElementById("schedule-table-body");

const closeScheduleModal =
    document.getElementById("close-schedule-modal");


// ==========================================
// PREVIEW
// ==========================================

const previewPrincipal =
    document.getElementById("preview-principal");

const previewInterest =
    document.getElementById("preview-interest");

const previewDuration =
    document.getElementById("preview-duration");

const previewWeekly =
    document.getElementById("preview-weekly") ||
    document.getElementById("preview-monthly");


// ==========================================
// DATA
// ==========================================

let loans = [];

let clients = [];

let selectedLoanId = null;

let loanDetailsOpen = false;

let previousLoansOpen = false;

let previousLoanSelectedId = null;

let repaymentSaving = false;


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
    ).format(
        Number(value) || 0
    );
}


function formatDate(date) {

    if (!date) return "";

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        return "";
    }

    return parsedDate
        .toISOString()
        .split("T")[0];
}


function today() {

    return formatDate(
        new Date()
    );
}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ==========================================
// 24-HOUR REPAYMENT-DELETE WINDOW
// ==========================================
//
// Returns true only if the given timestamp
// (ISO string or Date-parseable value) is
// within the last 24 hours.
//
// Used to decide whether the "Delete latest
// payment" control is shown / allowed on the
// loan details repayment schedule.
// ==========================================

function isWithinLast24Hours(
    timestampValue
) {

    if (!timestampValue)
        return false;


    const paymentTime =
        new Date(
            timestampValue
        ).getTime();


    if (
        Number.isNaN(
            paymentTime
        )
    ) {

        return false;
    }


    return (
        Date.now() -
        paymentTime
    ) <=
        24 * 60 * 60 * 1000;
}


// ==========================================
// NORMALIZE LOAN STATUS
// ==========================================
//
// Older Firestore records may still contain
// "Approved". The application now treats
// Approved as Active.
//
// New records are saved as Active.
// ==========================================

function normalizeLoanStatus(
    status
) {

    const value =
        String(
            status || "Pending"
        ).trim();


    if (
        value.toLowerCase() ===
        "approved"
    ) {

        return "Active";
    }


    if (
        value.toLowerCase() ===
        "active"
    ) {

        return "Active";
    }


    if (
        value.toLowerCase() ===
        "pending"
    ) {

        return "Pending";
    }


    if (
        value.toLowerCase() ===
        "arrears"
    ) {

        return "Arrears";
    }


    if (
        value.toLowerCase() ===
        "completed"
    ) {

        return "Completed";
    }


    if (
        value.toLowerCase() ===
        "rejected"
    ) {

        return "Rejected";
    }


    return value;
}


// ==========================================
// ACTIVE LOAN STATUS CHECK
// ==========================================

function isRunningLoan(
    loan
) {

    if (!loan)
        return false;


    const status =
        normalizeLoanStatus(
            loan.status
        );


    return (
        status === "Pending" ||
        status === "Active" ||
        status === "Arrears"
    );
}


// ==========================================
// PREVIOUS LOANS
// ==========================================
//
// Returns every loan belonging to the same
// client except the loan currently being viewed.
//
// Completed loans are intentionally included.
// ==========================================

function getPreviousLoans(
    currentLoan
) {

    if (!currentLoan)
        return [];


    return loans
        .filter(
            loan =>

                loan.clientId ===
                currentLoan.clientId &&

                loan.id !==
                currentLoan.id
        )
        .sort(
            (a, b) => {

                const dateA =
                    a.approvalDate ||
                    a.createdAt?.toDate?.() ||
                    "";

                const dateB =
                    b.approvalDate ||
                    b.createdAt?.toDate?.() ||
                    "";


                return (
                    new Date(dateB) -
                    new Date(dateA)
                );
            }
        );
}


// ==========================================
// GENERATE LOAN NUMBER
// ==========================================

function generateLoanNumber() {

    const year =
        new Date().getFullYear();

    const yearCode =
        String(year).slice(-3);

    const loansThisYear =
        loans.filter(
            loan => {

                const approvalYear =
                    new Date(
                        loan.approvalDate ||
                        loan.createdAt?.toDate?.() ||
                        Date.now()
                    ).getFullYear();

                return (
                    approvalYear ===
                    year
                );
            }
        );

    const sequence =
        String(
            loansThisYear.length + 1
        ).padStart(
            2,
            "0"
        );

    return `GML/${sequence}/${yearCode}`;
}


// ==========================================
// HISTORY LOGGER
// ==========================================

async function logHistory(
    action,
    category,
    details = {}
) {

    try {

        await addDoc(
            collection(
                db,
                "history"
            ),
            {

                action,

                category,

                details,

                officer:
                    localStorage.getItem(
                        "userName"
                    ) ||
                    localStorage.getItem(
                        "userEmail"
                    ) ||
                    "Unknown Officer",

                officerEmail:
                    localStorage.getItem(
                        "userEmail"
                    ) || "",

                createdAt:
                    serverTimestamp(),

                timestamp:
                    new Date().toISOString()
            }
        );

    } catch (error) {

        console.error(
            "History Log Error:",
            error
        );
    }
}


// ==========================================
// ROUND REPAYMENT
// ==========================================

function roundToNearestFive(
    amount
) {

    return Math.ceil(
        Number(amount) / 5
    ) * 5;
}


// ==========================================
// APPLY HISTORICAL PAYMENTS
// ==========================================

function applyHistoricalPayments(
    schedule,
    amountPaid
) {

    let remaining =
        Number(
            amountPaid || 0
        );

    for (
        const installment of schedule
    ) {

        if (
            remaining <= 0
        ) {

            break;
        }


        if (
            remaining >=
            installment.amount
        ) {

            installment.paidAmount =
                installment.amount;

            installment.remainingAmount =
                0;

            installment.paid =
                true;

            installment.status =
                "Paid";

            remaining -=
                installment.amount;

        } else {

            installment.paidAmount =
                remaining;

            installment.remainingAmount =
                installment.amount -
                remaining;

            installment.status =
                "Partial";

            remaining = 0;
        }
    }

    return schedule;
}


// ==========================================
// CALCULATE LOAN
// ==========================================

function calculateLoan() {

    const amount =
        Number(
            loanAmount?.value || 0
        );

    const interest =
        Number(
            loanInterest?.value || 0
        );

    const duration =
        Number(
            loanDuration?.value || 0
        );

    const processingFee =
        Number(
            loanProcessingFee?.value || 0
        );

    const interestAmount =
        amount *
        interest /
        100;

    const totalRepayment =
        amount +
        interestAmount;

    const weeklyPayment =
        duration > 0
            ? roundToNearestFive(
                totalRepayment /
                duration
            )
            : 0;

    if (previewPrincipal) {

        previewPrincipal.textContent =
            currency(amount);
    }


    if (previewInterest) {

        previewInterest.textContent =
            currency(
                interestAmount
            );
    }


    if (previewDuration) {

        previewDuration.textContent =
            `${duration} Weeks`;
    }


    if (previewWeekly) {

        previewWeekly.textContent =
            currency(
                weeklyPayment
            );
    }


    return {

        amount,

        interest,

        processingFee,

        interestAmount,

        duration,

        totalRepayment,

        weeklyPayment
    };
}


// ==========================================
// GENERATE REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(
    approvalDate,
    durationWeeks,
    weeklyPayment,
    totalRepayment
) {

    const schedule = [];

    const startDate =
        new Date(
            approvalDate
        );


    for (
        let week = 1;
        week <= durationWeeks;
        week++
    ) {

        const dueDate =
            new Date(
                startDate
            );

        dueDate.setDate(
            dueDate.getDate() +
            week * 7
        );


        let installmentAmount;


        if (
            week === durationWeeks
        ) {

            installmentAmount =
                Number(
                    totalRepayment
                ) -
                (
                    Number(
                        weeklyPayment
                    ) *
                    (
                        durationWeeks -
                        1
                    )
                );

        } else {

            installmentAmount =
                Number(
                    weeklyPayment
                );
        }


        schedule.push({

            week,

            amount:
                installmentAmount,

            paidAmount:
                0,

            remainingAmount:
                installmentAmount,

            dueDate:
                formatDate(
                    dueDate
                ),

            paid:
                false,

            status:
                "Pending",

            paidDate:
                null,

            paymentHistory:
                []
        });
    }


    return schedule;
}


// ==========================================
// LIVE CALCULATOR
// ==========================================

[
    loanAmount,
    loanInterest,
    loanDuration,
    loanProcessingFee

].forEach(
    input => {

        input?.addEventListener(
            "input",
            calculateLoan
        );
    }
);


// ==========================================
// LOAD CLIENTS
// ==========================================

function loadClients() {

    onSnapshot(

        collection(
            db,
            "clients"
        ),

        snapshot => {

            clients = [];

            snapshot.forEach(
                docSnap => {

                    clients.push({

                        id:
                            docSnap.id,

                        ...docSnap.data()
                    });
                }
            );


            populateClientDropdown();


            if (
                repaymentModal &&
                !repaymentModal.classList.contains(
                    "hidden"
                )
            ) {

                populateFabClientSelector();
            }


            if (
                loanDetailsOpen &&
                selectedLoanId &&
                !previousLoansOpen
            ) {

                const currentLoan =
                    loans.find(
                        loan =>
                            loan.id ===
                            selectedLoanId
                    );


                if (currentLoan) {

                    renderLoanDetailsPage(
                        currentLoan
                    );
                }
            }
        },

        error => {

            console.error(
                "Failed to load clients:",
                error
            );
        }
    );
}


// ==========================================
// CLIENT DROPDOWN FOR LOAN CREATION
// ==========================================

function populateClientDropdown() {

    if (!loanClient)
        return;


    loanClient.innerHTML = `

        <option value="">
            Select Client
        </option>

    `;


    clients
        .sort(
            (a, b) =>
                (
                    a.name || ""
                ).localeCompare(
                    b.name || ""
                )
        )
        .forEach(
            client => {

                loanClient.innerHTML += `

                    <option
                        value="${escapeHtml(
                            client.id
                        )}"
                    >
                        ${escapeHtml(
                            client.name
                        )}
                    </option>

                `;
            }
        );
}


// ==========================================
// LOAD LOANS
// ==========================================

function loadLoans() {

    onSnapshot(

        collection(
            db,
            "loans"
        ),

        snapshot => {

            loans = [];


            snapshot.forEach(
                docSnap => {

                    const data =
                        docSnap.data();


                    if (!data)
                        return;


                    const loan = {

                        id:
                            docSnap.id,

                        ...data
                    };


                    loan.processingFee ??=
                        0;

                    loan.amountPaid ??=
                        0;


                    loan.balance ??=
                        Number(
                            loan.totalRepayment ||
                            0
                        );


                    loan.weeklyPayment ??=
                        Number(
                            loan.repayment ||
                            0
                        );


                    loan.repaymentSchedule ??=
                        [];


                    loan.remainingInstallments ??=
                        loan.duration ||
                        0;


                    loan.completed ??=
                        false;


                    // ==========================================
                    // NORMALIZE OLD "APPROVED" RECORDS
                    // ==========================================

                    loan.status =
                        normalizeLoanStatus(
                            loan.status
                        );


                    const next =
                        loan.repaymentSchedule.find(
                            item =>
                                !item.paid
                        );


                    loan.nextRepaymentDate =
                        next
                            ? next.dueDate
                            : "-";


                    loans.push(
                        loan
                    );
                }
            );


            populateYearFilter();


            if (
                loanDetailsOpen &&
                selectedLoanId
            ) {

                const selectedLoan =
                    loans.find(
                        loan =>
                            loan.id ===
                            selectedLoanId
                    );


                if (selectedLoan) {

                    if (
                        previousLoansOpen
                    ) {

                        renderPreviousLoansPage(
                            selectedLoan
                        );

                    } else {

                        renderLoanDetailsPage(
                            selectedLoan
                        );
                    }

                } else {

                    closeLoanDetailsPage();
                }

            } else {

                filterLoans();
            }


            if (
                repaymentModal &&
                !repaymentModal.classList.contains(
                    "hidden"
                )
            ) {

                populateFabClientSelector();
            }
        },

        error => {

            console.error(
                "Failed to load loans:",
                error
            );
        }
    );
}


// ==========================================
// OPEN NEW LOAN
// ==========================================

function openLoanModal() {

    if (!loanModal)
        return;


    loanForm?.reset();


    if (loanPaid)
        loanPaid.value = 0;


    if (loanBalance)
        loanBalance.value = 0;


    if (loanType)
        loanType.value = "new";


    if (loanId)
        loanId.value = "";


    if (loanDueDate)
        loanDueDate.value =
            today();


    if (loanStartDate)
        loanStartDate.value =
            today();


    calculateLoan();


    loanModal.classList.remove(
        "hidden"
    );
}


// ==========================================
// NEW LOAN BUTTON
// ==========================================

document
    .getElementById(
        "new-loan-btn"
    )
    ?.addEventListener(
        "click",
        openLoanModal
    );


// ==========================================
// SAVE / UPDATE LOAN
// ==========================================

if (loanForm) {

    loanForm.addEventListener(
        "submit",
        async e => {

            let step =
                "START";


            try {

                e.preventDefault();


                const calc =
                    calculateLoan();


                step =
                    "calculateLoan";


                const isHistorical =
                    loanType?.value ===
                    "historical";


                const amountPaid =
                    isHistorical
                        ? Number(
                            loanPaid?.value ||
                            0
                        )
                        : 0;


                const outstandingBalance =
                    isHistorical
                        ? Number(
                            loanBalance?.value ||
                            calc.totalRepayment
                        )
                        : calc.totalRepayment;


                const client =
                    clients.find(
                        c =>
                            c.id ===
                            loanClient.value
                    );


                if (!client)
                    throw new Error(
                        "No client selected."
                    );


                const approvalDate =
                    isHistorical
                        ? new Date(
                            loanStartDate?.value
                        )
                        : new Date();


                let repaymentSchedule =
                    generateRepaymentSchedule(

                        approvalDate,

                        calc.duration,

                        calc.weeklyPayment,

                        calc.totalRepayment
                    );


                if (isHistorical) {

                    repaymentSchedule =
                        applyHistoricalPayments(

                            repaymentSchedule,

                            amountPaid
                        );
                }


                const loanData = {

                    clientId:
                        client.id,

                    clientName:
                        client.name,

                    loanNumber:
                        loanId?.value
                            ? (
                                loans.find(
                                    l =>
                                        l.id ===
                                        loanId.value
                                )?.loanNumber ||
                                generateLoanNumber()
                            )
                            : generateLoanNumber(),

                    loanType:
                        loanType?.value ||
                        "new",

                    amount:
                        calc.amount,

                    processingFee:
                        calc.processingFee,

                    interest:
                        calc.interest,

                    duration:
                        calc.duration,

                    repayment:
                        calc.weeklyPayment,

                    weeklyPayment:
                        calc.weeklyPayment,

                    totalRepayment:
                        calc.totalRepayment,

                    balance:
                        outstandingBalance,

                    totalIncome:
                        calc.processingFee,

                    openingBalance:
                        calc.totalRepayment,

                    amountPaid,

                    approvalDate:
                        formatDate(
                            approvalDate
                        ),

                    dueDate:
                        loanDueDate?.value ||
                        "",

                    repaymentSchedule,

                    nextRepaymentDate:
                        repaymentSchedule[0]
                            ?.dueDate ||
                        null,

                    remainingInstallments:
                        calc.duration,

                    // ==========================================
                    // NEW STATUS RULE
                    // ==========================================
                    //
                    // New loans begin Pending.
                    // Historical loans with a balance begin Active.
                    // Historical loans fully paid are Completed.
                    //
                    status:
                        isHistorical
                            ? (
                                outstandingBalance <=
                                0
                                    ? "Completed"
                                    : "Active"
                            )
                            : "Pending",

                    completed:
                        outstandingBalance <=
                        0,

                    createdBy:
                        localStorage.getItem(
                            "userName"
                        ) ||
                        localStorage.getItem(
                            "userEmail"
                        ) ||
                        "Unknown Officer",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()
                };


                // ==========================================
                // BLOCK NEW LOAN IF BALANCE EXISTS
                // ==========================================

                const blockedLoan =
                    loans.find(
                        loan =>

                            loan.clientId ===
                            client.id &&

                            loan.id !==
                            loanId?.value &&

                            (
                                Number(
                                    loan.balance ||
                                    0
                                ) > 0 ||

                                normalizeLoanStatus(
                                    loan.status
                                ) ===
                                "Arrears"
                            )
                    );


                if (blockedLoan) {

                    const continuePayment =
                        confirm(

                            `Cannot save loan.\n\n` +

                            `Client has an outstanding balance of ${currency(
                                blockedLoan.balance
                            )}.\n\n` +

                            `Loan No: ${blockedLoan.loanNumber}\n\n` +

                            `Press OK to continue to repayment.\n` +

                            `Press Cancel to close.`
                        );


                    if (
                        continuePayment &&
                        repaymentModal
                    ) {

                        openRepaymentForLoan(
                            blockedLoan.id
                        );
                    }


                    return;
                }


                // ==========================================
                // UPDATE EXISTING
                // ==========================================

                if (loanId?.value) {

                    await updateDoc(

                        doc(
                            db,
                            "loans",
                            loanId.value
                        ),

                        {

                            ...loanData,

                            updatedAt:
                                serverTimestamp()
                        }
                    );


                    await logHistory(

                        "Loan Updated",

                        "Loan",

                        {

                            loanId:
                                loanData.loanNumber,

                            client:
                                loanData.clientName,

                            amount:
                                loanData.amount,

                            balance:
                                loanData.balance
                        }
                    );


                    alert(
                        "Loan updated successfully."
                    );


                } else {

                    // ==========================================
                    // CREATE NEW
                    // ==========================================

                    await addDoc(

                        collection(
                            db,
                            "loans"
                        ),

                        loanData
                    );


                    await logHistory(

                        "Loan Created",

                        "Loan",

                        {

                            loanId:
                                loanData.loanNumber,

                            client:
                                loanData.clientName,

                            amount:
                                loanData.amount,

                            balance:
                                loanData.balance
                        }
                    );


                    alert(
                        "Loan created successfully."
                    );
                }


                loanForm.reset();


                if (loanId)
                    loanId.value = "";


                calculateLoan();


                loanModal.classList.add(
                    "hidden"
                );


            } catch (error) {

                console.error(
                    error
                );


                alert(

                    "ERROR DETECTED\n\n" +

                    "Last Step:\n" +
                    step +

                    "\n\nName:\n" +
                    error.name +

                    "\n\nMessage:\n" +
                    error.message
                );
            }
        }
    );
}


// ==========================================
// RENDER LOANS TABLE
// ==========================================
//
// IMPORTANT:
// Completed loans are NEVER rendered here.
//
// Main Loans page contains only:
// Pending
// Active
// Arrears
// ==========================================

function renderLoans(
    list
) {

    if (!loansTableBody)
        return;


    if (loanDetailsOpen)
        return;


    loansTableBody.innerHTML =
        "";


    // ==========================================
    // SAFETY FILTER
    // ==========================================

    list =
        list.filter(
            loan =>
                isRunningLoan(
                    loan
                )
        );


    list.sort(
        (a, b) => {

            const dateA =
                a.approvalDate ||
                "";

            const dateB =
                b.approvalDate ||
                "";


            if (
                dateA !==
                dateB
            ) {

                return (
                    new Date(dateB) -
                    new Date(dateA)
                );
            }


            return (
                a.clientName ||
                ""
            ).localeCompare(
                b.clientName ||
                ""
            );
        }
    );


    if (
        list.length === 0
    ) {

        loansTableBody.innerHTML = `

            <tr>

                <td
                    colspan="15"
                    style="text-align:center;"
                >
                    No active loans found.
                </td>

            </tr>

        `;

        return;
    }


    list.forEach(
        (loan, index) => {

            if (
                !loan ||
                !loan.id
            )
                return;


            const row =
                document.createElement(
                    "tr"
                );


            row.className =
                "loan-clickable-row";


            row.dataset.loanId =
                loan.id;


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHtml(
                        loan.approvalDate ||
                        loan.disbursementDate ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        loan.clientName ||
                        "-"
                    )}
                </td>

                <td>
                    ${currency(
                        loan.amount ||
                        0
                    )}
                </td>

                <td>
                    ${currency(
                        loan.processingFee ||
                        0
                    )}
                </td>

                <td>
                    ${loan.interest || 0}%
                </td>

                <td>
                    ${loan.duration || 0}
                    Weeks
                </td>

                <td>
                    ${currency(
                        loan.weeklyPayment ||
                        0
                    )}
                </td>

                <td>
                    ${currency(
                        loan.balance ||
                        0
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        loan.nextRepaymentDate ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        loan.dueDate ||
                        "-"
                    )}
                </td>

                <td>

                    <span class="status ${
                        normalizeLoanStatus(
                            loan.status
                        ).toLowerCase()
                    }">

                        ${escapeHtml(
                            normalizeLoanStatus(
                                loan.status
                            )
                        )}

                    </span>

                </td>

                <td>
                    ${escapeHtml(
                        loan.createdBy ||
                        "-"
                    )}
                </td>

            `;


            row.addEventListener(
                "click",
                () => {

                    openLoanDetailsPage(
                        loan.id
                    );
                }
            );


            loansTableBody.appendChild(
                row
            );
        }
    );
}


// ==========================================
// GET / CREATE TRUE FULL-SCREEN DETAILS PAGE
// ==========================================

function getLoanDetailsPage() {

    let page =
        document.getElementById(
            "loan-details-page"
        );


    if (page)
        return page;


    page =
        document.createElement(
            "section"
        );


    page.id =
        "loan-details-page";


    page.className =
        "loan-details-page hidden";


    page.style.position =
        "fixed";

    page.style.top =
        "0";

    page.style.left =
        "0";

    page.style.right =
        "0";

    page.style.bottom =
        "0";

    page.style.width =
        "100vw";

    page.style.height =
        "100vh";

    page.style.maxWidth =
        "100vw";

    page.style.maxHeight =
        "100vh";

    page.style.overflowY =
        "auto";

    page.style.overflowX =
        "hidden";

    page.style.zIndex =
        "99999";

    page.style.background =
        "var(--bg, #0b1424)";

    page.style.webkitOverflowScrolling =
        "touch";


    document.body.appendChild(
        page
    );


    return page;
}


// ==========================================
// OPEN LOAN DETAILS PAGE
// ==========================================

function openLoanDetailsPage(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan) {

        alert(
            "Loan not found."
        );

        return;
    }


    selectedLoanId =
        id;


    previousLoansOpen =
        false;


    previousLoanSelectedId =
        null;


    loanDetailsOpen =
        true;


    const page =
        getLoanDetailsPage();


    if (!page)
        return;


    const loansTable =
        document.getElementById(
            "loans-table"
        );


    if (loansTable) {

        loansTable.classList.add(
            "loan-list-hidden"
        );
    }


    hideLoanListControls();


    document.body.dataset.loanDetailsScroll =
        document.body.style.overflow ||
        "";


    document.body.style.overflow =
        "hidden";


    renderLoanDetailsPage(
        loan
    );


    page.classList.remove(
        "hidden"
    );


    page.scrollTop =
        0;


    window.scrollTo({
        top: 0,
        behavior: "instant"
    });


    if (
        !history.state ||
        history.state.loanDetails !==
        id
    ) {

        history.pushState(

            {
                loanDetails:
                    id
            },

            "",

            `#loan-${encodeURIComponent(
                id
            )}`
        );
    }
}


// ==========================================
// HIDE LOAN LIST CONTROLS
// ==========================================

function hideLoanListControls() {

    const possibleSelectors = [

        "#loan-search",

        "#loan-filter",

        "#loan-month-filter",

        "#loan-year-filter"

    ];


    possibleSelectors.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (!element)
                return;


            const parent =
                element.closest(
                    ".filter-group, .search-box, .loan-filter, .filter-item"
                );


            if (parent) {

                parent.classList.add(
                    "loan-details-control-hidden"
                );
            }
        }
    );
}


// ==========================================
// SHOW LOAN LIST CONTROLS
// ==========================================

function showLoanListControls() {

    document
        .querySelectorAll(
            ".loan-details-control-hidden"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "loan-details-control-hidden"
                );
            }
        );
}


// ==========================================
// CLOSE DETAILS PAGE
// ==========================================

function closeLoanDetailsPage(
    skipHistory = false
) {

    selectedLoanId =
        null;


    previousLoansOpen =
        false;


    previousLoanSelectedId =
        null;


    loanDetailsOpen =
        false;


    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (page) {

        page.classList.add(
            "hidden"
        );

        page.innerHTML =
            "";
    }


    const loansTable =
        document.getElementById(
            "loans-table"
        );


    if (loansTable) {

        loansTable.classList.remove(
            "loan-list-hidden"
        );
    }


    showLoanListControls();


    document.body.style.overflow =
        document.body.dataset.loanDetailsScroll ||
        "";


    delete document.body.dataset.loanDetailsScroll;


    filterLoans();


    if (!skipHistory) {

        if (
            location.hash.startsWith(
                "#loan-"
            )
        ) {

            history.back();
        }
    }


    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}


// ==========================================
// ANDROID / BROWSER BACK BUTTON
// ==========================================

window.addEventListener(
    "popstate",
    () => {

        if (previousLoansOpen) {

            previousLoansOpen =
                false;

            previousLoanSelectedId =
                null;


            const currentLoan =
                loans.find(
                    loan =>
                        loan.id ===
                        selectedLoanId
                );


            if (currentLoan) {

                renderLoanDetailsPage(
                    currentLoan
                );

                return;
            }
        }


        if (loanDetailsOpen) {

            closeLoanDetailsPage(
                true
            );
        }
    }
);


// ==========================================
// HANDLE DIRECT LOAN HASH
// ==========================================

window.addEventListener(
    "hashchange",
    () => {

        if (
            !location.hash.startsWith(
                "#loan-"
            )
        ) {

            if (loanDetailsOpen) {

                closeLoanDetailsPage(
                    true
                );
            }
        }
    }
);


// ==========================================
// RENDER FULL LOAN DETAILS PAGE
// ==========================================

function renderLoanDetailsPage(
    loan
) {

    const page =
        getLoanDetailsPage();


    if (!page)
        return;


    previousLoansOpen =
        false;


    const schedule =
        loan.repaymentSchedule ||
        [];


    const paidAmount =
        Number(
            loan.amountPaid ||
            0
        );


    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );


    const balance =
        Number(
            loan.balance ||
            0
        );


    const income =
        Number(
            loan.totalIncome ||
            0
        );


    const status =
        normalizeLoanStatus(
            loan.status
        );


    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    const previousLoans =
        getPreviousLoans(
            loan
        );


    page.innerHTML = `

        <div class="loan-details-mobile-page">

            <div class="loan-details-mobile-header">

                <button
                    type="button"
                    class="loan-details-back"
                    data-loan-action="back"
                    aria-label="Back to loans"
                >
                    ←
                </button>

                <div class="loan-details-header-text">

                    <div class="loan-details-page-title">
                        Loan Details
                    </div>

                    <div class="loan-details-page-number">
                        ${escapeHtml(
                            loan.loanNumber ||
                            "-"
                        )}
                    </div>

                </div>

            </div>


            <div class="loan-details-client-card">

                <div class="loan-details-client-label">
                    CLIENT
                </div>

                <div class="loan-details-client-name">
                    ${escapeHtml(
                        loan.clientName ||
                        "-"
                    )}
                </div>

                <span
                    class="loan-details-status ${statusClass}"
                >
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <div class="loan-details-balance-card">

                <div class="loan-details-balance-label">
                    OUTSTANDING BALANCE
                </div>

                <div class="loan-details-balance-value">
                    ${currency(
                        balance
                    )}
                </div>

                <div class="loan-details-balance-sub">

                    ${currency(
                        paidAmount
                    )}

                    paid of

                    ${currency(
                        totalRepayment
                    )}

                </div>

            </div>


            <div class="loan-details-section-heading">
                Loan Summary
            </div>


            <div class="loan-details-summary-grid">

                <div class="loan-summary-card">

                    <span>
                        Loan Amount
                    </span>

                    <strong>
                        ${currency(
                            loan.amount
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Total Repayment
                    </span>

                    <strong>
                        ${currency(
                            totalRepayment
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${currency(
                            paidAmount
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Weekly Payment
                    </span>

                    <strong>
                        ${currency(
                            loan.weeklyPayment
                        )}
                    </strong>

                </div>

            </div>


            <div class="loan-details-section-heading">
                Loan Information
            </div>


            <div class="loan-details-info-card">

                <div class="loan-info-row">

                    <span>
                        Processing Fee
                    </span>

                    <strong>
                        ${currency(
                            loan.processingFee
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Interest
                    </span>

                    <strong>
                        ${loan.interest || 0}%
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Duration
                    </span>

                    <strong>
                        ${loan.duration || 0}
                        Weeks
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Start Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.approvalDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Next Repayment
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.nextRepaymentDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Due Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.dueDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Officer
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.createdBy ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Income Earned
                    </span>

                    <strong>
                        ${currency(
                            income
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Loan Type
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "new"
                        )}
                    </strong>

                </div>

            </div>


            <!-- ==========================================
                 PREVIOUS LOANS CLICKABLE CARD
                 ========================================== -->

            <div class="loan-details-section-heading">
                Client Loan History
            </div>


            <button
                type="button"
                class="loan-previous-loans-card"
                data-loan-action="previous-loans"
            >

                <div class="loan-previous-loans-icon">
                    📚
                </div>

                <div class="loan-previous-loans-content">

                    <div class="loan-previous-loans-title">
                        Previous Loans
                    </div>

                    <div class="loan-previous-loans-subtitle">

                        ${
                            previousLoans.length
                                ? `${previousLoans.length} previous ${
                                    previousLoans.length === 1
                                        ? "loan"
                                        : "loans"
                                } for ${
                                    escapeHtml(
                                        loan.clientName ||
                                        "this client"
                                    )
                                }`
                                : `No previous loans for ${
                                    escapeHtml(
                                        loan.clientName ||
                                        "this client"
                                    )
                                }`
                        }

                    </div>

                </div>

                <div class="loan-previous-loans-arrow">
                    ›
                </div>

            </button>


            <div class="loan-details-section-heading">
                Actions
            </div>


            <div class="loan-details-action-list">

                ${
                    status !==
                    "Completed"

                        ? `

                            <button
                                type="button"
                                class="loan-page-action primary"
                                data-loan-action="repay"
                                data-id="${loan.id}"
                            >

                                <span class="loan-action-icon">
                                    💵
                                </span>

                                <span>
                                    Receive Repayment
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>

                        `

                        : ""
                }


                ${
                    status ===
                    "Pending"

                        ? `

                            <button
                                type="button"
                                class="loan-page-action"
                                data-loan-action="edit"
                                data-id="${loan.id}"
                            >

                                <span class="loan-action-icon">
                                    ✏️
                                </span>

                                <span>
                                    Edit Loan
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>


                            <button
                                type="button"
                                class="loan-page-action"
                                data-loan-action="approve"
                                data-id="${loan.id}"
                            >

                                <span class="loan-action-icon">
                                    ✔️
                                </span>

                                <span>
                                    Approve Loan
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>

                        `

                        : ""
                }


                ${
                    status ===
                    "Pending" &&
                    isAdmin()

                        ? `

                            <button
                                type="button"
                                class="loan-page-action danger"
                                data-loan-action="delete"
                                data-id="${loan.id}"
                            >

                                <span class="loan-action-icon">
                                    🗑️
                                </span>

                                <span>
                                    Delete Loan
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>

                        `

                        : ""
                }

            </div>


            <div class="loan-details-section-heading">
                Repayment Schedule
            </div>


            <div class="loan-mobile-schedule">

                ${
                    schedule.length === 0

                        ? `

                            <div class="loan-no-schedule-card">

                                No repayment schedule available.

                            </div>

                        `

                        : schedule
                            .map(
                                item =>
                                    renderMobileScheduleCard(
                                        loan,
                                        item
                                    )
                            )
                            .join("")
                }

            </div>


            <div class="loan-details-bottom-space"></div>

        </div>
    `;


    attachLoanDetailsPageActions();


    page.scrollTop =
        0;
}


// ==========================================
// RENDER PREVIOUS LOANS PAGE
// ==========================================
//
// This page remains inside the same full-screen
// loan details container.
//
// Completed loans are intentionally displayed here.
// ==========================================

function renderPreviousLoansPage(
    currentLoan
) {

    const page =
        getLoanDetailsPage();


    if (!page)
        return;


    const previousLoans =
        getPreviousLoans(
            currentLoan
        );


    previousLoansOpen =
        true;


    page.innerHTML = `

        <div class="loan-details-mobile-page">

            <div class="loan-details-mobile-header">

                <button
                    type="button"
                    class="loan-details-back"
                    data-loan-action="previous-loans-back"
                    aria-label="Back to loan details"
                >
                    ←
                </button>

                <div class="loan-details-header-text">

                    <div class="loan-details-page-title">
                        Previous Loans
                    </div>

                    <div class="loan-details-page-number">
                        ${escapeHtml(
                            currentLoan.clientName ||
                            "-"
                        )}
                    </div>

                </div>

            </div>


            <div class="loan-previous-history-header">

                <div class="loan-details-client-label">
                    CLIENT LOAN HISTORY
                </div>

                <div class="loan-details-client-name">
                    ${escapeHtml(
                        currentLoan.clientName ||
                        "-"
                    )}
                </div>

                <div class="loan-previous-history-count">
                    ${
                        previousLoans.length
                    }
                    ${
                        previousLoans.length === 1
                            ? "previous loan"
                            : "previous loans"
                    }
                </div>

            </div>


            ${
                previousLoans.length === 0

                    ? `

                        <div class="loan-no-previous-loans-card">

                            <div class="loan-no-previous-icon">
                                📚
                            </div>

                            <strong>
                                No Previous Loans
                            </strong>

                            <span>
                                This client has no other loan records.
                            </span>

                        </div>

                    `

                    : `

                        <div class="loan-previous-loans-list">

                            ${
                                previousLoans
                                    .map(
                                        loan =>
                                            renderPreviousLoanCard(
                                                loan
                                            )
                                    )
                                    .join("")
                            }

                        </div>

                    `
            }


            <div class="loan-details-bottom-space"></div>

        </div>
    `;


    attachPreviousLoansActions();


    page.scrollTop =
        0;
}


// ==========================================
// PREVIOUS LOAN CARD
// ==========================================

function renderPreviousLoanCard(
    loan
) {

    const status =
        normalizeLoanStatus(
            loan.status
        );


    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    const completed =
        status ===
        "Completed";


    return `

        <button
            type="button"
            class="loan-previous-loan-item"
            data-loan-action="open-previous-loan"
            data-id="${loan.id}"
        >

            <div class="loan-previous-loan-top">

                <div class="loan-previous-loan-number">

                    ${escapeHtml(
                        loan.loanNumber ||
                        "Loan"
                    )}

                </div>

                <span
                    class="loan-details-status ${statusClass}"
                >
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <div class="loan-previous-loan-main">

                <div class="loan-previous-loan-amount">

                    ${currency(
                        loan.amount ||
                        0
                    )}

                </div>

                <div class="loan-previous-loan-date">

                    ${
                        escapeHtml(
                            loan.approvalDate ||
                            loan.createdAt?.toDate?.()
                                ? formatDate(
                                    loan.approvalDate ||
                                    loan.createdAt.toDate()
                                )
                                : "-"
                        )
                    }

                </div>

            </div>


            <div class="loan-previous-loan-details">

                <div>

                    <span>
                        Paid
                    </span>

                    <strong>
                        ${currency(
                            loan.amountPaid ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Balance
                    </span>

                    <strong>
                        ${currency(
                            loan.balance ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Type
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "new"
                        )}
                    </strong>

                </div>

            </div>


            <div class="loan-previous-loan-footer">

                ${
                    completed
                        ? "Completed loan record"
                        : "View loan details"
                }

                <span>
                    ›
                </span>

            </div>

        </button>
    `;
}


// ==========================================
// PREVIOUS LOANS ACTIONS
// ==========================================

function attachPreviousLoansActions() {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (!page)
        return;


    page
        .querySelector(
            '[data-loan-action="previous-loans-back"]'
        )
        ?.addEventListener(
            "click",
            () => {

                previousLoansOpen =
                    false;

                previousLoanSelectedId =
                    null;


                const currentLoan =
                    loans.find(
                        loan =>
                            loan.id ===
                            selectedLoanId
                    );


                if (currentLoan) {

                    renderLoanDetailsPage(
                        currentLoan
                    );
                }
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="open-previous-loan"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.id;


                        const previousLoan =
                            loans.find(
                                loan =>
                                    loan.id ===
                                    id
                            );


                        if (!previousLoan)
                            return;


                        previousLoanSelectedId =
                            id;


                        renderHistoricalLoanDetails(
                            previousLoan
                        );
                    }
                );
            }
        );
}


// ==========================================
// RENDER SELECTED PREVIOUS LOAN DETAILS
// ==========================================
//
// This displays a historical/completed loan
// without changing the main current-loan
// selection.
// ==========================================

function renderHistoricalLoanDetails(
    loan
) {

    const page =
        getLoanDetailsPage();


    if (!page)
        return;


    const schedule =
        loan.repaymentSchedule ||
        [];


    const status =
        normalizeLoanStatus(
            loan.status
        );


    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    const paidAmount =
        Number(
            loan.amountPaid ||
            0
        );


    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );


    const balance =
        Number(
            loan.balance ||
            0
        );


    page.innerHTML = `

        <div class="loan-details-mobile-page">

            <div class="loan-details-mobile-header">

                <button
                    type="button"
                    class="loan-details-back"
                    data-loan-action="historical-loan-back"
                    aria-label="Back to previous loans"
                >
                    ←
                </button>

                <div class="loan-details-header-text">

                    <div class="loan-details-page-title">
                        Loan History
                    </div>

                    <div class="loan-details-page-number">
                        ${escapeHtml(
                            loan.loanNumber ||
                            "-"
                        )}
                    </div>

                </div>

            </div>


            <div class="loan-details-client-card">

                <div class="loan-details-client-label">
                    CLIENT
                </div>

                <div class="loan-details-client-name">
                    ${escapeHtml(
                        loan.clientName ||
                        "-"
                    )}
                </div>

                <span
                    class="loan-details-status ${statusClass}"
                >
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <div class="loan-details-balance-card">

                <div class="loan-details-balance-label">
                    LOAN BALANCE
                </div>

                <div class="loan-details-balance-value">
                    ${currency(
                        balance
                    )}
                </div>

                <div class="loan-details-balance-sub">

                    ${currency(
                        paidAmount
                    )}

                    paid of

                    ${currency(
                        totalRepayment
                    )}

                </div>

            </div>


            <div class="loan-details-section-heading">
                Loan Summary
            </div>


            <div class="loan-details-summary-grid">

                <div class="loan-summary-card">

                    <span>
                        Loan Amount
                    </span>

                    <strong>
                        ${currency(
                            loan.amount
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Total Repayment
                    </span>

                    <strong>
                        ${currency(
                            totalRepayment
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${currency(
                            paidAmount
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Weekly Payment
                    </span>

                    <strong>
                        ${currency(
                            loan.weeklyPayment
                        )}
                    </strong>

                </div>

            </div>


            <div class="loan-details-section-heading">
                Loan Information
            </div>


            <div class="loan-details-info-card">

                <div class="loan-info-row">

                    <span>
                        Loan Number
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.loanNumber ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Loan Type
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "new"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Start Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.approvalDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Due Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.dueDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Processing Fee
                    </span>

                    <strong>
                        ${currency(
                            loan.processingFee
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Interest
                    </span>

                    <strong>
                        ${loan.interest || 0}%
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Duration
                    </span>

                    <strong>
                        ${loan.duration || 0}
                        Weeks
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Officer
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.createdBy ||
                            "-"
                        )}
                    </strong>

                </div>

            </div>


            <div class="loan-details-section-heading">
                Repayment History
            </div>


            <div class="loan-mobile-schedule">

                ${
                    schedule.length === 0

                        ? `

                            <div class="loan-no-schedule-card">

                                No repayment history available.

                            </div>

                        `

                        : schedule
                            .map(
                                item =>
                                    renderMobileScheduleCard(
                                        loan,
                                        item
                                    )
                            )
                            .join("")
                }

            </div>


            <div class="loan-details-bottom-space"></div>

        </div>
    `;


    page
        .querySelector(
            '[data-loan-action="historical-loan-back"]'
        )
        ?.addEventListener(
            "click",
            () => {

                renderPreviousLoansPage(
                    loans.find(
                        item =>
                            item.id ===
                            selectedLoanId
                    )
                );
            }
        );


    page.scrollTop =
        0;
}


// ==========================================
// MOBILE SCHEDULE CARD
// ==========================================
//
// The "Delete latest payment" control is only
// rendered when:
//   1) the current user is an admin, AND
//   2) the installment has at least one
//      recorded payment, AND
//   3) that latest payment was made within
//      the last 24 hours.
// ==========================================

function renderMobileScheduleCard(
    loan,
    item
) {

    const amount =
        Number(
            item.amount ||
            0
        );


    const paid =
        Number(
            item.paidAmount ||
            0
        );


    const remaining =
        Math.max(
            amount -
            paid,
            0
        );


    let statusText =
        "Pending";


    let statusClass =
        "pending";


    let statusIcon =
        "⏳";


    if (item.paid) {

        statusText =
            "Paid";

        statusClass =
            "paid";

        statusIcon =
            "✅";

    } else if (
        paid > 0
    ) {

        statusText =
            "Partial";

        statusClass =
            "partial";

        statusIcon =
            "🟡";
    }


    const lastPayment =
        item.paymentHistory?.at(
            -1
        );


    const deleteButton =
        isAdmin() &&
        lastPayment &&
        isWithinLast24Hours(
            lastPayment.timestamp
        )

            ? `

                <button
                    type="button"
                    class="loan-schedule-delete"
                    data-loan-action="delete-payment"
                    data-loan="${loan.id}"
                    data-week="${item.week}"
                >
                    🗑️ Delete latest payment
                </button>

            `

            : "";


    return `

        <div class="loan-schedule-card">

            <div class="loan-schedule-card-header">

                <div>

                    <div class="loan-schedule-week">
                        Week ${item.week}
                    </div>

                    <div class="loan-schedule-due">
                        Due ${escapeHtml(
                            item.dueDate ||
                            "-"
                        )}
                    </div>

                </div>


                <div class="
                    loan-schedule-status
                    ${statusClass}
                ">

                    ${statusIcon}
                    ${statusText}

                </div>

            </div>


            <div class="loan-schedule-values">

                <div>

                    <span>
                        Amount
                    </span>

                    <strong>
                        ${currency(
                            amount
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Paid
                    </span>

                    <strong>
                        ${currency(
                            paid
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Balance
                    </span>

                    <strong>
                        ${currency(
                            remaining
                        )}
                    </strong>

                </div>

            </div>


            <div class="loan-schedule-paid-date">

                <span>
                    Paid Date
                </span>

                <strong>
                    ${escapeHtml(
                        item.paidDate ||
                        "-"
                    )}
                </strong>

            </div>


            ${
                deleteButton

                    ? `

                        <div class="loan-schedule-actions">

                            ${deleteButton}

                        </div>

                    `

                    : ""
            }

        </div>
    `;
}


// ==========================================
// DETAILS PAGE ACTIONS
// ==========================================

function attachLoanDetailsPageActions() {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (!page)
        return;


    page
        .querySelector(
            '[data-loan-action="back"]'
        )
        ?.addEventListener(
            "click",
            () => {

                closeLoanDetailsPage();
            }
        );


    page
        .querySelector(
            '[data-loan-action="previous-loans"]'
        )
        ?.addEventListener(
            "click",
            () => {

                const loan =
                    loans.find(
                        item =>
                            item.id ===
                            selectedLoanId
                    );


                if (!loan)
                    return;


                renderPreviousLoansPage(
                    loan
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="repay"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openRepaymentForLoan(
                            button.dataset.id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="edit"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        editLoan(
                            button.dataset.id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="approve"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        approveLoan(
                            button.dataset.id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="delete"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteLoan(
                            button.dataset.id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="delete-payment"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        deletePayment(

                            button.dataset.loan,

                            Number(
                                button.dataset.week
                            )
                        );
                    }
                );
            }
        );
}


// ==========================================
// OPEN REPAYMENT FOR SPECIFIC LOAN
// VERSION 7.1
// ==========================================
//
// Opened from the Loan Details page.
// The loan (and therefore the client) is
// already known, so the Client selector is
// hidden — only the payment fields are shown.
// ==========================================

function openRepaymentForLoan(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan) {

        alert(
            "Loan not found."
        );

        return;
    }


    if (!repaymentModal ||
        !repaymentForm
    ) {

        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    if (
        Number(
            loan.balance ||
            0
        ) <= 0 ||
        normalizeLoanStatus(
            loan.status
        ) ===
        "Completed"
    ) {

        alert(
            "This loan has no outstanding balance."
        );

        return;
    }


    // ==========================================
    // CREATE REPAYMENT SELECTORS
    // ==========================================

    createFabRepaymentSelectors(
        repaymentForm
    );


    const clientGroup =
        document.getElementById(
            "fab-repayment-client-group"
        );


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );


    // ==========================================
    // SELECT CLIENT
    // ==========================================

    if (clientSelector) {

        clientSelector.value =
            loan.clientId || "";
    }


    // ==========================================
    // SELECT SPECIFIC LOAN
    // ==========================================

    if (loanSelector) {

        loanSelector.innerHTML = `

            <option value="">
                Select Loan
            </option>

        `;


        const option =
            document.createElement(
                "option"
            );


        option.value =
            loan.id;


        option.textContent =
            `${
                loan.loanNumber ||
                "Loan"
            } — Balance ${
                currency(
                    loan.balance
                )
            }`;


        loanSelector.appendChild(
            option
        );


        loanSelector.value =
            loan.id;
    }


    // ==========================================
    // HIDE CLIENT + LOAN SELECTORS
    // ==========================================
    //
    // Coming from a loan row, the client and
    // loan are already fixed — no need to let
    // the officer pick either one again.
    // ==========================================

    if (loanGroup) {

        loanGroup.style.display =
            "none";
    }


    if (clientGroup) {

        clientGroup.style.display =
            "none";
    }


    // ==========================================
    // LOAD SELECTED LOAN
    // ==========================================

    fillRepaymentFromSelectedLoan(
        loan.id
    );


    // ==========================================
    // FORCE CORRECT LOAN ID
    // ==========================================

    if (repaymentLoanId) {

        repaymentLoanId.value =
            loan.id;
    }


    // ==========================================
    // RESET PAYMENT INPUT
    // ==========================================

    if (repaymentAmount) {

        repaymentAmount.value =
            "";
    }


    if (repaymentNotes) {

        repaymentNotes.value =
            "";
    }


    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    // ==========================================
    // HIDE OLD MANUAL CLIENT FIELD
    // ==========================================

    if (repaymentClient) {

        repaymentClient.value =
            loan.clientName || "";

        repaymentClient.readOnly =
            true;

        repaymentClient.style.display =
            "none";
    }


    // ==========================================
    // FORCE REPAYMENT MODAL ABOVE
    // LOAN DETAILS PAGE
    // ==========================================

    repaymentModal.style.position =
        "fixed";


    repaymentModal.style.zIndex =
        "100001";


    // ==========================================
    // OPEN MODAL
    // ==========================================

    repaymentModal.classList.remove(
        "hidden"
    );


    repaymentModal.setAttribute(
        "aria-hidden",
        "false"
    );


    // ==========================================
    // FOCUS PAYMENT AMOUNT
    // ==========================================

    setTimeout(
        () => {

            repaymentAmount?.focus();

        },
        150
    );
}


// ==========================================
// EDIT LOAN
// ==========================================

function editLoan(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan)
        return;


    if (
        normalizeLoanStatus(
            loan.status
        ) !==
        "Pending"
    ) {

        alert(
            "Only pending loans can be edited."
        );

        return;
    }


    if (loanId)
        loanId.value =
            loan.id;


    if (loanClient)
        loanClient.value =
            loan.clientId;


    if (loanAmount)
        loanAmount.value =
            loan.amount;


    if (loanProcessingFee)
        loanProcessingFee.value =
            loan.processingFee ||
            0;


    if (loanInterest)
        loanInterest.value =
            loan.interest;


    if (loanDuration)
        loanDuration.value =
            loan.duration;


    if (loanDueDate)
        loanDueDate.value =
            loan.dueDate ||
            today();


    if (loanType)
        loanType.value =
            loan.loanType ||
            "new";


    if (loanStartDate)
        loanStartDate.value =
            loan.approvalDate ||
            today();


    if (loanPaid)
        loanPaid.value =
            loan.amountPaid ||
            0;


    if (loanBalance)
        loanBalance.value =
            loan.balance ||
            0;


    calculateLoan();


    loanModal?.classList.remove(
        "hidden"
    );
}


// ==========================================
// APPROVE LOAN
// ==========================================
//
// Pending -> Active
//
// NEVER save "Approved" anymore.
// ==========================================

async function approveLoan(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan)
        return;


    if (
        normalizeLoanStatus(
            loan.status
        ) !==
        "Pending"
    ) {

        alert(
            "Loan is already active or has been processed."
        );

        return;
    }


    if (
        !confirm(

            `Approve loan ${
                loan.loanNumber || ""
            } for ${
                loan.clientName
            }?`
        )
    ) {

        return;
    }


    try {

        const approvalDate =
            new Date();


        const schedule =
            generateRepaymentSchedule(

                approvalDate,

                loan.duration,

                loan.weeklyPayment,

                loan.totalRepayment
            );


        await updateDoc(

            doc(
                db,
                "loans",
                loan.id
            ),

            {

                approvalDate:
                    formatDate(
                        approvalDate
                    ),

                repaymentSchedule:
                    schedule,

                nextRepaymentDate:
                    schedule.length
                        ? schedule[0]
                            .dueDate
                        : "-",

                remainingInstallments:
                    schedule.length,

                // ==========================================
                // IMPORTANT:
                // APPROVED IS NOW ACTIVE
                // ==========================================

                status:
                    "Active",

                completed:
                    false,

                updatedAt:
                    serverTimestamp()
            }
        );


        await logHistory(

            "Loan Approved",

            "Loan",

            {

                loanId:
                    loan.loanNumber,

                client:
                    loan.clientName,

                amount:
                    loan.amount,

                newStatus:
                    "Active"
            }
        );


        alert(
            "Loan approved successfully. Status is now Active."
        );


    } catch (error) {

        console.error(
            error
        );


        alert(
            "Failed to approve loan."
        );
    }
}


// ==========================================
// DELETE LOAN
// ==========================================

async function deleteLoan(
    id
) {

    if (!isAdmin()) {

        alert(
            "Only the Administrator can delete loans."
        );

        return;
    }


    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan)
        return;


    if (
        normalizeLoanStatus(
            loan.status
        ) !==
        "Pending"
    ) {

        alert(
            "Only pending loans can be deleted."
        );

        return;
    }


    if (
        !confirm(
            `Delete loan for ${
                loan.clientName
            }?`
        )
    ) {

        return;
    }


    try {

        await deleteDoc(

            doc(
                db,
                "loans",
                loan.id
            )
        );


        await logHistory(

            "Loan Deleted",

            "Loan",

            {

                loanId:
                    loan.loanNumber,

                client:
                    loan.clientName,

                amount:
                    loan.amount
            }
        );


        closeLoanDetailsPage();


        alert(
            "Loan deleted successfully."
        );


    } catch (error) {

        console.error(
            error
        );


        alert(
            "Failed to delete loan."
        );
    }
}


// ==========================================
// SEARCH / FILTER
// ==========================================

function populateYearFilter() {

    if (!loanYearFilter)
        return;


    const years =
        [
            ...new Set(

                loans.map(
                    loan => {

                        const date =
                            loan.approvalDate

                                ? new Date(
                                    loan.approvalDate
                                )

                                : loan.createdAt?.toDate

                                    ? loan.createdAt.toDate()

                                    : new Date();


                        return date.getFullYear();
                    }
                )
            )

        ].sort(
            (a, b) =>
                b - a
        );


    loanYearFilter.innerHTML = `

        <option value="ALL">
            All
        </option>

    `;


    years.forEach(
        year => {

            loanYearFilter.innerHTML += `

                <option value="${year}">
                    ${year}
                </option>

            `;
        }
    );
}


// ==========================================
// FILTER LOANS
// ==========================================
//
// IMPORTANT:
// Completed loans are removed BEFORE the
// normal search/status/month/year filters.
//
// This guarantees that Completed loans cannot
// accidentally appear on the main Loans page.
// ==========================================

function getFilteredLoans() {

    let filtered =
        [...loans];


    // ==========================================
    // MAIN LOANS LIST ONLY
    // ==========================================

    filtered =
        filtered.filter(
            loan =>
                isRunningLoan(
                    loan
                )
        );


    const keyword =
        loanSearch?.value
            ?.trim()
            .toLowerCase() ||
        "";


    const status =
        loanFilter?.value ||
        "ALL";


    const month =
        loanMonthFilter?.value ||
        "ALL";


    const year =
        loanYearFilter?.value ||
        "ALL";


    if (keyword) {

        filtered =
            filtered.filter(
                loan =>

                    (
                        loan.clientName ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        )

                    ||

                    String(
                        loan.id
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        )

                    ||

                    String(
                        loan.loanNumber ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        )
            );
    }


    if (
        status !==
        "ALL"
    ) {

        filtered =
            filtered.filter(
                loan =>
                    normalizeLoanStatus(
                        loan.status
                    ) ===
                    normalizeLoanStatus(
                        status
                    )
            );
    }


    if (
        month !==
        "ALL" ||
        year !==
        "ALL"
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const date =
                        loan.approvalDate

                            ? new Date(
                                loan.approvalDate
                            )

                            : loan.createdAt?.toDate

                                ? loan.createdAt.toDate()

                                : new Date();


                    const monthMatch =
                        month ===
                        "ALL" ||
                        date.getMonth() ===
                        Number(
                            month
                        );


              