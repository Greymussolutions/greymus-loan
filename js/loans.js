// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 1/16
// CORE IMPORTS, STATE, DOM SELECTORS & BASIC HELPERS
// ==========================================================


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
    db
} from "./firebase.js";

import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================================
// GLOBAL LOAN STATE
// ==========================================================

let loans = [];

let clients = [];

let loanDetailsOpen =
    false;

let previousLoansOpen =
    false;

let selectedLoanId =
    null;

let directLoanRepaymentMode =
    false;

let repaymentSaving =
    false;

let repaymentSubmissionStarted =
    false;


// ==========================================================
// DOM SELECTORS
// ==========================================================

// Loan form

const loanForm =
    document.getElementById(
        "loan-form"
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

const loanWeeklyPayment =
    document.getElementById(
        "loan-weekly-payment"
    );

const loanTotalRepayment =
    document.getElementById(
        "loan-total-repayment"
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

const loanStartDate =
    document.getElementById(
        "loan-start-date"
    );


// Loan table

const loansTableBody =
    document.getElementById(
        "loans-table-body"
    ) ||
    document.querySelector(
        "#loans-table tbody"
    );


// Loan search and filters

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


// Loan modal

const loanModal =
    document.getElementById(
        "loan-modal"
    );


// Repayment modal

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

const repaymentAmount =
    document.getElementById(
        "repayment-amount"
    );

const repaymentBalance =
    document.getElementById(
        "repayment-balance"
    );

const repaymentDate =
    document.getElementById(
        "repayment-date"
    );

const repaymentNotes =
    document.getElementById(
        "repayment-notes"
    );


// ==========================================================
// DATE HELPERS
// ==========================================================

function today() {

    const date =
        new Date();


    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );
}


// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(
    date
) {

    if (!date) {
        return "";
    }


    const value =
        date instanceof Date
            ? date
            : new Date(
                date
            );


    if (
        Number.isNaN(
            value.getTime()
        )
    ) {

        return "";
    }


    const year =
        value.getFullYear();

    const month =
        String(
            value.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            value.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );
}


// ==========================================================
// CURRENCY FORMATTER
// ==========================================================

function currency(
    amount
) {

    const value =
        Number(
            amount
        );


    const safeValue =
        Number.isFinite(
            value
        )
            ? value
            : 0;


    return new Intl.NumberFormat(
        "en-KE",
        {
            style:
                "currency",

            currency:
                "KES",

            minimumFractionDigits:
                0,

            maximumFractionDigits:
                0
        }
    ).format(
        safeValue
    );
}


// ==========================================================
// NUMBER SAFETY
// ==========================================================

function numberValue(
    value,
    fallback = 0
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}


// ==========================================================
// ROUND TO NEAREST FIVE
// ==========================================================

function roundToNearestFive(
    amount
) {

    const value =
        numberValue(
            amount
        );


    return (
        Math.round(
            value / 5
        ) * 5
    );
}


// ==========================================================
// NORMALIZE LOAN STATUS
// ==========================================================

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


    switch (
        value
    ) {

        case "pending":
            return "Pending";

        case "approved":
            return "Active";

        case "active":
            return "Active";

        case "arrears":
            return "Arrears";

        case "overdue":
            return "Arrears";

        case "completed":
            return "Completed";

        case "complete":
            return "Completed";

        case "rejected":
            return "Rejected";

        default:
            return status ||
                "";
    }
}


// ==========================================================
// RUNNING LOAN CHECK
// ==========================================================

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


    if (
        status ===
            "Completed" ||

        status ===
            "Rejected"
    ) {

        return false;
    }


    return (
        numberValue(
            loan.balance
        ) > 0
    );
}


// ==========================================================
// SAFE FIRESTORE DATE
// ==========================================================

function firestoreDateToDate(
    value
) {

    if (!value) {
        return null;
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        try {

            return value.toDate();

        } catch (error) {

            console.warn(
                "Firestore date conversion failed:",
                error
            );
        }
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


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


// ==========================================================
// LOAN DATE
// ==========================================================

function getLoanDate(
    loan
) {

    if (!loan) {
        return null;
    }


    if (
        loan.approvalDate
    ) {

        const approval =
            new Date(
                loan.approvalDate
            );


        if (
            !Number.isNaN(
                approval.getTime()
            )
        ) {

            return approval;
        }
    }


    return firestoreDateToDate(
        loan.createdAt
    );
}


// ==========================================================
// ADMIN CHECK
// ==========================================================

function isAdmin() {

    const role =
        String(
            localStorage.getItem(
                "userRole"
            ) ||
            localStorage.getItem(
                "role"
            ) ||
            ""
        )
            .trim()
            .toLowerCase();


    const email =
        String(
            localStorage.getItem(
                "userEmail"
            ) ||
            ""
        )
            .trim()
            .toLowerCase();


    const adminEmail =
        typeof ADMIN_EMAIL !==
        "undefined"
            ? String(
                ADMIN_EMAIL
            )
                .trim()
                .toLowerCase()
            : "";


    return (
        role === "admin" ||
        role === "administrator" ||
        (
            adminEmail &&
            email ===
                adminEmail
        )
    );
}


// ==========================================================
// HISTORY LOGGER
// ==========================================================

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

                action:
                    action ||
                    "",

                category:
                    category ||
                    "",

                details:
                    details ||
                    {},

                performedBy:
                    localStorage.getItem(
                        "userName"
                    ) ||
                    localStorage.getItem(
                        "userEmail"
                    ) ||
                    "Unknown Officer",

                createdAt:
                    serverTimestamp(),

                timestamp:
                    new Date()
                        .toISOString()
            }
        );

    } catch (error) {

        /*
         * History must never break
         * a successful financial operation.
         */

        console.error(
            "History logging error:",
            error
        );
    }
}


// ==========================================================
// SAFE ELEMENT HELPER
// ==========================================================

function setElementValue(
    element,
    value
) {

    if (!element) {
        return;
    }


    element.value =
        value ??
        "";
}


// ==========================================================
// END OF PART 1/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 2/16
// LOAN NUMBER, CALCULATOR & REPAYMENT SCHEDULE
// ==========================================================


// ==========================================================
// GENERATE LOAN NUMBER
// ==========================================================

function generateLoanNumber() {

    const timestamp =
        Date.now()
            .toString()
            .slice(-8);


    const random =
        Math.floor(
            100 +
            Math.random() *
            900
        );


    return (
        `GL-${timestamp}-${random}`
    );
}


// ==========================================================
// CALCULATE LOAN VALUES
// ==========================================================

function calculateLoan() {

    const amount =
        numberValue(
            loanAmount?.value
        );


    const interestRate =
        numberValue(
            loanInterest?.value
        );


    const duration =
        Math.max(
            Math.floor(
                numberValue(
                    loanDuration?.value,
                    1
                )
            ),
            1
        );


    const processingFee =
        numberValue(
            loanProcessingFee?.value
        );


    if (
        amount <= 0
    ) {

        setElementValue(
            loanWeeklyPayment,
            ""
        );

        setElementValue(
            loanTotalRepayment,
            ""
        );

        return {
            amount: 0,
            interest: 0,
            processingFee,
            totalRepayment: 0,
            weeklyPayment: 0
        };
    }


    const interestAmount =
        amount *
        (
            interestRate /
            100
        );


    const totalRepayment =
        amount +
        interestAmount;


    const weeklyPayment =
        roundToNearestFive(
            totalRepayment /
            duration
        );


    setElementValue(
        loanWeeklyPayment,
        weeklyPayment
    );


    setElementValue(
        loanTotalRepayment,
        totalRepayment
    );


    if (loanBalance) {

        const paid =
            numberValue(
                loanPaid?.value
            );


        loanBalance.value =
            Math.max(
                totalRepayment -
                paid,
                0
            );
    }


    return {

        amount,

        interest:
            interestAmount,

        processingFee,

        totalRepayment,

        weeklyPayment,

        duration
    };
}


// ==========================================================
// CALCULATOR INPUT EVENTS
// ==========================================================

[
    loanAmount,
    loanInterest,
    loanDuration,
    loanProcessingFee,
    loanPaid
]
    .forEach(
        element => {

            element?.addEventListener(
                "input",
                calculateLoan
            );

        }
    );


// ==========================================================
// GENERATE REPAYMENT SCHEDULE
// ==========================================================

function generateRepaymentSchedule(
    startDate,
    duration,
    weeklyPayment,
    totalRepayment
) {

    const start =
        startDate instanceof Date
            ? new Date(
                startDate
            )
            : new Date(
                startDate
            );


    if (
        Number.isNaN(
            start.getTime()
        )
    ) {

        return [];
    }


    const installments =
        Math.max(
            Math.floor(
                numberValue(
                    duration,
                    1
                )
            ),
            1
        );


    const total =
        Math.max(
            numberValue(
                totalRepayment
            ),
            0
        );


    const standardPayment =
        Math.max(
            numberValue(
                weeklyPayment
            ),
            0
        );


    const schedule =
        [];


    let allocated =
        0;


    for (
        let index = 0;
        index < installments;
        index++
    ) {

        const dueDate =
            new Date(
                start
            );


        dueDate.setDate(
            dueDate.getDate() +
            (
                (index + 1) *
                7
            )
        );


        let amount =
            standardPayment;


        /*
         * Make the final installment absorb
         * any rounding difference.
         */

        if (
            index ===
            installments - 1
        ) {

            amount =
                Math.max(
                    total -
                    allocated,
                    0
                );
        }


        amount =
            Math.round(
                amount *
                100
            ) / 100;


        allocated +=
            amount;


        schedule.push({

            installment:
                index + 1,

            dueDate:
                formatDate(
                    dueDate
                ),

            amount,

            paidAmount:
                0,

            remainingAmount:
                amount,

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


// ==========================================================
// CALCULATE CURRENT SCHEDULE BALANCE
// ==========================================================

function calculateScheduleBalance(
    schedule = []
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return 0;
    }


    return schedule.reduce(
        (
            total,
            item
        ) => {

            const amount =
                numberValue(
                    item.amount
                );


            const paid =
                numberValue(
                    item.paidAmount
                );


            return (
                total +
                Math.max(
                    amount -
                    paid,
                    0
                )
            );
        },
        0
    );
}


// ==========================================================
// GET REMAINING INSTALLMENTS
// ==========================================================

function getRemainingInstallments(
    schedule = []
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return 0;
    }


    return schedule.filter(
        item => {

            const remaining =
                numberValue(
                    item.remainingAmount ??
                    (
                        numberValue(
                            item.amount
                        ) -
                        numberValue(
                            item.paidAmount
                        )
                    )
                );


            return (
                !item.paid &&
                remaining >
                0
            );
        }
    ).length;
}


// ==========================================================
// GET NEXT REPAYMENT
// ==========================================================

function getNextRepayment(
    schedule = []
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return null;
    }


    return (
        schedule.find(
            item => {

                if (
                    item.paid
                ) {
                    return false;
                }


                const remaining =
                    numberValue(
                        item.remainingAmount ??
                        (
                            numberValue(
                                item.amount
                            ) -
                            numberValue(
                                item.paidAmount
                            )
                        )
                    );


                return (
                    remaining >
                    0
                );
            }
        ) ||
        null
    );
}


// ==========================================================
// GET LOAN BALANCE FROM SCHEDULE
// ==========================================================

function getScheduleOutstandingBalance(
    schedule = []
) {

    return Math.max(
        calculateScheduleBalance(
            schedule
        ),
        0
    );
}


// ==========================================================
// END OF PART 2/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 3/16
// CLIENT LOADING, LOAN LOADING & DATA NORMALIZATION
// ==========================================================


// ==========================================================
// LOAD CLIENTS
// ==========================================================

async function loadClients() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "clients"
                )
            );


        clients =
            snapshot.docs.map(
                clientDoc => ({

                    id:
                        clientDoc.id,

                    ...clientDoc.data()
                })
            );


        return clients;

    } catch (error) {

        console.error(
            "Failed to load clients:",
            error
        );


        clients =
            [];


        return [];
    }
}


// ==========================================================
// NORMALIZE REPAYMENT SCHEDULE
// ==========================================================

function normalizeRepaymentSchedule(
    schedule
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return [];
    }


    return schedule.map(
        (
            item,
            index
        ) => {

            const amount =
                numberValue(
                    item?.amount
                );


            const paidAmount =
                numberValue(
                    item?.paidAmount
                );


            const remainingAmount =
                Math.max(
                    numberValue(
                        item?.remainingAmount,
                        amount -
                        paidAmount
                    ),
                    0
                );


            const paid =
                item?.paid ===
                    true ||
                remainingAmount <=
                    0;


            let paymentHistory =
                Array.isArray(
                    item?.paymentHistory
                )
                    ? item.paymentHistory
                    : [];


            paymentHistory =
                paymentHistory.map(
                    record => ({

                        ...record,

                        amount:
                            numberValue(
                                record?.amount
                            ),

                        paymentId:
                            record?.paymentId ||
                            "",

                        repaymentDocId:
                            record?.repaymentDocId ||
                            null
                    })
                );


            return {

                ...item,

                installment:
                    item?.installment ??
                    index + 1,

                dueDate:
                    item?.dueDate ||
                    "",

                amount,

                paidAmount:
                    Math.min(
                        paidAmount,
                        amount
                    ),

                remainingAmount:
                    paid
                        ? 0
                        : remainingAmount,

                paid,

                status:
                    paid
                        ? "Paid"
                        : (
                            paidAmount > 0
                                ? "Partial"
                                : "Pending"
                        ),

                paidDate:
                    item?.paidDate ||
                    null,

                paymentHistory
            };
        }
    );
}


// ==========================================================
// NORMALIZE LOAN RECORD
// ==========================================================

