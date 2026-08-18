// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 7.1
//
// CORRECTIONS:
// ✔ Loan Details → Receive Repayment opens directly for that loan
// ✔ No client selector when repaying from Loan Details
// ✔ No loan selector when repaying from Loan Details
// ✔ Repayment is tied directly to the selected loan
// ✔ Repayment deletion is ADMIN ONLY
// ✔ Repayment delete button is visible only for the latest payment
// ✔ Repayment delete button expires after 24 hours
// ✔ Repayment cannot be deleted after 24 hours
// ✔ Direct repayment prevents selecting another loan accidentally
// ✔ FAB repayment still supports Client → Loan selection
// ✔ Duplicate repayment protection retained
// ✔ Compatible with GREYMUS manual messaging system
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
    document.getElementById(
        "loan-form"
    );

const loanModal =
    document.getElementById(
        "loan-modal"
    );

const loansTableBody =
    document.getElementById(
        "loans-table-body"
    );

const loanSearch =
    document.getElementById(
        "loan-search"
    );

const loanFilter =
    document.getElementById(
        "loan-filter"
    );

const loanMonthFilter =
    document.getElementById(
        "loan-month-filter"
    );

const loanYearFilter =
    document.getElementById(
        "loan-year-filter"
    );

const loanId =
    document.getElementById(
        "loan-id"
    );

const loanClient =
    document.getElementById(
        "loan-client"
    );

const loanAmount =
    document.getElementById(
        "loan-amount"
    );

const loanProcessingFee =
    document.getElementById(
        "loan-processing-fee"
    );

const loanPaid =
    document.getElementById(
        "loan-paid"
    );

const loanBalance =
    document.getElementById(
        "loan-balance"
    );

const loanType =
    document.getElementById(
        "loan-type"
    );

const loanInterest =
    document.getElementById(
        "loan-interest"
    );

const loanDuration =
    document.getElementById(
        "loan-duration"
    );

const loanDueDate =
    document.getElementById(
        "loan-due-date"
    );

const loanStartDate =
    document.getElementById(
        "loan-start-date"
    );


// ==========================================
// REPAYMENT MODAL ELEMENTS
// ==========================================

const repaymentModal =
    document.getElementById(
        "repayment-modal"
    );

const repaymentForm =
    document.getElementById(
        "repayment-form"
    );

const repaymentLoanId =
    document.getElementById(
        "repayment-loan-id"
    );

const repaymentClient =
    document.getElementById(
        "repayment-client"
    );

const repaymentBalance =
    document.getElementById(
        "repayment-balance"
    );

const repaymentAmount =
    document.getElementById(
        "repayment-amount"
    );

const repaymentDate =
    document.getElementById(
        "repayment-date"
    );

const repaymentNotes =
    document.getElementById(
        "repayment-notes"
    );


// ==========================================
// SCHEDULE MODAL ELEMENTS
// ==========================================

const scheduleModal =
    document.getElementById(
        "schedule-modal"
    );

const scheduleClient =
    document.getElementById(
        "schedule-client"
    );

const scheduleBalance =
    document.getElementById(
        "schedule-balance"
    );

const scheduleTableBody =
    document.getElementById(
        "schedule-table-body"
    );

const closeScheduleModal =
    document.getElementById(
        "close-schedule-modal"
    );


// ==========================================
// PREVIEW ELEMENTS
// ==========================================

const previewPrincipal =
    document.getElementById(
        "preview-principal"
    );

const previewInterest =
    document.getElementById(
        "preview-interest"
    );

const previewDuration =
    document.getElementById(
        "preview-duration"
    );

const previewWeekly =
    document.getElementById(
        "preview-weekly"
    ) ||
    document.getElementById(
        "preview-monthly"
    );


// ==========================================
// DATA STATE
// ==========================================

let loans = [];

let clients = [];

let selectedLoanId =
    null;

let loanDetailsOpen =
    false;

let previousLoansOpen =
    false;

let previousLoanSelectedId =
    null;

let repaymentSaving =
    false;


/*
 * TRUE when repayment modal was opened
 * from a specific Loan Details page.
 *
 * In this mode:
 *
 * - client selector is hidden
 * - loan selector is hidden
 * - repaymentLoanId is automatically assigned
 * - user cannot switch to another loan
 */

let directLoanRepaymentMode =
    false;


// ==========================================
// BASIC HELPERS
// ==========================================

function currency(
    value
) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style:
                "currency",

            currency:
                "KES",

            maximumFractionDigits:
                0
        }
    ).format(
        Number(value) || 0
    );

}