function normalizeLoan(
    id,
    data = {}
) {

    const schedule =
        normalizeRepaymentSchedule(
            data.repaymentSchedule
        );


    const amount =
        numberValue(
            data.amount
        );


    const totalRepayment =
        numberValue(
            data.totalRepayment
        );


    const amountPaid =
        numberValue(
            data.amountPaid
        );


    let balance;


    if (
        data.balance !==
        undefined &&
        data.balance !==
        null
    ) {

        balance =
            Math.max(
                numberValue(
                    data.balance
                ),
                0
            );

    } else if (
        totalRepayment >
        0
    ) {

        balance =
            Math.max(
                totalRepayment -
                amountPaid,
                0
            );

    } else {

        balance =
            getScheduleOutstandingBalance(
                schedule
            );
    }


    const remainingInstallments =
        schedule.length
            ? getRemainingInstallments(
                schedule
            )
            : numberValue(
                data.remainingInstallments
            );


    const nextRepayment =
        schedule.length
            ? getNextRepayment(
                schedule
            )
            : null;


    let status =
        normalizeLoanStatus(
            data.status
        );


    /*
     * Older records may not have a status.
     */

    if (!status) {

        status =
            balance <= 0
                ? "Completed"
                : "Active";
    }


    if (
        balance <=
        0
    ) {

        status =
            "Completed";
    }


    return {

        id,

        ...data,

        clientId:
            data.clientId ||
            "",

        clientName:
            data.clientName ||
            "",

        clientPhone:
            data.clientPhone ||
            data.phone ||
            "",

        loanNumber:
            data.loanNumber ||
            "",

        loanType:
            data.loanType ||
            "New",

        amount,

        processingFee:
            numberValue(
                data.processingFee
            ),

        interest:
            numberValue(
                data.interest
            ),

        duration:
            numberValue(
                data.duration,
                1
            ),

        weeklyPayment:
            numberValue(
                data.weeklyPayment
            ),

        totalRepayment,

        openingBalance:
            numberValue(
                data.openingBalance,
                totalRepayment
            ),

        amountPaid,

        balance,

        approvalDate:
            data.approvalDate ||
            "",

        dueDate:
            data.dueDate ||
            "",

        repaymentSchedule:
            schedule,

        nextRepaymentDate:
            nextRepayment?.dueDate ||
            data.nextRepaymentDate ||
            "-",

        remainingInstallments,

        status,

        completed:
            balance <= 0 ||
            data.completed === true,

        totalIncome:
            numberValue(
                data.totalIncome
            ),

        createdBy:
            data.createdBy ||
            "",

        createdAt:
            data.createdAt ||
            null,

        updatedAt:
            data.updatedAt ||
            null
    };
}


// ==========================================================
// LOAD LOANS
// ==========================================================

async function loadLoans() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "loans"
                )
            );


        loans =
            snapshot.docs.map(
                loanDoc =>
                    normalizeLoan(
                        loanDoc.id,
                        loanDoc.data()
                    )
            );


        populateYearFilter();


        if (
            !loanDetailsOpen
        ) {

            renderLoans(
                getFilteredLoans()
            );
        }


        return loans;

    } catch (error) {

        console.error(
            "Failed to load loans:",
            error
        );


        /*
         * Do NOT replace a working
         * in-memory loan list with an
         * empty list if Firebase temporarily
         * fails.
         */

        if (
            !Array.isArray(
                loans
            )
        ) {

            loans =
                [];
        }


        return loans;
    }
}


// ==========================================================
// REALTIME LOAN LISTENER
// ==========================================================

let loansRealtimeUnsubscribe =
    null;


function startLoansRealtimeListener() {

    /*
     * Prevent duplicate Firestore
     * listeners.
     */

    if (
        loansRealtimeUnsubscribe
    ) {

        return;
    }


    try {

        loansRealtimeUnsubscribe =
            onSnapshot(
                collection(
                    db,
                    "loans"
                ),

                snapshot => {

                    loans =
                        snapshot.docs.map(
                            loanDoc =>
                                normalizeLoan(
                                    loanDoc.id,
                                    loanDoc.data()
                                )
                        );


                    populateYearFilter();


                    if (
                        loanDetailsOpen
                    ) {

                        const currentLoan =
                            loans.find(
                                loan =>
                                    loan.id ===
                                    selectedLoanId
                            );


                        if (
                            currentLoan
                        ) {

                            renderLoanDetailsPage(
                                currentLoan
                            );

                        } else {

                            closeLoanDetailsPage();
                        }


                    } else {

                        renderLoans(
                            getFilteredLoans()
                        );
                    }
                },

                error => {

                    console.error(
                        "Loans realtime listener error:",
                        error
                    );
                }
            );

    } catch (error) {

        console.error(
            "Unable to start loans realtime listener:",
            error
        );
    }
}


// ==========================================================
// STOP REALTIME LISTENER
// ==========================================================

function stopLoansRealtimeListener() {

    if (
        typeof loansRealtimeUnsubscribe ===
        "function"
    ) {

        try {

            loansRealtimeUnsubscribe();

        } catch (error) {

            console.error(
                "Error stopping loan listener:",
                error
            );
        }
    }


    loansRealtimeUnsubscribe =
        null;
}


// ==========================================================
// GET LOAN BY ID
// ==========================================================

function getLoanById(
    id
) {

    if (!id) {
        return null;
    }


    return (
        loans.find(
            loan =>
                loan.id ===
                id
        ) ||
        null
    );
}


// ==========================================================
// GET CLIENT BY ID
// ==========================================================

function getClientById(
    id
) {

    if (!id) {
        return null;
    }


    return (
        clients.find(
            client =>
                client.id ===
                id
        ) ||
        null
    );
}


// ==========================================================
// END OF PART 3/16
// ==========================================================// ==========================================
// PART 4/16
// LOAN CALCULATOR + REPAYMENT SCHEDULE
// ==========================================

function calculateLoan() {

    const amount =
        Number(
            loanAmount?.value || 0
        );

    const interestRate =
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


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        if (loanInterestAmount) {
            loanInterestAmount.value = "";
        }

        if (loanTotalRepayment) {
            loanTotalRepayment.value = "";
        }

        if (loanWeeklyPayment) {
            loanWeeklyPayment.value = "";
        }

        return;
    }


    const safeInterestRate =
        Number.isFinite(interestRate) &&
        interestRate >= 0
            ? interestRate
            : 0;


    const safeDuration =
        Number.isFinite(duration) &&
        duration > 0
            ? duration
            : 1;


    const safeProcessingFee =
        Number.isFinite(processingFee) &&
        processingFee >= 0
            ? processingFee
            : 0;


    const interestAmount =
        amount *
        (
            safeInterestRate /
            100
        );


    const totalRepayment =
        amount +
        interestAmount;


    const weeklyPayment =
        roundToNearestFive(
            totalRepayment /
            safeDuration
        );


    if (loanInterestAmount) {

        loanInterestAmount.value =
            currency(
                interestAmount
            );
    }


    if (loanTotalRepayment) {

        loanTotalRepayment.value =
            currency(
                totalRepayment
            );
    }


    if (loanWeeklyPayment) {

        loanWeeklyPayment.value =
            currency(
                weeklyPayment
            );
    }


    /*
     * Processing fee is deliberately kept
     * separate from the repayment amount.
     *
     * It is a business income/fee field and
     * must not silently increase the client's
     * scheduled repayment.
     */

    if (loanProcessingFee) {

        loanProcessingFee.value =
            safeProcessingFee;
    }
}


// ==========================================
// ROUND WEEKLY PAYMENT
// ==========================================

function roundToNearestFive(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return 0;
    }


    return Math.round(
        number / 5
    ) * 5;
}


// ==========================================
// DATE NORMALIZATION
// ==========================================

function normalizeLoanDate(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {

        return new Date(
            value.getTime()
        );
    }


    if (
        typeof value?.toDate ===
        "function"
    ) {

        return value.toDate();
    }


    const date =
        new Date(value);


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
// ADD DAYS
// ==========================================

function addDays(
    date,
    days
) {

    const result =
        normalizeLoanDate(
            date
        );


    if (!result) {
        return null;
    }


    result.setDate(
        result.getDate() +
        Number(days || 0)
    );


    return result;
}


// ==========================================
// GENERATE REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(
    startDate,
    duration,
    weeklyPayment,
    totalRepayment
) {

    const safeStartDate =
        normalizeLoanDate(
            startDate
        ) ||
        new Date();


    const installments =
        Math.max(
            Number(duration || 0),
            0
        );


    const total =
        Math.max(
            Number(
                totalRepayment || 0
            ),
            0
        );


    if (
        installments <= 0 ||
        total <= 0
    ) {

        return [];
    }


    const baseWeekly =
        Number(
            weeklyPayment || 0
        );


    const schedule =
        [];


    let allocated =
        0;


    for (
        let index = 0;
        index < installments;
        index++
    ) {

        const dueDate =
            addDays(
                safeStartDate,
                (index + 1) * 7
            );


        /*
         * The final installment receives
         * the exact remaining amount.
         *
         * This prevents rounding from leaving
         * a small artificial balance.
         */

        let installmentAmount;


        if (
            index ===
            installments - 1
        ) {

            installmentAmount =
                Math.max(
                    total -
                    allocated,
                    0
                );

        } else {

            installmentAmount =
                baseWeekly;


            if (
                installmentAmount <= 0
            ) {

                installmentAmount =
                    total /
                    installments;
            }


            installmentAmount =
                Math.min(
                    installmentAmount,
                    Math.max(
                        total -
                        allocated,
                        0
                    )
                );
        }


        allocated +=
            installmentAmount;


        schedule.push({

            installment:
                index + 1,

            dueDate:
                formatDate(
                    dueDate
                ),

            amount:
                installmentAmount,

            paidAmount:
                0,

            remainingAmount:
                installmentAmount,

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
// GET NEXT REPAYMENT
// ==========================================

function getNextUnpaidInstallment(
    schedule = []
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return null;
    }


    return (
        schedule.find(
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


// ==========================================
// CALCULATE SCHEDULE BALANCE
// ==========================================

function getScheduleOutstanding(
    schedule = []
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return 0;
    }


    return schedule.reduce(
        (
            total,
            installment
        ) => {

            const amount =
                Number(
                    installment.remainingAmount ??
                    0
                );


            return total +
                (
                    Number.isFinite(
                        amount
                    )
                        ? Math.max(
                            amount,
                            0
                        )
                        : 0
                );
        },
        0
    );
}


// ==========================================
// LOAN STATUS NORMALIZATION
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
            "pending"
    ) {
        return "Pending";
    }


    if (
        value ===
            "active" ||
        value ===
            "approved"
    ) {
        return "Active";
    }


    if (
        value ===
            "arrears" ||
        value ===
            "overdue"
    ) {
        return "Arrears";
    }


    if (
        value ===
            "completed" ||
        value ===
            "complete" ||
        value ===
            "paid"
    ) {
        return "Completed";
    }


    if (
        value ===
            "rejected"
    ) {
        return "Rejected";
    }


    return (
        status ||
        "Pending"
    );
}


// ==========================================
// RUNNING LOAN CHECK
// ==========================================

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


    if (
        status ===
            "Pending" ||
        status ===
            "Rejected"
    ) {

        return false;
    }


    if (
        status ===
        "Completed"
    ) {

        return false;
    }


    return (
        Number(
            loan.balance ??
            0
        ) > 0
    );
}


// ==========================================
// END OF PART 4/16
// ==========================================// ==========================================
// PART 5/16
// LOAN FILTERS + OVERDUE STATUS
// ==========================================


// ==========================================
// POPULATE YEAR FILTER
// ==========================================

function populateYearFilter() {

    if (!loanYearFilter) {
        return;
    }


    const years =
        [
            ...new Set(
                loans
                    .map(
                        loan => {

                            const date =
                                normalizeLoanDate(
                                    loan.approvalDate
                                ) ||
                                normalizeLoanDate(
                                    loan.createdAt
                                );


                            return date
                                ? date.getFullYear()
                                : null;
                        }
                    )
                    .filter(
                        year =>
                            year !== null
                    )
            )
        ]
            .sort(
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

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(year);

            option.textContent =
                String(year);


            loanYearFilter.appendChild(
                option
            );
        }
    );
}


// ==========================================
// GET FILTERED LOANS
// ==========================================

function getFilteredLoans() {

    let filtered =
        Array.isArray(loans)
            ? [...loans]
            : [];


    /*
     * The main loans table shows only
     * currently running loans.
     *
     * Pending loans are intentionally kept
     * available to the pipeline/details
     * logic and are not destroyed here.
     */

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


    // ------------------------------------------
    // SEARCH
    // ------------------------------------------

    if (keyword) {

        filtered =
            filtered.filter(
                loan => {

                    const clientName =
                        String(
                            loan.clientName ||
                            ""
                        )
                            .toLowerCase();


                    const loanNumber =
                        String(
                            loan.loanNumber ||
                            ""
                        )
                            .toLowerCase();


                    const loanId =
                        String(
                            loan.id ||
                            ""
                        )
                            .toLowerCase();


                    return (
                        clientName.includes(
                            keyword
                        ) ||

                        loanNumber.includes(
                            keyword
                        ) ||

                        loanId.includes(
                            keyword
                        )
                    );
                }
            );
    }


    // ------------------------------------------
    // STATUS
    // ------------------------------------------

    if (
        status !==
        "ALL"
    ) {

        const wantedStatus =
            normalizeLoanStatus(
                status
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


    // ------------------------------------------
    // MONTH / YEAR
    // ------------------------------------------

    if (
        month !== "ALL" ||
        year !== "ALL"
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const date =
                        normalizeLoanDate(
                            loan.approvalDate
                        ) ||
                        normalizeLoanDate(
                            loan.createdAt
                        );


                    if (!date) {
                        return false;
                    }


                    const monthMatch =
                        month === "ALL" ||
                        date.getMonth() ===
                            Number(
                                month
                            );


                    const yearMatch =
                        year === "ALL" ||
                        date.getFullYear() ===
                            Number(
                                year
                            );


                    return (
                        monthMatch &&
                        yearMatch
                    );
                }
            );
    }


    return filtered;
}


// ==========================================
// APPLY LOAN FILTERS
// ==========================================

function filterLoans() {

    /*
     * Never re-render the table while the
     * full-screen loan details page is open.
     *
     * This prevents the details page from
     * being replaced by the table during
     * realtime refreshes.
     */

    if (loanDetailsOpen) {
        return;
    }


    const filtered =
        getFilteredLoans();


    renderLoans(
        filtered
    );
}


// ==========================================
// FILTER EVENT LISTENERS
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
// CHECK OVERDUE LOANS
// ==========================================

async function checkOverdueLoans() {

    const todayDate =
        today();


    if (
        !Array.isArray(
            loans
        ) ||
        !loans.length
    ) {

        return;
    }


    for (
        const loan
        of loans
    ) {

        if (!loan?.id) {
            continue;
        }


        const currentStatus =
            normalizeLoanStatus(
                loan.status
            );


        /*
         * Pending, rejected and completed
         * loans do not need automatic
         * arrears processing.
         */

        if (
            currentStatus ===
                "Pending" ||

            currentStatus ===
                "Rejected" ||

            currentStatus ===
                "Completed"
        ) {

            continue;
        }


        const schedule =
            Array.isArray(
                loan.repaymentSchedule
            )
                ? loan.repaymentSchedule
                : [];


        let nextRepayment =
            null;


        let hasArrears =
            false;


        for (
            const installment
            of schedule
        ) {

            const remaining =
                Number(
                    installment.remainingAmount ??
                    (
                        Number(
                            installment.amount ||
                            0
                        ) -
                        Number(
                            installment.paidAmount ||
                            0
                        )
                    )
                );


            if (
                installment.paid ||
                remaining <= 0
            ) {

                continue;
            }


            nextRepayment =
                installment.dueDate;


            if (
                String(
                    installment.dueDate ||
                    ""
                ) <
                todayDate
            ) {

                hasArrears =
                    true;
            }


            /*
             * The earliest unpaid installment
             * determines the current repayment
             * position.
             */

            break;
        }


        let newStatus;


        if (!nextRepayment) {

            newStatus =
                "Completed";

        } else if (
            hasArrears
        ) {

            newStatus =
                "Arrears";

        } else {

            newStatus =
                "Active";
        }


        const remainingInstallments =
            schedule.filter(
                installment => {

                    const remaining =
                        Number(
                            installment.remainingAmount ??
                            (
                                Number(
                                    installment.amount ||
                                    0
                                ) -
                                Number(
                                    installment.paidAmount ||
                                    0
                                )
                            )
                        );


                    return (
                        !installment.paid &&
                        remaining > 0
                    );
                }
            ).length;


        /*
         * Avoid unnecessary Firestore writes.
         */

        if (
            normalizeLoanStatus(
                loan.status
            ) ===
                newStatus &&

            String(
                loan.nextRepaymentDate ||
                "-"
            ) ===
                String(
                    nextRepayment ||
                    "-"
                ) &&

            Number(
                loan.remainingInstallments ||
                0
            ) ===
                remainingInstallments
        ) {

            continue;
        }


        try {

            await updateDoc(
                doc(
                    db,
                    "loans",
                    loan.id
                ),
                {

                    status:
                        newStatus,

                    completed:
                        newStatus ===
                        "Completed",

                    nextRepaymentDate:
                        nextRepayment ||
                        "-",

                    remainingInstallments:
                        remainingInstallments,

                    updatedAt:
                        serverTimestamp()
                }
            );

        } catch (error) {

            console.error(
                "Overdue loan update error:",
                error
            );
        }
    }
}


// ==========================================
// REFRESH FILTER OPTIONS
// ==========================================

function refreshLoanFilters() {

    populateYearFilter();

    /*
     * Do not call filterLoans() here if the
     * loan details page is currently open.
     * filterLoans() itself is protected, but
     * keeping this explicit makes the refresh
     * behavior predictable.
     */

    if (!loanDetailsOpen) {

        filterLoans();
    }
}


// ==========================================
// END OF PART 5/16
// ==========================================// ==========================================
// PART 6/16
// REPAYMENT SUBMISSION
// ==========================================


// ==========================================
// REPAYMENT SUBMISSION STATE
// ==========================================

let repaymentSaving =
    false;


// ==========================================
// REPAYMENT FORM SUBMISSION
// ==========================================

repaymentForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        /*
         * Prevent duplicate submissions.
         */

        if (repaymentSaving) {
            return;
        }


        // ------------------------------------------
        // FIND SELECTED LOAN
        // ------------------------------------------

        const selectedRepaymentLoanId =
            directLoanRepaymentMode
                ? (
                    selectedLoanId ||
                    repaymentLoanId?.value
                )
                : repaymentLoanId?.value;


        const loan =
            loans.find(
                item =>
                    item.id ===
                    selectedRepaymentLoanId
            );


        if (!loan) {

            alert(
                directLoanRepaymentMode
                    ? "The selected loan could not be found."
                    : "Please select a client with an outstanding loan."
            );

            return;
        }


        // ------------------------------------------
        // VALIDATE PAYMENT
        // ------------------------------------------

        const payment =
            Number(
                repaymentAmount?.value ||
                0
            );


        if (
            !Number.isFinite(
                payment
            ) ||
            payment <= 0
        ) {

            alert(
                "Enter a valid repayment amount."
            );

            return;
        }


        const currentBalance =
            Math.max(
                Number(
                    loan.balance ||
                    0
                ),
                0
            );


        if (
            currentBalance <=
            0
        ) {

            alert(
                "This loan has no outstanding balance."
            );

            return;
        }


        if (
            payment >
            currentBalance + 0.01
        ) {

            alert(
                `Payment cannot exceed ${currency(
                    currentBalance
                )}.`
            );

            return;
        }


        // ------------------------------------------
        // CONFIRM PAYMENT
        // ------------------------------------------

        if (
            !confirm(
                `Confirm repayment of ${currency(
                    payment
                )} for ${loan.clientName || "this client"}?`
            )
        ) {

            return;
        }


        repaymentSaving =
            true;


        const saveButton =
            repaymentForm.querySelector(
                'button[type="submit"]'
            );


        const originalButtonText =
            saveButton?.innerHTML ||
            "Save Repayment";


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.innerHTML =
                "Saving...";
        }


        try {

            // ==========================================
            // COPY REPAYMENT SCHEDULE
            // ==========================================

            const schedule =
                Array.isArray(
                    loan.repaymentSchedule
                )
                    ? JSON.parse(
                        JSON.stringify(
                            loan.repaymentSchedule
                        )
                    )
                    : [];


            if (!schedule.length) {

                throw new Error(
                    "This loan has no repayment schedule."
                );
            }


            let remainingPayment =
                payment;


            const repaymentDateValue =
                repaymentDate?.value ||
                today();


            const repaymentNotesValue =
                repaymentNotes?.value ||
                "";


            // ==========================================
            // APPLY PAYMENT FROM EARLIEST UNPAID
            // ==========================================

            for (
                const installment
                of schedule
            ) {

                if (
                    remainingPayment <=
                    0.01
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
                    0.01
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
                    !Array.isArray(
                        installment.paymentHistory
                    )
                ) {

                    installment.paymentHistory =
                        [];
                }


                const paymentRecord = {

                    paymentId:
                        `PAY-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`,

                    amount:
                        applied,

                    date:
                        repaymentDateValue,

                    notes:
                        repaymentNotesValue,

                    repaymentDocId:
                        null
                };


                installment.paymentHistory.push(
                    paymentRecord
                );


                if (
                    installment.remainingAmount <=
                    0.01
                ) {

                    installment.paid =
                        true;

                    installment.status =
                        "Paid";

                    installment.remainingAmount =
                        0;

                    installment.paidDate =
                        repaymentDateValue;

                } else {

                    installment.paid =
                        false;

                    installment.status =
                        "Partial";

                    installment.paidDate =
                        null;
                }


                remainingPayment -=
                    applied;
            }


            // ==========================================
            // VERIFY FULL PAYMENT ALLOCATION
            // ==========================================

            if (
                remainingPayment >
                0.01
            ) {

                throw new Error(
                    "The repayment could not be fully allocated to the loan schedule."
                );
            }


            // ==========================================
            // CALCULATE NEW LOAN TOTALS
            // ==========================================

            const oldAmountPaid =
                Number(
                    loan.amountPaid ||
                    0
                );


            const newAmountPaid =
                oldAmountPaid +
                payment;


            const totalRepayment =
                Math.max(
                    Number(
                        loan.totalRepayment ||
                        0
                    ),
                    0
                );


            const newBalance =
                Math.max(
                    totalRepayment -
                    newAmountPaid,
                    0
                );


            // ==========================================
            // FIND NEXT INSTALLMENT
            // ==========================================

            const nextInstallment =
                getNextUnpaidInstallment(
                    schedule
                );


            const nextRepaymentDate =
                nextInstallment
                    ? nextInstallment.dueDate
                    : null;


            const remainingInstallments =
                schedule.filter(
                    installment => {

                        const remaining =
                            Number(
                                installment.remainingAmount ??
                                0
                            );


                        return (
                            !installment.paid &&
                            remaining >
                            0.01
                        );
                    }
                ).length;


            // ==========================================
            // DETERMINE NEW STATUS
            // ==========================================

            let newStatus =
                "Active";


            if (
                newBalance <=
                0.01
            ) {

                newStatus =
                    "Completed";

            } else if (
                nextRepaymentDate &&
                nextRepaymentDate <
                today()
            ) {

                newStatus =
                    "Arrears";

            } else {

                newStatus =
                    "Active";
            }


            // ==========================================
            // CALCULATE REPAYMENT INTEREST
            // ==========================================

            const totalInterest =
                Math.max(
                    totalRepayment -
                    Number(
                        loan.amount ||
                        0
                    ),
                    0
                );


            const interestRatio =
                totalRepayment > 0
                    ? totalInterest /
                      totalRepayment
                    : 0;


            const repaymentInterest =
                payment *
                interestRatio;


            const newTotalIncome =
                Number(
                    loan.totalIncome ||
                    0
                ) +
                repaymentInterest;


            // ==========================================
            // UPDATE LOAN
            // ==========================================

            await updateDoc(
                doc(
                    db,
                    "loans",
                    loan.id
                ),
                {

                    amountPaid:
                        newAmountPaid,

                    balance:
                        newBalance,

                    totalIncome:
                        newTotalIncome,

                    repaymentSchedule:
                        schedule,

                    nextRepaymentDate:
                        nextRepaymentDate ||
                        "-",

                    remainingInstallments:
                        remainingInstallments,

                    status:
                        newStatus,

                    completed:
                        newBalance <=
                        0.01,

                    updatedAt:
                        serverTimestamp()
                }
            );


            // ==========================================
            // SAVE REPAYMENT RECORD
            // ==========================================

            const repaymentRef =
                await addDoc(
                    collection(
                        db,
                        "repayments"
                    ),
                    {

                        loanId:
                            loan.id,

                        loanNumber:
                            loan.loanNumber ||
                            "",

                        clientId:
                            loan.clientId ||
                            "",

                        clientName:
                            loan.clientName ||
                            "",

                        amount:
                            payment,

                        date:
                            repaymentDateValue,

                        notes:
                            repaymentNotesValue,

                        balanceBefore:
                            currentBalance,

                        balanceAfter:
                            newBalance,

                        recordedBy:
                            localStorage.getItem(
                                "userName"
                            ) ||
                            localStorage.getItem(
                                "userEmail"
                            ) ||
                            "Unknown Officer",

                        createdAt:
                            serverTimestamp(),

                        timestamp:
                            new Date()
                                .toISOString()
                    }
                );


            // ==========================================
            // LINK REPAYMENT DOCUMENT
            // ==========================================

            let linked =
                false;


            /*
             * The payment record is identified by
             * its unique paymentId rather than by
             * simply selecting the first unlinked
             * record.
             */

            const paymentIds =
                new Set();


            for (
                const installment
                of schedule
            ) {

                if (
                    !Array.isArray(
                        installment.paymentHistory
                    )
                ) {
                    continue;
                }


                for (
                    const record
                    of installment.paymentHistory
                ) {

                    if (
                        record &&
                        record.paymentId
                    ) {

                        paymentIds.add(
                            record.paymentId
                        );
                    }
                }
            }


            /*
             * Find the newest payment record
             * belonging to this submission.
             */

            outerLoop:
            for (
                let i =
                    schedule.length -
                    1;
                i >= 0;
                i--
            ) {

                const history =
                    schedule[i]
                        ?.paymentHistory;


                if (
                    !Array.isArray(
                        history
                    )
                ) {
                    continue;
                }


                for (
                    let j =
                        history.length -
                        1;
                    j >= 0;
                    j--
                ) {

                    const record =
                        history[j];


                    if (
                        record &&
                        record.paymentId &&
                        !record.repaymentDocId &&
                        paymentIds.has(
                            record.paymentId
                        )
                    ) {

                        record.repaymentDocId =
                            repaymentRef.id;

                        linked =
                            true;

                        break outerLoop;
                    }
                }
            }


            // ==========================================
            // SAVE PAYMENT LINK
            // ==========================================

            if (linked) {

                await updateDoc(
                    doc(
                        db,
                        "loans",
                        loan.id
                    ),
                    {

                        repaymentSchedule:
                            schedule,

                        updatedAt:
                            serverTimestamp()
                    }
                );
            }


            // ==========================================
            // HISTORY
            // ==========================================

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
                        payment,

                    previousBalance:
                        currentBalance,

                    newBalance:
                        newBalance,

                    status:
                        newStatus
                }
            );


            // ==========================================
            // UPDATE LOCAL LOAN OBJECT
            // ==========================================

            /*
             * This keeps the current UI accurate
             * immediately, without waiting for the
             * Firestore listener.
             */

            Object.assign(
                loan,
                {

                    amountPaid:
                        newAmountPaid,

                    balance:
                        newBalance,

                    totalIncome:
                        newTotalIncome,

                    repaymentSchedule:
                        schedule,

                    nextRepaymentDate:
                        nextRepaymentDate ||
                        "-",

                    remainingInstallments:
                        remainingInstallments,

                    status:
                        newStatus,

                    completed:
                        newBalance <=
                        0.01
                }
            );


            // ==========================================
            // SAFE REPAYMENT MESSAGE
            // ==========================================

            /*
             * Messaging happens ONLY after all
             * financial records have succeeded.
             *
             * Messaging can never roll back or
             * break the repayment transaction.
             */

            try {

                await sendLoanRepaymentMessage(
                    loan.id,
                    payment,
                    currentBalance,
                    newBalance,
                    newStatus
                );

            } catch (messageError) {

                console.error(
                    "Repayment message failed:",
                    messageError
                );
            }


            // ==========================================
            // REFRESH UI
            // ==========================================

            if (
                typeof refreshLoanTable ===
                "function"
            ) {

                refreshLoanTable();
            }


            if (
                loanDetailsOpen &&
                selectedLoanId ===
                    loan.id
            ) {

                renderLoanDetailsPage(
                    loan
                );
            }


            // ==========================================
            // CLOSE MODAL
            // ==========================================

            closeRepaymentModal();


            alert(
                `✅ Repayment of ${currency(
                    payment
                )} recorded successfully.`
            );


        } catch (error) {

            console.error(
                "Repayment save error:",
                error
            );


            alert(
                "Failed to save repayment.\n\n" +
                (
                    error?.message ||
                    "Please try again."
                )
            );

        } finally {

            repaymentSaving =
                false;


            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.innerHTML =
                    originalButtonText;
            }
        }
    }
);


// ==========================================
// END OF PART 6/16
// ==========================================// ==========================================
// PART 7/16
// FAB REPAYMENT SELECTORS
// ==========================================


// ==========================================
// SETUP FAB ADD REPAYMENT
// ==========================================

function setupFabAddRepayment() {

    /*
     * Use one delegated listener so the FAB
     * continues working even if the dashboard
     * or loan table is re-rendered.
     */

    if (
        document.body.dataset
            .greymusFabRepaymentSetup ===
        "true"
    ) {
        return;
    }


    document.body.dataset
        .greymusFabRepaymentSetup =
        "true";


    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "#fab-add-repayment, " +
                    "#fab-repayment, " +
                    "[data-action=\"add-repayment\"]"
                );


            if (!button) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            openFabRepaymentSelector();
        },
        true
    );
}


// ==========================================
// CREATE FAB REPAYMENT SELECTORS
// ==========================================