function formatDate(
    date
) {

    if (!date) {
        return "";
    }


    const parsedDate =
        new Date(
            date
        );


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


function escapeHtml(
    value
) {

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


function normalizeLoanStatus(
    status
) {

    const value =
        String(
            status ||
            "Pending"
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


function isRunningLoan(
    loan
) {

    if (!loan) {
        return false;
    }


    const status =
        normalizeLoanStatus(
            loan.status
        );


    return (
        status ===
            "Pending" ||

        status ===
            "Active" ||

        status ===
            "Arrears"
    );

}


function getPreviousLoans(
    currentLoan
) {

    if (!currentLoan) {
        return [];
    }


    return loans
        .filter(
            loan =>
                loan.clientId ===
                    currentLoan.clientId &&

                loan.id !==
                    currentLoan.id
        )
        .sort(
            (
                a,
                b
            ) => {

                const dateA =
                    a.approvalDate ||
                    a.createdAt
                        ?.toDate?.() ||
                    "";


                const dateB =
                    b.approvalDate ||
                    b.createdAt
                        ?.toDate?.() ||
                    "";


                return (
                    new Date(
                        dateB
                    ) -
                    new Date(
                        dateA
                    )
                );

            }
        );

}


function generateLoanNumber() {

    const year =
        new Date()
            .getFullYear();


    const yearCode =
        String(
            year
        ).slice(
            -3
        );


    const loansThisYear =
        loans.filter(
            loan => {

                const approvalYear =
                    new Date(
                        loan.approvalDate ||
                        loan.createdAt
                            ?.toDate?.() ||
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
            loansThisYear.length +
            1
        ).padStart(
            2,
            "0"
        );


    return `GML/${sequence}/${yearCode}`;

}


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
                    ) ||
                    "",

                createdAt:
                    serverTimestamp(),

                timestamp:
                    new Date()
                        .toISOString()

            }
        );

    } catch (
        error
    ) {

        console.error(
            "History Log Error:",
            error
        );

    }

}


function roundToNearestFive(
    amount
) {

    return Math.ceil(
        Number(
            amount
        ) / 5
    ) * 5;

}


function applyHistoricalPayments(
    schedule,
    amountPaid
) {

    let remaining =
        Number(
            amountPaid ||
            0
        );


    for (
        const installment
        of schedule
    ) {

        if (
            remaining <=
            0
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


            remaining =
                0;

        }

    }


    return schedule;

}


// ==========================================
// LOAN CALCULATOR
// ==========================================

function calculateLoan() {

    const amount =
        Number(
            loanAmount?.value ||
            0
        );


    const interest =
        Number(
            loanInterest?.value ||
            0
        );


    const duration =
        Number(
            loanDuration?.value ||
            0
        );


    const processingFee =
        Number(
            loanProcessingFee?.value ||
            0
        );


    const interestAmount =
        (
            amount *
            interest
        ) / 100;


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


    if (
        previewPrincipal
    ) {

        previewPrincipal.textContent =
            currency(
                amount
            );

    }


    if (
        previewInterest
    ) {

        previewInterest.textContent =
            currency(
                interestAmount
            );

    }


    if (
        previewDuration
    ) {

        previewDuration.textContent =
            `${duration} Weeks`;

    }


    if (
        previewWeekly
    ) {

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


function generateRepaymentSchedule(
    approvalDate,
    durationWeeks,
    weeklyPayment,
    totalRepayment
) {

    const schedule =
        [];


    const startDate =
        new Date(
            approvalDate
        );


    for (
        let week = 1;
        week <=
            durationWeeks;
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
            week ===
            durationWeeks
        ) {

            installmentAmount =
                Number(
                    totalRepayment
                ) -
                Number(
                    weeklyPayment
                ) *
                (
                    durationWeeks -
                    1
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
// CLIENTS
// ==========================================

function loadClients() {

    onSnapshot(
        collection(
            db,
            "clients"
        ),
        snapshot => {

            clients =
                [];


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
                        l =>
                            l.id ===
                            selectedLoanId
                    );


                if (
                    currentLoan
                ) {

                    renderLoanDetailsPage(
                        currentLoan
                    );

                }

            }

        },

        error =>
            console.error(
                "Failed to load clients:",
                error
            )

    );

}


function populateClientDropdown() {

    if (
        !loanClient
    ) {

        return;

    }


    loanClient.innerHTML =
        `<option value="">Select Client</option>`;


    clients
        .sort(
            (
                a,
                b
            ) =>
                (
                    a.name ||
                    ""
                ).localeCompare(
                    b.name ||
                    ""
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

            loans =
                [];


            snapshot.forEach(
                docSnap => {

                    const data =
                        docSnap.data();


                    if (
                        !data
                    ) {

                        return;

                    }


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
                        l =>
                            l.id ===
                            selectedLoanId
                    );


                if (
                    selectedLoan
                ) {

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

                if (
                    !directLoanRepaymentMode
                ) {

                    populateFabClientSelector();

                }

            }

        },

        error =>
            console.error(
                "Failed to load loans:",
                error
            )

    );

}


// ==========================================
// NEW LOAN MODAL
// ==========================================

function openLoanModal() {

    if (
        !loanModal
    ) {

        return;

    }


    loanForm?.reset();


    if (
        loanPaid
    ) {

        loanPaid.value =
            0;

    }


    if (
        loanBalance
    ) {

        loanBalance.value =
            0;

    }


    if (
        loanType
    ) {

        loanType.value =
            "new";

    }


    if (
        loanId
    ) {

        loanId.value =
            "";

    }


    if (
        loanDueDate
    ) {

        loanDueDate.value =
            today();

    }


    if (
        loanStartDate
    ) {

        loanStartDate.value =
            today();

    }


    calculateLoan();


    /*
     * IMPORTANT:
     *
     * Your HTML uses the "hidden" class.
     * Do NOT replace this with display:flex,
     * active, or any other class.
     */

    loanModal.classList.remove(
        "hidden"
    );

}


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

if (
    loanForm
) {

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


                if (
                    !client
                ) {

                    throw new Error(
                        "No client selected."
                    );

                }


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


                if (
                    isHistorical
                ) {

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


                if (
                    blockedLoan
                ) {

                    const continuePayment =
                        confirm(
                            `Cannot save loan.\n\n` +
                            `Client has an outstanding balance of ${currency(
                                blockedLoan.balance
                            )}.\n\n` +
                            `Loan No: ${blockedLoan.loanNumber}\n\n` +
                            `Press OK to continue to repayment.\nPress Cancel to close.`
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


                if (
                    loanId?.value
                ) {

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


                if (
                    loanId
                ) {

                    loanId.value =
                        "";

                }


                calculateLoan();


                loanModal.classList.add(
                    "hidden"
                );


            } catch (
                error
            ) {

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
// END OF PART 1
// ==========================================// ==========================================
// LOAN TABLE
// ==========================================

function renderLoans(list) {

    if (
        !loansTableBody ||
        loanDetailsOpen
    ) {
        return;
    }

    loansTableBody.innerHTML = "";

    list =
        list.filter(
            loan =>
                isRunningLoan(loan)
        );

    list.sort(
        (a, b) => {

            const dateA =
                a.approvalDate || "";

            const dateB =
                b.approvalDate || "";

            if (
                dateA !== dateB
            ) {

                return (
                    new Date(dateB) -
                    new Date(dateA)
                );

            }

            return (
                (a.clientName || "")
                    .localeCompare(
                        b.clientName || ""
                    )
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
            ) {

                return;

            }


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
                        loan.status ||
                        "-"
                    )}

                </td>


                <td>

                    ${escapeHtml(
                        loan.nextRepaymentDate ||
                        "-"
                    )}

                </td>


                <td>

                    ${loan.remainingInstallments ||
                        0}

                </td>


                <td>

                    ${
                        loan.completed
                            ? "Completed"
                            : "Running"
                    }

                </td>


                <td>

                    <button
                        type="button"
                        class="loan-message-btn"
                        data-loan-id="${escapeHtml(
                            loan.id
                        )}"
                        onclick="event.stopPropagation(); messageLoan('${escapeHtml(
                            loan.id
                        )}')"
                    >

                        Message

                    </button>

                </td>


                <td>

                    <button
                        type="button"
                        class="loan-view-btn"
                        onclick="event.stopPropagation(); openLoanDetails('${escapeHtml(
                            loan.id
                        )}')"
                    >

                        View

                    </button>

                </td>

            `;


            row.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            "button"
                        )
                    ) {

                        return;

                    }


                    openLoanDetails(
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
// FILTER LOANS
// ==========================================

function filterLoans() {

    if (
        loanDetailsOpen
    ) {

        return;

    }


    const search =
        (
            loanSearch?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        loanFilter?.value ||
        "all";


    const month =
        loanMonthFilter?.value ||
        "all";


    const year =
        loanYearFilter?.value ||
        "all";


    let filtered =
        [...loans];


    if (
        search
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const text =
                        [

                            loan.clientName,

                            loan.loanNumber,

                            loan.loanType,

                            loan.clientPhone,

                            loan.status

                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );

    }


    if (
        !isAllFilterValue(
            status
        )
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const loanStatus =
                        normalizeLoanStatus(
                            loan.status
                        );


                    return (
                        loanStatus.toLowerCase() ===
                        String(
                            status
                        )
                            .toLowerCase()
                    );

                }
            );

    }


    if (
        !isAllFilterValue(
            month
        )
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const date =
                        new Date(
                            loan.approvalDate ||
                            loan.disbursementDate ||
                            loan.createdAt
                                ?.toDate?.() ||
                            ""
                        );


                    if (
                        Number.isNaN(
                            date.getTime()
                        )
                    ) {

                        return false;

                    }


                    const selectedMonth =
                        Number(
                            month
                        );


                    return (
                        date.getMonth() +
                        1 ===
                        selectedMonth
                    );

                }
            );

    }


    if (
        !isAllFilterValue(
            year
        )
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const date =
                        new Date(
                            loan.approvalDate ||
                            loan.disbursementDate ||
                            loan.createdAt
                                ?.toDate?.() ||
                            ""
                        );


                    if (
                        Number.isNaN(
                            date.getTime()
                        )
                    ) {

                        return false;

                    }


                    return (
                        date.getFullYear() ===
                        Number(year)
                    );

                }
            );

    }


    renderLoans(
        filtered
    );

}


// ==========================================
// FILTER EVENTS
// ==========================================

loanSearch?.addEventListener(
    "input",
    filterLoans
);


loanFilter?.addEventListener(
    "change",
    filterLoans
);


loanMonthFilter?.addEventListener(
    "change",
    filterLoans
);


loanYearFilter?.addEventListener(
    "change",
    filterLoans
);


// ==========================================
// POPULATE YEAR FILTER
// ==========================================

function populateYearFilter() {

    if (
        !loanYearFilter
    ) {

        return;

    }


    const currentValue =
        loanYearFilter.value;


    const years =
        new Set();


    loans.forEach(
        loan => {

            const date =
                new Date(
                    loan.approvalDate ||
                    loan.disbursementDate ||
                    loan.createdAt
                        ?.toDate?.() ||
                    ""
                );


            if (
                !Number.isNaN(
                    date.getTime()
                )
            ) {

                years.add(
                    date.getFullYear()
                );

            }

        }
    );


    loanYearFilter.innerHTML = `

        <option value="all">
            All Years
        </option>

    `;


    Array.from(
        years
    )
        .sort(
            (a, b) =>
                b - a
        )
        .forEach(
            year => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    year;


                option.textContent =
                    year;


                loanYearFilter.appendChild(
                    option
                );

            }
        );


    if (
        currentValue &&
        Array.from(
            loanYearFilter.options
        )
            .some(
                option =>
                    option.value ===
                    currentValue
            )
    ) {

        loanYearFilter.value =
            currentValue;

    }

}


// ==========================================
// LOAN ROW CLICK HANDLER
// ==========================================

document.addEventListener(
    "click",
    event => {

        const row =
            event.target.closest(
                ".loan-clickable-row"
            );


        if (
            !row
        ) {

            return;

        }


        if (
            event.target.closest(
                "button"
            )
        ) {

            return;

        }


        const id =
            row.dataset.loanId;


        if (
            id
        ) {

            openLoanDetails(
                id
            );

        }

    }
);


// ==========================================
// LOAN DETAILS PAGE
// ==========================================

function openLoanDetails(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    selectedLoanId =
        id;


    loanDetailsOpen =
        true;


    previousLoansOpen =
        false;


    previousLoanSelectedId =
        null;


    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (
        !page
    ) {

        console.error(
            "Loan details page not found."
        );

        return;

    }


    renderLoanDetailsPage(
        loan
    );


    page.classList.remove(
        "hidden"
    );


    window.scrollTo(
        0,
        0
    );

}


// ==========================================
// CLOSE LOAN DETAILS PAGE
// ==========================================

function closeLoanDetailsPage() {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (
        page
    ) {

        page.classList.add(
            "hidden"
        );

    }


    loanDetailsOpen =
        false;


    previousLoansOpen =
        false;


    selectedLoanId =
        null;


    previousLoanSelectedId =
        null;


    filterLoans();

}


// ==========================================
// RENDER LOAN DETAILS
// ==========================================

function renderLoanDetailsPage(
    loan
) {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (
        !page ||
        !loan
    ) {

        return;

    }


    const client =
        clients.find(
            c =>
                c.id ===
                loan.clientId
        );


    const clientName =
        loan.clientName ||
        client?.name ||
        "Unknown Client";


    const balance =
        Number(
            loan.balance ||
            0
        );


    const amountPaid =
        Number(
            loan.amountPaid ||
            0
        );


    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );


    const collectionPercentage =
        totalRepayment >
        0
            ? Math.min(
                (
                    amountPaid /
                    totalRepayment
                ) *
                100,
                100
            )
            : 0;


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    page.innerHTML = `

        <div
            class="loan-details-header"
        >

            <button
                type="button"
                onclick="closeLoanDetailsPage()"
            >

                ← Back

            </button>


            <div>

                <h2>
                    Loan Details
                </h2>

                <p>
                    ${escapeHtml(
                        loan.loanNumber ||
                        "-"
                    )}
                </p>

            </div>


            <div
                class="loan-details-header-actions"
            >

                <button
                    type="button"
                    onclick="openRepaymentForLoan('${escapeHtml(
                        loan.id
                    )}')"
                >

                    Receive Repayment

                </button>


                <button
                    type="button"
                    onclick="messageLoan('${escapeHtml(
                        loan.id
                    )}')"
                >

                    Message

                </button>

            </div>

        </div>


        <div
            class="loan-details-client-card"
        >

            <div
                class="loan-client-avatar"
            >

                ${escapeHtml(
                    (
                        clientName[0] ||
                        "C"
                    ).toUpperCase()
                )}

            </div>


            <div>

                <h3>
                    ${escapeHtml(
                        clientName
                    )}
                </h3>


                <p>
                    ${escapeHtml(
                        loan.clientPhone ||
                        client?.phone ||
                        ""
                    )}
                </p>

            </div>

        </div>


        <div
            class="loan-details-summary-grid"
        >

            <div
                class="loan-summary-card"
            >

                <span>
                    Loan Amount
                </span>

                <strong>
                    ${currency(
                        loan.amount
                    )}
                </strong>

            </div>


            <div
                class="loan-summary-card"
            >

                <span>
                    Weekly Repayment
                </span>

                <strong>
                    ${currency(
                        loan.weeklyPayment
                    )}
                </strong>

            </div>


            <div
                class="loan-summary-card"
            >

                <span>
                    Amount Paid
                </span>

                <strong>
                    ${currency(
                        amountPaid
                    )}
                </strong>

            </div>


            <div
                class="loan-summary-card outstanding"
            >

                <span>
                    Outstanding Balance
                </span>

                <strong>
                    ${currency(
                        balance
                    )}
                </strong>

            </div>

        </div>


        <div
            class="loan-collection-progress"
        >

            <div
                class="loan-progress-header"
            >

                <strong>
                    Collection Progress
                </strong>


                <span>
                    ${collectionPercentage.toFixed(
                        0
                    )}%
                </span>

            </div>


            <div
                class="loan-progress-track"
            >

                <div
                    class="loan-progress-fill"
                    style="
                        width:${collectionPercentage}%;
                    "
                ></div>

            </div>

        </div>


        <div
            class="loan-details-section"
        >

            <h3>
                Loan Information
            </h3>


            <div
                class="loan-details-info-grid"
            >

                <div>

                    <span>
                        Client
                    </span>

                    <strong>
                        ${escapeHtml(
                            clientName
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Loan Type
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "-"
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Interest
                    </span>

                    <strong>
                        ${loan.interest || 0}%
                    </strong>

                </div>


                <div>

                    <span>
                        Duration
                    </span>

                    <strong>
                        ${loan.duration || 0}
                        Weeks
                    </strong>

                </div>


                <div>

                    <span>
                        Processing Fee
                    </span>

                    <strong>
                        ${currency(
                            loan.processingFee
                        )}
                    </strong>

                </div>


                <div>

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


                <div>

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


                <div>

                    <span>
                        Status
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.status ||
                            "-"
                        )}
                    </strong>

                </div>

            </div>

        </div>


        <div
            class="loan-details-section"
        >

            <div
                class="loan-section-heading"
            >

                <h3>
                    Repayment Schedule
                </h3>


                <span>
                    ${schedule.length}
                    Installments
                </span>

            </div>


            <div
                class="loan-schedule-table-wrapper"
            >

                <table
                    class="loan-schedule-table"
                >

                    <thead>

                        <tr>

                            <th>
                                Week
                            </th>

                            <th>
                                Due Date
                            </th>

                            <th>
                                Amount
                            </th>

                            <th>
                                Paid
                            </th>

                            <th>
                                Balance
                            </th>

                            <th>
                                Status
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            schedule.length
                                ? schedule
                                    .map(
                                        item => `

                                            <tr>

                                                <td>
                                                    ${item.week}
                                                </td>

                                                <td>
                                                    ${escapeHtml(
                                                        item.dueDate ||
                                                        "-"
                                                    )}
                                                </td>

                                                <td>
                                                    ${currency(
                                                        item.amount
                                                    )}
                                                </td>

                                                <td>
                                                    ${currency(
                                                        item.paidAmount ||
                                                        0
                                                    )}
                                                </td>

                                                <td>
                                                    ${currency(
                                                        item.remainingAmount ??
                                                        0
                                                    )}
                                                </td>

                                                <td>

                                                    ${escapeHtml(
                                                        item.status ||
                                                        (
                                                            item.paid
                                                                ? "Paid"
                                                                : "Pending"
                                                        )
                                                    )}

                                                </td>

                                            </tr>

                                        `
                                    )
                                    .join("")
                                : `

                                    <tr>

                                        <td
                                            colspan="6"
                                            style="
                                                text-align:center;
                                                padding:20px;
                                            "
                                        >

                                            No repayment schedule available.

                                        </td>

                                    </tr>

                                `
                        }

                    </tbody>

                </table>

            </div>

        </div>


        <div
            class="loan-details-actions"
        >

            <button
                type="button"
                onclick="openRepaymentForLoan('${escapeHtml(
                    loan.id
                )}')"
            >

                Receive Repayment

            </button>


            <button
                type="button"
                onclick="messageLoan('${escapeHtml(
                    loan.id
                )}')"
            >

                Message Client

            </button>


            ${
                isAdmin()
                    ? `

                        <button
                            type="button"
                            class="danger"
                            onclick="deleteLoan('${escapeHtml(
                                loan.id
                            )}')"
                        >

                            Delete Loan

                        </button>

                    `
                    : ""
            }

        </div>

    `;

}


// ==========================================
// END OF PART 2
// ==========================================// ==========================================
// PREVIOUS LOANS PAGE
// ==========================================

function openPreviousLoans(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        return;

    }


    selectedLoanId =
        loanId;


    previousLoansOpen =
        true;


    loanDetailsOpen =
        true;


    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (
        !page
    ) {

        return;

    }


    renderPreviousLoansPage(
        loan
    );


    page.classList.remove(
        "hidden"
    );


    window.scrollTo(
        0,
        0
    );

}


// ==========================================
// RENDER PREVIOUS LOANS
// ==========================================

function renderPreviousLoansPage(
    currentLoan
) {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (
        !page
    ) {

        return;

    }


    const previousLoans =
        getPreviousLoans(
            currentLoan
        );


    page.innerHTML = `

        <div
            class="loan-details-header"
        >

            <button
                type="button"
                onclick="openLoanDetails('${escapeHtml(
                    currentLoan.id
                )}')"
            >

                ← Back

            </button>


            <div>

                <h2>
                    Previous Loans
                </h2>

                <p>
                    ${escapeHtml(
                        currentLoan.clientName ||
                        "-"
                    )}
                </p>

            </div>

        </div>


        <div
            class="loan-details-section"
        >

            <div
                class="loan-section-heading"
            >

                <h3>
                    Loan History
                </h3>


                <span>
                    ${previousLoans.length}
                    Previous Loans
                </span>

            </div>


            ${
                previousLoans.length
                    ? `

                        <div
                            class="previous-loans-list"
                        >

                            ${previousLoans
                                .map(
                                    (
                                        loan,
                                        index
                                    ) => `

                                        <div
                                            class="previous-loan-card"
                                            onclick="openPreviousLoan('${escapeHtml(
                                                loan.id
                                            )}')"
                                        >

                                            <div
                                                class="previous-loan-number"
                                            >

                                                ${index + 1}

                                            </div>


                                            <div
                                                class="previous-loan-main"
                                            >

                                                <strong>
                                                    ${escapeHtml(
                                                        loan.loanNumber ||
                                                        "-"
                                                    )}
                                                </strong>


                                                <span>
                                                    ${escapeHtml(
                                                        loan.approvalDate ||
                                                        "-"
                                                    )}
                                                </span>

                                            </div>


                                            <div
                                                class="previous-loan-amount"
                                            >

                                                <strong>
                                                    ${currency(
                                                        loan.amount
                                                    )}
                                                </strong>


                                                <span>
                                                    ${escapeHtml(
                                                        loan.status ||
                                                        "-"
                                                    )}
                                                </span>

                                            </div>


                                            <div
                                                class="previous-loan-arrow"
                                            >

                                                ›

                                            </div>

                                        </div>

                                    `
                                )
                                .join("")}

                        </div>

                    `
                    : `

                        <div
                            class="empty-state"
                        >

                            <strong>
                                No previous loans
                            </strong>


                            <p>
                                This client has no
                                previous loan records.
                            </p>

                        </div>

                    `
            }

        </div>

    `;

}


// ==========================================
// OPEN PREVIOUS LOAN
// ==========================================

function openPreviousLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        return;

    }


    previousLoanSelectedId =
        loanId;


    previousLoansOpen =
        true;


    renderPreviousLoanDetails(
        loan
    );

}


// ==========================================
// PREVIOUS LOAN DETAILS
// ==========================================

function renderPreviousLoanDetails(
    loan
) {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (
        !page
    ) {

        return;

    }


    page.innerHTML = `

        <div
            class="loan-details-header"
        >

            <button
                type="button"
                onclick="openPreviousLoans('${escapeHtml(
                    selectedLoanId
                )}')"
            >

                ← Back

            </button>


            <div>

                <h2>
                    Previous Loan
                </h2>

                <p>
                    ${escapeHtml(
                        loan.loanNumber ||
                        "-"
                    )}
                </p>

            </div>


            <div
                class="loan-details-header-actions"
            >

                <button
                    type="button"
                    onclick="messageLoan('${escapeHtml(
                        loan.id
                    )}')"
                >

                    Message

                </button>

            </div>

        </div>


        <div
            class="loan-details-client-card"
        >

            <div
                class="loan-client-avatar"
            >

                ${escapeHtml(
                    (
                        loan.clientName?.[0] ||
                        "C"
                    ).toUpperCase()
                )}

            </div>


            <div>

                <h3>
                    ${escapeHtml(
                        loan.clientName ||
                        "-"
                    )}
                </h3>


                <p>
                    ${escapeHtml(
                        loan.clientPhone ||
                        ""
                    )}
                </p>

            </div>

        </div>


        <div
            class="loan-details-summary-grid"
        >

            <div
                class="loan-summary-card"
            >

                <span>
                    Loan Amount
                </span>

                <strong>
                    ${currency(
                        loan.amount
                    )}
                </strong>

            </div>


            <div
                class="loan-summary-card"
            >

                <span>
                    Total Repayment
                </span>

                <strong>
                    ${currency(
                        loan.totalRepayment
                    )}
                </strong>

            </div>


            <div
                class="loan-summary-card"
            >

                <span>
                    Amount Paid
                </span>

                <strong>
                    ${currency(
                        loan.amountPaid
                    )}
                </strong>

            </div>


            <div
                class="loan-summary-card"
            >

                <span>
                    Final Balance
                </span>

                <strong>
                    ${currency(
                        loan.balance
                    )}
                </strong>

            </div>

        </div>


        <div
            class="loan-details-section"
        >

            <h3>
                Loan Information
            </h3>


            <div
                class="loan-details-info-grid"
            >

                <div>

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


                <div>

                    <span>
                        Approval Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.approvalDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Loan Type
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "-"
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Interest
                    </span>

                    <strong>
                        ${loan.interest || 0}%
                    </strong>

                </div>


                <div>

                    <span>
                        Duration
                    </span>

                    <strong>
                        ${loan.duration || 0}
                        Weeks
                    </strong>

                </div>


                <div>

                    <span>
                        Weekly Repayment
                    </span>

                    <strong>
                        ${currency(
                            loan.weeklyPayment
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Processing Fee
                    </span>

                    <strong>
                        ${currency(
                            loan.processingFee
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Status
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.status ||
                            "-"
                        )}
                    </strong>

                </div>

            </div>

        </div>


        <div
            class="loan-details-section"
        >

            <div
                class="loan-section-heading"
            >

                <h3>
                    Repayment Schedule
                </h3>

            </div>


            <div
                class="loan-schedule-table-wrapper"
            >

                <table
                    class="loan-schedule-table"
                >

                    <thead>

                        <tr>

                            <th>
                                Week
                            </th>

                            <th>
                                Due Date
                            </th>

                            <th>
                                Amount
                            </th>

                            <th>
                                Paid
                            </th>

                            <th>
                                Remaining
                            </th>

                            <th>
                                Status
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            (
                                loan.repaymentSchedule ||
                                []
                            )
                                .map(
                                    item => `

                                        <tr>

                                            <td>
                                                ${item.week}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.dueDate ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${currency(
                                                    item.amount
                                                )}
                                            </td>

                                            <td>
                                                ${currency(
                                                    item.paidAmount ||
                                                    0
                                                )}
                                            </td>

                                            <td>
                                                ${currency(
                                                    item.remainingAmount ||
                                                    0
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    item.status ||
                                                    "-"
                                                )}
                                            </td>

                                        </tr>

                                    `
                                )
                                .join("")
                        }

                    </tbody>

                </table>

            </div>

        </div>

    `;

}


// ==========================================
// CLOSE LOAN DETAILS BUTTON
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#close-loan-details"
            );


        if (
            !button
        ) {

            return;

        }


        closeLoanDetailsPage();

    }
);


// ==========================================
// REPAYMENT MODAL
// ==========================================

function openRepaymentModal() {

    directLoanRepaymentMode =
        false;


    if (
        repaymentForm
    ) {

        repaymentForm.reset();

    }


    if (
        repaymentDate
    ) {

        repaymentDate.value =
            today();

    }


    if (
        repaymentLoanId
    ) {

        repaymentLoanId.value =
            "";

    }


    if (
        repaymentClient
    ) {

        repaymentClient.innerHTML = `

            <option value="">
                Select Client
            </option>

        `;

    }


    populateFabClientSelector();


    if (
        repaymentModal
    ) {

        repaymentModal.classList.remove(
            "hidden"
        );

    }

}


// ==========================================
// DIRECT REPAYMENT FROM LOAN DETAILS
// ==========================================

function openRepaymentForLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    directLoanRepaymentMode =
        true;


    selectedLoanId =
        loanId;


    if (
        repaymentForm
    ) {

        repaymentForm.reset();

    }


    if (
        repaymentLoanId
    ) {

        repaymentLoanId.value =
            loan.id;

    }


    if (
        repaymentClient
    ) {

        repaymentClient.innerHTML = `

            <option
                value="${escapeHtml(
                    loan.clientId
                )}"
                selected
            >

                ${escapeHtml(
                    loan.clientName ||
                    "-"
                )}

            </option>

        `;

        repaymentClient.disabled =
            true;

    }


    if (
        repaymentBalance
    ) {

        repaymentBalance.value =
            Number(
                loan.balance ||
                0
            );

    }


    if (
        repaymentAmount
    ) {

        repaymentAmount.value =
            "";

    }


    if (
        repaymentDate
    ) {

        repaymentDate.value =
            today();

    }


    if (
        repaymentModal
    ) {

        repaymentModal.classList.remove(
            "hidden"
        );

    }

}


// ==========================================
// CLOSE REPAYMENT MODAL
// ==========================================

function closeRepaymentModal() {

    if (
        repaymentModal
    ) {

        repaymentModal.classList.add(
            "hidden"
        );

    }


    directLoanRepaymentMode =
        false;


    if (
        repaymentClient
    ) {

        repaymentClient.disabled =
            false;

    }


    if (
        repaymentLoanId
    ) {

        repaymentLoanId.value =
            "";

    }

}


// ==========================================
// FAB CLIENT SELECTOR
// ==========================================

function populateFabClientSelector() {

    if (
        !repaymentClient ||
        directLoanRepaymentMode
    ) {

        return;

    }


    repaymentClient.innerHTML = `

        <option value="">
            Select Client
        </option>

    `;


    clients
        .slice()
        .sort(
            (
                a,
                b
            ) =>
                (
                    a.name ||
                    ""
                ).localeCompare(
                    b.name ||
                    ""
                )
        )
        .forEach(
            client => {

                repaymentClient.innerHTML += `

                    <option
                        value="${escapeHtml(
                            client.id
                        )}"
                    >

                        ${escapeHtml(
                            client.name ||
                            "-"
                        )}

                    </option>

                `;

            }
        );

}


// ==========================================
// CLIENT → LOAN SELECTION
// ==========================================

repaymentClient?.addEventListener(
    "change",
    () => {

        if (
            directLoanRepaymentMode
        ) {

            return;

        }


        const clientId =
            repaymentClient.value;


        if (
            !repaymentLoanId
        ) {

            return;

        }


        repaymentLoanId.innerHTML = `

            <option value="">
                Select Loan
            </option>

        `;


        const clientLoans =
            loans.filter(
                loan =>
                    loan.clientId ===
                        clientId &&

                    Number(
                        loan.balance ||
                        0
                    ) > 0
            );


        clientLoans.forEach(
            loan => {

                repaymentLoanId.innerHTML += `

                    <option
                        value="${escapeHtml(
                            loan.id
                        )}"
                    >

                        ${escapeHtml(
                            loan.loanNumber ||
                            "-"
                        )}
                        —
                        ${currency(
                            loan.balance ||
                            0
                        )}

                    </option>

                `;

            }
        );

    }
);


// ==========================================
// END OF PART 3
// ==========================================// ==========================================
// LOAN SELECTION FOR REPAYMENT
// ==========================================

repaymentLoanId?.addEventListener(
    "change",
    () => {

        const id =
            repaymentLoanId.value;

        const loan =
            loans.find(
                item =>
                    item.id === id
            );

        if (
            !loan
        ) {

            if (
                repaymentBalance
            ) {

                repaymentBalance.value =
                    "";

            }

            return;

        }


        if (
            repaymentBalance
        ) {

            repaymentBalance.value =
                Number(
                    loan.balance ||
                    0
                );

        }

    }
);


// ==========================================
// REPAYMENT FORM SUBMIT
// ==========================================

repaymentForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            repaymentSaving
        ) {

            return;

        }


        repaymentSaving =
            true;


        try {

            await recordRepayment();

        } catch (
            error
        ) {

            console.error(
                "Repayment Error:",
                error
            );


            alert(
                error.message ||
                "Unable to record repayment."
            );

        } finally {

            repaymentSaving =
                false;

        }

    }
);


// ==========================================
// RECORD REPAYMENT
// ==========================================

async function recordRepayment() {

    const id =
        repaymentLoanId?.value;


    if (
        !id
    ) {

        throw new Error(
            "Please select a loan."
        );

    }


    const loan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (
        !loan
    ) {

        throw new Error(
            "Selected loan could not be found."
        );

    }


    const amount =
        Number(
            repaymentAmount?.value ||
            0
        );


    if (
        amount <=
        0
    ) {

        throw new Error(
            "Please enter a valid repayment amount."
        );

    }


    const currentBalance =
        Number(
            loan.balance ||
            0
        );


    if (
        currentBalance <=
        0
    ) {

        throw new Error(
            "This loan has no outstanding balance."
        );

    }


    if (
        amount >
        currentBalance
    ) {

        throw new Error(
            `Repayment cannot exceed the outstanding balance of ${currency(
                currentBalance
            )}.`
        );

    }


    const paymentDate =
        repaymentDate?.value ||
        today();


    const notes =
        repaymentNotes?.value ||
        "";


    const officer =
        localStorage.getItem(
            "userName"
        ) ||
        localStorage.getItem(
            "userEmail"
        ) ||
        "Unknown Officer";


    const now =
        new Date();


    const paymentTime =
        now.toLocaleTimeString(
            [],
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    false
            }
        );


    /*
     * DUPLICATE PAYMENT PROTECTION
     *
     * Prevents accidental double submission
     * of the same repayment amount on the
     * same loan within a short period.
     */

    const recentPayments =
        Array.isArray(
            loan.paymentHistory
        )
            ? loan.paymentHistory
            : [];


    const duplicate =
        recentPayments.some(
            payment => {

                if (
                    Number(
                        payment.amount
                    ) !==
                    amount
                ) {

                    return false;

                }


                const timestamp =
                    payment.timestamp
                        ? new Date(
                            payment.timestamp
                        )
                        : null;


                if (
                    !timestamp ||
                    Number.isNaN(
                        timestamp.getTime()
                    )
                ) {

                    return false;

                }


                return (
                    Date.now() -
                    timestamp.getTime()
                ) <
                30000;

            }
        );


    if (
        duplicate
    ) {

        throw new Error(
            "This repayment appears to have already been recorded."
        );

    }


    /*
     * PAYMENT HISTORY ENTRY
     */

    const paymentEntry = {

        amount:
            amount,

        date:
            paymentDate,

        time:
            paymentTime,

        timestamp:
            now.toISOString(),

        notes:
            notes,

        officer:
            officer

    };


    /*
     * COPY THE CURRENT SCHEDULE
     */

    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule.map(
                item => ({

                    ...item,

                    paymentHistory:
                        Array.isArray(
                            item.paymentHistory
                        )
                            ? [
                                ...item.paymentHistory
                            ]
                            : []

                })
            )
            : [];


    /*
     * APPLY PAYMENT TO SCHEDULE
     *
     * Oldest unpaid installment first.
     */

    let remainingPayment =
        amount;


    for (
        const installment
        of schedule
    ) {

        if (
            remainingPayment <=
            0
        ) {

            break;

        }


        const installmentAmount =
            Number(
                installment.amount ||
                0
            );


        const alreadyPaid =
            Number(
                installment.paidAmount ||
                0
            );


        const installmentRemaining =
            Math.max(
                installmentAmount -
                alreadyPaid,
                0
            );


        if (
            installmentRemaining <=
            0
        ) {

            installment.paid =
                true;

            installment.status =
                "Paid";

            installment.remainingAmount =
                0;

            continue;

        }


        const applied =
            Math.min(
                remainingPayment,
                installmentRemaining
            );


        installment.paidAmount =
            alreadyPaid +
            applied;


        installment.remainingAmount =
            Math.max(
                installmentAmount -
                installment.paidAmount,
                0
            );


        if (
            installment.remainingAmount <=
            0
        ) {

            installment.paid =
                true;

            installment.status =
                "Paid";

            installment.paidDate =
                paymentDate;

        } else {

            installment.paid =
                false;

            installment.status =
                "Partial";

        }


        installment.paymentHistory.push(
            paymentEntry
        );


        remainingPayment -=
            applied;

    }


    /*
     * IF THE PAYMENT IS MORE THAN THE
     * CURRENT SCHEDULED INSTALLMENTS,
     * KEEP THE PAYMENT IN THE LOAN HISTORY.
     */

    if (
        !Array.isArray(
            loan.paymentHistory
        )
    ) {

        loan.paymentHistory =
            [];

    }


    const updatedPaymentHistory = [

        ...loan.paymentHistory,

        paymentEntry

    ];


    /*
     * NEW BALANCES
     */

    const newAmountPaid =
        Number(
            loan.amountPaid ||
            0
        ) +
        amount;


    const newBalance =
        Math.max(
            currentBalance -
            amount,
            0
        );


    const completed =
        newBalance <=
        0;


    /*
     * NEXT REPAYMENT
     */

    const nextInstallment =
        schedule.find(
            installment =>
                !installment.paid
        );


    const nextRepaymentDate =
        nextInstallment
            ? nextInstallment.dueDate
            : null;


    const remainingInstallments =
        schedule.filter(
            installment =>
                !installment.paid
        ).length;


    /*
     * STATUS
     */

    let newStatus =
        normalizeLoanStatus(
            loan.status
        );


    if (
        completed
    ) {

        newStatus =
            "Completed";

    } else if (
        newStatus ===
        "Completed"
    ) {

        newStatus =
            "Active";

    }


    /*
     * UPDATE FIRESTORE
     */

    await updateDoc(
        doc(
            db,
            "loans",
            id
        ),
        {

            amountPaid:
                newAmountPaid,

            balance:
                newBalance,

            repaymentSchedule:
                schedule,

            paymentHistory:
                updatedPaymentHistory,

            nextRepaymentDate:
                nextRepaymentDate,

            remainingInstallments:
                remainingInstallments,

            completed:
                completed,

            status:
                newStatus,

            updatedAt:
                serverTimestamp()

        }
    );


    /*
     * LOG REPAYMENT
     */

    await logHistory(
        "Repayment Received",
        "Repayment",
        {

            loanId:
                loan.loanNumber ||
                loan.id,

            client:
                loan.clientName,

            amount:
                amount,

            previousBalance:
                currentBalance,

            newBalance:
                newBalance,

            date:
                paymentDate,

            time:
                paymentTime,

            officer:
                officer

        }
    );


    /*
     * CLOSE MODAL
     */

    closeRepaymentModal();


    /*
     * REFRESH DETAILS PAGE IF IT IS OPEN
     */

    const updatedLoan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (
        loanDetailsOpen &&
        selectedLoanId ===
            id &&
        updatedLoan
    ) {

        renderLoanDetailsPage(
            {

                ...updatedLoan,

                amountPaid:
                    newAmountPaid,

                balance:
                    newBalance,

                repaymentSchedule:
                    schedule,

                nextRepaymentDate:
                    nextRepaymentDate,

                remainingInstallments:
                    remainingInstallments,

                completed:
                    completed,

                status:
                    newStatus

            }
        );

    }


    alert(
        `Repayment of ${currency(
            amount
        )} recorded successfully.`
    );


    /*
     * ======================================
     * MANUAL MESSAGE
     * ======================================
     *
     * The repayment is now recorded first.
     *
     * If messages.js exists, it can generate
     * the confirmation message automatically.
     *
     * There is NO API call here.
     *
     * The message button can then open the
     * device's SMS/WhatsApp composer manually.
     */

    if (
        typeof window.showRepaymentMessageButton ===
        "function"
    ) {

        window.showRepaymentMessageButton(
            {

                ...loan,

                amountPaid:
                    newAmountPaid,

                balance:
                    newBalance,

                repaymentAmount:
                    amount,

                paymentDate:
                    paymentDate,

                paymentTime:
                    paymentTime

            }
        );

    }

}


// ==========================================
// REPAYMENT MESSAGE BRIDGE
// ==========================================

function messageRepayment(
    loanId,
    amount = null
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    if (
        typeof window.openRepaymentMessage ===
        "function"
    ) {

        window.openRepaymentMessage(
            loan,
            amount
        );

        return;

    }


    if (
        typeof window.messageLoan ===
        "function"
    ) {

        window.messageLoan(
            loan.id,
            "repayment"
        );

        return;

    }


    alert(
        "Messaging module is not loaded yet."
    );

}


// ==========================================
// MESSAGE LOAN BRIDGE
// ==========================================

function messageLoan(
    loanId,
    type = "general"
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    /*
     * messages.js owns the actual message
     * generation and manual sending.
     */

    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        window.openLoanMessage(
            loan,
            type
        );

        return;

    }


    if (
        typeof window.openMessageModal ===
        "function"
    ) {

        window.openMessageModal(
            loan,
            type
        );

        return;

    }


    alert(
        "Messaging module is not loaded yet."
    );

}


// ==========================================
// APPROVAL MESSAGE BRIDGE
// ==========================================

function messageApproval(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        return;

    }


    if (
        typeof window.openApprovalMessage ===
        "function"
    ) {

        window.openApprovalMessage(
            loan
        );

        return;

    }


    messageLoan(
        loanId,
        "approval"
    );

}


// ==========================================
// DUE MESSAGE BRIDGE
// ==========================================

function messageDueToday(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        return;

    }


    if (
        typeof window.openDueTodayMessage ===
        "function"
    ) {

        window.openDueTodayMessage(
            loan
        );

        return;

    }


    messageLoan(
        loanId,
        "due"
    );

}


// ==========================================
// ARREARS MESSAGE BRIDGE
// ==========================================

function messageArrears(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        return;

    }


    if (
        typeof window.openArrearsMessage ===
        "function"
    ) {

        window.openArrearsMessage(
            loan
        );

        return;

    }


    messageLoan(
        loanId,
        "arrears"
    );

}


// ==========================================
// APPROVE LOAN
// ==========================================

async function approveLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    if (
        normalizeLoanStatus(
            loan.status
        ) ===
        "Active"
    ) {

        alert(
            "This loan is already active."
        );

        return;

    }


    const confirmed =
        confirm(
            `Approve loan ${loan.loanNumber || ""} for ${loan.clientName || "this client"}?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    const approvalDate =
        today();


    let schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    if (
        schedule.length ===
        0
    ) {

        schedule =
            generateRepaymentSchedule(
                approvalDate,
                Number(
                    loan.duration ||
                    0
                ),
                Number(
                    loan.weeklyPayment ||
                    loan.repayment ||
                    0
                ),
                Number(
                    loan.totalRepayment ||
                    0
                )
            );

    }


    await updateDoc(
        doc(
            db,
            "loans",
            loanId
        ),
        {

            status:
                "Active",

            approvalDate:
                approvalDate,

            repaymentSchedule:
                schedule,

            nextRepaymentDate:
                schedule[0]
                    ?.dueDate ||
                null,

            remainingInstallments:
                schedule.filter(
                    item =>
                        !item.paid
                ).length,

            updatedAt:
                serverTimestamp()

        }
    );


    await logHistory(
        "Loan Approved",
        "Loan",
        {

            loanId:
                loan.loanNumber ||
                loan.id,

            client:
                loan.clientName,

            amount:
                loan.amount

        }
    );


    /*
     * APPROVAL MESSAGE BUTTON
     */

    setTimeout(
        () => {

            if (
                typeof window.showApprovalMessageButton ===
                "function"
            ) {

                window.showApprovalMessageButton(
                    {

                        ...loan,

                        status:
                            "Active",

                        approvalDate:
                            approvalDate,

                        repaymentSchedule:
                            schedule

                    }
                );

            }

        },
        100
    );


    alert(
        "Loan approved successfully."
    );

}