function createFabRepaymentSelectors(
    form
) {

    if (!form) {
        return null;
    }


    let container =
        document.getElementById(
            "fab-repayment-selectors"
        );


    if (container) {

        /*
         * If the form was replaced by another
         * render, make sure the existing
         * container belongs to this form.
         */

        if (
            container.parentElement ===
            form
        ) {

            return container;
        }


        container.remove();
    }


    container =
        document.createElement(
            "div"
        );


    container.id =
        "fab-repayment-selectors";


    container.className =
        "fab-repayment-selectors";


    container.innerHTML = `

        <div
            class="fab-repayment-selector-group"
        >

            <label
                for="fab-repayment-client-select"
            >
                Client
            </label>

            <select
                id="fab-repayment-client-select"
                required
            >

                <option value="">
                    Select Client
                </option>

            </select>

        </div>


        <div
            class="fab-repayment-selector-group"
            id="fab-repayment-loan-group"
            style="display:none;"
        >

            <label
                for="fab-repayment-loan-select"
            >
                Loan
            </label>

            <select
                id="fab-repayment-loan-select"
            >

                <option value="">
                    Select Loan
                </option>

            </select>

        </div>
    `;


    form.insertBefore(
        container,
        form.firstElementChild
    );


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    clientSelector?.addEventListener(
        "change",
        event => {

            loadLoansForSelectedClient(
                event.target.value
            );
        }
    );


    loanSelector?.addEventListener(
        "change",
        event => {

            const id =
                event.target.value;


            if (!id) {

                clearRepaymentFields();

                return;
            }


            fillRepaymentFromSelectedLoan(
                id
            );
        }
    );


    return container;
}


// ==========================================
// HIDE FAB SELECTORS
// ==========================================

function hideFabRepaymentSelectors() {

    const container =
        document.getElementById(
            "fab-repayment-selectors"
        );


    if (container) {

        container.style.display =
            "none";
    }


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (clientSelector) {

        clientSelector.disabled =
            true;
    }


    if (loanSelector) {

        loanSelector.disabled =
            true;
    }
}


// ==========================================
// SHOW FAB SELECTORS
// ==========================================

function showFabRepaymentSelectors() {

    const container =
        document.getElementById(
            "fab-repayment-selectors"
        );


    if (container) {

        container.style.display =
            "";
    }


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (clientSelector) {

        clientSelector.disabled =
            false;
    }


    if (loanSelector) {

        loanSelector.disabled =
            false;
    }
}


// ==========================================
// POPULATE FAB CLIENT SELECTOR
// ==========================================

function populateFabClientSelector() {

    if (!repaymentForm) {
        return;
    }


    const container =
        createFabRepaymentSelectors(
            repaymentForm
        );


    if (!container) {
        return;
    }


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    if (!clientSelector) {
        return;
    }


    const previousValue =
        clientSelector.value;


    clientSelector.innerHTML = `
        <option value="">
            Select Client
        </option>
    `;


    const sortedClients =
        Array.isArray(clients)
            ? [...clients].sort(
                (a, b) =>
                    String(
                        a?.name ||
                        ""
                    ).localeCompare(
                        String(
                            b?.name ||
                            ""
                        )
                    )
            )
            : [];


    sortedClients.forEach(
        client => {

            if (!client?.id) {
                return;
            }


            const hasOutstandingLoan =
                loans.some(
                    loan =>

                        loan?.clientId ===
                            client.id &&

                        Number(
                            loan.balance ||
                            0
                        ) > 0 &&

                        normalizeLoanStatus(
                            loan.status
                        ) !==
                            "Completed"
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                client.id;


            option.textContent =
                client.name ||
                "Unnamed Client";


            /*
             * Keep clients without loans visible
             * but prevent them from being selected.
             */

            if (
                !hasOutstandingLoan
            ) {

                option.textContent +=
                    " — No outstanding loan";

                option.disabled =
                    true;
            }


            clientSelector.appendChild(
                option
            );
        }
    );


    if (previousValue) {

        const matchingOption =
            Array.from(
                clientSelector.options
            ).find(
                option =>
                    option.value ===
                    previousValue &&
                    !option.disabled
            );


        if (matchingOption) {

            clientSelector.value =
                previousValue;
        }
    }
}


// ==========================================
// OPEN FAB REPAYMENT SELECTOR
// ==========================================

function openFabRepaymentSelector() {

    const modal =
        document.getElementById(
            "repayment-modal"
        );


    const form =
        document.getElementById(
            "repayment-form"
        );


    if (
        !modal ||
        !form
    ) {

        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    /*
     * FAB mode means the user chooses
     * the client first.
     */

    directLoanRepaymentMode =
        false;


    selectedLoanId =
        null;


    /*
     * Reset only repayment fields.
     *
     * Do NOT reset the entire page or
     * loan table.
     */

    if (
        typeof clearRepaymentFields ===
        "function"
    ) {

        clearRepaymentFields();
    }


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


    if (repaymentLoanId) {

        repaymentLoanId.value =
            "";
    }


    const balanceField =
        repaymentBalance;


    if (balanceField) {

        balanceField.value =
            "";
    }


    createFabRepaymentSelectors(
        form
    );


    showFabRepaymentSelectors();


    populateFabClientSelector();


    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (loanGroup) {

        loanGroup.style.display =
            "none";
    }


    if (loanSelector) {

        loanSelector.innerHTML = `
            <option value="">
                Select Loan
            </option>
        `;
    }


    modal.style.position =
        "fixed";


    /*
     * Keep the repayment modal above the
     * full-screen loan details/table layers.
     */

    modal.style.zIndex =
        "100001";


    modal.classList.remove(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            repaymentAmount?.focus();

        },
        100
    );
}


// ==========================================
// LOAD LOANS FOR SELECTED CLIENT
// ==========================================

function loadLoansForSelectedClient(
    clientId
) {

    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );


    if (
        !loanSelector ||
        !loanGroup
    ) {

        return;
    }


    loanSelector.innerHTML = `
        <option value="">
            Select Loan
        </option>
    `;


    if (!clientId) {

        loanGroup.style.display =
            "none";


        clearRepaymentFields();

        return;
    }


    const clientLoans =
        loans
            .filter(
                loan =>

                    loan?.clientId ===
                        clientId &&

                    Number(
                        loan.balance ||
                        0
                    ) > 0 &&

                    normalizeLoanStatus(
                        loan.status
                    ) !==
                        "Completed"
            )
            .sort(
                (a, b) => {

                    const dateA =
                        normalizeLoanDate(
                            a.approvalDate
                        ) ||
                        normalizeLoanDate(
                            a.createdAt
                        ) ||
                        new Date(0);


                    const dateB =
                        normalizeLoanDate(
                            b.approvalDate
                        ) ||
                        normalizeLoanDate(
                            b.createdAt
                        ) ||
                        new Date(0);


                    return (
                        dateB -
                        dateA
                    );
                }
            );


    if (
        !clientLoans.length
    ) {

        loanGroup.style.display =
            "none";


        clearRepaymentFields();


        const client =
            clients.find(
                item =>
                    item.id ===
                    clientId
            );


        alert(
            `${
                client?.name ||
                "This client"
            } has no outstanding loan.`
        );


        return;
    }


    /*
     * Exactly one outstanding loan:
     * select it automatically.
     */

    if (
        clientLoans.length ===
        1
    ) {

        loanGroup.style.display =
            "none";


        fillRepaymentFromSelectedLoan(
            clientLoans[0].id
        );


        return;
    }


    /*
     * Multiple outstanding loans:
     * require the user to choose one.
     */

    loanGroup.style.display =
        "";


    clientLoans.forEach(
        loan => {

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
                        Number(
                            loan.balance ||
                            0
                        )
                    )
                }`;


            loanSelector.appendChild(
                option
            );
        }
    );


    clearRepaymentFields();
}


// ==========================================
// END OF PART 7/16
// ==========================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 8/16
// REPAYMENT MODAL + FAB REPAYMENT FLOW
// ==========================================================


// ==========================================================
// CREATE FAB REPAYMENT SELECTORS
// ==========================================================

function createFabRepaymentSelectors(form) {

    if (!form) {
        return null;
    }

    let container =
        document.getElementById(
            "fab-repayment-selectors"
        );

    if (container) {
        return container;
    }

    container =
        document.createElement("div");

    container.id =
        "fab-repayment-selectors";

    container.className =
        "fab-repayment-selectors";

    container.innerHTML = `

        <div class="fab-repayment-selector-group">

            <label
                for="fab-repayment-client-select"
            >
                Client
            </label>

            <select
                id="fab-repayment-client-select"
            >

                <option value="">
                    Select Client
                </option>

            </select>

        </div>

        <div
            class="fab-repayment-selector-group"
            id="fab-repayment-loan-group"
            style="display:none;"
        >

            <label
                for="fab-repayment-loan-select"
            >
                Loan
            </label>

            <select
                id="fab-repayment-loan-select"
            >

                <option value="">
                    Select Loan
                </option>

            </select>

        </div>
    `;

    /*
     * Insert only once.
     *
     * This is important because loans.js may
     * initialize more than once during Firebase
     * refreshes. Recreating this container can
     * break the repayment modal.
     */

    form.insertBefore(
        container,
        form.firstElementChild
    );


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );

    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (clientSelector) {

        clientSelector.addEventListener(
            "change",
            event => {

                loadLoansForSelectedClient(
                    event.target.value
                );
            }
        );
    }


    if (loanSelector) {

        loanSelector.addEventListener(
            "change",
            event => {

                const id =
                    event.target.value;

                if (!id) {
                    clearRepaymentFields();
                    return;
                }

                fillRepaymentFromSelectedLoan(
                    id
                );
            }
        );
    }


    return container;
}


// ==========================================================
// HIDE FAB REPAYMENT SELECTORS
// ==========================================================

function hideFabRepaymentSelectors() {

    const container =
        document.getElementById(
            "fab-repayment-selectors"
        );

    if (container) {

        container.style.display =
            "none";
    }


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );

    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (clientSelector) {

        clientSelector.disabled =
            true;
    }


    if (loanSelector) {

        loanSelector.disabled =
            true;
    }
}


// ==========================================================
// SHOW FAB REPAYMENT SELECTORS
// ==========================================================

function showFabRepaymentSelectors() {

    const container =
        document.getElementById(
            "fab-repayment-selectors"
        );

    if (container) {

        container.style.display =
            "";
    }


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );

    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (clientSelector) {

        clientSelector.disabled =
            false;
    }


    if (loanSelector) {

        loanSelector.disabled =
            false;
    }
}


// ==========================================================
// POPULATE FAB CLIENT SELECTOR
// ==========================================================

function populateFabClientSelector() {

    if (!repaymentForm) {
        return;
    }


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    if (!clientSelector) {
        return;
    }


    const previousValue =
        clientSelector.value;


    clientSelector.innerHTML = `
        <option value="">
            Select Client
        </option>
    `;


    const sortedClients =
        [...clients].sort(
            (a, b) =>
                String(
                    a.name || ""
                ).localeCompare(
                    String(
                        b.name || ""
                    )
                )
        );


    sortedClients.forEach(
        client => {

            const outstandingLoans =
                loans.filter(
                    loan => {

                        const balance =
                            Number(
                                loan.balance ||
                                0
                            );

                        const status =
                            normalizeLoanStatus(
                                loan.status
                            );

                        return (
                            loan.clientId ===
                                client.id &&

                            balance > 0 &&

                            status !==
                                "Completed" &&

                            status !==
                                "Rejected"
                        );
                    }
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                client.id;


            option.textContent =
                client.name ||
                "Unnamed Client";


            /*
             * Keep clients visible even when
             * they have no outstanding loan.
             *
             * They are disabled rather than
             * removed, which prevents confusion
             * when searching for a client.
             */

            if (
                outstandingLoans.length ===
                0
            ) {

                option.textContent =
                    `${
                        client.name ||
                        "Unnamed Client"
                    } — No outstanding loan`;

                option.disabled =
                    true;
            }


            clientSelector.appendChild(
                option
            );
        }
    );


    if (previousValue) {

        const option =
            [...clientSelector.options]
                .find(
                    item =>
                        item.value ===
                        previousValue
                );

        if (
            option &&
            !option.disabled
        ) {

            clientSelector.value =
                previousValue;
        }
    }
}


// ==========================================================
// OPEN FAB REPAYMENT SELECTOR
// ==========================================================

function openFabRepaymentSelector() {

    const modal =
        document.getElementById(
            "repayment-modal"
        );

    const form =
        document.getElementById(
            "repayment-form"
        );


    if (
        !modal ||
        !form
    ) {

        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    /*
     * This is normal FAB mode.
     *
     * The user selects:
     *
     * Client
     *    ↓
     * Outstanding loan
     *    ↓
     * Repayment amount
     */

    directLoanRepaymentMode =
        false;

    selectedLoanId =
        null;


    /*
     * Reset only repayment fields.
     *
     * Do NOT reset the loans table or
     * loan-details state.
     */

    repaymentForm?.reset();


    if (repaymentLoanId) {

        repaymentLoanId.value =
            "";
    }


    if (repaymentBalance) {

        repaymentBalance.value =
            "";
    }


    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    createFabRepaymentSelectors(
        form
    );

    showFabRepaymentSelectors();

    populateFabClientSelector();


    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );

    if (loanGroup) {

        loanGroup.style.display =
            "none";
    }


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );

    if (loanSelector) {

        loanSelector.innerHTML = `
            <option value="">
                Select Loan
            </option>
        `;
    }


    /*
     * Keep the modal above any loan details
     * overlay without changing the table.
     */

    modal.style.position =
        "fixed";

    modal.style.zIndex =
        "100001";

    modal.classList.remove(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            repaymentAmount?.focus();

        },
        100
    );
}


// ==========================================================
// LOAD OUTSTANDING LOANS FOR CLIENT
// ==========================================================

function loadLoansForSelectedClient(
    clientId
) {

    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );

    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );


    if (!clientId) {

        if (loanSelector) {

            loanSelector.innerHTML = `
                <option value="">
                    Select Loan
                </option>
            `;
        }

        if (loanGroup) {

            loanGroup.style.display =
                "none";
        }

        clearRepaymentFields();

        return;
    }


    const clientLoans =
        loans.filter(
            loan => {

                const balance =
                    Number(
                        loan.balance ||
                        0
                    );

                const status =
                    normalizeLoanStatus(
                        loan.status
                    );

                return (
                    loan.clientId ===
                        clientId &&

                    balance > 0 &&

                    status !==
                        "Completed" &&

                    status !==
                        "Rejected"
                );
            }
        );


    if (
        clientLoans.length ===
        0
    ) {

        clearRepaymentFields();


        if (loanGroup) {

            loanGroup.style.display =
                "none";
        }


        return;
    }


    /*
     * One outstanding loan:
     * select it automatically.
     */

    if (
        clientLoans.length ===
        1
    ) {

        if (loanSelector) {

            loanSelector.innerHTML = `
                <option value="${clientLoans[0].id}">
                    ${
                        clientLoans[0].loanNumber ||
                        "Loan"
                    } — ${
                        currency(
                            clientLoans[0].balance ||
                            0
                        )
                    } balance
                </option>
            `;

            loanSelector.value =
                clientLoans[0].id;
        }


        if (loanGroup) {

            loanGroup.style.display =
                "none";
        }


        fillRepaymentFromSelectedLoan(
            clientLoans[0].id
        );

        return;
    }


    /*
     * Multiple outstanding loans:
     * require explicit loan selection.
     */

    if (loanGroup) {

        loanGroup.style.display =
            "";
    }


    if (loanSelector) {

        loanSelector.innerHTML = `
            <option value="">
                Select Loan
            </option>
        `;


        clientLoans
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.approvalDate ||
                            a.createdAt?.toDate?.() ||
                            0
                        );

                    const dateB =
                        new Date(
                            b.approvalDate ||
                            b.createdAt?.toDate?.() ||
                            0
                        );

                    return (
                        dateB -
                        dateA
                    );
                }
            )
            .forEach(
                loan => {

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
                                loan.balance ||
                                0
                            )
                        }`;

                    loanSelector.appendChild(
                        option
                    );
                }
            );
    }


    clearRepaymentFields();
}