// ==========================================
// END OF PART 4
// ==========================================// ==========================================
// LOAN ACTIONS
// ==========================================

async function rejectLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    const confirmed =
        confirm(
            `Reject loan ${loan.loanNumber || ""} for ${loan.clientName || "this client"}?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    await updateDoc(
        doc(
            db,
            "loans",
            loanId
        ),
        {

            status:
                "Rejected",

            updatedAt:
                serverTimestamp()

        }
    );


    await logHistory(
        "Loan Rejected",
        "Loan",
        {

            loanId:
                loan.loanNumber ||
                loan.id,

            client:
                loan.clientName,

            amount:
                loan.amount

        }
    );


    alert(
        "Loan rejected successfully."
    );

}


// ==========================================
// DELETE LOAN
// ==========================================

async function deleteLoan(
    loanId
) {

    if (
        !isAdmin()
    ) {

        alert(
            "Only administrators can delete loans."
        );

        return;

    }


    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete loan ${loan.loanNumber || ""} for ${loan.clientName || "this client"}?\n\nThis action cannot be undone.`
        );


    if (
        !confirmed
    ) {

        return;

    }


    await deleteDoc(
        doc(
            db,
            "loans",
            loanId
        )
    );


    await logHistory(
        "Loan Deleted",
        "Loan",
        {

            loanId:
                loan.loanNumber ||
                loan.id,

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

}


// ==========================================
// EDIT LOAN
// ==========================================

function openEditLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    const editModal =
        document.getElementById(
            "edit-loan-modal"
        );


    if (
        !editModal
    ) {

        alert(
            "Edit loan form is not available."
        );

        return;

    }


    const setValue =
        (
            id,
            value
        ) => {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.value =
                    value ??
                    "";

            }

        };


    setValue(
        "edit-loan-id",
        loan.id
    );


    setValue(
        "edit-loan-amount",
        loan.amount
    );


    setValue(
        "edit-loan-interest",
        loan.interest
    );


    setValue(
        "edit-loan-duration",
        loan.duration
    );


    setValue(
        "edit-loan-fee",
        loan.processingFee
    );


    setValue(
        "edit-loan-weekly",
        loan.weeklyPayment
    );


    setValue(
        "edit-loan-type",
        loan.loanType
    );


    editModal.classList.remove(
        "hidden"
    );

}


// ==========================================
// CLOSE EDIT LOAN
// ==========================================

function closeEditLoan() {

    const editModal =
        document.getElementById(
            "edit-loan-modal"
        );


    if (
        editModal
    ) {

        editModal.classList.add(
            "hidden"
        );

    }

}


// ==========================================
// SAVE EDITED LOAN
// ==========================================

async function saveEditedLoan(
    event
) {

    if (
        event
    ) {

        event.preventDefault();

    }


    const id =
        document.getElementById(
            "edit-loan-id"
        )?.value;


    if (
        !id
    ) {

        alert(
            "Loan ID is missing."
        );

        return;

    }


    const loan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (
        !loan
    ) {

        alert(
            "Loan not found."
        );

        return;

    }


    const amount =
        Number(
            document.getElementById(
                "edit-loan-amount"
            )?.value ||
            0
        );


    const interest =
        Number(
            document.getElementById(
                "edit-loan-interest"
            )?.value ||
            0
        );


    const duration =
        Number(
            document.getElementById(
                "edit-loan-duration"
            )?.value ||
            0
        );


    const processingFee =
        Number(
            document.getElementById(
                "edit-loan-fee"
            )?.value ||
            0
        );


    const loanType =
        document.getElementById(
            "edit-loan-type"
        )?.value ||
        loan.loanType ||
        "";


    if (
        amount <=
        0
    ) {

        alert(
            "Please enter a valid loan amount."
        );

        return;

    }


    if (
        duration <=
        0
    ) {

        alert(
            "Please enter a valid duration."
        );

        return;

    }


    /*
     * Recalculate financial values.
     */

    const calculated =
        calculateLoan(
            amount,
            interest,
            duration
        );


    const weeklyPayment =
        calculated.weeklyPayment;


    const totalRepayment =
        calculated.totalRepayment;


    const newBalance =
        Math.max(
            totalRepayment -
            Number(
                loan.amountPaid ||
                0
            ),
            0
        );


    const updatedFields = {

        amount:
            amount,

        interest:
            interest,

        duration:
            duration,

        processingFee:
            processingFee,

        loanType:
            loanType,

        weeklyPayment:
            weeklyPayment,

        repayment:
            weeklyPayment,

        totalRepayment:
            totalRepayment,

        balance:
            newBalance,

        updatedAt:
            serverTimestamp()

    };


    await updateDoc(
        doc(
            db,
            "loans",
            id
        ),
        updatedFields
    );


    await logHistory(
        "Loan Updated",
        "Loan",
        {

            loanId:
                loan.loanNumber ||
                loan.id,

            client:
                loan.clientName,

            amount:
                amount

        }
    );


    closeEditLoan();


    alert(
        "Loan updated successfully."
    );


    if (
        loanDetailsOpen &&
        selectedLoanId ===
            id
    ) {

        const updatedLoan = {

            ...loan,

            ...updatedFields

        };


        renderLoanDetailsPage(
            updatedLoan
        );

    }

}