// ==========================================================
// FILL REPAYMENT FORM FROM SELECTED LOAN
// ==========================================================

function fillRepaymentFromSelectedLoan(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (!loan) {

        clearRepaymentFields();

        return;
    }


    selectedLoanId =
        loan.id;


    if (repaymentLoanId) {

        repaymentLoanId.value =
            loan.id;
    }


    if (repaymentClient) {

        if (
            repaymentClient.tagName ===
            "SELECT"
        ) {

            repaymentClient.value =
                loan.clientId || "";

        } else {

            repaymentClient.value =
                loan.clientName || "";
        }
    }


    if (repaymentBalance) {

        repaymentBalance.value =
            currency(
                Number(
                    loan.balance ||
                    0
                )
            );
    }


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
}


// ==========================================================
// CLEAR REPAYMENT FIELDS
// ==========================================================

function clearRepaymentFields() {

    if (repaymentLoanId) {

        repaymentLoanId.value =
            "";
    }


    if (repaymentBalance) {

        repaymentBalance.value =
            "";
    }


    if (repaymentAmount) {

        repaymentAmount.value =
            "";
    }


    if (repaymentNotes) {

        repaymentNotes.value =
            "";
    }


    if (repaymentClient) {

        if (
            repaymentClient.tagName ===
            "SELECT"
        ) {

            repaymentClient.value =
                "";

        } else {

            repaymentClient.value =
                "";
        }
    }
}


// ==========================================================
// END OF PART 8/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 9/16
// DIRECT REPAYMENT + MODAL CONTROLS
// ==========================================================


// ==========================================================
// OPEN REPAYMENT DIRECTLY FROM LOAN DETAILS
// ==========================================================

function openRepaymentForLoan(id) {

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


    const balance =
        Number(
            loan.balance ||
            0
        );


    if (balance <= 0) {

        alert(
            "This loan has no outstanding balance."
        );

        return;
    }


    const modal =
        document.getElementById(
            "repayment-modal"
        );

    const form =
        document.getElementById(
            "repayment-form"
        );


    if (
        !modal ||
        !form
    ) {

        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    /*
     * DIRECT LOAN MODE
     *
     * The user opened repayment from
     * a specific loan, so no client/loan
     * selection is required.
     */

    directLoanRepaymentMode =
        true;

    selectedLoanId =
        loan.id;


    /*
     * Make sure the selector container
     * exists before hiding it.
     */

    createFabRepaymentSelectors(
        form
    );

    hideFabRepaymentSelectors();


    /*
     * Populate the hidden loan ID.
     */

    if (repaymentLoanId) {

        repaymentLoanId.value =
            loan.id;
    }


    /*
     * Populate client display.
     */

    if (repaymentClient) {

        if (
            repaymentClient.tagName ===
            "SELECT"
        ) {

            repaymentClient.value =
                loan.clientId || "";

        } else {

            repaymentClient.value =
                loan.clientName || "";
        }
    }


    /*
     * Populate current balance.
     */

    if (repaymentBalance) {

        repaymentBalance.value =
            currency(
                balance
            );
    }


    /*
     * Always use today's date when
     * opening a new repayment.
     */

    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    if (repaymentAmount) {

        repaymentAmount.value =
            "";
    }


    if (repaymentNotes) {

        repaymentNotes.value =
            "";
    }


    /*
     * Open modal above loan details.
     *
     * Do not modify loanDetailsOpen.
     * Do not close the loans table.
     */

    modal.style.position =
        "fixed";

    modal.style.zIndex =
        "100001";

    modal.classList.remove(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            repaymentAmount?.focus();

        },
        100
    );
}


// ==========================================================
// CLOSE REPAYMENT MODAL
// ==========================================================

function closeRepaymentModal() {

    const modal =
        document.getElementById(
            "repayment-modal"
        );


    if (!modal) {
        return;
    }


    /*
     * Remember whether repayment was
     * opened from Loan Details.
     */

    const wasDirectMode =
        directLoanRepaymentMode;

    const returnLoanId =
        selectedLoanId;


    modal.classList.add(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.style.zIndex =
        "";

    modal.style.position =
        "";


    /*
     * Return to normal repayment mode.
     */

    directLoanRepaymentMode =
        false;


    /*
     * Clear only repayment fields.
     *
     * This is deliberately isolated from
     * the loans table.
     */

    clearRepaymentFields();


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


    /*
     * Restore FAB selectors for the
     * next normal repayment.
     */

    showFabRepaymentSelectors();


    /*
     * If repayment was opened from Loan
     * Details, refresh ONLY that loan's
     * details after the modal closes.
     */

    if (
        wasDirectMode &&
        returnLoanId &&
        loanDetailsOpen
    ) {

        const updatedLoan =
            loans.find(
                item =>
                    item.id ===
                    returnLoanId
            );


        if (updatedLoan) {

            renderLoanDetailsPage(
                updatedLoan
            );
        }
    }
}


// ==========================================================
// REPAYMENT MODAL CLOSE BUTTON
// ==========================================================

document.addEventListener(
    "click",
    event => {

        const closeButton =
            event.target.closest(
                "#close-repayment-modal, " +
                ".close-repayment-modal, " +
                "#repayment-modal .close-modal, " +
                "[data-close=\"repayment-modal\"], " +
                "[data-modal-close=\"repayment-modal\"]"
            );


        if (!closeButton) {
            return;
        }


        event.preventDefault();
        event.stopPropagation();


        closeRepaymentModal();
    }
);


// ==========================================================
// REPAYMENT MODAL BACKDROP
// ==========================================================

document
    .getElementById(
        "repayment-modal"
    )
    ?.addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "repayment-modal"
            ) {

                closeRepaymentModal();
            }
        }
    );


// ==========================================================
// ESCAPE KEY — CLOSE REPAYMENT MODAL
// ==========================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        const modal =
            document.getElementById(
                "repayment-modal"
            );


        if (
            modal &&
            !modal.classList.contains(
                "hidden"
            )
        ) {

            closeRepaymentModal();

            return;
        }
    }
);


// ==========================================================
// REPAYMENT DATE DEFAULT
// ==========================================================

if (repaymentDate) {

    repaymentDate.value =
        today();
}


// ==========================================================
// REPAYMENT AMOUNT INPUT SAFETY
// ==========================================================

if (repaymentAmount) {

    repaymentAmount.setAttribute(
        "inputmode",
        "decimal"
    );

    repaymentAmount.setAttribute(
        "min",
        "0"
    );

    repaymentAmount.setAttribute(
        "step",
        "0.01"
    );
}


// ==========================================================
// CLIENT DISPLAY SAFETY
// ==========================================================

if (repaymentClient) {

    if (
        repaymentClient.tagName !==
        "SELECT"
    ) {

        repaymentClient.readOnly =
            true;
    }
}


// ==========================================================
// BALANCE DISPLAY SAFETY
// ==========================================================

if (repaymentBalance) {

    repaymentBalance.readOnly =
        true;
}


// ==========================================================
// REPAYMENT LOAN-ID CHANGE
// ==========================================================

repaymentLoanId
    ?.addEventListener(
        "change",
        event => {

            const id =
                event.target.value;


            if (!id) {

                clearRepaymentFields();

                return;
            }


            fillRepaymentFromSelectedLoan(
                id
            );
        }
    );


// ==========================================================
// REPAYMENT AMOUNT VALIDATION
// ==========================================================

repaymentAmount
    ?.addEventListener(
        "input",
        () => {

            const loanId =
                directLoanRepaymentMode
                    ? selectedLoanId
                    : repaymentLoanId?.value;


            if (!loanId) {

                repaymentAmount.setCustomValidity(
                    ""
                );

                return;
            }


            const loan =
                loans.find(
                    item =>
                        item.id ===
                        loanId
                );


            if (!loan) {

                repaymentAmount.setCustomValidity(
                    ""
                );

                return;
            }


            const amount =
                Number(
                    repaymentAmount.value ||
                    0
                );


            const balance =
                Number(
                    loan.balance ||
                    0
                );


            if (
                amount >
                balance
            ) {

                repaymentAmount.setCustomValidity(
                    `Payment cannot exceed ${currency(
                        balance
                    )}.`
                );

            } else {

                repaymentAmount.setCustomValidity(
                    ""
                );
            }
        }
    );


// ==========================================================
// REPAYMENT SUBMISSION LOCK
// ==========================================================

let repaymentSubmissionStarted =
    false;


repaymentForm
    ?.addEventListener(
        "submit",
        event => {

            /*
             * This listener does NOT perform
             * the financial save.
             *
             * It only blocks accidental
             * duplicate browser submissions.
             */

            if (
                repaymentSubmissionStarted
            ) {

                event.preventDefault();

                event.stopImmediatePropagation();

                return;
            }


            repaymentSubmissionStarted =
                true;


            /*
             * Give the main async repayment
             * handler time to complete.
             */

            setTimeout(
                () => {

                    repaymentSubmissionStarted =
                        false;

                },
                3000
            );
        },
        true
    );


// ==========================================================
// END OF PART 9/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 10/16
// SAFE MESSAGING BRIDGE
// ==========================================================


// ==========================================================
// GET CLIENT DATA FOR MESSAGING
// ==========================================================

function getLoanClientForMessaging(loan) {

    if (!loan) {
        return null;
    }


    const client =
        Array.isArray(clients)
            ? clients.find(
                item =>
                    item.id ===
                    loan.clientId
            )
            : null;


    return {

        id:
            client?.id ||
            loan.clientId ||
            "",

        name:
            client?.name ||
            loan.clientName ||
            "",

        phone:
            client?.phone ||
            client?.phoneNumber ||
            client?.mobile ||
            loan.clientPhone ||
            loan.phone ||
            ""
    };
}


// ==========================================================
// NORMALIZE PHONE NUMBER
// ==========================================================

function normalizeMessagingPhone(phone) {

    if (
        phone === null ||
        phone === undefined
    ) {
        return "";
    }


    let value =
        String(phone).trim();


    if (!value) {
        return "";
    }


    value =
        value.replace(
            /[\s().-]/g,
            ""
        );


    /*
     * Kenyan local formats:
     *
     * 07XXXXXXXX
     * 01XXXXXXXX
     *
     * become:
     *
     * +2547XXXXXXXX
     * +2541XXXXXXXX
     */

    if (
        /^0[17]\d{8}$/.test(
            value
        )
    ) {

        value =
            "+254" +
            value.substring(1);
    }


    /*
     * 254XXXXXXXXX
     * becomes:
     *
     * +254XXXXXXXXX
     */

    if (
        /^254[17]\d{8}$/.test(
            value
        )
    ) {

        value =
            "+" +
            value;
    }


    return value;
}


// ==========================================================
// GET CLIENT PHONE
// ==========================================================

function getLoanClientPhone(loan) {

    const client =
        getLoanClientForMessaging(
            loan
        );


    return normalizeMessagingPhone(
        client?.phone
    );
}


// ==========================================================
// BUILD LOAN MESSAGING PAYLOAD
// ==========================================================

function buildLoanMessagingPayload(
    loan,
    options = {}
) {

    if (!loan) {
        return null;
    }


    const client =
        getLoanClientForMessaging(
            loan
        );


    const phone =
        normalizeMessagingPhone(
            options.phone ||
            client?.phone
        );


    return {

        loanId:
            loan.id ||
            "",

        loanNumber:
            loan.loanNumber ||
            "",

        clientId:
            client?.id ||
            "",

        clientName:
            client?.name ||
            "",

        clientPhone:
            phone,

        phone:
            phone,

        loanAmount:
            Number(
                loan.amount ||
                0
            ),

        amount:
            Number(
                options.amount ??
                0
            ),

        paymentAmount:
            Number(
                options.paymentAmount ??
                options.amount ??
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

        balance:
            Number(
                options.balance ??
                loan.balance ??
                0
            ),

        previousBalance:
            Number(
                options.previousBalance ??
                0
            ),

        weeklyPayment:
            Number(
                loan.weeklyPayment ||
                0
            ),

        nextRepaymentDate:
            loan.nextRepaymentDate ||
            "",

        dueDate:
            options.dueDate ||
            loan.nextRepaymentDate ||
            "",

        status:
            options.status ||
            loan.status ||
            "",

        messageType:
            options.messageType ||
            options.type ||
            "",

        type:
            options.messageType ||
            options.type ||
            ""
    };
}


// ==========================================================
// FIND MESSAGING FUNCTION
// ==========================================================

function getMessagingFunction() {

    if (
        typeof window ===
        "undefined"
    ) {
        return null;
    }


    /*
     * Support the different messaging
     * exports used by the existing
     * GREYMUS messaging versions.
     */

    const sources = [

        window.GREYMUS_MESSAGING,

        window.greymusMessaging,

        window
    ];


    for (
        const source
        of sources
    ) {

        if (!source) {
            continue;
        }


        const functionNames = [

            "sendLoanMessage",

            "sendClientMessage",

            "sendMessage",

            "openNativeSms",

            "openClientSms"
        ];


        for (
            const name
            of functionNames
        ) {

            if (
                typeof source[name] ===
                "function"
            ) {

                return {

                    fn:
                        source[name],

                    owner:
                        source
                };
            }
        }
    }


    return null;
}


// ==========================================================
// CALL MESSAGING MODULE SAFELY
// ==========================================================

async function callMessagingModule(
    payload
) {

    try {

        if (!payload) {
            return false;
        }


        const messenger =
            getMessagingFunction();


        if (!messenger) {

            console.warn(
                "GREYMUS messaging module is unavailable. Financial operation continues."
            );

            return false;
        }


        /*
         * Do not let messaging errors
         * propagate into loan operations.
         */

        await Promise.resolve(
            messenger.fn.call(
                messenger.owner,
                payload
            )
        );


        return true;

    } catch (error) {

        console.error(
            "GREYMUS messaging error:",
            error
        );


        return false;
    }
}


// ==========================================================
// SAFE GENERAL LOAN MESSAGE
// ==========================================================

async function sendLoanMessageSafely(
    loanId,
    messageType,
    extraData = {}
) {

    try {

        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if (!loan) {

            console.warn(
                "Messaging skipped: loan not found.",
                loanId
            );

            return false;
        }


        const payload =
            buildLoanMessagingPayload(
                loan,
                {

                    ...extraData,

                    messageType:
                        messageType
                }
            );


        if (!payload) {
            return false;
        }


        return await callMessagingModule(
            payload
        );

    } catch (error) {

        console.error(
            "Safe loan messaging error:",
            error
        );


        return false;
    }
}


// ==========================================================
// SEND LOAN APPROVAL MESSAGE
// ==========================================================

async function sendLoanApprovalMessage(
    loanId
) {

    try {

        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if (!loan) {
            return false;
        }


        const balance =
            Number(
                loan.balance ??
                loan.totalRepayment ??
                0
            );


        return await sendLoanMessageSafely(
            loanId,
            "loan-approved",
            {

                balance:
                    balance,

                status:
                    "Active"
            }
        );

    } catch (error) {

        console.error(
            "Loan approval messaging error:",
            error
        );

        return false;
    }
}


// ==========================================================
// SEND REPAYMENT MESSAGE
// ==========================================================

async function sendLoanRepaymentMessage(
    loanId,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    try {

        const numericBalance =
            Number(
                newBalance ||
                0
            );


        let messageType =
            "partial";


        if (
            numericBalance <=
            0
        ) {

            messageType =
                "full";

        } else if (
            normalizeLoanStatus(
                status
            ) ===
            "Arrears"
        ) {

            messageType =
                "partial-arrears";
        }


        return await sendLoanMessageSafely(
            loanId,
            messageType,
            {

                amount:
                    paymentAmount,

                paymentAmount:
                    paymentAmount,

                previousBalance:
                    previousBalance,

                balance:
                    numericBalance,

                status:
                    status
            }
        );

    } catch (error) {

        console.error(
            "Repayment messaging error:",
            error
        );

        return false;
    }
}


// ==========================================================
// END OF PART 10/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 11/16
// REPAYMENT SUBMISSION
// ==========================================================


// ==========================================================
// REPAYMENT SUBMISSION
// ==========================================================

repaymentForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (repaymentSaving) {
            return;
        }


        const loanId =
            directLoanRepaymentMode
                ? (
                    selectedLoanId ||
                    repaymentLoanId?.value
                )
                : repaymentLoanId?.value;


        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if (!loan) {

            alert(
                directLoanRepaymentMode
                    ? "The selected loan could not be found."
                    : "Please select a client with an outstanding loan."
            );

            return;
        }


        const payment =
            Number(
                repaymentAmount?.value ||
                0
            );


        if (
            !Number.isFinite(payment) ||
            payment <= 0
        ) {

            alert(
                "Enter a valid repayment amount."
            );

            repaymentAmount?.focus();

            return;
        }


        const currentBalance =
            Number(
                loan.balance ||
                0
            );


        if (currentBalance <= 0) {

            alert(
                "This loan has no outstanding balance."
            );

            return;
        }


        if (
            payment >
            currentBalance
        ) {

            alert(
                "Payment cannot exceed the outstanding balance."
            );

            return;
        }


        if (
            !confirm(
                `Confirm repayment of ${currency(
                    payment
                )} for ${loan.clientName || "this client"}?`
            )
        ) {
            return;
        }


        repaymentSaving =
            true;


        const saveButton =
            repaymentForm.querySelector(
                'button[type="submit"]'
            );


        const originalButtonText =
            saveButton?.innerHTML ||
            "Save Repayment";


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.innerHTML =
                "Saving...";
        }


        try {

            // ==================================================
            // COPY REPAYMENT SCHEDULE
            // ==================================================

            const schedule =
                Array.isArray(
                    loan.repaymentSchedule
                )
                    ? JSON.parse(
                        JSON.stringify(
                            loan.repaymentSchedule
                        )
                    )
                    : [];


            if (!schedule.length) {

                throw new Error(
                    "This loan does not have a repayment schedule."
                );
            }


            let remainingPayment =
                payment;


            // ==================================================
            // APPLY PAYMENT TO EARLIEST UNPAID INSTALLMENTS
            // ==================================================

            for (
                const installment
                of schedule
            ) {

                if (
                    remainingPayment <=
                    0.009
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


                const remainingAmount =
                    Math.max(
                        installmentAmount -
                        alreadyPaid,
                        0
                    );


                if (
                    remainingAmount <=
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
                        remainingAmount
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
                    !Array.isArray(
                        installment.paymentHistory
                    )
                ) {

                    installment.paymentHistory =
                        [];
                }


                const paymentRecord = {

                    paymentId:
                        `PAY-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`,

                    amount:
                        applied,

                    date:
                        repaymentDate?.value ||
                        today(),

                    notes:
                        repaymentNotes?.value ||
                        "",

                    repaymentDocId:
                        null
                };


                installment.paymentHistory.push(
                    paymentRecord
                );


                if (
                    installment.remainingAmount <=
                    0.009
                ) {

                    installment.remainingAmount =
                        0;

                    installment.paid =
                        true;

                    installment.status =
                        "Paid";

                    installment.paidDate =
                        paymentRecord.date;

                } else {

                    installment.paid =
                        false;

                    installment.status =
                        "Partial";

                    installment.paidDate =
                        null;
                }


                remainingPayment -=
                    applied;
            }


            // ==================================================
            // VERIFY FULL PAYMENT ALLOCATION
            // ==================================================

            if (
                remainingPayment >
                0.01
            ) {

                throw new Error(
                    "The repayment could not be fully allocated to the loan schedule."
                );
            }


            // ==================================================
            // CALCULATE NEW LOAN TOTALS
            // ==================================================

            const previousAmountPaid =
                Number(
                    loan.amountPaid ||
                    0
                );


            const newAmountPaid =
                previousAmountPaid +
                payment;


            const totalRepayment =
                Number(
                    loan.totalRepayment ||
                    0
                );


            const newBalance =
                Math.max(
                    totalRepayment -
                    newAmountPaid,
                    0
                );


            // ==================================================
            // FIND NEXT UNPAID INSTALLMENT
            // ==================================================

            const nextInstallment =
                schedule.find(
                    installment => {

                        return (
                            !installment.paid &&
                            Number(
                                installment.remainingAmount ||
                                0
                            ) > 0
                        );
                    }
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


            // ==================================================
            // DETERMINE NEW STATUS
            // ==================================================

            let newStatus =
                "Active";


            if (
                newBalance <=
                0
            ) {

                newStatus =
                    "Completed";

            } else if (
                nextRepaymentDate &&
                nextRepaymentDate <
                    today()
            ) {

                newStatus =
                    "Arrears";

            } else {

                newStatus =
                    "Active";
            }


            // ==================================================
            // CALCULATE REPAYMENT INCOME
            // ==================================================

            const totalInterest =
                Math.max(
                    totalRepayment -
                    Number(
                        loan.amount ||
                        0
                    ),
                    0
                );


            const interestRatio =
                totalRepayment > 0
                    ? totalInterest /
                      totalRepayment
                    : 0;


            const repaymentInterest =
                payment *
                interestRatio;


            const newTotalIncome =
                Number(
                    loan.totalIncome ||
                    0
                ) +
                repaymentInterest;


            // ==================================================
            // UPDATE LOAN
            // ==================================================

            await updateDoc(
                doc(
                    db,
                    "loans",
                    loan.id
                ),
                {

                    amountPaid:
                        newAmountPaid,

                    balance:
                        newBalance,

                    totalIncome:
                        newTotalIncome,

                    repaymentSchedule:
                        schedule,

                    nextRepaymentDate:
                        nextRepaymentDate ||
                        "-",

                    remainingInstallments:
                        remainingInstallments,

                    status:
                        newStatus,

                    completed:
                        newBalance <=
                        0,

                    updatedAt:
                        serverTimestamp()
                }
            );


            // ==================================================
            // CREATE REPAYMENT RECORD
            // ==================================================

            const repaymentRef =
                await addDoc(
                    collection(
                        db,
                        "repayments"
                    ),
                    {

                        loanId:
                            loan.id,

                        loanNumber:
                            loan.loanNumber ||
                            "",

                        clientId:
                            loan.clientId ||
                            "",

                        clientName:
                            loan.clientName ||
                            "",

                        amount:
                            payment,

                        date:
                            repaymentDate?.value ||
                            today(),

                        notes:
                            repaymentNotes?.value ||
                            "",

                        balanceBefore:
                            currentBalance,

                        balanceAfter:
                            newBalance,

                        recordedBy:
                            localStorage.getItem(
                                "userName"
                            ) ||
                            localStorage.getItem(
                                "userEmail"
                            ) ||
                            "Unknown Officer",

                        createdAt:
                            serverTimestamp(),

                        timestamp:
                            new Date()
                                .toISOString()
                    }
                );


            // ==================================================
            // LINK REPAYMENT DOCUMENT TO PAYMENT RECORD
            // ==================================================

            let paymentLinked =
                false;


            for (
                const installment
                of schedule
            ) {

                if (
                    !Array.isArray(
                        installment.paymentHistory
                    )
                ) {
                    continue;
                }


                for (
                    const record
                    of installment.paymentHistory
                ) {

                    if (
                        record.paymentId &&
                        !record.repaymentDocId &&
                        !paymentLinked
                    ) {

                        record.repaymentDocId =
                            repaymentRef.id;

                        paymentLinked =
                            true;
                    }
                }
            }


            if (paymentLinked) {

                await updateDoc(
                    doc(
                        db,
                        "loans",
                        loan.id
                    ),
                    {

                        repaymentSchedule:
                            schedule,

                        updatedAt:
                            serverTimestamp()
                    }
                );
            }


            // ==================================================
            // HISTORY
            // ==================================================

            await logHistory(
                "Repayment Received",
                "Repayment",
                {

                    loanId:
                        loan.loanNumber ||
                        loan.id,

                    client:
                        loan.clientName ||
                        "",

                    amount:
                        payment,

                    previousBalance:
                        currentBalance,

                    newBalance:
                        newBalance,

                    status:
                        newStatus
                }
            );


            // ==================================================
            // END OF PART 11
            // ==================================================

        } catch (error) {

            console.error(
                "Repayment save error:",
                error
            );


            alert(
                "Failed to save repayment.\n\n" +
                (
                    error?.message ||
                    "Unknown error."
                )
            );

        } finally {

            repaymentSaving =
                false;


            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.innerHTML =
                    originalButtonText;
            }
        }
    }
);


// ==========================================================
// END OF PART 11/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 12/16
// REPAYMENT → CLIENT MESSAGE INTEGRATION
//
// IMPORTANT:
// Financial processing is completed BEFORE messaging.
// Messaging errors can NEVER cancel a successful repayment.
// ==========================================================


// ==========================================================
// REPAYMENT MESSAGE AFTER SUCCESSFUL TRANSACTION
// ==========================================================

async function triggerRepaymentClientMessage(
    loan,
    paymentAmount,
    previousBalance,
    newBalance,
    newStatus
) {

    if (!loan) {
        return false;
    }


    try {

        /*
         * Determine the correct message type.
         *
         * full:
         * Loan has been completely cleared.
         *
         * partial-arrears:
         * Payment was received but the loan remains
         * in arrears.
         *
         * partial:
         * Normal partial repayment.
         */

        let messageType =
            "partial";


        if (
            Number(newBalance) <= 0
        ) {

            messageType =
                "full";

        } else if (
            normalizeLoanStatus(
                newStatus
            ) === "Arrears"
        ) {

            messageType =
                "partial-arrears";
        }


        /*
         * Build the message payload using the
         * updated financial information.
         */

        const payload =
            buildLoanMessagingPayload(
                loan,
                {

                    messageType:
                        messageType,

                    amount:
                        Number(
                            paymentAmount ||
                            0
                        ),

                    paymentAmount:
                        Number(
                            paymentAmount ||
                            0
                        ),

                    previousBalance:
                        Number(
                            previousBalance ||
                            0
                        ),

                    balance:
                        Number(
                            newBalance ||
                            0
                        ),

                    status:
                        newStatus
                }
            );


        if (!payload) {

            console.warn(
                "Repayment message skipped: payload unavailable."
            );

            return false;
        }


        /*
         * Messaging is optional.
         *
         * The repayment is already successful,
         * so any messaging error is isolated.
         */

        return await callMessagingModule(
            payload
        );

    } catch (error) {

        console.error(
            "Repayment client message error:",
            error
        );

        return false;
    }
}


// ==========================================================
// LOAN APPROVAL → CLIENT MESSAGE
// ==========================================================

async function triggerLoanApprovalClientMessage(
    loan
) {

    if (!loan) {
        return false;
    }


    try {

        const payload =
            buildLoanMessagingPayload(
                loan,
                {

                    messageType:
                        "loan-approved",

                    balance:
                        Number(
                            loan.balance ??
                            loan.totalRepayment ??
                            0
                        ),

                    status:
                        "Active"
                }
            );


        if (!payload) {

            console.warn(
                "Approval message skipped: payload unavailable."
            );

            return false;
        }


        return await callMessagingModule(
            payload
        );

    } catch (error) {

        console.error(
            "Loan approval client message error:",
            error
        );

        return false;
    }
}


// ==========================================================
// SAFE MESSAGE BRIDGE
// ==========================================================

async function safelyNotifyLoanClient(
    loan,
    options = {}
) {

    /*
     * This function intentionally catches ALL
     * messaging errors.
     *
     * Never throw a messaging exception back
     * into repayment or loan approval logic.
     */

    try {

        if (!loan) {
            return false;
        }


        const messageType =
            options.messageType ||
            "";


        if (!messageType) {

            console.warn(
                "Client notification skipped: message type missing."
            );

            return false;
        }


        const payload =
            buildLoanMessagingPayload(
                loan,
                {

                    ...options,

                    messageType:
                        messageType
                }
            );


        if (!payload) {
            return false;
        }


        return await callMessagingModule(
            payload
        );

    } catch (error) {

        console.error(
            "Safe client notification error:",
            error
        );

        return false;
    }
}


// ==========================================================
// PUBLIC COMPATIBILITY HELPERS
// ==========================================================

/*
 * These wrappers allow older sections of loans.js
 * to continue calling the messaging layer without
 * requiring messaging.js to expose one exact API.
 */

async function sendLoanMessageSafely(
    loanId,
    messageType,
    extraData = {}
) {

    try {

        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if (!loan) {
            return false;
        }


        return await safelyNotifyLoanClient(
            loan,
            {

                ...extraData,

                messageType:
                    messageType
            }
        );

    } catch (error) {

        console.error(
            "sendLoanMessageSafely error:",
            error
        );

        return false;
    }
}


async function sendRepaymentMessageSafely(
    loanId,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    try {

        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if (!loan) {
            return false;
        }


        return await triggerRepaymentClientMessage(
            loan,
            paymentAmount,
            previousBalance,
            newBalance,
            status
        );

    } catch (error) {

        console.error(
            "sendRepaymentMessageSafely error:",
            error
        );

        return false;
    }
}