// ==========================================
// EDIT LOAN FORM EVENT
// ==========================================

document
    .getElementById(
        "edit-loan-form"
    )
    ?.addEventListener(
        "submit",
        saveEditedLoan
    );


// ==========================================
// CLIENT LOAN HISTORY
// ==========================================

function getPreviousLoans(
    currentLoan
) {

    if (
        !currentLoan
    ) {

        return [];

    }


    const clientId =
        currentLoan.clientId;


    const clientName =
        (
            currentLoan.clientName ||
            ""
        )
            .trim()
            .toLowerCase();


    return loans
        .filter(
            loan => {

                if (
                    loan.id ===
                    currentLoan.id
                ) {

                    return false;

                }


                const sameClientId =
                    clientId &&
                    loan.clientId ===
                        clientId;


                const sameClientName =
                    !clientId &&
                    clientName &&
                    (
                        loan.clientName ||
                        ""
                    )
                        .trim()
                        .toLowerCase() ===
                    clientName;


                return (
                    sameClientId ||
                    sameClientName
                );

            }
        )
        .sort(
            (
                a,
                b
            ) => {

                const dateA =
                    new Date(
                        a.approvalDate ||
                        a.disbursementDate ||
                        ""
                    );


                const dateB =
                    new Date(
                        b.approvalDate ||
                        b.disbursementDate ||
                        ""
                    );


                return (
                    dateB -
                    dateA
                );

            }
        );

}


// ==========================================
// LOAN STATUS HELPERS
// ==========================================

function normalizeLoanStatus(
    status
) {

    const value =
        String(
            status ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        value ===
        "approved"
    ) {

        return "Approved";

    }


    if (
        value ===
        "active"
    ) {

        return "Active";

    }


    if (
        value ===
        "running"
    ) {

        return "Active";

    }


    if (
        value ===
        "completed"
    ) {

        return "Completed";

    }


    if (
        value ===
        "rejected"
    ) {

        return "Rejected";

    }


    if (
        value ===
        "pending"
    ) {

        return "Pending";

    }


    return (
        status ||
        ""
    );

}


// ==========================================
// RUNNING LOAN CHECK
// ==========================================

function isRunningLoan(
    loan
) {

    if (
        !loan
    ) {

        return false;

    }


    const status =
        normalizeLoanStatus(
            loan.status
        );


    /*
     * Active loans are the main running loans.
     *
     * Completed and rejected loans are not
     * displayed in the active loan table.
     */

    return (
        status ===
        "Active"
    );

}


// ==========================================
// ADMIN CHECK
// ==========================================

function isAdmin() {

    const role =
        (
            localStorage.getItem(
                "userRole"
            ) ||
            ""
        )
            .trim()
            .toLowerCase();


    const email =
        (
            localStorage.getItem(
                "userEmail"
            ) ||
            ""
        )
            .trim()
            .toLowerCase();


    return (
        role ===
            "admin" ||

        role ===
            "administrator" ||

        email ===
            "admin"
    );

}


// ==========================================
// ALL FILTER VALUE CHECK
// ==========================================

function isAllFilterValue(
    value
) {

    if (
        value ===
        undefined ||
        value ===
        null
    ) {

        return true;

    }


    const normalized =
        String(
            value
        )
            .trim()
            .toLowerCase();


    return (
        normalized ===
            "" ||

        normalized ===
            "all" ||

        normalized ===
            "all months" ||

        normalized ===
            "all years" ||

        normalized ===
            "all statuses"
    );

}