// ==========================================================
// END OF PART 12/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 13/16
// LOAN DETAILS + REPAYMENT ACTIONS
// ==========================================================


// ==========================================================
// GET LOAN DETAILS BY ID
// ==========================================================

function getLoanDetailsById(id) {

    if (!id) {
        return null;
    }

    return loans.find(
        loan =>
            loan.id === id
    ) || null;
}


// ==========================================================
// OPEN LOAN DETAILS PAGE
// ==========================================================

function openLoanDetailsPage(id) {

    const loan =
        getLoanDetailsById(id);

    if (!loan) {

        alert(
            "Loan not found."
        );

        return;
    }

    selectedLoanId =
        loan.id;

    loanDetailsOpen =
        true;

    renderLoanDetailsPage(
        loan
    );
}


// ==========================================================
// RENDER LOAN DETAILS PAGE
// ==========================================================

function renderLoanDetailsPage(
    loan
) {

    if (!loan) {
        return;
    }

    const container =
        document.getElementById(
            "loan-details-page"
        );

    if (!container) {

        console.warn(
            "Loan details container not found."
        );

        return;
    }


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    const balance =
        Number(
            loan.balance || 0
        );


    const amountPaid =
        Number(
            loan.amountPaid || 0
        );


    const totalRepayment =
        Number(
            loan.totalRepayment || 0
        );


    const status =
        normalizeLoanStatus(
            loan.status
        );


    const nextInstallment =
        schedule.find(
            item =>
                !item.paid &&
                Number(
                    item.remainingAmount ||
                    item.amount ||
                    0
                ) > 0
        );


    const nextDueDate =
        nextInstallment?.dueDate ||
        loan.nextRepaymentDate ||
        "-";


    container.innerHTML = `

        <div class="loan-details-header">

            <button
                type="button"
                class="loan-details-back"
                id="loan-details-back"
            >
                ← Back
            </button>

            <div>

                <h2>
                    Loan Details
                </h2>

                <div class="loan-details-client-name">
                    ${
                        loan.clientName ||
                        "Unnamed Client"
                    }
                </div>

            </div>

        </div>


        <div class="loan-details-summary">

            <div class="loan-detail-card">

                <span>
                    Loan Amount
                </span>

                <strong>
                    ${currency(
                        loan.amount || 0
                    )}
                </strong>

            </div>


            <div class="loan-detail-card">

                <span>
                    Total Repayment
                </span>

                <strong>
                    ${currency(
                        totalRepayment
                    )}
                </strong>

            </div>


            <div class="loan-detail-card">

                <span>
                    Amount Paid
                </span>

                <strong>
                    ${currency(
                        amountPaid
                    )}
                </strong>

            </div>


            <div class="loan-detail-card">

                <span>
                    Outstanding Balance
                </span>

                <strong>
                    ${currency(
                        balance
                    )}
                </strong>

            </div>


            <div class="loan-detail-card">

                <span>
                    Status
                </span>

                <strong>
                    ${status}
                </strong>

            </div>


            <div class="loan-detail-card">

                <span>
                    Next Repayment
                </span>

                <strong>
                    ${nextDueDate}
                </strong>

            </div>

        </div>


        <div class="loan-details-actions">

            ${
                balance > 0
                    ? `
                        <button
                            type="button"
                            class="btn-primary"
                            data-action="receive-repayment"
                            data-loan-id="${loan.id}"
                        >
                            Receive Repayment
                        </button>
                      `
                    : ""
            }


            ${
                status === "Pending"
                    ? `
                        <button
                            type="button"
                            class="btn-success"
                            data-action="approve-loan"
                            data-loan-id="${loan.id}"
                        >
                            Approve Loan
                        </button>
                      `
                    : ""
            }


            ${
                status === "Pending" &&
                typeof isAdmin ===
                    "function" &&
                isAdmin()
                    ? `
                        <button
                            type="button"
                            class="btn-danger"
                            data-action="delete-loan"
                            data-loan-id="${loan.id}"
                        >
                            Delete Loan
                        </button>
                      `
                    : ""
            }

        </div>


        <div class="loan-details-section">

            <h3>
                Repayment Schedule
            </h3>

            <div
                class="loan-repayment-schedule"
            >

                ${
                    schedule.length
                        ? schedule
                            .map(
                                (
                                    item,
                                    index
                                ) => {

                                    const installmentAmount =
                                        Number(
                                            item.amount ||
                                            0
                                        );

                                    const paidAmount =
                                        Number(
                                            item.paidAmount ||
                                            0
                                        );

                                    const remaining =
                                        Number(
                                            item.remainingAmount ??
                                            Math.max(
                                                installmentAmount -
                                                paidAmount,
                                                0
                                            )
                                        );

                                    const itemStatus =
                                        item.paid
                                            ? "Paid"
                                            : remaining <
                                              installmentAmount
                                                ? "Partial"
                                                : "Pending";

                                    return `

                                        <div
                                            class="repayment-schedule-card"
                                        >

                                            <div>

                                                <strong>
                                                    Installment ${
                                                        index +
                                                        1
                                                    }
                                                </strong>

                                                <span>
                                                    Due:
                                                    ${
                                                        item.dueDate ||
                                                        "-"
                                                    }
                                                </span>

                                            </div>


                                            <div>

                                                <span>
                                                    Amount:
                                                    ${currency(
                                                        installmentAmount
                                                    )}
                                                </span>

                                                <span>
                                                    Paid:
                                                    ${currency(
                                                        paidAmount
                                                    )}
                                                </span>

                                                <span>
                                                    Remaining:
                                                    ${currency(
                                                        remaining
                                                    )}
                                                </span>

                                            </div>


                                            <strong>
                                                ${itemStatus}
                                            </strong>

                                        </div>

                                    `;
                                }
                            )
                            .join("")
                        : `
                            <div class="empty-state">
                                No repayment schedule available.
                            </div>
                          `
                }

            </div>

        </div>

    `;


    container.classList.remove(
        "hidden"
    );


    const backButton =
        document.getElementById(
            "loan-details-back"
        );


    backButton?.addEventListener(
        "click",
        () => {

            closeLoanDetailsPage();

        }
    );


    /*
     * IMPORTANT:
     *
     * Use delegated actions below so that
     * dynamically rendered buttons continue
     * working after every refresh.
     */

    container
        .querySelectorAll(
            "[data-action=\"receive-repayment\"]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        openRepaymentForLoan(
                            button.dataset.loanId
                        );

                    }
                );
            }
        );


    container
        .querySelectorAll(
            "[data-action=\"approve-loan\"]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        approveLoan(
                            button.dataset.loanId
                        );

                    }
                );
            }
        );


    container
        .querySelectorAll(
            "[data-action=\"delete-loan\"]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        deleteLoan(
                            button.dataset.loanId
                        );

                    }
                );
            }
        );
}


// ==========================================================
// CLOSE LOAN DETAILS PAGE
// ==========================================================

function closeLoanDetailsPage() {

    const container =
        document.getElementById(
            "loan-details-page"
        );

    if (container) {

        container.classList.add(
            "hidden"
        );
    }


    loanDetailsOpen =
        false;


    selectedLoanId =
        null;


    if (
        typeof filterLoans ===
        "function"
    ) {

        filterLoans();
    }
}


// ==========================================================
// LOAN TABLE → DETAILS
// ==========================================================

document.addEventListener(
    "click",
    event => {

        const trigger =
            event.target.closest(
                "[data-loan-details], " +
                "[data-action=\"loan-details\"], " +
                ".loan-details-btn"
            );

        if (!trigger) {
            return;
        }


        const id =
            trigger.dataset.loanId ||
            trigger.dataset.loanDetails;


        if (!id) {
            return;
        }


        event.preventDefault();

        event.stopPropagation();


        openLoanDetailsPage(
            id
        );

    },
    true
);


// ==========================================================
// END OF PART 13/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 14/16
// LOAN TABLE ACTIONS + SAFE REPAYMENT MODAL CONTROL
// ==========================================================


// ==========================================================
// LOAN TABLE ACTION HANDLER
// ==========================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }


        const action =
            button.dataset.action;


        const loanId =
            button.dataset.loanId ||
            button.dataset.id ||
            "";


        if (!loanId) {
            return;
        }


        // ------------------------------------------
        // RECEIVE REPAYMENT
        // ------------------------------------------

        if (
            action ===
            "receive-repayment"
        ) {

            event.preventDefault();
            event.stopPropagation();

            openRepaymentForLoan(
                loanId
            );

            return;
        }


        // ------------------------------------------
        // APPROVE LOAN
        // ------------------------------------------

        if (
            action ===
            "approve-loan"
        ) {

            event.preventDefault();
            event.stopPropagation();

            approveLoan(
                loanId
            );

            return;
        }


        // ------------------------------------------
        // DELETE LOAN
        // ------------------------------------------

        if (
            action ===
            "delete-loan"
        ) {

            event.preventDefault();
            event.stopPropagation();

            deleteLoan(
                loanId
            );

            return;
        }

    },
    true
);


// ==========================================================
// SAFE REPAYMENT MODAL OPEN
// ==========================================================

function openRepaymentModalSafely(
    loan
) {

    if (!loan) {

        alert(
            "Loan not found."
        );

        return false;
    }


    if (
        Number(
            loan.balance || 0
        ) <= 0
    ) {

        alert(
            "This loan has no outstanding balance."
        );

        return false;
    }


    const modal =
        document.getElementById(
            "repayment-modal"
        );

    const form =
        document.getElementById(
            "repayment-form"
        );


    if (
        !modal ||
        !form
    ) {

        alert(
            "Repayment form is unavailable."
        );

        return false;
    }


    directLoanRepaymentMode =
        true;


    selectedLoanId =
        loan.id;


    createFabRepaymentSelectors(
        form
    );


    hideFabRepaymentSelectors();


    /*
     * Reset only the fields belonging
     * to the repayment transaction.
     *
     * Do not reset the entire application
     * or loan table.
     */

    if (repaymentLoanId) {

        repaymentLoanId.value =
            loan.id;
    }


    if (repaymentClient) {

        if (
            repaymentClient.tagName ===
            "SELECT"
        ) {

            repaymentClient.value =
                loan.clientId ||
                "";

        } else {

            repaymentClient.value =
                loan.clientName ||
                "";
        }
    }


    if (repaymentBalance) {

        repaymentBalance.value =
            currency(
                Number(
                    loan.balance || 0
                )
            );
    }


    if (repaymentAmount) {

        repaymentAmount.value =
            "";

        repaymentAmount.setCustomValidity(
            ""
        );
    }


    if (repaymentNotes) {

        repaymentNotes.value =
            "";
    }


    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    modal.style.position =
        "fixed";

    modal.style.zIndex =
        "100001";


    modal.classList.remove(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            repaymentAmount?.focus();

        },
        100
    );


    return true;
}


// ==========================================================
// OVERRIDE DIRECT REPAYMENT OPEN
// ==========================================================

function openRepaymentForLoanSafe(
    id
) {

    const loan =
        getLoanDetailsById(
            id
        );


    if (!loan) {

        alert(
            "Loan not found."
        );

        return;
    }


    openRepaymentModalSafely(
        loan
    );
}


// ==========================================================
// REPAYMENT MODAL STATE RESET
// ==========================================================

function resetRepaymentModalFields() {

    if (repaymentLoanId) {

        repaymentLoanId.value =
            "";
    }


    if (repaymentBalance) {

        repaymentBalance.value =
            "";
    }


    if (repaymentAmount) {

        repaymentAmount.value =
            "";

        repaymentAmount.setCustomValidity(
            ""
        );
    }


    if (repaymentNotes) {

        repaymentNotes.value =
            "";
    }


    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    selectedLoanId =
        null;
}


// ==========================================================
// SAFE MODAL CLOSE
// ==========================================================

function closeRepaymentModalSafely() {

    const modal =
        document.getElementById(
            "repayment-modal"
        );


    if (!modal) {
        return;
    }


    const wasDirectMode =
        directLoanRepaymentMode;


    const returnLoanId =
        selectedLoanId;


    modal.classList.add(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    modal.style.zIndex =
        "";


    directLoanRepaymentMode =
        false;


    /*
     * Clear repayment-only values.
     */

    if (repaymentAmount) {

        repaymentAmount.value =
            "";

        repaymentAmount.setCustomValidity(
            ""
        );
    }


    if (repaymentNotes) {

        repaymentNotes.value =
            "";
    }


    if (repaymentLoanId) {

        repaymentLoanId.value =
            "";
    }


    if (repaymentBalance) {

        repaymentBalance.value =
            "";
    }


    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    showFabRepaymentSelectors();


    /*
     * If repayment was opened from
     * Loan Details, refresh that page.
     *
     * Do NOT close or reload the loans
     * table unnecessarily.
     */

    if (
        wasDirectMode &&
        loanDetailsOpen &&
        returnLoanId
    ) {

        const updatedLoan =
            loans.find(
                loan =>
                    loan.id ===
                    returnLoanId
            );


        if (updatedLoan) {

            renderLoanDetailsPage(
                updatedLoan
            );
        }
    }
}


// ==========================================================
// REPAYMENT MODAL CLOSE DELEGATION
// ==========================================================

document.addEventListener(
    "click",
    event => {

        const closeButton =
            event.target.closest(
                "#close-repayment-modal, " +
                ".close-repayment-modal, " +
                "[data-close=\"repayment-modal\"], " +
                "[data-modal-close=\"repayment-modal\"]"
            );


        if (!closeButton) {
            return;
        }


        event.preventDefault();

        event.stopPropagation();


        closeRepaymentModalSafely();

    },
    true
);


// ==========================================================
// REPAYMENT BACKDROP
// ==========================================================

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "repayment-modal"
            );


        if (
            !modal ||
            event.target !== modal
        ) {
            return;
        }


        if (
            modal.classList.contains(
                "hidden"
            )
        ) {
            return;
        }


        closeRepaymentModalSafely();

    }
);


// ==========================================================
// ESCAPE — REPAYMENT MODAL
// ==========================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        const modal =
            document.getElementById(
                "repayment-modal"
            );


        if (
            modal &&
            !modal.classList.contains(
                "hidden"
            )
        ) {

            event.preventDefault();

            closeRepaymentModalSafely();

        }

    }
);


// ==========================================================
// REPAYMENT CLIENT SELECTOR SAFETY
// ==========================================================

document.addEventListener(
    "change",
    event => {

        if (
            event.target.id !==
            "fab-repayment-client-select"
        ) {
            return;
        }


        const clientId =
            event.target.value;


        loadLoansForSelectedClient(
            clientId
        );

    }
);


// ==========================================================
// REPAYMENT LOAN SELECTOR SAFETY
// ==========================================================

document.addEventListener(
    "change",
    event => {

        if (
            event.target.id !==
            "fab-repayment-loan-select"
        ) {
            return;
        }


        const loanId =
            event.target.value;


        if (!loanId) {

            clearRepaymentFields();

            return;
        }


        fillRepaymentFromSelectedLoan(
            loanId
        );

    }
);


// ==========================================================
// FAB REPAYMENT OPEN HANDLER
// ==========================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#fab-add-repayment, " +
                "#fab-repayment, " +
                "[data-action=\"add-repayment\"]"
            );


        if (!button) {
            return;
        }


        event.preventDefault();
        event.stopPropagation();


        openFabRepaymentSelector();

    },
    true
);


// ==========================================================
// END OF PART 14/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 15/16
// FILTERS + OVERDUE STATUS + SAFE AUTO REFRESH
// ==========================================================


// ==========================================================
// YEAR FILTER
// ==========================================================

function populateYearFilter() {

    if (!loanYearFilter) {
        return;
    }


    const years = [
        ...new Set(
            loans
                .map(
                    loan => {

                        const date =
                            loan.approvalDate
                                ? new Date(
                                    loan.approvalDate
                                )
                                : loan.createdAt?.toDate
                                    ? loan.createdAt.toDate()
                                    : null;

                        return date &&
                            !Number.isNaN(
                                date.getTime()
                            )
                            ? date.getFullYear()
                            : null;
                    }
                )
                .filter(
                    year =>
                        year !== null
                )
        )
    ].sort(
        (a, b) =>
            b - a
    );


    loanYearFilter.innerHTML =
        `<option value="ALL">All</option>`;


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


// ==========================================================
// FILTER LOANS
// ==========================================================

function getFilteredLoans() {

    let filtered =
        [...loans];


    /*
     * Keep the existing rule that the main
     * loan table only displays running loans.
     *
     * Historical/completed records remain
     * available through the appropriate
     * history/status views.
     */

    filtered =
        filtered.filter(
            loan =>
                typeof isRunningLoan ===
                    "function"
                    ? isRunningLoan(loan)
                    : true
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


    // ------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------

    if (keyword) {

        filtered =
            filtered.filter(
                loan => {

                    const clientName =
                        String(
                            loan.clientName ||
                            ""
                        ).toLowerCase();


                    const loanId =
                        String(
                            loan.id ||
                            ""
                        ).toLowerCase();


                    const loanNumber =
                        String(
                            loan.loanNumber ||
                            ""
                        ).toLowerCase();


                    return (
                        clientName.includes(
                            keyword
                        ) ||

                        loanId.includes(
                            keyword
                        ) ||

                        loanNumber.includes(
                            keyword
                        )
                    );
                }
            );
    }


    // ------------------------------------------------------
    // STATUS
    // ------------------------------------------------------

    if (
        status !==
        "ALL"
    ) {

        filtered =
            filtered.filter(
                loan => {

                    return (
                        normalizeLoanStatus(
                            loan.status
                        ) ===
                        normalizeLoanStatus(
                            status
                        )
                    );
                }
            );
    }


    // ------------------------------------------------------
    // MONTH / YEAR
    // ------------------------------------------------------

    if (
        month !== "ALL" ||
        year !== "ALL"
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
                                : null;


                    if (
                        !date ||
                        Number.isNaN(
                            date.getTime()
                        )
                    ) {

                        return false;
                    }


                    const monthMatch =
                        month === "ALL" ||
                        date.getMonth() ===
                            Number(
                                month
                            );


                    const yearMatch =
                        year === "ALL" ||
                        date.getFullYear() ===
                            Number(
                                year
                            );


                    return (
                        monthMatch &&
                        yearMatch
                    );
                }
            );
    }


    return filtered;
}


// ==========================================================
// APPLY FILTERS
// ==========================================================

function filterLoans() {

    /*
     * Do not rerender the loan table while
     * the full-screen details page is open.
     *
     * This prevents the table from replacing
     * the details interface unexpectedly.
     */

    if (
        typeof loanDetailsOpen !==
        "undefined" &&
        loanDetailsOpen
    ) {

        return;
    }


    if (
        typeof renderLoans !==
        "function"
    ) {

        return;
    }


    renderLoans(
        getFilteredLoans()
    );
}


// ==========================================================
// FILTER EVENTS
// ==========================================================

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


// ==========================================================
// CHECK OVERDUE LOANS
// ==========================================================

async function checkOverdueLoans() {

    const todayDate =
        today();


    if (
        !Array.isArray(
            loans
        )
    ) {

        return;
    }


    for (
        const loan of loans
    ) {

        const currentStatus =
            normalizeLoanStatus(
                loan.status
            );


        /*
         * These records should not be
         * automatically changed.
         */

        if (
            currentStatus ===
                "Pending" ||

            currentStatus ===
                "Completed" ||

            currentStatus ===
                "Rejected"
        ) {

            continue;
        }


        const schedule =
            Array.isArray(
                loan.repaymentSchedule
            )
                ? loan.repaymentSchedule
                : [];


        let nextRepayment =
            null;

        let hasArrears =
            false;


        /*
         * Find the earliest unpaid
         * installment.
         */

        for (
            const item of schedule
        ) {

            if (
                item.paid ===
                true
            ) {

                continue;
            }


            const remaining =
                Number(
                    item.remainingAmount ??
                    item.amount ??
                    0
                );


            if (
                remaining <=
                0
            ) {

                continue;
            }


            nextRepayment =
                item.dueDate ||
                null;


            if (
                nextRepayment &&
                nextRepayment <
                    todayDate
            ) {

                hasArrears =
                    true;
            }


            break;
        }


        let newStatus;


        if (
            !nextRepayment
        ) {

            /*
             * No unpaid installment means
             * the loan is fully scheduled as
             * paid.
             */

            newStatus =
                Number(
                    loan.balance || 0
                ) <= 0
                    ? "Completed"
                    : "Active";

        } else if (
            hasArrears
        ) {

            newStatus =
                "Arrears";

        } else {

            newStatus =
                "Active";
        }


        const newCompleted =
            newStatus ===
            "Completed";


        const newRemainingInstallments =
            schedule.filter(
                item => {

                    if (
                        item.paid ===
                        true
                    ) {
                        return false;
                    }


                    return (
                        Number(
                            item.remainingAmount ??
                            item.amount ??
                            0
                        ) > 0
                    );
                }
            ).length;


        const newNextRepaymentDate =
            nextRepayment ||
            "-";


        /*
         * Avoid unnecessary Firestore writes.
         */

        if (
            normalizeLoanStatus(
                loan.status
            ) ===
                normalizeLoanStatus(
                    newStatus
                ) &&

            String(
                loan.nextRepaymentDate ||
                "-"
            ) ===
                String(
                    newNextRepaymentDate
                ) &&

            Number(
                loan.remainingInstallments ||
                0
            ) ===
                newRemainingInstallments &&

            Boolean(
                loan.completed
            ) ===
                newCompleted
        ) {

            continue;
        }


        try {

            await updateDoc(
                doc(
                    db,
                    "loans",
                    loan.id
                ),
                {

                    status:
                        newStatus,

                    completed:
                        newCompleted,

                    nextRepaymentDate:
                        newNextRepaymentDate,

                    remainingInstallments:
                        newRemainingInstallments,

                    updatedAt:
                        serverTimestamp()
                }
            );

        } catch (error) {

            /*
             * One failed loan update must not
             * stop the remaining loans from
             * being checked.
             */

            console.error(
                "Overdue loan update error:",
                loan.id,
                error
            );
        }
    }
}


// ==========================================================
// SAFE REFRESH
// ==========================================================

function safeRefreshLoanTable() {

    try {

        if (
            typeof loanDetailsOpen !==
                "undefined" &&
            loanDetailsOpen
        ) {

            return;
        }


        filterLoans();

    } catch (error) {

        console.error(
            "Loan table refresh error:",
            error
        );
    }
}


// ==========================================================
// AUTOMATIC OVERDUE CHECK
// ==========================================================

setInterval(
    () => {

        if (
            typeof checkOverdueLoans !==
            "function"
        ) {

            return;
        }


        checkOverdueLoans()
            .catch(
                error => {

                    console.error(
                        "Automatic overdue check failed:",
                        error
                    );
                }
            );

    },
    60000
);


// ==========================================================
// AUTOMATIC TABLE REFRESH
// ==========================================================

setInterval(
    () => {

        safeRefreshLoanTable();

    },
    30000
);


// ==========================================================
// OPEN DETAILS REFRESH
// ==========================================================

setInterval(
    () => {

        if (
            !loanDetailsOpen ||
            !selectedLoanId
        ) {

            return;
        }


        const loan =
            loans.find(
                item =>
                    item.id ===
                    selectedLoanId
            );


        if (!loan) {

            closeLoanDetailsPage();

            return;
        }


        try {

            renderLoanDetailsPage(
                loan
            );

        } catch (error) {

            console.error(
                "Loan details refresh error:",
                error
            );
        }

    },
    60000
);


// ==========================================================
// END OF PART 15/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 16/16
// INITIALIZATION + PUBLIC EXPORTS
//
// IMPORTANT:
// This final part intentionally contains only
// initialization, compatibility helpers and exports.
// It does NOT replace the loan-table rendering logic.
// ==========================================================


// ==========================================================
// REFRESH LOAN TABLE
// ==========================================================

function refreshLoanTable() {

    try {

        if (
            typeof loanDetailsOpen !==
                "undefined" &&
            loanDetailsOpen
        ) {

            return;
        }


        if (
            typeof filterLoans ===
            "function"
        ) {

            filterLoans();

        } else if (
            typeof renderLoans ===
            "function"
        ) {

            renderLoans(
                loans
            );
        }

    } catch (error) {

        console.error(
            "refreshLoanTable error:",
            error
        );
    }
}


// ==========================================================
// GET LOAN BY ID
// ==========================================================

function getLoanById(
    id
) {

    if (!id) {
        return null;
    }


    return loans.find(
        loan =>
            loan.id ===
            id
    ) || null;
}


// ==========================================================
// GET NEXT REPAYMENT
// ==========================================================

function getNextRepayment(
    schedule = []
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return null;
    }


    return (
        schedule.find(
            installment => {

                if (
                    installment.paid ===
                    true
                ) {

                    return false;
                }


                const remaining =
                    Number(
                        installment.remainingAmount ??
                        installment.amount ??
                        0
                    );


                return (
                    remaining >
                    0
                );
            }
        ) ||
        null
    );
}


// ==========================================================
// INITIALIZE REPAYMENT DATE
// ==========================================================

function initializeRepaymentDate() {

    if (
        typeof repaymentDate ===
        "undefined" ||
        !repaymentDate
    ) {

        return;
    }


    if (
        !repaymentDate.value
    ) {

        repaymentDate.value =
            today();
    }
}


// ==========================================================
// INITIALIZE YEAR FILTER
// ==========================================================

function initializeLoanFilters() {

    try {

        if (
            typeof populateYearFilter ===
            "function"
        ) {

            populateYearFilter();
        }


        /*
         * Do not force renderLoans here.
         *
         * loadLoans() is responsible for
         * loading Firestore data and rendering
         * the table.
         */

    } catch (error) {

        console.error(
            "Loan filter initialization error:",
            error
        );
    }
}


// ==========================================================
// INITIALIZE FAB REPAYMENT
// ==========================================================

function initializeFabRepayment() {

    try {

        if (
            typeof setupFabAddRepayment ===
            "function"
        ) {

            setupFabAddRepayment();
        }

    } catch (error) {

        console.error(
            "FAB repayment initialization error:",
            error
        );
    }
}


// ==========================================================
// INITIALIZE LOAN MODULE
// ==========================================================

let loansModuleInitialized =
    false;


async function initializeLoansModule() {

    /*
     * Prevent the module from initializing
     * more than once.
     *
     * This is important because index.html,
     * app.js or another module may trigger
     * DOMContentLoaded-related initialization.
     */

    if (
        loansModuleInitialized
    ) {

        return;
    }


    loansModuleInitialized =
        true;


    try {

        initializeRepaymentDate();

        initializeLoanFilters();

        initializeFabRepayment();


        /*
         * Load clients first because the
         * repayment selector depends on them.
         */

        if (
            typeof loadClients ===
            "function"
        ) {

            try {

                await loadClients();

            } catch (clientError) {

                console.error(
                    "Client loading error:",
                    clientError
                );
            }
        }


        /*
         * loadLoans() remains the primary
         * Firestore loader and table renderer.
         *
         * Do not call renderLoans() separately
         * before it completes.
         */

        if (
            typeof loadLoans ===
            "function"
        ) {

            try {

                await loadLoans();

            } catch (loanError) {

                console.error(
                    "Loan loading error:",
                    loanError
                );
            }
        }


        /*
         * Perform the overdue check only
         * after loans have been loaded.
         */

        if (
            typeof checkOverdueLoans ===
            "function"
        ) {

            try {

                await checkOverdueLoans();

            } catch (overdueError) {

                console.error(
                    "Initial overdue check error:",
                    overdueError
                );
            }
        }


        /*
         * Refresh the year filter after
         * Firestore data has been loaded.
         */

        try {

            populateYearFilter();

        } catch (filterError) {

            console.error(
                "Year filter refresh error:",
                filterError
            );
        }


    } catch (error) {

        console.error(
            "Loans module initialization error:",
            error
        );
    }
}


// ==========================================================
// DOM READY INITIALIZATION
// ==========================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeLoansModule,
        {
            once: true
        }
    );

} else {

    initializeLoansModule();

}


// ==========================================================
// PUBLIC GLOBAL HELPERS
// ==========================================================

/*
 * These are exposed globally so dynamically
 * generated HTML buttons can safely call
 * them using data-action handlers or inline
 * application integrations.
 */

if (
    typeof window !==
    "undefined"
) {

    window.getLoanById =
        getLoanById;


    window.getNextRepayment =
        getNextRepayment;


    window.refreshLoanTable =
        refreshLoanTable;


    window.openLoanDetailsPage =
        openLoanDetailsPage;


    window.openRepaymentForLoan =
        openRepaymentForLoanSafe;


    window.closeRepaymentModal =
        closeRepaymentModalSafely;


    window.approveLoan =
        approveLoan;


    window.deleteLoan =
        deleteLoan;


    window.sendLoanApprovalMessage =
        sendLoanApprovalMessage;


    window.sendLoanRepaymentMessage =
        sendLoanRepaymentMessage;

}


// ==========================================================
// MODULE EXPORTS
// ==========================================================

export {

    loadLoans,

    renderLoans,

    calculateLoan,

    currency,

    generateRepaymentSchedule,

    refreshLoanTable,

    getLoanById,

    getNextRepayment,

    openLoanDetailsPage,

    openRepaymentForLoanSafe,

    closeRepaymentModalSafely,

    approveLoan,

    deleteLoan,

    sendLoanApprovalMessage,

    sendLoanRepaymentMessage

};


// ==========================================================
// END OF LOANS.JS
// END OF PART 16/16
// ==========================================================