// ==========================================
// END OF PART 5
// ==========================================// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function currency(
    value
) {

    const amount =
        Number(
            value ||
            0
        );


    return (
        "KSh " +
        amount.toLocaleString(
            "en-KE",
            {
                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    2
            }
        )
    );

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(
    value
) {

    if (
        value ===
        null ||
        value ===
        undefined
    ) {

        return "";

    }


    return String(
        value
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
// TODAY
// ==========================================

function today() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() +
            1
        )
            .padStart(
                2,
                "0"
            );


    const day =
        String(
            date.getDate()
        )
            .padStart(
                2,
                "0"
            );


    return (
        `${year}-${month}-${day}`
    );

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(
    value
) {

    if (
        !value
    ) {

        return "-";

    }


    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleDateString(
        "en-KE",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"

        }
    );

}


// ==========================================
// FORMAT TIME
// ==========================================

function formatTime(
    value
) {

    if (
        !value
    ) {

        return "-";

    }


    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleTimeString(
        "en-KE",
        {

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit",

            hour12:
                false

        }
    );

}


// ==========================================
// ROUND TO NEAREST FIVE
// ==========================================

function roundToNearestFive(
    value
) {

    return (
        Math.round(
            Number(
                value ||
                0
            ) /
            5
        ) *
        5
    );

}


// ==========================================
// CALCULATE LOAN
// ==========================================

function calculateLoan(
    amount,
    interest,
    duration
) {

    const principal =
        Number(
            amount ||
            0
        );


    const rate =
        Number(
            interest ||
            0
        );


    const weeks =
        Number(
            duration ||
            0
        );


    /*
     * Interest is calculated on the
     * principal amount.
     */

    const interestAmount =
        principal *
        (
            rate /
            100
        );


    const totalRepayment =
        principal +
        interestAmount;


    /*
     * Weekly repayment is rounded
     * to the nearest KSh 5.
     */

    let weeklyPayment =
        weeks >
        0
            ? roundToNearestFive(
                totalRepayment /
                weeks
            )
            : 0;


    /*
     * Recalculate the total repayment
     * represented by the rounded weekly
     * payment.
     */

    let adjustedTotal =
        weeklyPayment *
        weeks;


    /*
     * Keep the calculated total repayment
     * when there is no duration.
     */

    if (
        weeks <=
        0
    ) {

        adjustedTotal =
            totalRepayment;

    }


    return {

        principal:
            principal,

        interest:
            interestAmount,

        interestRate:
            rate,

        duration:
            weeks,

        weeklyPayment:
            weeklyPayment,

        totalRepayment:
            adjustedTotal

    };

}


// ==========================================
// GENERATE REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(
    startDate,
    duration,
    weeklyPayment,
    totalRepayment = null
) {

    const weeks =
        Number(
            duration ||
            0
        );


    const weekly =
        Number(
            weeklyPayment ||
            0
        );


    if (
        weeks <=
        0
    ) {

        return [];

    }


    const schedule =
        [];


    let totalScheduled =
        0;


    for (
        let i = 1;
        i <= weeks;
        i++
    ) {

        const date =
            new Date(
                `${startDate}T00:00:00`
            );


        /*
         * Weekly repayment is due every
         * seven days.
         */

        date.setDate(
            date.getDate() +
            (
                i *
                7
            )
        );


        const dueDate =
            date.toISOString()
                .split("T")[0];


        let amount =
            weekly;


        /*
         * Adjust the final installment when
         * a precise total repayment is given.
         */

        if (
            i === weeks &&
            totalRepayment !==
                null &&
            Number(
                totalRepayment
            ) > 0
        ) {

            amount =
                Math.max(
                    Number(
                        totalRepayment
                    ) -
                    totalScheduled,
                    0
                );

        }


        totalScheduled +=
            amount;


        schedule.push({

            week:
                i,

            amount:
                amount,

            paidAmount:
                0,

            remainingAmount:
                amount,

            dueDate:
                dueDate,

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
// APPLY HISTORICAL PAYMENTS
// ==========================================

function applyHistoricalPayments(
    schedule,
    amountPaid
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return [];

    }


    let remaining =
        Number(
            amountPaid ||
            0
        );


    const result =
        schedule.map(
            item => {

                const installment = {

                    ...item,

                    paymentHistory:
                        Array.isArray(
                            item.paymentHistory
                        )
                            ? [
                                ...item.paymentHistory
                            ]
                            : []

                };


                const amount =
                    Number(
                        installment.amount ||
                        0
                    );


                if (
                    remaining <=
                    0
                ) {

                    installment.paidAmount =
                        Number(
                            installment.paidAmount ||
                            0
                        );


                    installment.remainingAmount =
                        Math.max(
                            amount -
                            installment.paidAmount,
                            0
                        );


                    installment.paid =
                        installment.remainingAmount <=
                        0;


                    installment.status =
                        installment.paid
                            ? "Paid"
                            : "Pending";


                    return installment;

                }


                const paid =
                    Math.min(
                        amount,
                        remaining
                    );


                installment.paidAmount =
                    paid;


                installment.remainingAmount =
                    Math.max(
                        amount -
                        paid,
                        0
                    );


                installment.paid =
                    installment.remainingAmount <=
                    0;


                installment.status =
                    installment.paid
                        ? "Paid"
                        : paid > 0
                            ? "Partial"
                            : "Pending";


                remaining -=
                    paid;


                return installment;

            }
        );


    return result;

}


// ==========================================
// SAFE FIRESTORE DATE
// ==========================================

function normalizeFirestoreDate(
    value
) {

    if (
        !value
    ) {

        return null;

    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();

    }


    if (
        value instanceof Date
    ) {

        return value;

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

}


// ==========================================
// NORMALIZE LOAN DATA
// ==========================================

function normalizeLoan(
    data,
    id
) {

    const loan =
        {

            ...data,

            id:
                id,

            amount:
                Number(
                    data.amount ||
                    0
                ),

            processingFee:
                Number(
                    data.processingFee ||
                    0
                ),

            interest:
                Number(
                    data.interest ||
                    0
                ),

            duration:
                Number(
                    data.duration ||
                    0
                ),

            repayment:
                Number(
                    data.repayment ||
                    data.weeklyPayment ||
                    0
                ),

            weeklyPayment:
                Number(
                    data.weeklyPayment ||
                    data.repayment ||
                    0
                ),

            totalRepayment:
                Number(
                    data.totalRepayment ||
                    0
                ),

            amountPaid:
                Number(
                    data.amountPaid ||
                    0
                ),

            balance:
                Number(
                    data.balance ||
                    0
                ),

            remainingInstallments:
                Number(
                    data.remainingInstallments ||
                    0
                ),

            paymentHistory:
                Array.isArray(
                    data.paymentHistory
                )
                    ? data.paymentHistory
                    : [],

            repaymentSchedule:
                Array.isArray(
                    data.repaymentSchedule
                )
                    ? data.repaymentSchedule
                    : []

        };


    /*
     * Make sure every schedule item has
     * the fields required by the repayment
     * system.
     */

    loan.repaymentSchedule =
        loan.repaymentSchedule.map(
            item => ({

                ...item,

                amount:
                    Number(
                        item.amount ||
                        0
                    ),

                paidAmount:
                    Number(
                        item.paidAmount ||
                        0
                    ),

                remainingAmount:
                    Number(
                        item.remainingAmount ??
                        Math.max(
                            Number(
                                item.amount ||
                                0
                            ) -
                            Number(
                                item.paidAmount ||
                                0
                            ),
                            0
                        )
                    ),

                paid:
                    Boolean(
                        item.paid
                    ),

                status:
                    item.status ||
                    (
                        item.paid
                            ? "Paid"
                            : "Pending"
                    ),

                paymentHistory:
                    Array.isArray(
                        item.paymentHistory
                    )
                        ? item.paymentHistory
                        : []

            })
        );


    return loan;

}


// ==========================================
// END OF PART 6
// ==========================================// ==========================================
// FIRESTORE LOAN LISTENER
// ==========================================

function startLoansListener() {

    if (
        loansUnsubscribe
    ) {

        loansUnsubscribe();

        loansUnsubscribe =
            null;

    }


    const loansRef =
        collection(
            db,
            "loans"
        );


    loansUnsubscribe =
        onSnapshot(
            loansRef,
            snapshot => {

                loans =
                    snapshot.docs.map(
                        loanDoc =>
                            normalizeLoan(
                                loanDoc.data(),
                                loanDoc.id
                            )
                    );


                /*
                 * Keep the newest loans first.
                 */

                loans.sort(
                    (
                        a,
                        b
                    ) => {

                        const dateA =
                            normalizeFirestoreDate(
                                a.createdAt ||
                                a.approvalDate ||
                                a.disbursementDate
                            );


                        const dateB =
                            normalizeFirestoreDate(
                                b.createdAt ||
                                b.approvalDate ||
                                b.disbursementDate
                            );


                        if (
                            !dateA &&
                            !dateB
                        ) {

                            return 0;

                        }


                        if (
                            !dateA
                        ) {

                            return 1;

                        }


                        if (
                            !dateB
                        ) {

                            return -1;

                        }


                        return (
                            dateB -
                            dateA
                        );

                    }
                );


                populateYearFilter();


                /*
                 * Do not destroy the loan details
                 * page while it is being viewed.
                 */

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


                    if (
                        selectedLoan
                    ) {

                        if (
                            previousLoansOpen &&
                            previousLoanSelectedId
                        ) {

                            const previousLoan =
                                loans.find(
                                    loan =>
                                        loan.id ===
                                        previousLoanSelectedId
                                );


                            if (
                                previousLoan
                            ) {

                                renderPreviousLoanDetails(
                                    previousLoan
                                );

                            }

                        } else {

                            renderLoanDetailsPage(
                                selectedLoan
                            );

                        }

                    }

                } else {

                    filterLoans();

                }


                /*
                 * Notify other modules that the loan
                 * collection has changed.
                 */

                document.dispatchEvent(
                    new CustomEvent(
                        "loansUpdated",
                        {
                            detail:
                                loans
                        }
                    )
                );


                /*
                 * Refresh dashboard information if
                 * the dashboard exposes its refresh
                 * function.
                 */

                if (
                    typeof window.refreshDashboard ===
                    "function"
                ) {

                    window.refreshDashboard(
                        loans
                    );

                }

            },

            error => {

                console.error(
                    "Loans listener error:",
                    error
                );


                if (
                    loansTableBody
                ) {

                    loansTableBody.innerHTML = `

                        <tr>

                            <td
                                colspan="15"
                                style="
                                    text-align:center;
                                    padding:20px;
                                "
                            >

                                Unable to load loans.

                            </td>

                        </tr>

                    `;

                }

            }
        );

}


// ==========================================
// START LISTENER
// ==========================================

startLoansListener();


// ==========================================
// CLEAN UP LISTENER
// ==========================================

window.addEventListener(
    "beforeunload",
    () => {

        if (
            loansUnsubscribe
        ) {

            loansUnsubscribe();

            loansUnsubscribe =
                null;

        }

    }
);


// ==========================================
// LOAN FORM ELEMENTS
// ==========================================

const loanForm =
    document.getElementById(
        "loan-form"
    );


const loanModal =
    document.getElementById(
        "loan-modal"
    );


const closeLoanModalButton =
    document.getElementById(
        "close-loan-modal"
    );


const cancelLoanButton =
    document.getElementById(
        "cancel-loan"
    );


const loanClient =
    document.getElementById(
        "loan-client"
    );


const loanAmount =
    document.getElementById(
        "loan-amount"
    );


const loanInterest =
    document.getElementById(
        "loan-interest"
    );


const loanDuration =
    document.getElementById(
        "loan-duration"
    );


const loanProcessingFee =
    document.getElementById(
        "loan-processing-fee"
    );


const loanType =
    document.getElementById(
        "loan-type"
    );


const loanSecurity =
    document.getElementById(
        "loan-security"
    );


const loanGuarantor =
    document.getElementById(
        "loan-guarantor"
    );


const loanGuarantorPhone =
    document.getElementById(
        "loan-guarantor-phone"
    );


// ==========================================
// OPEN NEW LOAN MODAL
// ==========================================

function openLoanModal() {

    if (
        !loanModal
    ) {

        return;

    }


    if (
        loanForm
    ) {

        loanForm.reset();

    }


    populateClientDropdown();


    /*
     * Load default settings.
     */

    const defaultInterest =
        Number(
            localStorage.getItem(
                "defaultInterest"
            ) ||
            0
        );


    const defaultDuration =
        Number(
            localStorage.getItem(
                "defaultDuration"
            ) ||
            0
        );


    const defaultFee =
        Number(
            localStorage.getItem(
                "defaultFee"
            ) ||
            0
        );


    if (
        loanInterest &&
        defaultInterest > 0
    ) {

        loanInterest.value =
            defaultInterest;

    }


    if (
        loanDuration &&
        defaultDuration > 0
    ) {

        loanDuration.value =
            defaultDuration;

    }


    if (
        loanProcessingFee
    ) {

        loanProcessingFee.value =
            defaultFee;

    }


    loanModal.classList.remove(
        "hidden"
    );

}


// ==========================================
// CLOSE NEW LOAN MODAL
// ==========================================

function closeLoanModal() {

    if (
        loanModal
    ) {

        loanModal.classList.add(
            "hidden"
        );

    }

}


// ==========================================
// NEW LOAN BUTTONS
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#add-loan-btn, #new-loan-btn"
            );


        if (
            !button
        ) {

            return;

        }


        openLoanModal();

    }
);


closeLoanModalButton?.addEventListener(
    "click",
    closeLoanModal
);


cancelLoanButton?.addEventListener(
    "click",
    closeLoanModal
);


// ==========================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ==========================================

loanModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            loanModal
        ) {

            closeLoanModal();

        }

    }
);


// ==========================================
// CLIENT DROPDOWN
// ==========================================

function populateClientDropdown() {

    if (
        !loanClient
    ) {

        return;

    }


    const currentValue =
        loanClient.value;


    loanClient.innerHTML = `

        <option value="">
            Select Client
        </option>

    `;


    clients
        .slice()
        .sort(
            (
                a,
                b
            ) =>
                (
                    a.name ||
                    ""
                ).localeCompare(
                    b.name ||
                    ""
                )
        )
        .forEach(
            client => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    client.id;


                option.textContent =
                    client.name ||
                    "Unnamed Client";


                loanClient.appendChild(
                    option
                );

            }
        );


    if (
        currentValue
    ) {

        loanClient.value =
            currentValue;

    }

}


// ==========================================
// AUTO CALCULATE LOAN
// ==========================================

function updateLoanCalculation() {

    const amount =
        Number(
            loanAmount?.value ||
            0
        );


    const interest =
        Number(
            loanInterest?.value ||
            0
        );


    const duration =
        Number(
            loanDuration?.value ||
            0
        );


    if (
        amount <=
        0 ||
        duration <=
        0
    ) {

        return;

    }


    const calculated =
        calculateLoan(
            amount,
            interest,
            duration
        );


    const weeklyElement =
        document.getElementById(
            "loan-weekly-repayment"
        );


    const totalElement =
        document.getElementById(
            "loan-total-repayment"
        );


    if (
        weeklyElement
    ) {

        weeklyElement.value =
            calculated.weeklyPayment;

    }


    if (
        totalElement
    ) {

        totalElement.value =
            calculated.totalRepayment;

    }


    /*
     * Support text-only calculation displays.
     */

    const weeklyText =
        document.getElementById(
            "loan-weekly-display"
        );


    const totalText =
        document.getElementById(
            "loan-total-display"
        );


    if (
        weeklyText
    ) {

        weeklyText.textContent =
            currency(
                calculated.weeklyPayment
            );

    }


    if (
        totalText
    ) {

        totalText.textContent =
            currency(
                calculated.totalRepayment
            );

    }

}


loanAmount?.addEventListener(
    "input",
    updateLoanCalculation
);


loanInterest?.addEventListener(
    "input",
    updateLoanCalculation
);


loanDuration?.addEventListener(
    "input",
    updateLoanCalculation
);


// ==========================================
// CREATE LOAN
// ==========================================

loanForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        try {

            await createLoan();

        } catch (
            error
        ) {

            console.error(
                "Create loan error:",
                error
            );


            alert(
                error.message ||
                "Unable to create loan."
            );

        }

    }
);


// ==========================================
// CREATE NEW LOAN
// ==========================================

async function createLoan() {

    const clientId =
        loanClient?.value;


    if (
        !clientId
    ) {

        throw new Error(
            "Please select a client."
        );

    }


    const client =
        clients.find(
            item =>
                item.id ===
                clientId
        );


    if (
        !client
    ) {

        throw new Error(
            "Selected client could not be found."
        );

    }


    const amount =
        Number(
            loanAmount?.value ||
            0
        );


    const interest =
        Number(
            loanInterest?.value ||
            0
        );


    const duration =
        Number(
            loanDuration?.value ||
            0
        );


    const processingFee =
        Number(
            loanProcessingFee?.value ||
            0
        );


    if (
        amount <=
        0
    ) {

        throw new Error(
            "Please enter a valid loan amount."
        );

    }


    if (
        duration <=
        0
    ) {

        throw new Error(
            "Please enter a valid loan duration."
        );

    }


    const loanTypeValue =
        loanType?.value ||
        "Standard";


    const securityValue =
        loanSecurity?.value ||
        "";


    const guarantorValue =
        loanGuarantor?.value ||
        "";


    const guarantorPhoneValue =
        loanGuarantorPhone?.value ||
        "";


    const calculated =
        calculateLoan(
            amount,
            interest,
            duration
        );


    const loanNumber =
        generateLoanNumber();


    const creationDate =
        today();


    const schedule =
        generateRepaymentSchedule(
            creationDate,
            duration,
            calculated.weeklyPayment,
            calculated.totalRepayment
        );


    const loanData = {

        clientId:
            clientId,

        clientName:
            client.name ||
            "",

        clientPhone:
            client.phone ||
            "",

        loanNumber:
            loanNumber,

        loanType:
            loanTypeValue,

        amount:
            amount,

        processingFee:
            processingFee,

        interest:
            interest,

        duration:
            duration,

        repayment:
            calculated.weeklyPayment,

        weeklyPayment:
            calculated.weeklyPayment,

        totalRepayment:
            calculated.totalRepayment,

        balance:
            calculated.totalRepayment,

        totalIncome:
            calculated.totalRepayment -
            amount,

        openingBalance:
            calculated.totalRepayment,

        amountPaid:
            0,

        approvalDate:
            null,

        dueDate:
            schedule.length
                ? schedule[
                    schedule.length -
                    1
                ].dueDate
                : null,

        repaymentSchedule:
            schedule,

        nextRepaymentDate:
            schedule[0]
                ?.dueDate ||
            null,

        remainingInstallments:
            schedule.length,

        status:
            "Pending",

        completed:
            false,

        security:
            securityValue,

        guarantor:
            guarantorValue,

        guarantorPhone:
            guarantorPhoneValue,

        paymentHistory:
            [],

        createdBy:
            localStorage.getItem(
                "userEmail"
            ) ||
            localStorage.getItem(
                "userName"
            ) ||
            "Unknown User",

        createdAt:
            serverTimestamp(),

        updatedAt:
            serverTimestamp()

    };


    const loanRef =
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
                loanNumber,

            client:
                client.name,

            amount:
                amount

        }
    );


    closeLoanModal();


    alert(
        `Loan ${loanNumber} created successfully.`
    );


    return loanRef.id;

}


// ==========================================
// GENERATE LOAN NUMBER
// ==========================================

function generateLoanNumber() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() +
            1
        )
            .padStart(
                2,
                "0"
            );


    const day =
        String(
            now.getDate()
        )
            .padStart(
                2,
                "0"
            );


    const random =
        Math.floor(
            1000 +
            Math.random() *
            9000
        );


    return (
        `GR-${year}${month}${day}-${random}`
    );

}


// ==========================================
// END OF PART 7
// ==========================================// ==========================================
// LOAN FILTERING
// ==========================================

function filterLoans() {

    const searchValue =
        (
            document.getElementById(
                "loan-search"
            )?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const statusValue =
        document.getElementById(
            "loan-status-filter"
        )?.value ||
        "all";


    const monthValue =
        document.getElementById(
            "loan-month-filter"
        )?.value ||
        "all";


    const yearValue =
        document.getElementById(
            "loan-year-filter"
        )?.value ||
        "all";


    let filtered =
        [...loans];


    // --------------------------------------
    // SEARCH
    // --------------------------------------

    if (
        searchValue
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const searchable =
                        [

                            loan.clientName,

                            loan.clientPhone,

                            loan.loanNumber,

                            loan.loanType,

                            loan.status

                        ]
                            .filter(
                                value =>
                                    value !==
                                    undefined &&
                                    value !==
                                    null
                            )
                            .join(" ")
                            .toLowerCase();


                    return searchable.includes(
                        searchValue
                    );

                }
            );

    }


    // --------------------------------------
    // STATUS
    // --------------------------------------

    if (
        !isAllFilterValue(
            statusValue
        )
    ) {

        const wantedStatus =
            normalizeLoanStatus(
                statusValue
            );


        filtered =
            filtered.filter(
                loan =>
                    normalizeLoanStatus(
                        loan.status
                    ) ===
                    wantedStatus
            );

    }


    // --------------------------------------
    // MONTH / YEAR
    // --------------------------------------

    filtered =
        filtered.filter(
            loan => {

                const dateValue =
                    loan.approvalDate ||
                    loan.createdAt ||
                    loan.disbursementDate;


                if (
                    isAllFilterValue(
                        monthValue
                    ) &&
                    isAllFilterValue(
                        yearValue
                    )
                ) {

                    return true;

                }


                const date =
                    normalizeFirestoreDate(
                        dateValue
                    );


                if (
                    !date
                ) {

                    return false;

                }


                if (
                    !isAllFilterValue(
                        yearValue
                    )
                ) {

                    if (
                        String(
                            date.getFullYear()
                        ) !==
                        String(
                            yearValue
                        )
                    ) {

                        return false;

                    }

                }


                if (
                    !isAllFilterValue(
                        monthValue
                    )
                ) {

                    const month =
                        String(
                            date.getMonth() +
                            1
                        )
                            .padStart(
                                2,
                                "0"
                            );


                    if (
                        month !==
                        String(
                            monthValue
                        )
                            .padStart(
                                2,
                                "0"
                            )
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    renderLoansTable(
        filtered
    );

}


// ==========================================
// SEARCH / FILTER EVENTS
// ==========================================

document.addEventListener(
    "input",
    event => {

        if (
            event.target.matches(
                "#loan-search"
            )
        ) {

            filterLoans();

        }

    }
);


document.addEventListener(
    "change",
    event => {

        if (
            event.target.matches(
                "#loan-status-filter, #loan-month-filter, #loan-year-filter"
            )
        ) {

            filterLoans();

        }

    }
);


// ==========================================
// RENDER LOANS TABLE
// ==========================================

function renderLoansTable(
    list
) {

    if (
        !loansTableBody
    ) {

        return;

    }


    if (
        !Array.isArray(
            list
        ) ||
        list.length ===
        0
    ) {

        loansTableBody.innerHTML = `

            <tr>

                <td
                    colspan="15"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >

                    No loans found.

                </td>

            </tr>

        `;

        return;

    }


    loansTableBody.innerHTML =
        list
            .map(
                loan =>
                    createLoanRow(
                        loan
                    )
            )
            .join("");


    /*
     * Attach row click handlers.
     *
     * The message buttons stop propagation
     * so clicking Message does not open the
     * loan details page.
     */

    loansTableBody
        .querySelectorAll(
            "[data-loan-row]"
        )
        .forEach(
            row => {

                row.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target.closest(
                                "button"
                            ) ||
                            event.target.closest(
                                "a"
                            )
                        ) {

                            return;

                        }


                        const id =
                            row.dataset.loanRow;


                        if (
                            id
                        ) {

                            openLoanDetails(
                                id
                            );

                        }

                    }
                );

            }
        );


    /*
     * Message buttons
     */

    loansTableBody
        .querySelectorAll(
            "[data-message-loan]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const id =
                            button.dataset.messageLoan;


                        const type =
                            button.dataset.messageType ||
                            "general";


                        messageLoan(
                            id,
                            type
                        );

                    }
                );

            }
        );

}


// ==========================================
// CREATE LOAN TABLE ROW
// ==========================================

function createLoanRow(
    loan
) {

    const status =
        normalizeLoanStatus(
            loan.status
        );


    const amount =
        Number(
            loan.amount ||
            0
        );


    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );


    const amountPaid =
        Number(
            loan.amountPaid ||
            0
        );


    const balance =
        Number(
            loan.balance ||
            0
        );


    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    /*
     * Message button is displayed according
     * to the current loan status.
     */

    let messageType =
        "general";


    if (
        status ===
        "Approved"
    ) {

        messageType =
            "approval";

    } else if (
        status ===
        "Active"
    ) {

        messageType =
            "general";

    } else if (
        status ===
        "Completed"
    ) {

        messageType =
            "completed";

    }


    return `

        <tr
            data-loan-row="${escapeHtml(
                loan.id
            )}"
            class="loan-table-row"
        >

            <td>

                <strong>
                    ${escapeHtml(
                        loan.loanNumber ||
                        "-"
                    )}
                </strong>

            </td>


            <td>

                <div
                    class="loan-client-cell"
                >

                    <div
                        class="loan-mini-avatar"
                    >

                        ${escapeHtml(
                            (
                                loan.clientName?.[0] ||
                                "C"
                            ).toUpperCase()
                        )}

                    </div>


                    <div>

                        <strong>
                            ${escapeHtml(
                                loan.clientName ||
                                "-"
                            )}
                        </strong>


                        <small>
                            ${escapeHtml(
                                loan.clientPhone ||
                                ""
                            )}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                ${currency(
                    amount
                )}
            </td>


            <td>
                ${loan.interest || 0}%
            </td>


            <td>
                ${currency(
                    loan.weeklyPayment
                )}
            </td>


            <td>
                ${currency(
                    totalRepayment
                )}
            </td>


            <td>
                ${currency(
                    amountPaid
                )}
            </td>


            <td>
                ${currency(
                    balance
                )}
            </td>


            <td>
                ${escapeHtml(
                    formatDate(
                        loan.nextRepaymentDate
                    )
                )}
            </td>


            <td>

                <span
                    class="
                        loan-status-badge
                        ${statusClass}
                    "
                >

                    ${escapeHtml(
                        status ||
                        "-"
                    )}

                </span>

            </td>


            <td>

                <div
                    class="loan-row-actions"
                >

                    <button
                        type="button"
                        class="loan-message-button"
                        data-message-loan="${escapeHtml(
                            loan.id
                        )}"
                        data-message-type="${escapeHtml(
                            messageType
                        )}"
                        title="Message client"
                    >

                        Message

                    </button>

                </div>

            </td>

        </tr>

    `;

}


// ==========================================
// YEAR FILTER
// ==========================================

function populateYearFilter() {

    const select =
        document.getElementById(
            "loan-year-filter"
        );


    if (
        !select
    ) {

        return;

    }


    const currentValue =
        select.value;


    const years =
        new Set();


    loans.forEach(
        loan => {

            const date =
                normalizeFirestoreDate(
                    loan.approvalDate ||
                    loan.createdAt ||
                    loan.disbursementDate
                );


            if (
                date
            ) {

                years.add(
                    date.getFullYear()
                );

            }

        }
    );


    const sortedYears =
        Array.from(
            years
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    b -
                    a
            );


    select.innerHTML = `

        <option value="all">
            All Years
        </option>

        ${sortedYears
            .map(
                year => `

                    <option
                        value="${year}"
                    >
                        ${year}
                    </option>

                `
            )
            .join("")}

    `;


    if (
        currentValue &&
        (
            currentValue ===
            "all" ||
            sortedYears.includes(
                Number(
                    currentValue
                )
            )
        )
    ) {

        select.value =
            currentValue;

    }

}


// ==========================================
// MONTH FILTER SETUP
// ==========================================

function setupMonthFilter() {

    const select =
        document.getElementById(
            "loan-month-filter"
        );


    if (
        !select ||
        select.children.length >
        1
    ) {

        return;

    }


    const months = [

        "January",

        "February",

        "March",

        "April",

        "May",

        "June",

        "July",

        "August",

        "September",

        "October",

        "November",

        "December"

    ];


    months.forEach(
        (
            month,
            index
        ) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(
                    index +
                    1
                )
                    .padStart(
                        2,
                        "0"
                    );


            option.textContent =
                month;


            select.appendChild(
                option
            );

        }
    );

}


setupMonthFilter();


// ==========================================
// CLIENT DROPDOWN REFRESH
// ==========================================

document.addEventListener(
    "clientsUpdated",
    () => {

        populateClientDropdown();

        populateFabClientSelector();

    }
);


// ==========================================
// LOAN DETAILS PAGE CLOSE
// ==========================================

function closeLoanDetailsPage() {

    selectedLoanId =
        null;


    previousLoanSelectedId =
        null;


    loanDetailsOpen =
        false;


    previousLoansOpen =
        false;


    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (
        page
    ) {

        page.classList.add(
            "hidden"
        );


        page.innerHTML =
            "";

    }


    filterLoans();

}


// ==========================================
// ESC KEY
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        if (
            loanDetailsOpen
        ) {

            closeLoanDetailsPage();

            return;

        }


        if (
            repaymentModal &&
            !repaymentModal.classList.contains(
                "hidden"
            )
        ) {

            closeRepaymentModal();

            return;

        }


        if (
            loanModal &&
            !loanModal.classList.contains(
                "hidden"
            )
        ) {

            closeLoanModal();

        }

    }
);


// ==========================================
// EXPOSE FUNCTIONS GLOBALLY
// ==========================================

window.openLoanModal =
    openLoanModal;


window.closeLoanModal =
    closeLoanModal;


window.openRepaymentModal =
    openRepaymentModal;


window.closeRepaymentModal =
    closeRepaymentModal;


window.openRepaymentForLoan =
    openRepaymentForLoan;


window.openLoanDetails =
    openLoanDetails;


window.closeLoanDetailsPage =
    closeLoanDetailsPage;


window.openPreviousLoans =
    openPreviousLoans;


window.openPreviousLoan =
    openPreviousLoan;


window.messageLoan =
    messageLoan;


window.messageRepayment =
    messageRepayment;


window.messageApproval =
    messageApproval;


window.messageDueToday =
    messageDueToday;


window.messageArrears =
    messageArrears;


window.approveLoan =
    approveLoan;


window.rejectLoan =
    rejectLoan;


window.deleteLoan =
    deleteLoan;


window.openEditLoan =
    openEditLoan;


window.closeEditLoan =
    closeEditLoan;


window.saveEditedLoan =
    saveEditedLoan;


window.filterLoans =
    filterLoans;


window.currency =
    currency;


window.formatDate =
    formatDate;


window.formatTime =
    formatTime;


window.normalizeLoanStatus =
    normalizeLoanStatus;


window.calculateLoan =
    calculateLoan;


window.generateRepaymentSchedule =
    generateRepaymentSchedule;


// ==========================================
// INITIAL FILTER RENDER
// ==========================================

setTimeout(
    () => {

        populateClientDropdown();

        populateFabClientSelector();

        populateYearFilter();

        filterLoans();

    },
    0
);


// ==========================================
// END OF PART 8
// ==========================================// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// PART 9 / 9
// ==========================================


// ==========================================
// FINAL SAFETY / COMPATIBILITY HELPERS
// ==========================================

/*
 * Some existing versions of the app may already
 * define these functions. The checks below prevent
 * duplicate-definition problems from breaking the
 * loans module.
 */


if (
    typeof window.refreshLoans ===
    "undefined"
) {

    window.refreshLoans =
        function () {

            if (
                typeof filterLoans ===
                "function"
            ) {

                filterLoans();

            }

        };

}


// ==========================================
// REFRESH LOANS FROM CURRENT DATA
// ==========================================

function refreshLoansDisplay() {

    try {

        if (
            typeof populateYearFilter ===
            "function"
        ) {

            populateYearFilter();

        }


        if (
            typeof filterLoans ===
            "function"
        ) {

            filterLoans();

        }

    } catch (
        error
    ) {

        console.error(
            "Unable to refresh loans display:",
            error
        );

    }

}


window.refreshLoansDisplay =
    refreshLoansDisplay;


// ==========================================
// LOAN DETAILS NAVIGATION
// ==========================================

function navigateToLoanDetails(
    loanId
) {

    if (
        !loanId
    ) {

        return;

    }


    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (
        !loan
    ) {

        return;

    }


    openLoanDetails(
        loanId
    );

}


window.navigateToLoanDetails =
    navigateToLoanDetails;


// ==========================================
// LOAN STATUS DISPLAY
// ==========================================

function getLoanStatusClass(
    status
) {

    const normalized =
        normalizeLoanStatus(
            status
        );


    switch (
        normalized
    ) {

        case "Active":

            return "active";

        case "Approved":

            return "approved";

        case "Pending":

            return "pending";

        case "Completed":

            return "completed";

        case "Rejected":

            return "rejected";

        default:

            return "unknown";

    }

}


window.getLoanStatusClass =
    getLoanStatusClass;


// ==========================================
// OUTSTANDING BALANCE
// ==========================================

function getLoanOutstandingBalance(
    loan
) {

    if (
        !loan
    ) {

        return 0;

    }


    /*
     * The balance stored on the loan remains
     * the primary source.
     */

    if (
        loan.balance !==
        undefined &&
        loan.balance !==
        null
    ) {

        return Math.max(
            Number(
                loan.balance
            ) || 0,
            0
        );

    }


    return Math.max(

        Number(
            loan.totalRepayment ||
            0
        ) -

        Number(
            loan.amountPaid ||
            0
        ),

        0

    );

}


window.getLoanOutstandingBalance =
    getLoanOutstandingBalance;


// ==========================================
// OUTSTANDING INTEREST
// ==========================================

function getLoanOutstandingInterest(
    loan
) {

    if (
        !loan
    ) {

        return 0;

    }


    const totalInterest =
        Math.max(

            Number(
                loan.totalRepayment ||
                0
            ) -

            Number(
                loan.amount ||
                0
            ),

            0

        );


    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );


    const amountPaid =
        Number(
            loan.amountPaid ||
            0
        );


    if (
        totalRepayment <=
        0
    ) {

        return 0;

    }


    /*
     * Payments are applied against the
     * repayment obligation first.
     *
     * This provides a safe outstanding
     * interest figure for display.
     */

    const outstanding =
        Math.max(

            totalInterest -

            Math.max(
                amountPaid -
                Number(
                    loan.amount ||
                    0
                ),
                0
            ),

            0

        );


    return outstanding;

}


window.getLoanOutstandingInterest =
    getLoanOutstandingInterest;


// ==========================================
// OUTSTANDING PRINCIPAL
// ==========================================

function getLoanOutstandingPrincipal(
    loan
) {

    if (
        !loan
    ) {

        return 0;

    }


    const principal =
        Number(
            loan.amount ||
            0
        );


    const amountPaid =
        Number(
            loan.amountPaid ||
            0
        );


    return Math.max(

        principal -
        Math.min(
            amountPaid,
            principal
        ),

        0

    );

}


window.getLoanOutstandingPrincipal =
    getLoanOutstandingPrincipal;


// ==========================================
// NEXT DUE INSTALLMENT
// ==========================================

function getNextDueInstallment(
    loan
) {

    if (
        !loan ||
        !Array.isArray(
            loan.repaymentSchedule
        )
    ) {

        return null;

    }


    return (
        loan.repaymentSchedule.find(
            installment =>
                !installment.paid &&
                Number(
                    installment.remainingAmount ??
                    installment.amount ??
                    0
                ) > 0
        ) ||
        null
    );

}


window.getNextDueInstallment =
    getNextDueInstallment;


// ==========================================
// DUE TODAY
// ==========================================

function isLoanDueToday(
    loan
) {

    if (
        !loan
    ) {

        return false;

    }


    const todayValue =
        today();


    const next =
        getNextDueInstallment(
            loan
        );


    if (
        next &&
        next.dueDate ===
            todayValue
    ) {

        return true;

    }


    return (
        loan.nextRepaymentDate ===
        todayValue
    );

}


window.isLoanDueToday =
    isLoanDueToday;


// ==========================================
// ARREARS CHECK
// ==========================================

function isLoanInArrears(
    loan
) {

    if (
        !loan
    ) {

        return false;

    }


    if (
        normalizeLoanStatus(
            loan.status
        ) !==
        "Active"
    ) {

        return false;

    }


    const todayDate =
        new Date(
            `${today()}T00:00:00`
        );


    const next =
        getNextDueInstallment(
            loan
        );


    if (
        next
    ) {

        const dueDate =
            new Date(
                `${next.dueDate}T00:00:00`
            );


        return (
            dueDate <
            todayDate
        );

    }


    /*
     * If the schedule is unavailable,
     * use nextRepaymentDate.
     */

    if (
        loan.nextRepaymentDate
    ) {

        const dueDate =
            new Date(
                `${loan.nextRepaymentDate}T00:00:00`
            );


        return (
            dueDate <
            todayDate
        );

    }


    return false;

}


window.isLoanInArrears =
    isLoanInArrears;


// ==========================================
// DUE AMOUNT
// ==========================================

function getLoanDueAmount(
    loan
) {

    const installment =
        getNextDueInstallment(
            loan
        );


    if (
        !installment
    ) {

        return 0;

    }


    return Math.max(

        Number(
            installment.remainingAmount ??
            installment.amount ??
            0
        ),

        0

    );

}


window.getLoanDueAmount =
    getLoanDueAmount;


// ==========================================
// ARREARS AMOUNT
// ==========================================

function getLoanArrearsAmount(
    loan
) {

    if (
        !loan ||
        !Array.isArray(
            loan.repaymentSchedule
        )
    ) {

        return 0;

    }


    const todayDate =
        new Date(
            `${today()}T00:00:00`
        );


    let arrears =
        0;


    loan.repaymentSchedule.forEach(
        installment => {

            if (
                installment.paid
            ) {

                return;

            }


            if (
                !installment.dueDate
            ) {

                return;

            }


            const dueDate =
                new Date(
                    `${installment.dueDate}T00:00:00`
                );


            if (
                dueDate <
                todayDate
            ) {

                arrears +=
                    Number(
                        installment.remainingAmount ??
                        installment.amount ??
                        0
                    );

            }

        }
    );


    return Math.max(
        arrears,
        0
    );

}


window.getLoanArrearsAmount =
    getLoanArrearsAmount;


// ==========================================
// MESSAGE DATA BUILDER
// ==========================================

/*
 * messages.js can use this function to get
 * all the financial information required to
 * generate a client message.
 *
 * No API is used here.
 */

function getLoanMessageData(
    loan
) {

    if (
        !loan
    ) {

        return null;

    }


    const nextInstallment =
        getNextDueInstallment(
            loan
        );


    return {

        loanId:
            loan.id,

        loanNumber:
            loan.loanNumber ||
            "",

        clientName:
            loan.clientName ||
            "",

        clientPhone:
            loan.clientPhone ||
            "",

        loanAmount:
            Number(
                loan.amount ||
                0
            ),

        weeklyRepayment:
            Number(
                loan.weeklyPayment ||
                loan.repayment ||
                0
            ),

        totalRepayment:
            Number(
                loan.totalRepayment ||
                0
            ),

        amountPaid:
            Number(
                loan.amountPaid ||
                0
            ),

        outstandingBalance:
            getLoanOutstandingBalance(
                loan
            ),

        outstandingPrincipal:
            getLoanOutstandingPrincipal(
                loan
            ),

        outstandingInterest:
            getLoanOutstandingInterest(
                loan
            ),

        dueAmount:
            getLoanDueAmount(
                loan
            ),

        arrearsAmount:
            getLoanArrearsAmount(
                loan
            ),

        dueDate:
            nextInstallment?.dueDate ||
            loan.nextRepaymentDate ||
            "",

        status:
            normalizeLoanStatus(
                loan.status
            ),

        interest:
            Number(
                loan.interest ||
                0
            ),

        duration:
            Number(
                loan.duration ||
                0
            ),

        loanType:
            loan.loanType ||
            ""

    };

}


window.getLoanMessageData =
    getLoanMessageData;


// ==========================================
// MESSAGE BUTTON HTML HELPER
// ==========================================

function loanMessageButton(
    loan,
    type = "general",
    label = "Message"
) {

    if (
        !loan
    ) {

        return "";

    }


    return `

        <button
            type="button"
            class="loan-message-button"
            data-message-loan="${escapeHtml(
                loan.id
            )}"
            data-message-type="${escapeHtml(
                type
            )}"
            onclick="
                event.stopPropagation();
                messageLoan(
                    '${escapeHtml(
                        loan.id
                    )}',
                    '${escapeHtml(
                        type
                    )}'
                );
            "
        >

            ${escapeHtml(
                label
            )}

        </button>

    `;

}


window.loanMessageButton =
    loanMessageButton;


// ==========================================
// APPROVAL MESSAGE BUTTON
// ==========================================

function approvalMessageButton(
    loan
) {

    return loanMessageButton(
        loan,
        "approval",
        "Message"
    );

}


window.approvalMessageButton =
    approvalMessageButton;


// ==========================================
// DUE TODAY MESSAGE BUTTON
// ==========================================

function dueTodayMessageButton(
    loan
) {

    return loanMessageButton(
        loan,
        "due",
        "Message"
    );

}


window.dueTodayMessageButton =
    dueTodayMessageButton;


// ==========================================
// ARREARS MESSAGE BUTTON
// ==========================================

function arrearsMessageButton(
    loan
) {

    return loanMessageButton(
        loan,
        "arrears",
        "Message"
    );

}


window.arrearsMessageButton =
    arrearsMessageButton;


// ==========================================
// REPAYMENT MESSAGE BUTTON
// ==========================================

function repaymentMessageButton(
    loan
) {

    return loanMessageButton(
        loan,
        "repayment",
        "Message"
    );

}


window.repaymentMessageButton =
    repaymentMessageButton;


// ==========================================
// COMPLETED LOAN MESSAGE BUTTON
// ==========================================

function completedMessageButton(
    loan
) {

    return loanMessageButton(
        loan,
        "completed",
        "Message"
    );

}


window.completedMessageButton =
    completedMessageButton;


// ==========================================
// SAFE CLIENT LOOKUP
// ==========================================

function getLoanClient(
    loan
) {

    if (
        !loan
    ) {

        return null;

    }


    if (
        loan.clientId
    ) {

        const client =
            clients.find(
                item =>
                    item.id ===
                    loan.clientId
            );


        if (
            client
        ) {

            return client;

        }

    }


    const name =
        (
            loan.clientName ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        !name
    ) {

        return null;

    }


    return (
        clients.find(
            client =>
                (
                    client.name ||
                    ""
                )
                    .trim()
                    .toLowerCase() ===
                name
        ) ||
        null
    );

}


window.getLoanClient =
    getLoanClient;


// ==========================================
// CLEANUP
// ==========================================

function cleanupLoansModule() {

    if (
        loansUnsubscribe
    ) {

        loansUnsubscribe();

        loansUnsubscribe =
            null;

    }


    selectedLoanId =
        null;


    previousLoanSelectedId =
        null;


    loanDetailsOpen =
        false;


    previousLoansOpen =
        false;


    directLoanRepaymentMode =
        false;

}


window.cleanupLoansModule =
    cleanupLoansModule;


// ==========================================
// FINAL INITIALIZATION
// ==========================================

try {

    populateClientDropdown();

} catch (
    error
) {

    console.warn(
        "Client dropdown initialization skipped:",
        error
    );

}


try {

    populateFabClientSelector();

} catch (
    error
) {

    console.warn(
        "Repayment client initialization skipped:",
        error
    );

}


try {

    setupMonthFilter();

} catch (
    error
) {

    console.warn(
        "Month filter initialization skipped:",
        error
    );

}


// ==========================================
// GREYMUS LOANS MODULE READY
// ==========================================

console.log(
    "GREYMUS Loans module ready."
);


// ==========================================
// END OF loans.js — PART 9 / 9
// ==========================================