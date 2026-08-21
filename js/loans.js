// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS
// CLEAN REBUILD — PART 1/16
//
// IMPORTANT
// ----------------------------------------------------------
// This rebuild keeps loan operations independent from
// messaging.js. Messaging can fail without breaking:
// - Loan approval
// - Repayment saving
// - Loan balances
// - Repayment schedules
// - Firestore records
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
    doc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================================
// GLOBAL LOAN STATE
// ==========================================================

let loans = [];

let clients = [];


// ==========================================================
// UI STATE
// ==========================================================

let loanDetailsOpen =
    false;

let previousLoansOpen =
    false;

let selectedLoanId =
    null;

let directLoanRepaymentMode =
    false;


// ==========================================================
// REPAYMENT STATE
// ==========================================================

let repaymentSaving =
    false;

let repaymentSubmissionStarted =
    false;


// ==========================================================
// REALTIME LISTENER STATE
// ==========================================================

let loansRealtimeUnsubscribe =
    null;

let loansModuleInitialized =
    false;

let overdueCheckRunning =
    false;


// ==========================================================
// DOM SELECTORS
// ==========================================================

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


// ==========================================================
// REPAYMENT FORM SELECTORS
// ==========================================================

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
// TODAY
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
// MONTH KEY
// ==========================================================

function monthKey(
    date = new Date()
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}`
    );
}


// ==========================================================
// DATE NORMALIZATION
// ==========================================================

function normalizeDateValue(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {

        return value;
    }


    if (
        typeof value?.toDate ===
        "function"
    ) {

        try {

            return value.toDate();

        } catch (
            error
        ) {

            console.error(
                "Firestore date conversion error:",
                error
            );
        }
    }


    const parsed =
        new Date(
            value
        );


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {

        return null;
    }


    return parsed;
}


// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(
    date
) {

    const parsed =
        normalizeDateValue(
            date
        );


    if (!parsed) {
        return "";
    }


    const year =
        parsed.getFullYear();


    const month =
        String(
            parsed.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            parsed.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );
}


// ==========================================================
// CURRENCY
// ==========================================================

function currency(
    amount
) {

    const value =
        Number(
            amount || 0
        );


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
                2
        }
    ).format(
        Number.isFinite(
            value
        )
            ? value
            : 0
    );
}


// ==========================================================
// SAFE NUMBER
// ==========================================================

function safeNumber(
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
        safeNumber(
            amount
        );


    return Math.round(
        value / 5
    ) * 5;
}


// ==========================================================
// NORMALIZE LOAN STATUS
// ==========================================================

function normalizeLoanStatus(
    status
) {

    const value =
        String(
            status || ""
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
        "approved" ||
        value ===
        "active"
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
        "Active"
    );
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


    /*
     * Pending loans are still part of
     * the loan pipeline and must remain
     * available to the existing workflow.
     *
     * Completed and rejected loans are
     * excluded from the active running
     * loan table.
     */

    return (
        status !==
            "Completed" &&

        status !==
            "Rejected"
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
                "USER_ROLE"
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
        String(
            typeof ADMIN_EMAIL !==
            "undefined"
                ? ADMIN_EMAIL
                : ""
        )
            .trim()
            .toLowerCase();


    return (
        role === "admin" ||
        role === "administrator" ||
        (
            adminEmail &&
            email === adminEmail
        )
    );
}


// ==========================================================
// SAFE CLIENT NAME
// ==========================================================

function getClientName(
    client
) {

    if (!client) {
        return "Unnamed Client";
    }


    return (
        client.name ||
        client.fullName ||
        client.clientName ||
        "Unnamed Client"
    );
}


// ==========================================================
// SAFE CLIENT PHONE
// ==========================================================

function getClientPhone(
    client
) {

    if (!client) {
        return "";
    }


    return (
        client.phone ||
        client.phoneNumber ||
        client.mobile ||
        ""
    );
}


// ==========================================================
// FIND CLIENT
// ==========================================================

function getClientById(
    clientId
) {

    if (!clientId) {
        return null;
    }


    return (
        clients.find(
            client =>
                client.id ===
                clientId
        ) ||
        null
    );
}


// ==========================================================
// FIND LOAN
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
// NEXT UNPAID INSTALLMENT
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
                    safeNumber(
                        installment.remainingAmount,
                        safeNumber(
                            installment.amount
                        )
                    );


                return (
                    remaining > 0
                );
            }
        ) ||
        null
    );
}


// ==========================================================
// GET REMAINING SCHEDULE AMOUNT
// ==========================================================

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
                safeNumber(
                    installment.amount
                );


            const paid =
                safeNumber(
                    installment.paidAmount
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
// GET CURRENT LOAN BALANCE
// ==========================================================

function getLoanBalance(
    loan
) {

    if (!loan) {
        return 0;
    }


    if (
        Number.isFinite(
            Number(
                loan.balance
            )
        )
    ) {

        return Math.max(
            Number(
                loan.balance
            ),
            0
        );
    }


    const total =
        safeNumber(
            loan.totalRepayment
        );


    const paid =
        safeNumber(
            loan.amountPaid
        );


    return Math.max(
        total -
        paid,
        0
    );
}


// ==========================================================
// PUBLIC HELPERS WILL BE EXPORTED
// AT THE END OF PART 16
// ==========================================================


// ==========================================================
// END OF PART 1/16
// ==========================================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 2/16
// LOAN CALCULATION + REPAYMENT SCHEDULE
// ==========================================================


// ==========================================================
// LOAN CALCULATOR SELECTORS
// ==========================================================

const loanAmountInput =
    document.getElementById(
        "loan-amount"
    );

const loanInterestInput =
    document.getElementById(
        "loan-interest"
    );

const loanDurationInput =
    document.getElementById(
        "loan-duration"
    );

const loanFeeInput =
    document.getElementById(
        "loan-processing-fee"
    );

const loanPaidInput =
    document.getElementById(
        "loan-paid"
    );

const loanBalanceInput =
    document.getElementById(
        "loan-balance"
    );

const loanWeeklyPaymentInput =
    document.getElementById(
        "loan-weekly-payment"
    );

const loanTotalRepaymentInput =
    document.getElementById(
        "loan-total-repayment"
    );


// ==========================================================
// CALCULATE LOAN
// ==========================================================

function calculateLoan() {

    const amount =
        safeNumber(
            loanAmountInput?.value
        );


    const interestRate =
        safeNumber(
            loanInterestInput?.value
        );


    const duration =
        Math.max(
            Math.floor(
                safeNumber(
                    loanDurationInput?.value,
                    0
                )
            ),
            0
        );


    const processingFee =
        Math.max(
            safeNumber(
                loanFeeInput?.value
            ),
            0
        );


    /*
     * Interest is calculated on the
     * principal amount.
     */

    const interestAmount =
        amount *
        (
            interestRate /
            100
        );


    const totalRepayment =
        amount +
        interestAmount;


    const rawWeeklyPayment =
        duration > 0
            ? totalRepayment /
              duration
            : 0;


    const weeklyPayment =
        roundToNearestFive(
            rawWeeklyPayment
        );


    const paid =
        Math.min(
            Math.max(
                safeNumber(
                    loanPaidInput?.value
                ),
                0
            ),
            totalRepayment
        );


    const balance =
        Math.max(
            totalRepayment -
            paid,
            0
        );


    /*
     * Update calculator outputs
     * without throwing errors if a
     * particular HTML input does
     * not exist.
     */

    if (
        loanWeeklyPaymentInput
    ) {

        loanWeeklyPaymentInput.value =
            weeklyPayment;
    }


    if (
        loanTotalRepaymentInput
    ) {

        loanTotalRepaymentInput.value =
            totalRepayment;
    }


    if (
        loanBalanceInput
    ) {

        loanBalanceInput.value =
            balance;
    }


    return {

        amount,

        interestRate,

        interestAmount,

        duration,

        processingFee,

        totalRepayment,

        weeklyPayment,

        paid,

        balance
    };
}


// ==========================================================
// CALCULATOR EVENT LISTENERS
// ==========================================================

[
    loanAmountInput,

    loanInterestInput,

    loanDurationInput,

    loanFeeInput,

    loanPaidInput
]
    .forEach(
        input => {

            input?.addEventListener(
                "input",
                calculateLoan
            );

            input?.addEventListener(
                "change",
                calculateLoan
            );
        }
    );


// ==========================================================
// GENERATE REPAYMENT SCHEDULE
// ==========================================================

function generateRepaymentSchedule(
    approvalDate,
    duration,
    weeklyPayment,
    totalRepayment
) {

    const startDate =
        normalizeDateValue(
            approvalDate
        );


    if (!startDate) {

        return [];
    }


    const installments =
        Math.max(
            Math.floor(
                safeNumber(
                    duration
                )
            ),
            0
        );


    if (
        installments <=
        0
    ) {

        return [];
    }


    const total =
        Math.max(
            safeNumber(
                totalRepayment
            ),
            0
        );


    /*
     * The normal weekly payment is
     * rounded to the nearest five.
     *
     * The final installment is adjusted
     * so the complete schedule exactly
     * equals totalRepayment.
     */

    const standardPayment =
        Math.max(
            roundToNearestFive(
                weeklyPayment
            ),
            0
        );


    const schedule =
        [];


    let scheduledTotal =
        0;


    for (
        let index = 0;
        index < installments;
        index++
    ) {

        const dueDate =
            new Date(
                startDate
            );


        /*
         * First repayment is one week
         * after approval.
         */

        dueDate.setDate(
            dueDate.getDate() +
            (
                (index + 1) *
                7
            )
        );


        let installmentAmount;


        if (
            index ===
            installments - 1
        ) {

            /*
             * Final installment absorbs
             * any rounding difference.
             */

            installmentAmount =
                Math.max(
                    total -
                    scheduledTotal,
                    0
                );

        } else {

            installmentAmount =
                standardPayment;


            /*
             * Prevent the schedule from
             * exceeding the total repayment.
             */

            const remainingBeforeFinal =
                Math.max(
                    total -
                    scheduledTotal,
                    0
                );


            if (
                installmentAmount >
                remainingBeforeFinal
            ) {

                installmentAmount =
                    remainingBeforeFinal;
            }
        }


        scheduledTotal +=
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


    /*
     * If rounding produced a tiny
     * discrepancy, correct the final
     * installment.
     */

    if (
        schedule.length
    ) {

        const difference =
            Number(
                (
                    total -
                    scheduledTotal
                ).toFixed(
                    2
                )
            );


        if (
            Math.abs(
                difference
            ) > 0.001
        ) {

            const last =
                schedule[
                    schedule.length - 1
                ];


            last.amount =
                Math.max(
                    last.amount +
                    difference,
                    0
                );


            last.remainingAmount =
                Math.max(
                    last.amount -
                    safeNumber(
                        last.paidAmount
                    ),
                    0
                );
        }
    }


    return schedule;
}


// ==========================================================
// NORMALIZE EXISTING REPAYMENT SCHEDULE
// ==========================================================
//
// Older loans may not contain all the
// fields used by the current repayment
// system. This function upgrades them
// safely in memory.
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
            installment,
            index
        ) => {

            const amount =
                Math.max(
                    safeNumber(
                        installment.amount
                    ),
                    0
                );


            const paidAmount =
                Math.min(
                    Math.max(
                        safeNumber(
                            installment.paidAmount
                        ),
                        0
                    ),
                    amount
                );


            const remainingAmount =
                Math.max(
                    amount -
                    paidAmount,
                    0
                );


            const paid =
                remainingAmount <=
                0;


            return {

                ...installment,

                installment:
                    installment.installment ||
                    index + 1,

                dueDate:
                    installment.dueDate ||
                    "",

                amount,

                paidAmount,

                remainingAmount,

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
                    paid
                        ? (
                            installment.paidDate ||
                            null
                        )
                        : null,

                paymentHistory:
                    Array.isArray(
                        installment.paymentHistory
                    )
                        ? installment.paymentHistory
                        : []
            };
        }
    );
}


// ==========================================================
// CALCULATE REMAINING INSTALLMENTS
// ==========================================================

function calculateRemainingInstallments(
    schedule
) {

    const normalized =
        normalizeRepaymentSchedule(
            schedule
        );


    return normalized.filter(
        installment =>
            !installment.paid &&
            safeNumber(
                installment.remainingAmount
            ) > 0
    ).length;
}


// ==========================================================
// GET NEXT REPAYMENT DATE
// ==========================================================

function getNextRepaymentDate(
    schedule
) {

    const next =
        getNextRepayment(
            normalizeRepaymentSchedule(
                schedule
            )
        );


    return next?.dueDate ||
        "-";
}


// ==========================================================
// CALCULATE LOAN BALANCE FROM SCHEDULE
// ==========================================================

function calculateScheduleBalance(
    schedule
) {

    return getScheduleOutstanding(
        normalizeRepaymentSchedule(
            schedule
        )
    );
}


// ==========================================================
// END OF PART 2/16
// ==========================================================// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS
// PART 3/16
// ==========================================
//
// LOAN CALCULATIONS
// REPAYMENT SCHEDULE
// DATE HELPERS
// CURRENCY HELPERS
//
// IMPORTANT:
// This part is designed to work with the
// existing GREYMUS loans.js structure.
// ==========================================


// ==========================================
// DATE HELPERS
// ==========================================

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


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(
    date
) {

    if (!date) {
        return "";
    }


    const value =
        date instanceof Date
            ? date
            : new Date(date);


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


// ==========================================
// PARSE FIRESTORE / DATE VALUE
// ==========================================

function parseLoanDate(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {

        return value;
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        try {

            return value.toDate();

        } catch (error) {

            console.warn(
                "Unable to convert Firestore date:",
                error
            );
        }
    }


    if (
        typeof value ===
        "number"
    ) {

        const date =
            new Date(value);

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    if (
        typeof value ===
        "string"
    ) {

        const date =
            new Date(value);

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    return null;
}


// ==========================================
// CURRENCY
// ==========================================

function currency(
    amount
) {

    const value =
        Number(
            amount || 0
        );


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
        Number.isFinite(value)
            ? value
            : 0
    );
}


// ==========================================
// NUMERIC SAFETY
// ==========================================

function safeNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);


    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}


// ==========================================
// ROUND TO NEAREST FIVE
// ==========================================

function roundToNearestFive(
    value
) {

    const number =
        safeNumber(
            value
        );


    if (
        number <= 0
    ) {

        return 0;
    }


    return (
        Math.round(
            number / 5
        ) * 5
    );
}


// ==========================================
// LOAN INTEREST CALCULATION
// ==========================================

function calculateInterestAmount(
    principal,
    interestRate
) {

    const amount =
        safeNumber(
            principal
        );

    const rate =
        safeNumber(
            interestRate
        );


    if (
        amount <= 0 ||
        rate <= 0
    ) {

        return 0;
    }


    return (
        amount *
        rate /
        100
    );
}


// ==========================================
// LOAN CALCULATOR
// ==========================================

function calculateLoan() {

    /*
     * Keep this function tolerant of
     * different HTML versions.
     *
     * Missing fields must never crash
     * loans.js.
     */

    const amountInput =
        document.getElementById(
            "loan-amount"
        );


    const interestInput =
        document.getElementById(
            "loan-interest"
        );


    const durationInput =
        document.getElementById(
            "loan-duration"
        );


    const feeInput =
        document.getElementById(
            "loan-processing-fee"
        ) ||
        document.getElementById(
            "loan-fee"
        );


    const interestOutput =
        document.getElementById(
            "loan-interest-amount"
        );


    const repaymentOutput =
        document.getElementById(
            "loan-repayment"
        );


    const weeklyOutput =
        document.getElementById(
            "loan-weekly-payment"
        );


    const balanceOutput =
        document.getElementById(
            "loan-balance"
        );


    const amount =
        safeNumber(
            amountInput?.value
        );


    const interestRate =
        safeNumber(
            interestInput?.value
        );


    const duration =
        Math.max(
            Math.floor(
                safeNumber(
                    durationInput?.value
                )
            ),
            0
        );


    const processingFee =
        Math.max(
            safeNumber(
                feeInput?.value
            ),
            0
        );


    const interest =
        calculateInterestAmount(
            amount,
            interestRate
        );


    const totalRepayment =
        amount +
        interest;


    const weeklyPayment =
        duration > 0
            ? roundToNearestFive(
                totalRepayment /
                duration
            )
            : 0;


    if (interestOutput) {

        interestOutput.value =
            currency(
                interest
            );
    }


    if (repaymentOutput) {

        repaymentOutput.value =
            currency(
                totalRepayment
            );
    }


    if (weeklyOutput) {

        weeklyOutput.value =
            currency(
                weeklyPayment
            );
    }


    if (balanceOutput) {

        balanceOutput.value =
            currency(
                totalRepayment
            );
    }


    /*
     * Return the calculation so other
     * parts of loans.js can use exactly
     * the same figures.
     */

    return {

        amount,

        interestRate,

        interest,

        processingFee,

        duration,

        weeklyPayment,

        totalRepayment,

        balance:
            totalRepayment,

        amountPaid:
            0
    };
}


// ==========================================
// GENERATE LOAN NUMBER
// ==========================================

function generateLoanNumber() {

    const timestamp =
        Date.now()
            .toString()
            .slice(
                -8
            );


    const random =
        Math.floor(
            Math.random() *
            900
        ) +
        100;


    return (
        `GL-${timestamp}-${random}`
    );
}


// ==========================================
// ADD DAYS
// ==========================================

function addDays(
    date,
    days
) {

    const result =
        new Date(
            date
        );


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

    const start =
        parseLoanDate(
            startDate
        );


    if (!start) {
        return [];
    }


    const installments =
        Math.max(
            Math.floor(
                safeNumber(
                    duration
                )
            ),
            0
        );


    if (
        installments <= 0
    ) {

        return [];
    }


    const total =
        Math.max(
            safeNumber(
                totalRepayment
            ),
            0
        );


    if (
        total <= 0
    ) {

        return [];
    }


    /*
     * Use the requested weekly payment,
     * but make sure the final installment
     * exactly reconciles the total.
     */

    let standardPayment =
        Math.max(
            safeNumber(
                weeklyPayment
            ),
            0
        );


    if (
        standardPayment <= 0
    ) {

        standardPayment =
            total /
            installments;
    }


    standardPayment =
        roundToNearestFive(
            standardPayment
        );


    /*
     * If rounding would make the normal
     * installment larger than the total,
     * fall back to the exact amount.
     */

    if (
        standardPayment <= 0
    ) {

        standardPayment =
            total /
            installments;
    }


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
                start,
                (index + 1) * 7
            );


        let amount;


        if (
            index ===
            installments - 1
        ) {

            /*
             * Final installment absorbs any
             * rounding difference.
             */

            amount =
                Math.max(
                    total -
                    allocated,
                    0
                );

        } else {

            amount =
                Math.min(
                    standardPayment,
                    Math.max(
                        total -
                        allocated,
                        0
                    )
                );
        }


        allocated +=
            amount;


        schedule.push({

            installment:
                index + 1,

            dueDate:
                formatDate(
                    dueDate
                ),

            amount:
                Number(
                    amount.toFixed(
                        2
                    )
                ),

            paidAmount:
                0,

            remainingAmount:
                Number(
                    amount.toFixed(
                        2
                    )
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
// GET NEXT UNPAID INSTALLMENT
// ==========================================

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


                const amount =
                    safeNumber(
                        installment.amount
                    );


                const paidAmount =
                    safeNumber(
                        installment.paidAmount
                    );


                return (
                    amount -
                    paidAmount
                ) > 0.01;
            }
        ) ||
        null
    );
}


// ==========================================
// GET REMAINING SCHEDULE BALANCE
// ==========================================

function getScheduleBalance(
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
                safeNumber(
                    installment.amount
                );


            const paid =
                safeNumber(
                    installment.paidAmount
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


// ==========================================
// COUNT REMAINING INSTALLMENTS
// ==========================================

function countRemainingInstallments(
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
        installment => {

            const amount =
                safeNumber(
                    installment.amount
                );


            const paid =
                safeNumber(
                    installment.paidAmount
                );


            return (
                !installment.paid &&
                amount -
                paid >
                0.01
            );
        }
    ).length;
}


// ==========================================
// NORMALIZE SCHEDULE
// ==========================================

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
            installment,
            index
        ) => {

            const amount =
                Math.max(
                    safeNumber(
                        installment.amount
                    ),
                    0
                );


            const paidAmount =
                Math.min(
                    Math.max(
                        safeNumber(
                            installment.paidAmount
                        ),
                        0
                    ),
                    amount
                );


            const remainingAmount =
                Math.max(
                    amount -
                    paidAmount,
                    0
                );


            const paid =
                remainingAmount <=
                0.01;


            return {

                ...installment,

                installment:
                    installment.installment ||
                    index + 1,

                amount,

                paidAmount,

                remainingAmount,

                paid,

                status:
                    paid
                        ? "Paid"
                        : (
                            paidAmount >
                            0
                                ? "Partial"
                                : "Pending"
                        ),

                paymentHistory:
                    Array.isArray(
                        installment.paymentHistory
                    )
                        ? installment.paymentHistory
                        : []
            };
        }
    );
}


// ==========================================
// IS RUNNING LOAN
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


    /*
     * Pending loans remain visible in the
     * main pipeline because they still need
     * processing.
     */

    if (
        status ===
        "Pending"
    ) {

        return true;
    }


    /*
     * Rejected loans are not active loans.
     */

    if (
        status ===
        "Rejected"
    ) {

        return false;
    }


    /*
     * Completed loans remain useful for
     * history, but are excluded from the
     * active running-loans list.
     */

    if (
        status ===
        "Completed"
    ) {

        return false;
    }


    return true;
}


// ==========================================
// END OF PART 3/16
// ==========================================// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS
// PART 4/16
// ==========================================
//
// LOAN DATA NORMALIZATION
// FIRESTORE LOAN LOADING
// CLIENT LOADING
// STATUS HELPERS
// REALTIME DATA SAFETY
// ==========================================


// ==========================================
// NORMALIZE LOAN STATUS
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


    switch (value) {

        case "pending":
            return "Pending";

        case "approved":
            return "Active";

        case "active":
            return "Active";

        case "running":
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

        case "cancelled":
            return "Rejected";

        case "canceled":
            return "Rejected";

        default:
            return status
                ? String(status)
                : "Pending";
    }
}


// ==========================================
// CONVERT FIRESTORE DATE
// ==========================================

function getFirestoreDate(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {

        return value;
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        try {

            return value.toDate();

        } catch (error) {

            return null;
        }
    }


    if (
        typeof value ===
        "string"
    ) {

        const date =
            new Date(value);


        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    if (
        typeof value ===
        "number"
    ) {

        const date =
            new Date(value);


        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    return null;
}


// ==========================================
// GET LOAN DATE
// ==========================================

function getLoanDate(
    loan
) {

    if (!loan) {
        return new Date();
    }


    const approvalDate =
        getFirestoreDate(
            loan.approvalDate
        );


    if (approvalDate) {
        return approvalDate;
    }


    const createdDate =
        getFirestoreDate(
            loan.createdAt
        );


    if (createdDate) {
        return createdDate;
    }


    return new Date();
}


// ==========================================
// NORMALIZE LOAN RECORD
// ==========================================

function normalizeLoanRecord(
    data,
    id
) {

    const loan =
        data || {};


    const schedule =
        normalizeRepaymentSchedule(
            loan.repaymentSchedule
        );


    const amount =
        Math.max(
            safeNumber(
                loan.amount
            ),
            0
        );


    const totalRepayment =
        Math.max(
            safeNumber(
                loan.totalRepayment
            ),
            amount
        );


    const amountPaid =
        Math.min(
            Math.max(
                safeNumber(
                    loan.amountPaid
                ),
                0
            ),
            totalRepayment
        );


    /*
     * Older loan records may not have a
     * balance field. Reconstruct it safely.
     */

    let balance =
        loan.balance !==
        undefined &&
        loan.balance !==
        null
            ? safeNumber(
                loan.balance
            )
            : (
                totalRepayment -
                amountPaid
            );


    balance =
        Math.max(
            Math.min(
                balance,
                totalRepayment
            ),
            0
        );


    /*
     * If the schedule exists and has a
     * reliable remaining balance, use it
     * only when the stored balance is
     * missing or clearly inconsistent.
     */

    if (
        Array.isArray(
            schedule
        ) &&
        schedule.length &&
        (
            loan.balance ===
            undefined ||
            loan.balance ===
            null
        )
    ) {

        balance =
            Math.min(
                getScheduleBalance(
                    schedule
                ),
                totalRepayment
            );
    }


    let status =
        normalizeLoanStatus(
            loan.status
        );


    if (
        balance <=
        0.01 &&
        totalRepayment > 0
    ) {

        status =
            "Completed";
    }


    return {

        ...loan,

        id,

        clientId:
            loan.clientId ||
            "",

        clientName:
            loan.clientName ||
            "",

        clientPhone:
            loan.clientPhone ||
            loan.phone ||
            "",

        loanNumber:
            loan.loanNumber ||
            id,

        loanType:
            loan.loanType ||
            "New",

        amount,

        processingFee:
            Math.max(
                safeNumber(
                    loan.processingFee
                ),
                0
            ),

        interest:
            Math.max(
                safeNumber(
                    loan.interest
                ),
                0
            ),

        duration:
            Math.max(
                Math.floor(
                    safeNumber(
                        loan.duration
                    )
                ),
                0
            ),

        repayment:
            safeNumber(
                loan.repayment
            ),

        weeklyPayment:
            Math.max(
                safeNumber(
                    loan.weeklyPayment
                ),
                0
            ),

        totalRepayment,

        openingBalance:
            safeNumber(
                loan.openingBalance,
                totalRepayment
            ),

        amountPaid,

        balance,

        approvalDate:
            loan.approvalDate ||
            "",

        dueDate:
            loan.dueDate ||
            "",

        repaymentSchedule:
            schedule,

        nextRepaymentDate:
            loan.nextRepaymentDate ||
            (
                getNextRepayment(
                    schedule
                )?.dueDate ||
                "-"
            ),

        remainingInstallments:
            loan.remainingInstallments !==
            undefined
                ? Math.max(
                    Math.floor(
                        safeNumber(
                            loan.remainingInstallments
                        )
                    ),
                    0
                )
                : countRemainingInstallments(
                    schedule
                ),

        status,

        completed:
            status ===
            "Completed",

        totalIncome:
            Math.max(
                safeNumber(
                    loan.totalIncome
                ),
                0
            ),

        createdBy:
            loan.createdBy ||
            "",

        createdAt:
            loan.createdAt ||
            null,

        updatedAt:
            loan.updatedAt ||
            null
    };
}


// ==========================================
// LOAD CLIENTS
// ==========================================

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
                clientDoc => {

                    const data =
                        clientDoc.data() ||
                        {};


                    return {

                        ...data,

                        id:
                            clientDoc.id,

                        name:
                            data.name ||
                            data.clientName ||
                            "",

                        phone:
                            data.phone ||
                            data.phoneNumber ||
                            data.mobile ||
                            ""
                    };
                }
            );


        /*
         * Keep repayment selectors in sync
         * after clients have loaded.
         */

        populateFabClientSelector?.();


        return clients;

    } catch (error) {

        console.error(
            "Failed to load clients:",
            error
        );


        /*
         * Do not destroy the existing
         * client data if a refresh fails.
         */

        return clients;
    }
}


// ==========================================
// LOAD LOANS
// ==========================================

async function loadLoans() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "loans"
                )
            );


        const loadedLoans =
            snapshot.docs.map(
                loanDoc => {

                    return normalizeLoanRecord(
                        loanDoc.data(),
                        loanDoc.id
                    );
                }
            );


        /*
         * Replace the local array only after
         * Firestore successfully returned data.
         */

        loans =
            loadedLoans;


        populateYearFilter();


        /*
         * Refresh the visible table only when
         * the loan details page is not blocking
         * the normal loan list.
         */

        if (
            !loanDetailsOpen
        ) {

            filterLoans();
        }


        /*
         * Keep repayment selectors synchronized
         * with the newest balances.
         */

        populateFabClientSelector?.();


        return loans;

    } catch (error) {

        console.error(
            "Failed to load loans:",
            error
        );


        /*
         * Never replace valid existing data
         * with an empty array after a failed
         * Firestore request.
         */

        return loans;
    }
}


// ==========================================
// REFRESH SINGLE LOAN FROM FIRESTORE
// ==========================================

async function refreshLoan(
    id
) {

    if (!id) {
        return null;
    }


    try {

        const loanRef =
            doc(
                db,
                "loans",
                id
            );


        const snapshot =
            await getDoc(
                loanRef
            );


        if (
            !snapshot.exists()
        ) {

            loans =
                loans.filter(
                    loan =>
                        loan.id !==
                        id
                );


            return null;
        }


        const updatedLoan =
            normalizeLoanRecord(
                snapshot.data(),
                snapshot.id
            );


        const index =
            loans.findIndex(
                loan =>
                    loan.id ===
                    id
            );


        if (
            index >=
            0
        ) {

            loans[index] =
                updatedLoan;

        } else {

            loans.push(
                updatedLoan
            );
        }


        populateYearFilter();


        if (
            !loanDetailsOpen
        ) {

            filterLoans();
        }


        return updatedLoan;

    } catch (error) {

        console.error(
            "Failed to refresh loan:",
            error
        );


        return null;
    }
}


// ==========================================
// FIND LOAN SAFELY
// ==========================================

function findLoan(
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


// ==========================================
// GET CLIENT BY ID
// ==========================================

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


// ==========================================
// GET CLIENT NAME
// ==========================================

function getLoanClientName(
    loan
) {

    if (!loan) {
        return "";
    }


    const client =
        getClientById(
            loan.clientId
        );


    return (
        client?.name ||
        loan.clientName ||
        ""
    );
}


// ==========================================
// GET CLIENT PHONE
// ==========================================

function getLoanClientPhone(
    loan
) {

    if (!loan) {
        return "";
    }


    const client =
        getClientById(
            loan.clientId
        );


    return (
        client?.phone ||
        client?.phoneNumber ||
        loan.clientPhone ||
        loan.phone ||
        ""
    );
}


// ==========================================
// CHECK WHETHER LOAN HAS BALANCE
// ==========================================

function hasOutstandingBalance(
    loan
) {

    if (!loan) {
        return false;
    }


    return (
        safeNumber(
            loan.balance
        ) >
        0.01
    );
}


// ==========================================
// CHECK ACTIVE LOAN
// ==========================================

function isActiveLoan(
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
        (
            status ===
            "Active"
        ) ||
        (
            status ===
            "Arrears"
        )
    ) &&
    hasOutstandingBalance(
        loan
    );
}


// ==========================================
// CHECK PENDING LOAN
// ==========================================

function isPendingLoan(
    loan
) {

    return (
        !!loan &&
        normalizeLoanStatus(
            loan.status
        ) ===
        "Pending"
    );
}


// ==========================================
// CHECK COMPLETED LOAN
// ==========================================

function isCompletedLoan(
    loan
) {

    return (
        !!loan &&
        (
            normalizeLoanStatus(
                loan.status
            ) ===
            "Completed" ||
            safeNumber(
                loan.balance
            ) <=
            0.01
        )
    );
}


// ==========================================
// END OF PART 4/16
// ==========================================// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS
// PART 5/16
// ==========================================
//
// FILTERS
// OVERDUE / ARREARS STATUS
// LOAN APPROVAL
// LOAN DELETE
//
// IMPORTANT:
// This part replaces the conflicting versions
// previously provided for these functions.
// Do not duplicate these functions later.
// ==========================================


// ==========================================
// FILTERS
// ==========================================

function populateYearFilter() {

    if (!loanYearFilter) {
        return;
    }


    const years = [
        ...new Set(
            loans.map(
                loan => {

                    const date =
                        getLoanDate(
                            loan
                        );


                    return date.getFullYear();
                }
            )
        )
    ]
        .filter(
            year =>
                Number.isFinite(
                    year
                )
        )
        .sort(
            (
                a,
                b
            ) =>
                b - a
        );


    loanYearFilter.innerHTML =
        `
            <option value="ALL">
                All
            </option>
        `;


    years.forEach(
        year => {

            loanYearFilter.innerHTML +=
                `
                    <option value="${year}">
                        ${year}
                    </option>
                `;
        }
    );
}


// ==========================================
// GET FILTERED LOANS
// ==========================================

function getFilteredLoans() {

    let filtered =
        [...loans];


    /*
     * The main loans list should show
     * running/pending loans only.
     *
     * Completed loans remain available
     * through history/details where required.
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


    const selectedStatus =
        loanFilter?.value ||
        "ALL";


    const selectedMonth =
        loanMonthFilter?.value ||
        "ALL";


    const selectedYear =
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
                            getLoanClientName(
                                loan
                            ) ||
                            ""
                        )
                            .toLowerCase();


                    const loanId =
                        String(
                            loan.id ||
                            ""
                        )
                            .toLowerCase();


                    const loanNumber =
                        String(
                            loan.loanNumber ||
                            ""
                        )
                            .toLowerCase();


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


    // ------------------------------------------
    // STATUS
    // ------------------------------------------

    if (
        selectedStatus !==
        "ALL"
    ) {

        filtered =
            filtered.filter(
                loan =>
                    normalizeLoanStatus(
                        loan.status
                    ) ===
                    normalizeLoanStatus(
                        selectedStatus
                    )
            );
    }


    // ------------------------------------------
    // MONTH / YEAR
    // ------------------------------------------

    if (
        selectedMonth !==
            "ALL" ||
        selectedYear !==
            "ALL"
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const date =
                        getLoanDate(
                            loan
                        );


                    const monthMatch =
                        selectedMonth ===
                            "ALL" ||
                        date.getMonth() ===
                            Number(
                                selectedMonth
                            );


                    const yearMatch =
                        selectedYear ===
                            "ALL" ||
                        date.getFullYear() ===
                            Number(
                                selectedYear
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
// FILTER LOANS
// ==========================================

function filterLoans() {

    /*
     * Never redraw the loan table over the
     * full-screen loan details page.
     */

    if (
        loanDetailsOpen
    ) {

        return;
    }


    const filtered =
        getFilteredLoans();


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
// GET FIRST UNPAID INSTALLMENT
// ==========================================

function getFirstUnpaidInstallment(
    loan
) {

    if (!loan) {
        return null;
    }


    const schedule =
        normalizeRepaymentSchedule(
            loan.repaymentSchedule
        );


    return getNextRepayment(
        schedule
    );
}


// ==========================================
// DETERMINE LOAN ARREARS
// ==========================================

function loanHasArrears(
    loan
) {

    if (!loan) {
        return false;
    }


    if (
        isCompletedLoan(
            loan
        )
    ) {

        return false;
    }


    const schedule =
        normalizeRepaymentSchedule(
            loan.repaymentSchedule
        );


    const todayDate =
        today();


    /*
     * Arrears exist when the earliest
     * unpaid installment is already
     * past its due date.
     */

    const overdueInstallment =
        schedule.find(
            installment => {

                if (
                    installment.paid
                ) {

                    return false;
                }


                const remaining =
                    safeNumber(
                        installment.remainingAmount
                    );


                if (
                    remaining <=
                    0.01
                ) {

                    return false;
                }


                return (
                    installment.dueDate &&
                    installment.dueDate <
                    todayDate
                );
            }
        );


    return !!overdueInstallment;
}


// ==========================================
// CHECK OVERDUE LOANS
// ==========================================

async function checkOverdueLoans() {

    const todayDate =
        today();


    /*
     * Work on a snapshot so Firestore
     * updates do not interfere with the
     * current loop.
     */

    const loanSnapshot =
        [...loans];


    for (
        const loan
        of loanSnapshot
    ) {

        if (!loan?.id) {
            continue;
        }


        const currentStatus =
            normalizeLoanStatus(
                loan.status
            );


        /*
         * These statuses do not need
         * automatic overdue processing.
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
            normalizeRepaymentSchedule(
                loan.repaymentSchedule
            );


        /*
         * No schedule means there is no
         * installment that can currently
         * be marked overdue.
         */

        if (
            schedule.length ===
            0
        ) {

            continue;
        }


        const nextInstallment =
            getNextRepayment(
                schedule
            );


        const nextRepayment =
            nextInstallment
                ? nextInstallment.dueDate
                : null;


        const arrears =
            schedule.some(
                installment => {

                    if (
                        installment.paid
                    ) {

                        return false;
                    }


                    const remaining =
                        safeNumber(
                            installment.remainingAmount
                        );


                    return (
                        remaining >
                        0.01 &&
                        installment.dueDate &&
                        installment.dueDate <
                        todayDate
                    );
                }
            );


        let newStatus;


        if (
            !nextInstallment
        ) {

            newStatus =
                "Completed";

        } else if (
            arrears
        ) {

            newStatus =
                "Arrears";

        } else {

            newStatus =
                "Active";
        }


        const remainingInstallments =
            countRemainingInstallments(
                schedule
            );


        const completed =
            !nextInstallment;


        /*
         * Avoid unnecessary Firestore writes.
         */

        if (
            currentStatus ===
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
                remainingInstallments &&

            Boolean(
                loan.completed
            ) ===
                completed
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

                    completed,

                    nextRepaymentDate:
                        nextRepayment ||
                        "-",

                    remainingInstallments,

                    updatedAt:
                        serverTimestamp()
                }
            );


            /*
             * Update the local record immediately
             * so the interface reflects the change
             * without waiting for another full load.
             */

            const localLoan =
                loans.find(
                    item =>
                        item.id ===
                        loan.id
                );


            if (localLoan) {

                localLoan.status =
                    newStatus;

                localLoan.completed =
                    completed;

                localLoan.nextRepaymentDate =
                    nextRepayment ||
                    "-";

                localLoan.remainingInstallments =
                    remainingInstallments;
            }

        } catch (error) {

            console.error(
                "Overdue loan update error:",
                error
            );
        }
    }


    /*
     * Refresh the visible list after all
     * status checks have completed.
     */

    if (
        !loanDetailsOpen
    ) {

        filterLoans();
    }
}


// ==========================================
// APPROVE LOAN
// ==========================================

async function approveLoan(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (
        !loan ||
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
                loan.loanNumber ||
                ""
            } for ${
                loan.clientName ||
                getLoanClientName(
                    loan
                ) ||
                "client"
            }?`
        )
    ) {

        return;
    }


    try {

        // ------------------------------------------
        // APPROVAL DATE
        // ------------------------------------------

        const approvalDate =
            new Date();


        // ------------------------------------------
        // REPAYMENT SCHEDULE
        // ------------------------------------------

        const schedule =
            generateRepaymentSchedule(
                approvalDate,
                loan.duration,
                loan.weeklyPayment,
                loan.totalRepayment
            );


        const nextRepayment =
            schedule.length
                ? schedule[0].dueDate
                : "-";


        // ------------------------------------------
        // UPDATE FIRESTORE
        // ------------------------------------------

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
                    nextRepayment,

                remainingInstallments:
                    schedule.length,

                status:
                    "Active",

                completed:
                    false,

                updatedAt:
                    serverTimestamp()
            }
        );


        // ------------------------------------------
        // UPDATE LOCAL LOAN
        // ------------------------------------------

        loan.approvalDate =
            formatDate(
                approvalDate
            );

        loan.repaymentSchedule =
            schedule;

        loan.nextRepaymentDate =
            nextRepayment;

        loan.remainingInstallments =
            schedule.length;

        loan.status =
            "Active";

        loan.completed =
            false;


        // ------------------------------------------
        // HISTORY
        // ------------------------------------------

        try {

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

        } catch (historyError) {

            /*
             * History must never make an
             * already-approved loan appear
             * unsuccessful.
             */

            console.error(
                "Loan approval history error:",
                historyError
            );
        }


        // ------------------------------------------
        // SAFE CLIENT MESSAGE
        // ------------------------------------------

        try {

            /*
             * Build the approved version of the
             * loan so messaging.js receives the
             * newly-created repayment schedule
             * and Active status.
             */

            const approvedLoan = {

                ...loan,

                approvalDate:
                    formatDate(
                        approvalDate
                    ),

                repaymentSchedule:
                    schedule,

                nextRepaymentDate:
                    nextRepayment,

                remainingInstallments:
                    schedule.length,

                status:
                    "Active",

                completed:
                    false
            };


            const payload =
                buildLoanMessagingPayload(
                    approvedLoan,
                    {

                        messageType:
                            "loan-approved",

                        balance:
                            Number(
                                approvedLoan.balance ||
                                approvedLoan.totalRepayment ||
                                0
                            )
                    }
                );


            if (payload) {

                await callMessagingModule(
                    payload
                );
            }

        } catch (messageError) {

            console.error(
                "Loan approval message failed:",
                messageError
            );
        }


        // ------------------------------------------
        // REFRESH UI
        // ------------------------------------------

        populateYearFilter();


        if (
            !loanDetailsOpen
        ) {

            filterLoans();
        }


        alert(
            "Loan approved successfully. Status is now Active."
        );

    } catch (error) {

        console.error(
            "Loan approval error:",
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

    if (
        !isAdmin()
    ) {

        alert(
            "Only the Administrator can delete loans."
        );

        return;
    }


    const loan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (!loan) {

        alert(
            "Loan not found."
        );

        return;
    }


    /*
     * Only pending loans can be deleted.
     * Active, arrears and completed loans
     * are protected from accidental deletion.
     */

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
                loan.clientName ||
                getLoanClientName(
                    loan
                ) ||
                "this client"
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


        /*
         * Remove the deleted loan locally
         * immediately.
         */

        loans =
            loans.filter(
                item =>
                    item.id !==
                    loan.id
            );


        try {

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

        } catch (historyError) {

            console.error(
                "Loan deletion history error:",
                historyError
            );
        }


        /*
         * Close details if the deleted loan
         * happened to be open.
         */

        if (
            loanDetailsOpen &&
            selectedLoanId ===
                loan.id
        ) {

            closeLoanDetailsPage();
        }


        populateYearFilter();


        if (
            !loanDetailsOpen
        ) {

            filterLoans();
        }


        alert(
            "Loan deleted successfully."
        );

    } catch (error) {

        console.error(
            "Loan deletion error:",
            error
        );


        alert(
            "Failed to delete loan."
        );
    }
}


// ==========================================
// END OF PART 5/16
// ==========================================// ==========================================
// PART 6/16
// REPAYMENT SUBMISSION
// ==========================================
//
// SAFE VERSION
//
// This section:
// 1. Validates the selected loan
// 2. Prevents duplicate repayment submissions
// 3. Applies payment to earliest unpaid installments
// 4. Supports arrears + today's installment
// 5. Recalculates balance/status
// 6. Saves repayment to Firestore
// 7. Links repayment ID to schedule
// 8. Records history
//
// Messaging is NOT allowed to break the
// financial transaction.
// ==========================================


repaymentForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        // ==========================================
        // DUPLICATE SUBMISSION PROTECTION
        // ==========================================

        if (repaymentSaving) {
            return;
        }


        // ==========================================
        // DETERMINE SELECTED LOAN
        // ==========================================

        const selectedRepaymentLoanId =
            directLoanRepaymentMode
                ? (
                    selectedLoanId ||
                    repaymentLoanId?.value ||
                    ""
                )
                : (
                    repaymentLoanId?.value ||
                    ""
                );


        if (!selectedRepaymentLoanId) {

            alert(
                directLoanRepaymentMode
                    ? "The selected loan could not be found."
                    : "Please select a client with an outstanding loan."
            );

            return;
        }


        const loan =
            loans.find(
                item =>
                    item.id ===
                    selectedRepaymentLoanId
            );


        if (!loan) {

            alert(
                "The selected loan could not be found."
            );

            return;
        }


        // ==========================================
        // VALIDATE LOAN BALANCE
        // ==========================================

        const currentBalance =
            Number(
                loan.balance ||
                0
            );


        if (
            !Number.isFinite(
                currentBalance
            ) ||
            currentBalance <= 0
        ) {

            alert(
                "This loan has no outstanding balance."
            );

            return;
        }


        // ==========================================
        // READ PAYMENT
        // ==========================================

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


        // ==========================================
        // PAYMENT CANNOT EXCEED BALANCE
        // ==========================================

        if (
            payment >
            currentBalance + 0.01
        ) {

            alert(
                "Payment cannot exceed the outstanding balance."
            );

            return;
        }


        // ==========================================
        // PAYMENT DATE
        // ==========================================

        const paymentDate =
            repaymentDate?.value ||
            today();


        // ==========================================
        // PAYMENT NOTES
        // ==========================================

        const paymentNotes =
            repaymentNotes?.value ||
            "";


        // ==========================================
        // CONFIRM REPAYMENT
        // ==========================================

        if (
            !confirm(
                `Confirm repayment of ${currency(
                    payment
                )} for ${loan.clientName || "this client"}?`
            )
        ) {

            return;
        }


        // ==========================================
        // LOCK SUBMISSION
        // ==========================================

        repaymentSaving =
            true;


        const saveButton =
            repaymentForm?.querySelector(
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
                    "This loan does not have a repayment schedule."
                );
            }


            // ==========================================
            // APPLY PAYMENT
            // ==========================================

            let remainingPayment =
                payment;


            for (
                const installment
                of schedule
            ) {

                if (
                    remainingPayment <=
                    0.001
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


                // ------------------------------------------
                // ALREADY COMPLETED INSTALLMENT
                // ------------------------------------------

                if (
                    installmentRemaining <=
                    0.001
                ) {

                    installment.paid =
                        true;

                    installment.status =
                        "Paid";

                    installment.paidAmount =
                        installmentAmount;

                    installment.remainingAmount =
                        0;

                    continue;
                }


                // ------------------------------------------
                // APPLY PAYMENT TO THIS INSTALLMENT
                // ------------------------------------------

                const appliedAmount =
                    Math.min(
                        remainingPayment,
                        installmentRemaining
                    );


                const newPaidAmount =
                    alreadyPaid +
                    appliedAmount;


                const newRemainingAmount =
                    Math.max(
                        installmentAmount -
                        newPaidAmount,
                        0
                    );


                installment.paidAmount =
                    newPaidAmount;


                installment.remainingAmount =
                    newRemainingAmount;


                // ------------------------------------------
                // PAYMENT HISTORY
                // ------------------------------------------

                if (
                    !Array.isArray(
                        installment.paymentHistory
                    )
                ) {

                    installment.paymentHistory =
                        [];
                }


                const paymentId =
                    `PAY-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 9)}`;


                installment.paymentHistory.push({

                    paymentId,

                    amount:
                        appliedAmount,

                    date:
                        paymentDate,

                    notes:
                        paymentNotes,

                    repaymentDocId:
                        null
                });


                // ------------------------------------------
                // INSTALLMENT STATUS
                // ------------------------------------------

                if (
                    newRemainingAmount <=
                    0.001
                ) {

                    installment.paid =
                        true;

                    installment.status =
                        "Paid";

                    installment.remainingAmount =
                        0;

                    installment.paidDate =
                        paymentDate;

                } else {

                    installment.paid =
                        false;

                    installment.status =
                        "Partial";

                    installment.paidDate =
                        null;
                }


                remainingPayment -=
                    appliedAmount;
            }


            // ==========================================
            // VERIFY FULL PAYMENT WAS ALLOCATED
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
            // CALCULATE NEW TOTAL PAID
            // ==========================================

            const oldAmountPaid =
                Number(
                    loan.amountPaid ||
                    0
                );


            const newAmountPaid =
                oldAmountPaid +
                payment;


            // ==========================================
            // CALCULATE NEW BALANCE
            // ==========================================

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


            // ==========================================
            // FIND NEXT UNPAID INSTALLMENT
            // ==========================================

            const nextInstallment =
                schedule.find(
                    installment => {

                        const remaining =
                            Number(
                                installment.remainingAmount ||
                                0
                            );

                        return (
                            !installment.paid &&
                            remaining >
                            0.001
                        );
                    }
                );


            const nextRepaymentDate =
                nextInstallment
                    ? (
                        nextInstallment.dueDate ||
                        "-"
                    )
                    : "-";


            // ==========================================
            // REMAINING INSTALLMENTS
            // ==========================================

            const remainingInstallments =
                schedule.filter(
                    installment =>
                        !installment.paid &&
                        Number(
                            installment.remainingAmount ||
                            0
                        ) > 0.001
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
                nextRepaymentDate !== "-" &&
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
            // INCOME CALCULATION
            // ==========================================
            //
            // Income here represents the interest
            // portion of repayments.
            //
            // Processing fee is preserved separately
            // and is NOT repeatedly added on every
            // repayment.
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
                        nextRepaymentDate,

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
                            paymentDate,

                        notes:
                            paymentNotes,

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
            // LINK REPAYMENT DOCUMENT ID
            // ==========================================

            let repaymentLinked =
                false;


            /*
             * Only the payment records created by
             * THIS repayment should receive the new
             * repayment document ID.
             *
             * We identify them by the absence of
             * repaymentDocId and work backwards from
             * the schedule.
             */

            for (
                let s =
                    schedule.length - 1;
                s >= 0;
                s--
            ) {

                const installment =
                    schedule[s];


                if (
                    !Array.isArray(
                        installment.paymentHistory
                    )
                ) {

                    continue;
                }


                for (
                    let p =
                        installment.paymentHistory.length - 1;
                    p >= 0;
                    p--
                ) {

                    const record =
                        installment
                            .paymentHistory[p];


                    if (
                        record &&
                        record.paymentId &&
                        !record.repaymentDocId
                    ) {

                        record.repaymentDocId =
                            repaymentRef.id;

                        repaymentLinked =
                            true;

                        /*
                         * Continue linking all newly
                         * created records from this
                         * repayment.
                         */
                    }
                }
            }


            // ==========================================
            // SAVE LINKED SCHEDULE
            // ==========================================

            if (
                repaymentLinked
            ) {

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
            // RECORD HISTORY
            // ==========================================

            try {

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

            } catch (historyError) {

                /*
                 * History failure must not turn a
                 * successfully saved repayment into
                 * a failed repayment.
                 */

                console.error(
                    "Repayment history error:",
                    historyError
                );
            }


            // ==========================================
            // UPDATE LOCAL LOAN DATA
            // ==========================================
            //
            // This keeps the UI immediately
            // consistent without waiting for the
            // Firestore listener.
            // ==========================================

            const localLoan =
                loans.find(
                    item =>
                        item.id ===
                        loan.id
                );


            if (localLoan) {

                localLoan.amountPaid =
                    newAmountPaid;

                localLoan.balance =
                    newBalance;

                localLoan.totalIncome =
                    newTotalIncome;

                localLoan.repaymentSchedule =
                    schedule;

                localLoan.nextRepaymentDate =
                    nextRepaymentDate;

                localLoan.remainingInstallments =
                    remainingInstallments;

                localLoan.status =
                    newStatus;

                localLoan.completed =
                    newBalance <=
                    0.01;
            }


            // ==========================================
            // SUCCESS
            // ==========================================

            alert(
                `Repayment of ${currency(
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
                    "Unknown error."
                )
            );

        } finally {

            // ==========================================
            // RELEASE SUBMISSION LOCK
            // ==========================================

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
//
// This section handles:
// 1. FAB Add Repayment
// 2. Client selection
// 3. Outstanding loan selection
// 4. Automatic loan selection when only one
// 5. Loading the selected loan into repayment form
//
// IMPORTANT:
// This section does NOT save repayments.
// ==========================================


// ==========================================
// FAB REPAYMENT CLICK HANDLER
// ==========================================

function setupFabAddRepayment() {

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
         * Make sure the existing container
         * remains inside the current form.
         */

        if (
            container.parentElement !==
            form
        ) {

            form.insertBefore(
                container,
                form.firstElementChild
            );
        }


        return container;
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
                autocomplete="off"
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
                autocomplete="off"
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


    // ==========================================
    // CLIENT SELECT CHANGE
    // ==========================================

    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    clientSelector?.addEventListener(
        "change",
        event => {

            loadLoansForSelectedClient(
                event.target.value
            );
        }
    );


    // ==========================================
    // LOAN SELECT CHANGE
    // ==========================================

    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
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


    createFabRepaymentSelectors(
        repaymentForm
    );


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


    // ==========================================
    // SORT CLIENTS
    // ==========================================

    const sortedClients =
        [...clients].sort(
            (a, b) =>
                String(
                    a.name ||
                    ""
                ).localeCompare(
                    String(
                        b.name ||
                        ""
                    )
                )
        );


    // ==========================================
    // ADD CLIENTS
    // ==========================================

    sortedClients.forEach(
        client => {

            const clientLoans =
                loans.filter(
                    loan => {

                        const sameClient =
                            String(
                                loan.clientId ||
                                ""
                            ) ===
                            String(
                                client.id ||
                                ""
                            );


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
                            sameClient &&
                            balance > 0 &&
                            status !==
                                "Completed" &&
                            status !==
                                "Rejected" &&
                            status !==
                                "Pending"
                        );
                    }
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                client.id;


            const clientName =
                client.name ||
                "Unnamed Client";


            if (
                clientLoans.length
            ) {

                option.textContent =
                    clientName;

            } else {

                option.textContent =
                    `${clientName} — No outstanding loan`;

                option.disabled =
                    true;
            }


            clientSelector.appendChild(
                option
            );
        }
    );


    // ==========================================
    // RESTORE PREVIOUS CLIENT
    // ==========================================

    if (
        previousValue &&
        Array.from(
            clientSelector.options
        ).some(
            option =>
                option.value ===
                previousValue
        )
    ) {

        clientSelector.value =
            previousValue;
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


    // ==========================================
    // NORMAL FAB MODE
    // ==========================================

    directLoanRepaymentMode =
        false;


    selectedLoanId =
        null;


    // ==========================================
    // RESET FORM
    // ==========================================

    form.reset();


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


    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    // ==========================================
    // CREATE SELECTORS
    // ==========================================

    createFabRepaymentSelectors(
        form
    );


    showFabRepaymentSelectors();


    populateFabClientSelector();


    // ==========================================
    // RESET LOAN SELECTOR
    // ==========================================

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


    // ==========================================
    // OPEN MODAL
    // ==========================================

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


    // ==========================================
    // FOCUS CLIENT SELECTOR
    // ==========================================

    setTimeout(
        () => {

            document
                .getElementById(
                    "fab-repayment-client-select"
                )
                ?.focus();

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


    // ==========================================
    // RESET LOAN SELECTOR
    // ==========================================

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


    if (!clientId) {
        return;
    }


    // ==========================================
    // FIND OUTSTANDING LOANS
    // ==========================================

    const clientLoans =
        loans
            .filter(
                loan => {

                    const sameClient =
                        String(
                            loan.clientId ||
                            ""
                        ) ===
                        String(
                            clientId ||
                            ""
                        );


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
                        sameClient &&
                        balance > 0 &&
                        status !==
                            "Completed" &&
                        status !==
                            "Rejected" &&
                        status !==
                            "Pending"
                    );
                }
            )
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.approvalDate ||
                            a.createdAt ||
                            0
                        );


                    const dateB =
                        new Date(
                            b.approvalDate ||
                            b.createdAt ||
                            0
                        );


                    return dateB -
                        dateA;
                }
            );


    // ==========================================
    // NO OUTSTANDING LOANS
    // ==========================================

    if (
        clientLoans.length ===
        0
    ) {

        alert(
            "This client has no outstanding loan."
        );

        return;
    }


    // ==========================================
    // ONE OUTSTANDING LOAN
    // ==========================================

    if (
        clientLoans.length ===
        1
    ) {

        if (loanSelector) {

            loanSelector.value =
                clientLoans[0].id;
        }


        fillRepaymentFromSelectedLoan(
            clientLoans[0].id
        );


        return;
    }


    // ==========================================
    // MULTIPLE OUTSTANDING LOANS
    // ==========================================

    if (loanGroup) {

        loanGroup.style.display =
            "";
    }


    if (loanSelector) {

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
    }
}


// ==========================================
// END OF PART 7/16
// ==========================================// ==========================================
// PART 8/16
// REPAYMENT FORM + LOAN DETAILS INTEGRATION
// ==========================================
//
// This section handles:
// 1. Loading a selected loan into repayment form
// 2. Clearing repayment fields safely
// 3. Opening repayment from Loan Details
// 4. Closing repayment modal
// 5. Backdrop / ESC closing
// 6. Repayment input validation
// 7. Read-only client and balance fields
//
// IMPORTANT:
// This section does NOT save repayments.
// ==========================================


// ==========================================
// FILL REPAYMENT FROM SELECTED LOAN
// ==========================================

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


    const balance =
        Number(
            loan.balance ||
            0
        );


    if (
        balance <=
        0
    ) {

        clearRepaymentFields();

        alert(
            "This loan has no outstanding balance."
        );

        return;
    }


    // ==========================================
    // STORE LOAN ID
    // ==========================================

    if (repaymentLoanId) {

        repaymentLoanId.value =
            loan.id;
    }


    selectedLoanId =
        loan.id;


    // ==========================================
    // CLIENT DISPLAY
    // ==========================================

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


    // ==========================================
    // BALANCE DISPLAY
    // ==========================================

    if (repaymentBalance) {

        repaymentBalance.value =
            currency(
                balance
            );
    }


    // ==========================================
    // DEFAULT DATE
    // ==========================================

    if (repaymentDate) {

        repaymentDate.value =
            today();
    }


    // ==========================================
    // RESET PAYMENT INPUT
    // ==========================================

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
}


// ==========================================
// CLEAR REPAYMENT FIELDS
// ==========================================

function clearRepaymentFields() {

    if (repaymentLoanId) {

        repaymentLoanId.value =
            "";
    }


    if (repaymentBalance) {

        repaymentBalance.value =
            "";
    }


    if (
        repaymentAmount &&
        typeof repaymentAmount
            .setCustomValidity ===
            "function"
    ) {

        repaymentAmount.setCustomValidity(
            ""
        );
    }


    /*
     * Do not clear selectedLoanId here.
     *
     * It may be required to return to the
     * currently open Loan Details page.
     */
}


// ==========================================
// OPEN REPAYMENT FROM LOAN DETAILS
// ==========================================

function openRepaymentForLoan(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                id
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


    if (
        balance <=
        0
    ) {

        alert(
            "This loan has no outstanding balance."
        );

        return;
    }


    // ==========================================
    // GET MODAL + FORM
    // ==========================================

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


    // ==========================================
    // DIRECT LOAN MODE
    // ==========================================

    directLoanRepaymentMode =
        true;


    selectedLoanId =
        loan.id;


    // ==========================================
    // PREPARE FAB SELECTORS
    // ==========================================

    createFabRepaymentSelectors(
        form
    );


    hideFabRepaymentSelectors();


    // ==========================================
    // RESET FORM
    // ==========================================

    form.reset();


    // ==========================================
    // RESTORE SELECTED LOAN
    // ==========================================

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
                balance
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


    // ==========================================
    // SHOW MODAL ABOVE LOAN DETAILS
    // ==========================================

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


    // ==========================================
    // FOCUS PAYMENT FIELD
    // ==========================================

    setTimeout(
        () => {

            repaymentAmount?.focus();

        },
        100
    );
}


// ==========================================
// CLOSE REPAYMENT MODAL
// ==========================================

function closeRepaymentModal() {

    const modal =
        document.getElementById(
            "repayment-modal"
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    modal.style.zIndex =
        "";


    // ==========================================
    // REMEMBER WHETHER DETAILS WERE OPEN
    // ==========================================

    const wasDirectLoanMode =
        directLoanRepaymentMode;


    const returnLoanId =
        selectedLoanId;


    // ==========================================
    // RETURN TO NORMAL MODE
    // ==========================================

    directLoanRepaymentMode =
        false;


    // ==========================================
    // RESET FORM VALUES
    // ==========================================

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


    clearRepaymentFields();


    // ==========================================
    // RESTORE FAB SELECTORS
    // ==========================================

    showFabRepaymentSelectors();


    /*
     * If the modal came from Loan Details,
     * keep selectedLoanId so the details page
     * can remain associated with the same loan.
     */

    if (
        wasDirectLoanMode &&
        returnLoanId &&
        loanDetailsOpen
    ) {

        selectedLoanId =
            returnLoanId;


        const updatedLoan =
            loans.find(
                item =>
                    item.id ===
                    returnLoanId
            );


        if (updatedLoan) {

            try {

                renderLoanDetailsPage(
                    updatedLoan
                );

            } catch (error) {

                console.error(
                    "Loan details refresh error:",
                    error
                );
            }
        }
    }
}


// ==========================================
// REPAYMENT MODAL CLOSE BUTTONS
// ==========================================

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


// ==========================================
// REPAYMENT BACKDROP
// ==========================================

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


// ==========================================
// ESCAPE KEY
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


        if (
            loanDetailsOpen &&
            typeof closeLoanDetailsPage ===
                "function"
        ) {

            closeLoanDetailsPage();
        }
    }
);


// ==========================================
// REPAYMENT DATE DEFAULT
// ==========================================

if (repaymentDate) {

    repaymentDate.value =
        today();
}


// ==========================================
// REPAYMENT AMOUNT INPUT SAFETY
// ==========================================

if (repaymentAmount) {

    repaymentAmount.setAttribute(
        "inputmode",
        "decimal"
    );


    repaymentAmount.setAttribute(
        "min",
        "0"
    );


    repaymentAmount.addEventListener(
        "input",
        () => {

            const loanId =
                directLoanRepaymentMode
                    ? (
                        selectedLoanId ||
                        repaymentLoanId?.value ||
                        ""
                    )
                    : (
                        repaymentLoanId?.value ||
                        ""
                    );


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
                balance + 0.01
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
}


// ==========================================
// CLIENT DISPLAY READ-ONLY
// ==========================================

if (repaymentClient) {

    if (
        repaymentClient.tagName !==
        "SELECT"
    ) {

        repaymentClient.readOnly =
            true;
    }
}


// ==========================================
// BALANCE DISPLAY READ-ONLY
// ==========================================

if (repaymentBalance) {

    repaymentBalance.readOnly =
        true;
}


// ==========================================
// REPAYMENT LOAN ID CHANGE
// ==========================================

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


// ==========================================
// END OF PART 8/16
// ==========================================// ==========================================
// PART 9/16
// REPAYMENT MODAL SAFETY + MESSAGING BRIDGE
// ==========================================


// ==========================================
// CLOSE REPAYMENT MODAL
// ==========================================

function closeRepaymentModal() {

    const modal =
        document.getElementById(
            "repayment-modal"
        );

    if (!modal) {
        return;
    }


    modal.classList.add(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.style.zIndex = "";


    // ------------------------------------------
    // RETURN TO NORMAL REPAYMENT MODE
    // ------------------------------------------

    directLoanRepaymentMode =
        false;


    /*
     * IMPORTANT:
     *
     * Do NOT clear selectedLoanId here.
     *
     * When repayment was opened from
     * Loan Details, it is still needed
     * to return to the correct loan.
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


    showFabRepaymentSelectors();
}


// ==========================================
// REPAYMENT CLOSE BUTTONS
// ==========================================

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


        closeRepaymentModal();
    }
);


// ==========================================
// REPAYMENT BACKDROP CLOSE
// ==========================================

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


// ==========================================
// ESCAPE KEY
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
        }
    }
);


// ==========================================
// REPAYMENT DATE DEFAULT
// ==========================================

if (repaymentDate) {

    repaymentDate.value =
        today();
}


// ==========================================
// REPAYMENT AMOUNT INPUT SAFETY
// ==========================================

if (repaymentAmount) {

    repaymentAmount.setAttribute(
        "inputmode",
        "decimal"
    );

    repaymentAmount.setAttribute(
        "min",
        "0"
    );
}


// ==========================================
// CLIENT DISPLAY SAFETY
// ==========================================

if (repaymentClient) {

    /*
     * Client must never be manually
     * changed when it is a text field.
     *
     * The client comes from the selected
     * Firestore loan.
     */

    if (
        repaymentClient.tagName !==
        "SELECT"
    ) {

        repaymentClient.readOnly =
            true;
    }
}


// ==========================================
// BALANCE DISPLAY SAFETY
// ==========================================

if (repaymentBalance) {

    repaymentBalance.readOnly =
        true;
}


// ==========================================
// REPAYMENT LOAN CHANGE
// ==========================================

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


// ==========================================
// REPAYMENT AMOUNT VALIDATION
// ==========================================

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
                Number.isFinite(amount) &&
                amount > balance
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


// ==========================================
// REPAYMENT SUBMISSION LOCK
// ==========================================

let repaymentSubmissionStarted =
    false;


repaymentForm
    ?.addEventListener(
        "submit",
        event => {

            /*
             * This listener does NOT save
             * the repayment.
             *
             * It only blocks a second
             * submit event while the main
             * repayment handler is running.
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
             * Release the browser-level
             * protection after a short
             * period.
             *
             * The main repaymentSaving
             * variable remains responsible
             * for the actual save protection.
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


// ==========================================
// SAFE MESSAGING BRIDGE
// ==========================================

/*
 * Messaging is completely isolated from
 * the financial transaction.
 *
 * loans.js remains fully functional even
 * when messaging.js:
 *
 * - is missing
 * - has an error
 * - has no phone number
 * - cannot open native SMS
 * - throws an exception
 *
 * IMPORTANT:
 *
 * This function does NOT directly modify
 * Firestore.
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

            console.warn(
                "Messaging skipped: loan not found.",
                loanId
            );

            return false;
        }


        const client =
            getLoanClientForMessaging
                ? getLoanClientForMessaging(
                    loan
                )
                : null;


        /*
         * Build one consistent payload
         * for messaging.js.
         */

        const payload = {

            loanId:
                loan.id,

            loanNumber:
                loan.loanNumber ||
                "",

            loan:
                loan,

            clientId:
                client?.id ||
                loan.clientId ||
                "",

            clientName:
                client?.name ||
                loan.clientName ||
                "",

            clientPhone:
                extraData.clientPhone ||
                extraData.phone ||
                client?.phone ||
                loan.clientPhone ||
                loan.phone ||
                "",

            phone:
                extraData.clientPhone ||
                extraData.phone ||
                client?.phone ||
                loan.clientPhone ||
                loan.phone ||
                "",

            amount:
                Number(
                    extraData.amount ||
                    0
                ),

            paymentAmount:
                Number(
                    extraData.paymentAmount ||
                    extraData.amount ||
                    0
                ),

            balance:
                Number(
                    extraData.balance ??
                    loan.balance ??
                    0
                ),

            previousBalance:
                Number(
                    extraData.previousBalance ||
                    0
                ),

            status:
                extraData.status ||
                loan.status ||
                "",

            messageType:
                messageType,

            type:
                messageType
        };


        /*
         * Find the messaging function
         * without assuming one exact
         * messaging.js version.
         */

        const messenger =
            typeof window !==
                "undefined"
                ? (
                    window.GREYMUS_MESSAGING ||
                    window.greymusMessaging ||
                    window
                )
                : null;


        if (!messenger) {

            console.warn(
                "Messaging module unavailable. Financial operation continues."
            );

            return false;
        }


        const messagingFunction =
            messenger.sendLoanMessage ||
            messenger.sendClientMessage ||
            messenger.sendMessage ||
            messenger.openNativeSms ||
            messenger.openClientSms;


        if (
            typeof messagingFunction !==
            "function"
        ) {

            console.warn(
                "No compatible messaging function found. Financial operation continues."
            );

            return false;
        }


        await Promise.resolve(
            messagingFunction.call(
                messenger,
                payload
            )
        );


        return true;

    } catch (error) {

        /*
         * NEVER throw the messaging error
         * back into loan processing.
         */

        console.error(
            "GREYMUS messaging integration error:",
            error
        );


        return false;
    }
}


// ==========================================
// SAFE REPAYMENT MESSAGE
// ==========================================

async function sendRepaymentMessageSafely(
    loanId,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    try {

        let messageType =
            "partial";


        if (
            Number(
                newBalance
            ) <= 0
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
                    newBalance,

                status:
                    status
            }
        );

    } catch (error) {

        console.error(
            "Safe repayment messaging error:",
            error
        );

        return false;
    }
}


// ==========================================
// END OF PART 9/16
// ==========================================// ==========================================
// PART 10/16
// MESSAGING CLIENT DATA + PHONE NORMALIZATION
// ==========================================


// ==========================================
// GET CLIENT FOR MESSAGING
// ==========================================

function getLoanClientForMessaging(
    loan
) {

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


    /*
     * Prefer the current client record.
     *
     * If the client is not yet available
     * in memory, safely fall back to the
     * information stored on the loan.
     */

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
            loan.clientPhone ||
            loan.phone ||
            ""
    };
}


// ==========================================
// NORMALIZE KENYAN PHONE NUMBER
// ==========================================

function normalizeMessagingPhone(
    phone
) {

    if (
        phone ===
        null ||
        phone ===
        undefined
    ) {

        return "";
    }


    let value =
        String(
            phone
        ).trim();


    if (!value) {
        return "";
    }


    /*
     * Remove common formatting characters.
     */

    value =
        value.replace(
            /[\s().-]/g,
            ""
        );


    /*
     * Kenyan local format:
     *
     * 07XXXXXXXX
     * 01XXXXXXXX
     *
     * becomes:
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
            value.substring(
                1
            );
    }


    /*
     * Kenyan international format
     * without the plus sign.
     */

    else if (
        /^254[17]\d{8}$/.test(
            value
        )
    ) {

        value =
            "+" +
            value;
    }


    /*
     * If the number is already in
     * +254 format, leave it unchanged.
     */

    return value;
}


// ==========================================
// GET CURRENT CLIENT PHONE
// ==========================================

function getLoanClientPhone(
    loan
) {

    const client =
        getLoanClientForMessaging(
            loan
        );


    return normalizeMessagingPhone(
        client?.phone
    );
}


// ==========================================
// BUILD STANDARD LOAN MESSAGE PAYLOAD
// ==========================================

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

        /*
         * Loan identity
         */

        loanId:
            loan.id,

        loanNumber:
            loan.loanNumber ||
            "",


        /*
         * Client identity
         */

        clientId:
            client?.id ||
            loan.clientId ||
            "",

        clientName:
            client?.name ||
            loan.clientName ||
            "",

        clientPhone:
            phone,

        phone:
            phone,


        /*
         * Financial information
         */

        loanAmount:
            Number(
                loan.amount ||
                0
            ),

        amount:
            Number(
                options.amount ||
                0
            ),

        paymentAmount:
            Number(
                options.paymentAmount ||
                options.amount ||
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
                options.previousBalance ||
                0
            ),

        weeklyPayment:
            Number(
                loan.weeklyPayment ||
                0
            ),


        /*
         * Dates
         */

        nextRepaymentDate:
            loan.nextRepaymentDate ||
            "",

        dueDate:
            options.dueDate ||
            loan.nextRepaymentDate ||
            "",


        /*
         * Status / message type
         */

        status:
            options.status ||
            loan.status ||
            "",

        messageType:
            options.messageType ||
            "",

        type:
            options.messageType ||
            ""
    };
}


// ==========================================
// FIND MESSAGING FUNCTION
// ==========================================

function getMessagingFunction() {

    try {

        if (
            typeof window ===
            "undefined"
        ) {

            return null;
        }


        /*
         * Support messaging.js versions
         * that expose a namespace.
         */

        const messenger =
            window.GREYMUS_MESSAGING ||
            window.greymusMessaging;


        if (messenger) {

            return {

                context:
                    messenger,

                function:
                    messenger.sendLoanMessage ||
                    messenger.sendClientMessage ||
                    messenger.sendMessage ||
                    messenger.openNativeSms ||
                    messenger.openClientSms
            };
        }


        /*
         * Also support versions that
         * expose functions directly on
         * window.
         */

        return {

            context:
                window,

            function:
                window.sendLoanMessage ||
                window.sendClientMessage ||
                window.sendMessage ||
                window.openNativeSms ||
                window.openClientSms
        };

    } catch (error) {

        console.error(
            "Unable to locate messaging module:",
            error
        );

        return null;
    }
}


// ==========================================
// CALL MESSAGING.JS SAFELY
// ==========================================

async function callMessagingModule(
    payload
) {

    try {

        if (!payload) {

            return false;
        }


        const messaging =
            getMessagingFunction();


        if (
            !messaging ||
            typeof messaging.function !==
                "function"
        ) {

            console.warn(
                "GREYMUS messaging.js is unavailable. Continuing without messaging."
            );

            return false;
        }


        /*
         * Call messaging.js with the
         * complete standardized payload.
         *
         * Any error is caught locally.
         */

        await Promise.resolve(
            messaging.function.call(
                messaging.context,
                payload
            )
        );


        return true;

    } catch (error) {

        console.error(
            "GREYMUS messaging call failed:",
            error
        );


        /*
         * Messaging must NEVER break:
         *
         * - loan approval
         * - repayment saving
         * - balance calculation
         * - Firestore updates
         */

        return false;
    }
}


// ==========================================
// SEND LOAN APPROVAL MESSAGE
// ==========================================

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


        const payload =
            buildLoanMessagingPayload(
                loan,
                {

                    messageType:
                        "loan-approved",

                    balance:
                        Number(
                            loan.balance ||
                            loan.totalRepayment ||
                            0
                        ),

                    status:
                        loan.status ||
                        "Active"
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
            "Loan approval messaging error:",
            error
        );

        return false;
    }
}


// ==========================================
// SEND REPAYMENT MESSAGE
// ==========================================

async function sendLoanRepaymentMessage(
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


        let messageType =
            "partial";


        /*
         * Fully cleared loan.
         */

        if (
            Number(
                newBalance
            ) <= 0
        ) {

            messageType =
                "full";
        }


        /*
         * Payment made while the loan
         * still has arrears.
         */

        else if (
            normalizeLoanStatus(
                status
            ) ===
            "Arrears"
        ) {

            messageType =
                "partial-arrears";
        }


        /*
         * Normal partial repayment.
         */

        else {

            messageType =
                "partial";
        }


        const payload =
            buildLoanMessagingPayload(
                loan,
                {

                    messageType:
                        messageType,

                    amount:
                        paymentAmount,

                    paymentAmount:
                        paymentAmount,

                    previousBalance:
                        previousBalance,

                    balance:
                        newBalance,

                    status:
                        status
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
            "Repayment messaging error:",
            error
        );

        return false;
    }
}


// ==========================================
// END OF PART 10/16
// ==========================================// ==========================================
// PART 11/16
// APPROVAL MESSAGE + REPAYMENT MESSAGE HELPERS
// ==========================================


// ==========================================
// BUILD APPROVED LOAN SNAPSHOT
// ==========================================

function buildApprovedLoanSnapshot(
    loan,
    approvalDate,
    schedule
) {

    if (!loan) {
        return null;
    }


    return {

        ...loan,

        approvalDate:
            formatDate(
                approvalDate
            ),

        repaymentSchedule:
            schedule,

        nextRepaymentDate:
            schedule?.length
                ? schedule[0].dueDate
                : "-",

        remainingInstallments:
            schedule?.length ||
            0,

        status:
            "Active",

        completed:
            false
    };
}


// ==========================================
// SEND APPROVAL MESSAGE SAFELY
// ==========================================

async function sendApprovalMessageSafely(
    loan,
    approvalDate,
    schedule
) {

    try {

        if (!loan) {
            return false;
        }


        const approvedLoan =
            buildApprovedLoanSnapshot(
                loan,
                approvalDate,
                schedule
            );


        if (!approvedLoan) {
            return false;
        }


        /*
         * IMPORTANT:
         *
         * The approval message is called
         * ONLY after Firestore has already
         * successfully changed the loan to
         * Active.
         */

        const payload =
            buildLoanMessagingPayload(
                approvedLoan,
                {

                    messageType:
                        "loan-approved",

                    status:
                        "Active",

                    balance:
                        Number(
                            approvedLoan.balance ||
                            approvedLoan.totalRepayment ||
                            0
                        ),

                    dueDate:
                        approvedLoan
                            .nextRepaymentDate
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
            "Safe approval message error:",
            error
        );

        return false;
    }
}


// ==========================================
// DETERMINE REPAYMENT MESSAGE TYPE
// ==========================================

function getRepaymentMessageType(
    newBalance,
    status
) {

    const balance =
        Number(
            newBalance ||
            0
        );


    /*
     * Loan completely cleared.
     */

    if (
        balance <=
        0
    ) {

        return "full";
    }


    /*
     * Payment made while loan remains
     * in arrears.
     */

    if (
        normalizeLoanStatus(
            status
        ) ===
        "Arrears"
    ) {

        return "partial-arrears";
    }


    /*
     * Normal partial repayment.
     */

    return "partial";
}


// ==========================================
// BUILD REPAYMENT MESSAGE PAYLOAD
// ==========================================

function buildRepaymentMessagePayload(
    loan,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    if (!loan) {
        return null;
    }


    const messageType =
        getRepaymentMessageType(
            newBalance,
            status
        );


    return buildLoanMessagingPayload(
        loan,
        {

            messageType:
                messageType,

            amount:
                paymentAmount,

            paymentAmount:
                paymentAmount,

            previousBalance:
                previousBalance,

            balance:
                newBalance,

            status:
                status
        }
    );
}


// ==========================================
// SEND REPAYMENT MESSAGE SAFELY
// ==========================================

async function sendRepaymentMessageAfterSave(
    loanId,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    try {

        /*
         * Get the latest local loan.
         */

        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if (!loan) {

            console.warn(
                "Repayment message skipped: loan not found.",
                loanId
            );

            return false;
        }


        const payload =
            buildRepaymentMessagePayload(
                loan,
                paymentAmount,
                previousBalance,
                newBalance,
                status
            );


        if (!payload) {
            return false;
        }


        /*
         * Messaging is intentionally isolated.
         *
         * Failure here does not affect the
         * repayment already saved to Firestore.
         */

        return await callMessagingModule(
            payload
        );

    } catch (error) {

        console.error(
            "Post-repayment messaging error:",
            error
        );

        return false;
    }
}


// ==========================================
// PUBLIC MESSAGE HELPER
// ==========================================

async function sendClientLoanMessage(
    loanId,
    messageType,
    options = {}
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
                "Cannot send client message: loan not found."
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
            "Client loan message error:",
            error
        );

        return false;
    }
}


// ==========================================
// MESSAGE CURRENT LOAN STATUS
// ==========================================

async function messageCurrentLoanStatus(
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


        const status =
            normalizeLoanStatus(
                loan.status
            );


        let messageType =
            "partial";


        if (
            status ===
            "Arrears"
        ) {

            messageType =
                "arrears";
        }


        if (
            status ===
            "Completed"
        ) {

            messageType =
                "full";
        }


        return await sendClientLoanMessage(
            loan.id,
            messageType,
            {

                balance:
                    Number(
                        loan.balance ||
                        0
                    ),

                status:
                    loan.status ||
                    ""
            }
        );

    } catch (error) {

        console.error(
            "Loan status messaging error:",
            error
        );

        return false;
    }
}


// ==========================================
// OPTIONAL GLOBAL BRIDGE
// ==========================================

/*
 * These functions are exposed only as
 * safe bridges for messaging.js or other
 * UI modules.
 *
 * They do not directly modify Firestore.
 */

if (
    typeof window !==
    "undefined"
) {

    window.GREYMUS_LOAN_MESSAGING = {

        getClient:
            getLoanClientForMessaging,

        getPhone:
            getLoanClientPhone,

        buildPayload:
            buildLoanMessagingPayload,

        sendLoanApproval:
            sendLoanApprovalMessage,

        sendRepayment:
            sendLoanRepaymentMessage,

        sendMessage:
            sendClientLoanMessage,

        messageStatus:
            messageCurrentLoanStatus
    };
}


// ==========================================
// END OF PART 11/16
// ==========================================// ==========================================
// PART 12/16
// REPAYMENT → CLIENT MESSAGE INTEGRATION
// ==========================================


// ==========================================
// SEND REPAYMENT MESSAGE AFTER SUCCESS
// ==========================================

/*
 * IMPORTANT:
 *
 * This function must ONLY be called after:
 *
 * 1. Loan has been updated
 * 2. Repayment document has been saved
 * 3. Repayment schedule has been saved
 * 4. History has been recorded
 *
 * Messaging failure NEVER reverses or
 * interrupts the financial transaction.
 */

async function processRepaymentClientMessage(
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

            console.warn(
                "Repayment message skipped: loan not found."
            );

            return false;
        }


        /*
         * Build the message type from the
         * FINAL loan state.
         */

        const messageType =
            getRepaymentMessageType(
                newBalance,
                status
            );


        /*
         * Build a fresh snapshot.
         *
         * This is important because the
         * local loan object may still contain
         * the old balance immediately after
         * Firestore update.
         */

        const messagingLoan = {

            ...loan,

            amountPaid:
                Number(
                    loan.amountPaid ||
                    0
                ),

            balance:
                Number(
                    newBalance ||
                    0
                ),

            status:
                status ||
                loan.status ||
                "",

            nextRepaymentDate:
                loan.nextRepaymentDate ||
                "-",

            remainingInstallments:
                Number(
                    loan.remainingInstallments ||
                    0
                )
        };


        const payload =
            buildLoanMessagingPayload(
                messagingLoan,
                {

                    messageType:
                        messageType,

                    amount:
                        paymentAmount,

                    paymentAmount:
                        paymentAmount,

                    previousBalance:
                        previousBalance,

                    balance:
                        newBalance,

                    status:
                        status
                }
            );


        if (!payload) {

            return false;
        }


        /*
         * callMessagingModule() catches
         * messaging.js errors internally.
         */

        return await callMessagingModule(
            payload
        );

    } catch (error) {

        console.error(
            "Post-repayment client message error:",
            error
        );

        return false;
    }
}


// ==========================================
// REPAYMENT MESSAGE TYPE DETAILS
// ==========================================

function getRepaymentMessageDetails(
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    const payment =
        Number(
            paymentAmount ||
            0
        );


    const before =
        Number(
            previousBalance ||
            0
        );


    const after =
        Number(
            newBalance ||
            0
        );


    const normalizedStatus =
        normalizeLoanStatus(
            status
        );


    let messageType =
        "partial";


    if (
        after <=
        0
    ) {

        messageType =
            "full";

    } else if (
        normalizedStatus ===
        "Arrears"
    ) {

        messageType =
            "partial-arrears";
    }


    return {

        messageType,

        paymentAmount:
            payment,

        previousBalance:
            before,

        newBalance:
            after,

        status:
            status || ""
    };
}


// ==========================================
// REPAYMENT MESSAGE WRAPPER
// ==========================================

async function sendRepaymentClientMessage(
    loanId,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    try {

        const details =
            getRepaymentMessageDetails(
                paymentAmount,
                previousBalance,
                newBalance,
                status
            );


        return await processRepaymentClientMessage(
            loanId,

            details.paymentAmount,

            details.previousBalance,

            details.newBalance,

            details.status
        );

    } catch (error) {

        console.error(
            "Repayment client message wrapper error:",
            error
        );

        return false;
    }
}


// ==========================================
// APPROVAL → CLIENT MESSAGE
// ==========================================

async function processLoanApprovalClientMessage(
    loanId,
    approvalDate,
    schedule
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
                "Approval message skipped: loan not found."
            );

            return false;
        }


        /*
         * Construct the approved state
         * without waiting for a realtime
         * Firestore listener.
         */

        const approvedLoan = {

            ...loan,

            approvalDate:
                formatDate(
                    approvalDate
                ),

            repaymentSchedule:
                Array.isArray(
                    schedule
                )
                    ? schedule
                    : [],

            nextRepaymentDate:
                schedule?.length
                    ? schedule[0].dueDate
                    : "-",

            remainingInstallments:
                schedule?.length ||
                0,

            status:
                "Active",

            completed:
                false
        };


        const payload =
            buildLoanMessagingPayload(
                approvedLoan,
                {

                    messageType:
                        "loan-approved",

                    status:
                        "Active",

                    balance:
                        Number(
                            approvedLoan.balance ||
                            approvedLoan.totalRepayment ||
                            0
                        ),

                    dueDate:
                        approvedLoan.nextRepaymentDate
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
            "Loan approval client message error:",
            error
        );

        return false;
    }
}


// ==========================================
// SAFE APPROVAL MESSAGE WRAPPER
// ==========================================

async function sendLoanApprovalMessageSafely(
    loanId,
    approvalDate,
    schedule
) {

    try {

        return await processLoanApprovalClientMessage(
            loanId,
            approvalDate,
            schedule
        );

    } catch (error) {

        console.error(
            "Safe loan approval message error:",
            error
        );

        return false;
    }
}


// ==========================================
// MESSAGE AFTER REPAYMENT
// ==========================================

async function notifyClientAfterRepayment(
    loanId,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    /*
     * Deliberately do not throw.
     *
     * The repayment is already complete.
     */

    try {

        await sendRepaymentClientMessage(
            loanId,
            paymentAmount,
            previousBalance,
            newBalance,
            status
        );

    } catch (error) {

        console.error(
            "Client repayment notification failed:",
            error
        );
    }
}


// ==========================================
// MESSAGE AFTER LOAN APPROVAL
// ==========================================

async function notifyClientAfterLoanApproval(
    loanId,
    approvalDate,
    schedule
) {

    /*
     * Deliberately do not throw.
     */

    try {

        await sendLoanApprovalMessageSafely(
            loanId,
            approvalDate,
            schedule
        );

    } catch (error) {

        console.error(
            "Client approval notification failed:",
            error
        );
    }
}


// ==========================================
// IMPORTANT INTEGRATION NOTE
// ==========================================

/*
 * DO NOT create another repaymentForm
 * submit listener in this part.
 *
 * The main repayment submission handler
 * from the earlier part remains the ONLY
 * handler responsible for saving repayments.
 *
 * After the repayment has successfully
 * been saved and history recorded, call:
 *
 * notifyClientAfterRepayment(
 *     loan.id,
 *     payment,
 *     currentBalance,
 *     newBalance,
 *     newStatus
 * );
 *
 * This keeps:
 *
 * REPAYMENT
 *    ↓
 * FIRESTORE
 *    ↓
 * HISTORY
 *    ↓
 * MESSAGING.JS
 *
 * Messaging cannot break the repayment.
 */


// ==========================================
// IMPORTANT APPROVAL INTEGRATION NOTE
// ==========================================

/*
 * After the loan approval update and
 * approval history have succeeded, call:
 *
 * notifyClientAfterLoanApproval(
 *     loan.id,
 *     approvalDate,
 *     schedule
 * );
 *
 * The loan remains Active even if SMS
 * messaging fails.
 */


// ==========================================
// END OF PART 12/16
// ==========================================// ==========================================
// PART 13/16
// LOAN APPROVAL + REPAYMENT MESSAGE HOOKS
// ==========================================


// ==========================================
// APPROVAL MESSAGE HOOK
// ==========================================

async function runLoanApprovalMessageHook(
    loan,
    approvalDate,
    schedule
) {

    try {

        if (!loan) {
            return false;
        }


        /*
         * The loan must already have been
         * approved before this function
         * is called.
         */

        const approvedLoan = {

            ...loan,

            approvalDate:
                formatDate(
                    approvalDate
                ),

            repaymentSchedule:
                Array.isArray(
                    schedule
                )
                    ? schedule
                    : [],

            nextRepaymentDate:
                Array.isArray(schedule) &&
                schedule.length
                    ? schedule[0].dueDate
                    : "-",

            remainingInstallments:
                Array.isArray(schedule)
                    ? schedule.length
                    : 0,

            status:
                "Active",

            completed:
                false
        };


        const payload =
            buildLoanMessagingPayload(
                approvedLoan,
                {

                    messageType:
                        "loan-approved",

                    status:
                        "Active",

                    balance:
                        Number(
                            approvedLoan.balance ||
                            approvedLoan.totalRepayment ||
                            0
                        ),

                    dueDate:
                        approvedLoan
                            .nextRepaymentDate
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
            "Loan approval messaging hook error:",
            error
        );

        return false;
    }
}


// ==========================================
// REPAYMENT MESSAGE HOOK
// ==========================================

async function runRepaymentMessageHook(
    loan,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    try {

        if (!loan) {
            return false;
        }


        /*
         * Determine the correct message
         * from the FINAL repayment result.
         */

        const messageType =
            getRepaymentMessageType(
                newBalance,
                status
            );


        /*
         * Create a fresh loan snapshot so
         * messaging.js receives the new
         * balance rather than the old one.
         */

        const updatedLoan = {

            ...loan,

            amountPaid:
                Number(
                    loan.amountPaid ||
                    0
                ),

            balance:
                Number(
                    newBalance ||
                    0
                ),

            status:
                status ||
                loan.status ||
                "",

            completed:
                Number(
                    newBalance ||
                    0
                ) <= 0
        };


        const payload =
            buildLoanMessagingPayload(
                updatedLoan,
                {

                    messageType:
                        messageType,

                    amount:
                        paymentAmount,

                    paymentAmount:
                        paymentAmount,

                    previousBalance:
                        previousBalance,

                    balance:
                        newBalance,

                    status:
                        status
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
            "Repayment messaging hook error:",
            error
        );

        return false;
    }
}


// ==========================================
// FINAL REPAYMENT NOTIFICATION
// ==========================================

async function notifyRepaymentSuccessfullySaved(
    loan,
    paymentAmount,
    previousBalance,
    newBalance,
    status
) {

    try {

        /*
         * Messaging happens only after the
         * financial transaction has succeeded.
         */

        await runRepaymentMessageHook(
            loan,
            paymentAmount,
            previousBalance,
            newBalance,
            status
        );

    } catch (error) {

        /*
         * Never allow a messaging problem
         * to turn a successful repayment
         * into a failed repayment.
         */

        console.error(
            "Final repayment notification error:",
            error
        );
    }
}


// ==========================================
// FINAL APPROVAL NOTIFICATION
// ==========================================

async function notifyLoanApprovedSuccessfully(
    loan,
    approvalDate,
    schedule
) {

    try {

        /*
         * Messaging is secondary to the
         * successful loan approval.
         */

        await runLoanApprovalMessageHook(
            loan,
            approvalDate,
            schedule
        );

    } catch (error) {

        console.error(
            "Final loan approval notification error:",
            error
        );
    }
}


// ==========================================
// SAFE LOAN APPROVAL OPERATION
// ==========================================

async function approveLoanWithMessaging(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                id
        );


    if (
        !loan ||
        normalizeLoanStatus(
            loan.status
        ) !==
            "Pending"
    ) {

        alert(
            "Loan is already active or has been processed."
        );

        return false;
    }


    if (
        !confirm(
            `Approve loan ${
                loan.loanNumber || ""
            } for ${
                loan.clientName || ""
            }?`
        )
    ) {

        return false;
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


        /*
         * FIRST:
         * Save the actual loan approval.
         */

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
                        ? schedule[0].dueDate
                        : "-",

                remainingInstallments:
                    schedule.length,

                status:
                    "Active",

                completed:
                    false,

                updatedAt:
                    serverTimestamp()
            }
        );


        /*
         * SECOND:
         * Record approval history.
         */

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


        /*
         * THIRD:
         * Send the client message.
         *
         * This is deliberately last.
         */

        const approvedLoan = {

            ...loan,

            approvalDate:
                formatDate(
                    approvalDate
                ),

            repaymentSchedule:
                schedule,

            nextRepaymentDate:
                schedule.length
                    ? schedule[0].dueDate
                    : "-",

            remainingInstallments:
                schedule.length,

            status:
                "Active",

            completed:
                false
        };


        await notifyLoanApprovedSuccessfully(
            approvedLoan,
            approvalDate,
            schedule
        );


        alert(
            "Loan approved successfully. Status is now Active."
        );


        return true;

    } catch (error) {

        console.error(
            "Loan approval failed:",
            error
        );


        alert(
            "Failed to approve loan."
        );


        return false;
    }
}


// ==========================================
// REPAYMENT SUCCESS HOOK
// ==========================================

async function completeRepaymentNotification(
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


        /*
         * Create the final loan state
         * received by messaging.js.
         */

        const finalLoan = {

            ...loan,

            balance:
                Number(
                    newBalance ||
                    0
                ),

            status:
                status ||
                loan.status ||
                "",

            completed:
                Number(
                    newBalance ||
                    0
                ) <= 0
        };


        await notifyRepaymentSuccessfullySaved(
            finalLoan,
            paymentAmount,
            previousBalance,
            newBalance,
            status
        );


        return true;

    } catch (error) {

        console.error(
            "Repayment completion hook error:",
            error
        );

        return false;
    }
}


// ==========================================
// END OF PART 13/16
// ==========================================// ==========================================
// LOAN DETAILS PAGE
// PART 14/16
// ==========================================


// ==========================================
// OPEN LOAN DETAILS
// ==========================================

function openLoanDetailsPage(id) {

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
        loan.id;

    previousLoansOpen =
        !loanDetailsOpen;

    loanDetailsOpen =
        true;


    renderLoanDetailsPage(
        loan
    );
}


// ==========================================
// CLOSE LOAN DETAILS PAGE
// ==========================================

function closeLoanDetailsPage() {

    loanDetailsOpen =
        false;

    selectedLoanId =
        null;


    const detailsPage =
        document.getElementById(
            "loan-details-page"
        );


    if (detailsPage) {

        detailsPage.classList.add(
            "hidden"
        );

        detailsPage.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    const loansSection =
        document.getElementById(
            "loans-section"
        );


    if (loansSection) {

        loansSection.classList.remove(
            "hidden"
        );
    }


    filterLoans();
}


// ==========================================
// RENDER LOAN DETAILS PAGE
// ==========================================

function renderLoanDetailsPage(
    loan
) {

    if (!loan) {
        return;
    }


    const detailsPage =
        document.getElementById(
            "loan-details-page"
        );


    if (!detailsPage) {

        console.warn(
            "Loan details page element was not found."
        );

        return;
    }


    selectedLoanId =
        loan.id;

    loanDetailsOpen =
        true;


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


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
        Math.max(
            Number(
                loan.balance ??
                totalRepayment -
                amountPaid
            ),
            0
        );


    const processingFee =
        Number(
            loan.processingFee ||
            0
        );


    const interest =
        Number(
            loan.interest ||
            Math.max(
                totalRepayment -
                amount,
                0
            )
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
                    item.remainingAmount ??
                    item.amount ??
                    0
                ) > 0
        );


    const nextDueDate =
        nextInstallment?.dueDate ||
        loan.nextRepaymentDate ||
        "-";


    const client =
        getLoanClientForMessaging(
            loan
        );


    const clientPhone =
        normalizeMessagingPhone(
            client?.phone
        );


    // ==========================================
    // SCHEDULE HTML
    // ==========================================

    const scheduleHtml =
        schedule.length
            ? schedule
                .map(
                    (item, index) => {

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


                        const remainingAmount =
                            Math.max(
                                Number(
                                    item.remainingAmount ??
                                    installmentAmount -
                                    paidAmount
                                ),
                                0
                            );


                        let installmentStatus =
                            item.status ||
                            (
                                item.paid
                                    ? "Paid"
                                    : (
                                        paidAmount >
                                        0
                                            ? "Partial"
                                            : "Pending"
                                    )
                            );


                        const normalizedItemStatus =
                            String(
                                installmentStatus
                            ).toLowerCase();


                        if (
                            !item.paid &&
                            item.dueDate &&
                            item.dueDate <
                                today() &&
                            remainingAmount > 0
                        ) {

                            installmentStatus =
                                "Arrears";
                        }


                        return `
                            <div
                                class="repayment-schedule-card"
                                data-installment-index="${index}"
                            >

                                <div
                                    class="repayment-schedule-header"
                                >

                                    <strong>
                                        Installment ${
                                            index + 1
                                        }
                                    </strong>

                                    <span
                                        class="schedule-status ${normalizedItemStatus}"
                                    >
                                        ${
                                            installmentStatus
                                        }
                                    </span>

                                </div>


                                <div
                                    class="repayment-schedule-row"
                                >

                                    <span>
                                        Due Date
                                    </span>

                                    <strong>
                                        ${
                                            item.dueDate ||
                                            "-"
                                        }
                                    </strong>

                                </div>


                                <div
                                    class="repayment-schedule-row"
                                >

                                    <span>
                                        Amount
                                    </span>

                                    <strong>
                                        ${
                                            currency(
                                                installmentAmount
                                            )
                                        }
                                    </strong>

                                </div>


                                <div
                                    class="repayment-schedule-row"
                                >

                                    <span>
                                        Paid
                                    </span>

                                    <strong>
                                        ${
                                            currency(
                                                paidAmount
                                            )
                                        }
                                    </strong>

                                </div>


                                <div
                                    class="repayment-schedule-row"
                                >

                                    <span>
                                        Remaining
                                    </span>

                                    <strong>
                                        ${
                                            currency(
                                                remainingAmount
                                            )
                                        }
                                    </strong>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("")
            : `
                <div
                    class="empty-state"
                >
                    No repayment schedule available.
                </div>
            `;


    // ==========================================
    // LOAN DETAILS CONTENT
    // ==========================================

    detailsPage.innerHTML = `

        <div
            class="loan-details-wrapper"
        >

            <div
                class="loan-details-topbar"
            >

                <button
                    type="button"
                    class="back-button"
                    data-action="close-loan-details"
                    aria-label="Back to loans"
                >
                    ← Back
                </button>


                <div
                    class="loan-details-actions"
                >

                    ${
                        status ===
                        "Pending"
                            ? `
                                <button
                                    type="button"
                                    class="btn btn-primary"
                                    data-action="approve-loan"
                                    data-loan-id="${loan.id}"
                                >
                                    Approve Loan
                                </button>
                            `
                            : ""
                    }


                    ${
                        balance > 0 &&
                        status !==
                        "Pending"
                            ? `
                                <button
                                    type="button"
                                    class="btn btn-success"
                                    data-action="receive-repayment"
                                    data-loan-id="${loan.id}"
                                >
                                    Receive Repayment
                                </button>
                            `
                            : ""
                    }


                    ${
                        isAdmin() &&
                        status === "Pending"
                            ? `
                                <button
                                    type="button"
                                    class="btn btn-danger"
                                    data-action="delete-loan"
                                    data-loan-id="${loan.id}"
                                >
                                    Delete Loan
                                </button>
                            `
                            : ""
                    }

                </div>

            </div>


            <div
                class="loan-details-header"
            >

                <div>

                    <h2>
                        ${
                            client?.name ||
                            loan.clientName ||
                            "Unnamed Client"
                        }
                    </h2>

                    <p>
                        ${
                            loan.loanNumber ||
                            "Loan"
                        }
                    </p>

                </div>


                <span
                    class="loan-status-badge ${String(
                        status
                    ).toLowerCase()}"
                >
                    ${status}
                </span>

            </div>


            <div
                class="loan-summary-grid"
            >

                <div
                    class="loan-summary-card"
                >

                    <span>
                        Loan Amount
                    </span>

                    <strong>
                        ${currency(amount)}
                    </strong>

                </div>


                <div
                    class="loan-summary-card"
                >

                    <span>
                        Total Repayment
                    </span>

                    <strong>
                        ${currency(totalRepayment)}
                    </strong>

                </div>


                <div
                    class="loan-summary-card"
                >

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${currency(amountPaid)}
                    </strong>

                </div>


                <div
                    class="loan-summary-card"
                >

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${currency(balance)}
                    </strong>

                </div>

            </div>


            <div
                class="loan-details-grid"
            >

                <div
                    class="loan-info-card"
                >

                    <h3>
                        Loan Information
                    </h3>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Client
                        </span>

                        <strong>
                            ${
                                client?.name ||
                                loan.clientName ||
                                "-"
                            }
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Phone
                        </span>

                        <strong>
                            ${
                                clientPhone ||
                                "-"
                            }
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Loan Type
                        </span>

                        <strong>
                            ${
                                loan.loanType ||
                                "New"
                            }
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Duration
                        </span>

                        <strong>
                            ${
                                loan.duration ||
                                "-"
                            } weeks
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Weekly Payment
                        </span>

                        <strong>
                            ${
                                currency(
                                    loan.weeklyPayment ||
                                    0
                                )
                            }
                        </strong>
                    </div>

                </div>


                <div
                    class="loan-info-card"
                >

                    <h3>
                        Financial Information
                    </h3>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Interest
                        </span>

                        <strong>
                            ${currency(interest)}
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Processing Fee
                        </span>

                        <strong>
                            ${currency(processingFee)}
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Next Repayment
                        </span>

                        <strong>
                            ${nextDueDate}
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Remaining Installments
                        </span>

                        <strong>
                            ${
                                Number(
                                    loan.remainingInstallments ??
                                    schedule.filter(
                                        item =>
                                            !item.paid
                                    ).length
                                )
                            }
                        </strong>
                    </div>


                    <div
                        class="loan-info-row"
                    >
                        <span>
                            Approval Date
                        </span>

                        <strong>
                            ${
                                loan.approvalDate ||
                                "-"
                            }
                        </strong>
                    </div>

                </div>

            </div>


            <div
                class="loan-schedule-section"
            >

                <div
                    class="loan-section-header"
                >

                    <h3>
                        Repayment Schedule
                    </h3>

                    <span>
                        ${
                            schedule.length
                        } installments
                    </span>

                </div>


                <div
                    class="repayment-schedule-list"
                >
                    ${scheduleHtml}
                </div>

            </div>

        </div>
    `;


    // ==========================================
    // SHOW DETAILS PAGE
    // ==========================================

    const loansSection =
        document.getElementById(
            "loans-section"
        );


    if (loansSection) {

        loansSection.classList.add(
            "hidden"
        );
    }


    detailsPage.classList.remove(
        "hidden"
    );


    detailsPage.setAttribute(
        "aria-hidden",
        "false"
    );


    detailsPage.scrollTop =
        0;


    // ==========================================
    // DETAILS ACTION EVENTS
    // ==========================================

    detailsPage
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        const action =
                            event.currentTarget
                                .dataset
                                .action;


                        const loanId =
                            event.currentTarget
                                .dataset
                                .loanId;


                        if (
                            action ===
                            "close-loan-details"
                        ) {

                            closeLoanDetailsPage();

                            return;
                        }


                        if (
                            action ===
                            "approve-loan"
                        ) {

                            approveLoan(
                                loanId
                            );

                            return;
                        }


                        if (
                            action ===
                            "receive-repayment"
                        ) {

                            openRepaymentForLoan(
                                loanId
                            );

                            return;
                        }


                        if (
                            action ===
                            "delete-loan"
                        ) {

                            deleteLoan(
                                loanId
                            );

                        }

                    }
                );
            }
        );
}


// ==========================================
// LOAN ROW / CARD CLICK HANDLER
// ==========================================

document.addEventListener(
    "click",
    event => {

        const trigger =
            event.target.closest(
                "[data-loan-details], " +
                "[data-action=\"open-loan-details\"]"
            );


        if (!trigger) {
            return;
        }


        const id =
            trigger.dataset.loanDetails ||
            trigger.dataset.loanId;


        if (!id) {
            return;
        }


        event.preventDefault();
        event.stopPropagation();


        openLoanDetailsPage(
            id
        );
    }
);


// ==========================================
// RECEIVE REPAYMENT GLOBAL HANDLER
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-action=\"receive-repayment\"]"
            );


        if (!button) {
            return;
        }


        /*
         * Loan-details buttons are already
         * handled by renderLoanDetailsPage().
         */

        if (
            button.closest(
                "#loan-details-page"
            )
        ) {
            return;
        }


        const id =
            button.dataset.loanId;


        if (!id) {
            return;
        }


        event.preventDefault();


        openRepaymentForLoan(
            id
        );
    }
);


// ==========================================
// END OF PART 14/16
// ==========================================// ==========================================
// LOAN EDITING + FORM MANAGEMENT
// PART 15/16
// ==========================================


// ==========================================
// OPEN EDIT LOAN
// ==========================================

function openEditLoan(id) {

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


    const modal =
        document.getElementById(
            "loan-modal"
        );


    const form =
        document.getElementById(
            "loan-form"
        );


    if (
        !modal ||
        !form
    ) {

        alert(
            "Loan form is unavailable."
        );

        return;
    }


    form.dataset.editingLoanId =
        loan.id;


    const title =
        modal.querySelector(
            ".modal-title, h2, h3"
        );


    if (title) {

        title.textContent =
            "Edit Loan";
    }


    const clientField =
        document.getElementById(
            "loan-client"
        );


    const amountField =
        document.getElementById(
            "loan-amount"
        );


    const feeField =
        document.getElementById(
            "loan-processing-fee"
        );


    const interestField =
        document.getElementById(
            "loan-interest"
        );


    const durationField =
        document.getElementById(
            "loan-duration"
        );


    const typeField =
        document.getElementById(
            "loan-type"
        );


    const startDateField =
        document.getElementById(
            "loan-start-date"
        );


    const paidField =
        document.getElementById(
            "loan-paid"
        );


    const balanceField =
        document.getElementById(
            "loan-balance"
        );


    if (clientField) {

        if (
            clientField.tagName ===
            "SELECT"
        ) {

            clientField.value =
                loan.clientId ||
                "";

        } else {

            clientField.value =
                loan.clientName ||
                "";
        }
    }


    if (amountField) {

        amountField.value =
            loan.amount ??
            "";
    }


    if (feeField) {

        feeField.value =
            loan.processingFee ??
            0;
    }


    if (interestField) {

        interestField.value =
            loan.interestRate ??
            loan.interestPercentage ??
            "";
    }


    if (durationField) {

        durationField.value =
            loan.duration ??
            "";
    }


    if (typeField) {

        typeField.value =
            loan.loanType ||
            "New";
    }


    if (startDateField) {

        startDateField.value =
            loan.startDate ||
            loan.approvalDate ||
            today();
    }


    if (paidField) {

        paidField.value =
            loan.amountPaid ??
            0;
    }


    if (balanceField) {

        balanceField.value =
            loan.balance ??
            0;

        balanceField.readOnly =
            true;
    }


    modal.classList.remove(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            amountField?.focus();

        },
        100
    );
}


// ==========================================
// CLOSE LOAN MODAL
// ==========================================

function closeLoanModal() {

    const modal =
        document.getElementById(
            "loan-modal"
        );


    const form =
        document.getElementById(
            "loan-form"
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    if (form) {

        form.reset();

        delete form.dataset.editingLoanId;
    }


    const title =
        modal.querySelector(
            ".modal-title, h2, h3"
        );


    if (title) {

        title.textContent =
            "Add Loan";
    }
}


// ==========================================
// LOAN MODAL CLOSE EVENTS
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#close-loan-modal, " +
                ".close-loan-modal, " +
                "[data-close=\"loan-modal\"], " +
                "[data-modal-close=\"loan-modal\"]"
            );


        if (!button) {
            return;
        }


        event.preventDefault();


        closeLoanModal();
    }
);


document
    .getElementById(
        "loan-modal"
    )
    ?.addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "loan-modal"
            ) {

                closeLoanModal();
            }
        }
    );


// ==========================================
// ESCAPE KEY FOR LOAN FORM
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


        const modal =
            document.getElementById(
                "loan-modal"
            );


        if (
            modal &&
            !modal.classList.contains(
                "hidden"
            )
        ) {

            closeLoanModal();
        }
    }
);


// ==========================================
// LOAN FORM SUBMISSION LOCK
// ==========================================

let loanSaving =
    false;


document
    .getElementById(
        "loan-form"
    )
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (loanSaving) {
                return;
            }


            const form =
                event.currentTarget;


            const editingLoanId =
                form.dataset.editingLoanId ||
                "";


            const clientField =
                document.getElementById(
                    "loan-client"
                );


            const amountField =
                document.getElementById(
                    "loan-amount"
                );


            const feeField =
                document.getElementById(
                    "loan-processing-fee"
                );


            const interestField =
                document.getElementById(
                    "loan-interest"
                );


            const durationField =
                document.getElementById(
                    "loan-duration"
                );


            const typeField =
                document.getElementById(
                    "loan-type"
                );


            const startDateField =
                document.getElementById(
                    "loan-start-date"
                );


            const clientId =
                clientField?.value ||
                "";


            if (!clientId) {

                alert(
                    "Please select a client."
                );

                return;
            }


            const client =
                clients.find(
                    item =>
                        item.id ===
                        clientId
                );


            if (!client) {

                alert(
                    "Selected client could not be found."
                );

                return;
            }


            const amount =
                Number(
                    amountField?.value ||
                    0
                );


            const processingFee =
                Number(
                    feeField?.value ||
                    0
                );


            const interestRate =
                Number(
                    interestField?.value ||
                    0
                );


            const duration =
                Number(
                    durationField?.value ||
                    0
                );


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                alert(
                    "Enter a valid loan amount."
                );

                return;
            }


            if (
                !Number.isFinite(duration) ||
                duration <= 0
            ) {

                alert(
                    "Enter a valid loan duration."
                );

                return;
            }


            if (
                !Number.isFinite(
                    interestRate
                ) ||
                interestRate < 0
            ) {

                alert(
                    "Enter a valid interest rate."
                );

                return;
            }


            if (
                !Number.isFinite(
                    processingFee
                ) ||
                processingFee < 0
            ) {

                alert(
                    "Enter a valid processing fee."
                );

                return;
            }


            const saveButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            const originalText =
                saveButton?.innerHTML ||
                "Save Loan";


            loanSaving =
                true;


            if (saveButton) {

                saveButton.disabled =
                    true;

                saveButton.innerHTML =
                    "Saving...";
            }


            try {

                // ==========================================
                // EDIT EXISTING LOAN
                // ==========================================

                if (editingLoanId) {

                    const existingLoan =
                        loans.find(
                            item =>
                                item.id ===
                                editingLoanId
                        );


                    if (!existingLoan) {

                        throw new Error(
                            "The loan being edited no longer exists."
                        );
                    }


                    /*
                     * Do not destroy repayment
                     * history when editing an active
                     * or historical loan.
                     */

                    const previousPaid =
                        Number(
                            existingLoan.amountPaid ||
                            0
                        );


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
                        typeof roundToNearestFive ===
                        "function"

                            ? roundToNearestFive(
                                totalRepayment /
                                duration
                            )

                            : Math.round(
                                (
                                    totalRepayment /
                                    duration
                                ) / 5
                            ) * 5;


                    const balance =
                        Math.max(
                            totalRepayment -
                            previousPaid,
                            0
                        );


                    await updateDoc(
                        doc(
                            db,
                            "loans",
                            editingLoanId
                        ),
                        {

                            clientId:
                                client.id,

                            clientName:
                                client.name ||
                                "",

                            amount,

                            processingFee,

                            interest:
                                interestAmount,

                            interestRate,

                            duration,

                            weeklyPayment,

                            totalRepayment,

                            balance,

                            amountPaid:
                                previousPaid,

                            loanType:
                                typeField?.value ||
                                existingLoan.loanType ||
                                "New",

                            updatedAt:
                                serverTimestamp()
                        }
                    );


                    await logHistory(
                        "Loan Updated",
                        "Loan",
                        {

                            loanId:
                                existingLoan.loanNumber,

                            client:
                                client.name,

                            amount,

                            balance
                        }
                    );


                    closeLoanModal();


                    alert(
                        "Loan updated successfully."
                    );


                    return;
                }


                // ==========================================
                // CREATE NEW LOAN
                // ==========================================

                const calculation =
                    calculateLoanValuesForSave(
                        amount,
                        interestRate,
                        duration,
                        processingFee
                    );


                const startDate =
                    startDateField?.value ||
                    today();


                const loanType =
                    typeField?.value ||
                    "New";


                const loanNumber =
                    generateLoanNumber();


                const initialPaid =
                    Number(
                        document.getElementById(
                            "loan-paid"
                        )?.value ||
                        0
                    );


                const totalRepayment =
                    calculation.totalRepayment;


                const initialBalance =
                    Math.max(
                        totalRepayment -
                        initialPaid,
                        0
                    );


                let schedule =
                    [];


                /*
                 * Pending loans do not normally
                 * receive a repayment schedule
                 * until approval.
                 *
                 * Historical loans may need an
                 * immediately usable schedule.
                 */

                if (
                    loanType ===
                    "Historical"
                ) {

                    schedule =
                        generateRepaymentSchedule(
                            new Date(
                                startDate
                            ),
                            duration,
                            calculation.weeklyPayment,
                            totalRepayment
                        );


                    let remaining =
                        initialPaid;


                    for (
                        const item
                        of schedule
                    ) {

                        const installmentAmount =
                            Number(
                                item.amount ||
                                0
                            );


                        const applied =
                            Math.min(
                                remaining,
                                installmentAmount
                            );


                        item.paidAmount =
                            applied;


                        item.remainingAmount =
                            Math.max(
                                installmentAmount -
                                applied,
                                0
                            );


                        item.paid =
                            item.remainingAmount <=
                            0;


                        item.status =
                            item.paid
                                ? "Paid"
                                : (
                                    applied > 0
                                        ? "Partial"
                                        : "Pending"
                                );


                        if (
                            applied > 0
                        ) {

                            item.paidDate =
                                startDate;
                        }


                        remaining -=
                            applied;


                        if (
                            remaining <=
                            0
                        ) {
                            break;
                        }
                    }
                }


                const firstUnpaid =
                    schedule.find(
                        item =>
                            !item.paid
                    );


                const status =
                    loanType ===
                    "Historical"

                        ? (
                            initialBalance <=
                            0
                                ? "Completed"
                                : (
                                    firstUnpaid &&
                                    firstUnpaid.dueDate <
                                    today()
                                        ? "Arrears"
                                        : "Active"
                                )
                        )

                        : "Pending";


                await addDoc(
                    collection(
                        db,
                        "loans"
                    ),
                    {

                        clientId:
                            client.id,

                        clientName:
                            client.name ||
                            "",

                        loanNumber,

                        loanType,

                        amount,

                        processingFee,

                        interest:
                            calculation.interestAmount,

                        interestRate,

                        duration,

                        repayment:
                            totalRepayment,

                        weeklyPayment:
                            calculation.weeklyPayment,

                        totalRepayment,

                        balance:
                            initialBalance,

                        openingBalance:
                            totalRepayment,

                        amountPaid:
                            initialPaid,

                        approvalDate:
                            loanType ===
                            "Historical"
                                ? formatDate(
                                    new Date(
                                        startDate
                                    )
                                )
                                : "",

                        dueDate:
                            firstUnpaid?.dueDate ||
                            "",

                        repaymentSchedule:
                            schedule,

                        nextRepaymentDate:
                            firstUnpaid?.dueDate ||
                            "-",

                        remainingInstallments:
                            schedule.filter(
                                item =>
                                    !item.paid
                            ).length,

                        status,

                        completed:
                            initialBalance <=
                            0,

                        totalIncome:
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
                    }
                );


                await logHistory(
                    "Loan Created",
                    "Loan",
                    {

                        loanId:
                            loanNumber,

                        client:
                            client.name,

                        amount,

                        loanType,

                        status
                    }
                );


                closeLoanModal();


                alert(
                    "Loan created successfully."
                );


            } catch (error) {

                console.error(
                    "Loan save error:",
                    error
                );


                alert(
                    "Failed to save loan.\n\n" +
                    error.message
                );


            } finally {

                loanSaving =
                    false;


                if (saveButton) {

                    saveButton.disabled =
                        false;

                    saveButton.innerHTML =
                        originalText;
                }
            }
        }
    );


// ==========================================
// SAFE LOAN CALCULATION FOR FORM SAVE
// ==========================================

function calculateLoanValuesForSave(
    amount,
    interestRate,
    duration,
    processingFee = 0
) {

    const safeAmount =
        Number(
            amount
        ) || 0;


    const safeInterestRate =
        Number(
            interestRate
        ) || 0;


    const safeDuration =
        Number(
            duration
        ) || 1;


    const safeFee =
        Number(
            processingFee
        ) || 0;


    const interestAmount =
        safeAmount *
        (
            safeInterestRate /
            100
        );


    const totalRepayment =
        safeAmount +
        interestAmount;


    const rawWeekly =
        totalRepayment /
        safeDuration;


    const weeklyPayment =
        typeof roundToNearestFive ===
        "function"

            ? roundToNearestFive(
                rawWeekly
            )

            : Math.round(
                rawWeekly / 5
            ) * 5;


    return {

        amount:
            safeAmount,

        processingFee:
            safeFee,

        interestAmount,

        totalRepayment,

        weeklyPayment
    };
}


// ==========================================
// LOAN FORM LIVE CALCULATION
// ==========================================

function updateLoanFormCalculation() {

    const amountField =
        document.getElementById(
            "loan-amount"
        );


    const interestField =
        document.getElementById(
            "loan-interest"
        );


    const durationField =
        document.getElementById(
            "loan-duration"
        );


    const paidField =
        document.getElementById(
            "loan-paid"
        );


    const balanceField =
        document.getElementById(
            "loan-balance"
        );


    if (
        !amountField ||
        !interestField ||
        !durationField
    ) {
        return;
    }


    const amount =
        Number(
            amountField.value ||
            0
        );


    const interest =
        Number(
            interestField.value ||
            0
        );


    const duration =
        Number(
            durationField.value ||
            0
        );


    if (
        amount <= 0 ||
        interest < 0 ||
        duration <= 0
    ) {

        if (balanceField) {

            balanceField.value =
                "";
        }

        return;
    }


    const calculation =
        calculateLoanValuesForSave(
            amount,
            interest,
            duration
        );


    const paid =
        Number(
            paidField?.value ||
            0
        );


    const balance =
        Math.max(
            calculation.totalRepayment -
            paid,
            0
        );


    if (balanceField) {

        balanceField.value =
            currency(
                balance
            );
    }


    const weeklyField =
        document.getElementById(
            "loan-weekly-payment"
        );


    if (weeklyField) {

        weeklyField.value =
            currency(
                calculation.weeklyPayment
            );
    }


    const totalField =
        document.getElementById(
            "loan-total-repayment"
        );


    if (totalField) {

        totalField.value =
            currency(
                calculation.totalRepayment
            );
    }
}


[
    "loan-amount",
    "loan-interest",
    "loan-duration",
    "loan-paid"
]
.forEach(
    id => {

        document
            .getElementById(id)
            ?.addEventListener(
                "input",
                updateLoanFormCalculation
            );
    }
);


// ==========================================
// ADD LOAN BUTTON
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#add-loan-btn, " +
                "#fab-add-loan, " +
                "[data-action=\"add-loan\"]"
            );


        if (!button) {
            return;
        }


        /*
         * Do not treat the repayment FAB
         * as an Add Loan button.
         */

        if (
            button.id ===
                "fab-add-repayment" ||
            button.dataset.action ===
                "add-repayment"
        ) {
            return;
        }


        event.preventDefault();


        const form =
            document.getElementById(
                "loan-form"
            );


        const modal =
            document.getElementById(
                "loan-modal"
            );


        if (
            !form ||
            !modal
        ) {

            alert(
                "Loan form is unavailable."
            );

            return;
        }


        form.reset();


        delete form.dataset.editingLoanId;


        const title =
            modal.querySelector(
                ".modal-title, h2, h3"
            );


        if (title) {

            title.textContent =
                "Add Loan";
        }


        const dateField =
            document.getElementById(
                "loan-start-date"
            );


        if (dateField) {

            dateField.value =
                today();
        }


        const feeField =
            document.getElementById(
                "loan-processing-fee"
            );


        if (
            feeField &&
            !feeField.value
        ) {

            feeField.value =
                localStorage.getItem(
                    "GREYMUS_DEFAULT_FEE"
                ) ||
                0;
        }


        const interestField =
            document.getElementById(
                "loan-interest"
            );


        if (
            interestField &&
            !interestField.value
        ) {

            interestField.value =
                localStorage.getItem(
                    "GREYMUS_DEFAULT_INTEREST"
                ) ||
                20;
        }


        const durationField =
            document.getElementById(
                "loan-duration"
            );


        if (
            durationField &&
            !durationField.value
        ) {

            durationField.value =
                localStorage.getItem(
                    "GREYMUS_DEFAULT_DURATION"
                ) ||
                12;
        }


        modal.classList.remove(
            "hidden"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        updateLoanFormCalculation();
    }
);


// ==========================================
// EDIT LOAN ACTION HANDLER
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-action=\"edit-loan\"]"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.loanId;


        if (!id) {
            return;
        }


        event.preventDefault();


        openEditLoan(
            id
        );
    }
);


// ==========================================
// END OF PART 15/16
// ==========================================// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// LOANS.JS — PART 16/16
// FINALIZATION, SAFE REFRESH, PUBLIC API & INITIALIZATION
// ==========================================================


// ==========================================================
// SAFE LOAN DATA REFRESH
// ==========================================================

async function refreshLoansSafely() {

    try {

        if (
            typeof loadLoans ===
            "function"
        ) {

            await loadLoans();

        }

    } catch (error) {

        console.error(
            "Loan refresh error:",
            error
        );
    }
}


// ==========================================================
// REFRESH CURRENT LOAN DETAILS
// ==========================================================

function refreshCurrentLoanDetails() {

    if (
        !loanDetailsOpen ||
        !selectedLoanId
    ) {
        return;
    }


    const currentLoan =
        loans.find(
            loan =>
                loan.id ===
                selectedLoanId
        );


    if (!currentLoan) {

        selectedLoanId =
            null;

        loanDetailsOpen =
            false;

        return;
    }


    try {

        renderLoanDetailsPage(
            currentLoan
        );

    } catch (error) {

        console.error(
            "Loan details refresh error:",
            error
        );
    }
}


// ==========================================================
// REFRESH LOAN TABLE
// ==========================================================

function refreshLoanTable() {

    try {

        if (loanDetailsOpen) {
            return;
        }


        renderLoans(
            getFilteredLoans()
        );

    } catch (error) {

        console.error(
            "Loan table refresh error:",
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
// GET NEXT UNPAID REPAYMENT
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


                return (
                    Number(
                        installment.remainingAmount ??
                        installment.amount ??
                        0
                    ) > 0
                );
            }
        ) ||
        null
    );
}


// ==========================================================
// GET CURRENT LOAN BALANCE
// ==========================================================

function getLoanBalance(
    loan
) {

    if (!loan) {
        return 0;
    }


    return Math.max(
        Number(
            loan.balance ||
            0
        ),
        0
    );
}


// ==========================================================
// GET OUTSTANDING LOANS FOR CLIENT
// ==========================================================

function getOutstandingLoansForClient(
    clientId
) {

    if (!clientId) {
        return [];
    }


    return loans.filter(
        loan => {

            if (
                loan.clientId !==
                clientId
            ) {
                return false;
            }


            const balance =
                Number(
                    loan.balance ||
                    0
                );


            if (
                balance <=
                0
            ) {
                return false;
            }


            return (
                normalizeLoanStatus(
                    loan.status
                ) !==
                "Completed"
            );
        }
    );
}


// ==========================================================
// GET CLIENT FOR LOAN
// ==========================================================

function getClientForLoan(
    loan
) {

    if (!loan) {
        return null;
    }


    return (
        clients.find(
            client =>
                client.id ===
                loan.clientId
        ) ||
        null
    );
}


// ==========================================================
// SAFE DATE VALUE
// ==========================================================

function getLoanDateValue(
    loan
) {

    if (!loan) {
        return null;
    }


    if (
        loan.approvalDate
    ) {

        const date =
            new Date(
                loan.approvalDate
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date;
        }
    }


    if (
        loan.createdAt &&
        typeof loan.createdAt.toDate ===
            "function"
    ) {

        try {

            return loan.createdAt.toDate();

        } catch (error) {

            console.warn(
                "Unable to convert loan createdAt:",
                error
            );
        }
    }


    if (
        loan.createdAt
    ) {

        const date =
            new Date(
                loan.createdAt
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date;
        }
    }


    return null;
}


// ==========================================================
// SAFE LOAN STATUS
// ==========================================================

function getDisplayLoanStatus(
    loan
) {

    if (!loan) {
        return "";
    }


    return normalizeLoanStatus(
        loan.status
    );
}


// ==========================================================
// WINDOW PUBLIC HELPERS
// ==========================================================
//
// These are intentionally exposed so that
// messaging.js and other modules can communicate
// with loans.js without directly modifying the
// loan transaction logic.
//

if (
    typeof window !==
    "undefined"
) {

    window.GREYMUS_LOANS =
        {

            getLoanById,

            getNextRepayment,

            getLoanBalance,

            getOutstandingLoansForClient,

            getClientForLoan,

            refreshLoanTable,

            refreshLoansSafely,

            refreshCurrentLoanDetails,

            getDisplayLoanStatus
        };
}


// ==========================================================
// MESSAGING PUBLIC BRIDGE
// ==========================================================
//
// Messaging functions are exposed without
// replacing any existing messaging.js functions.
//

if (
    typeof window !==
    "undefined"
) {

    window.sendLoanApprovalMessage =
        sendLoanApprovalMessage;

    window.sendLoanRepaymentMessage =
        sendLoanRepaymentMessage;

    window.sendLoanMessageSafely =
        sendLoanMessageSafely;

    window.sendRepaymentMessageSafely =
        sendRepaymentMessageSafely;
}


// ==========================================================
// REALTIME / PERIODIC SAFETY REFRESH
// ==========================================================

let loanRefreshTimer =
    null;


function startLoanRefreshTimer() {

    if (
        loanRefreshTimer
    ) {
        return;
    }


    loanRefreshTimer =
        setInterval(
            async () => {

                try {

                    if (
                        typeof checkOverdueLoans ===
                        "function"
                    ) {

                        await checkOverdueLoans();
                    }


                    if (
                        !loanDetailsOpen
                    ) {

                        refreshLoanTable();

                    } else {

                        refreshCurrentLoanDetails();
                    }

                } catch (error) {

                    console.error(
                        "Automatic loan refresh error:",
                        error
                    );
                }

            },
            60000
        );
}


// ==========================================================
// INITIALIZE LOANS MODULE
// ==========================================================

let loansInitialized =
    false;


async function initializeLoansModule() {

    if (
        loansInitialized
    ) {
        return;
    }


    loansInitialized =
        true;


    try {

        if (
            typeof calculateLoan ===
            "function"
        ) {

            calculateLoan();
        }


        if (
            typeof loadClients ===
            "function"
        ) {

            await loadClients();
        }


        if (
            typeof loadLoans ===
            "function"
        ) {

            await loadLoans();
        }


        if (
            typeof checkOverdueLoans ===
            "function"
        ) {

            await checkOverdueLoans();
        }


        if (
            typeof populateYearFilter ===
            "function"
        ) {

            populateYearFilter();
        }


        if (
            typeof setupFabAddRepayment ===
            "function"
        ) {

            setupFabAddRepayment();
        }


        startLoanRefreshTimer();


    } catch (error) {

        console.error(
            "Loans module initialization error:",
            error
        );


        /*
         * Allow a later initialization attempt
         * if Firebase or another dependency
         * was temporarily unavailable.
         */

        loansInitialized =
            false;
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
// FIREBASE / DATA CHANGE SAFETY
// ==========================================================
//
// If loadLoans() installs a Firestore realtime
// listener, this function does not create another
// listener. It only keeps the UI synchronized
// after the in-memory loans array changes.
//

function syncLoanUIAfterDataChange() {

    try {

        populateYearFilter();


        if (
            loanDetailsOpen
        ) {

            refreshCurrentLoanDetails();

        } else {

            refreshLoanTable();
        }


    } catch (error) {

        console.error(
            "Loan UI synchronization error:",
            error
        );
    }
}


// ==========================================================
// FINAL PUBLIC API
// ==========================================================

export {

    loadLoans,

    renderLoans,

    calculateLoan,

    currency,

    generateRepaymentSchedule,

    refreshLoanTable,

    refreshLoansSafely,

    refreshCurrentLoanDetails,

    getLoanById,

    getNextRepayment,

    getLoanBalance,

    getOutstandingLoansForClient,

    getClientForLoan,

    getDisplayLoanStatus,

    sendLoanApprovalMessage,

    sendLoanRepaymentMessage,

    sendLoanMessageSafely,

    sendRepaymentMessageSafely,

    buildLoanMessagingPayload,

    getLoanClientForMessaging,

    getLoanClientPhone,

    normalizeMessagingPhone
};


// ==========================================================
// END OF LOANS.JS
// ==========================================================
//
// PART 16/16 COMPLETE
//
// IMPORTANT:
// Do not add another duplicate:
//   - approveLoan()
//   - closeRepaymentModal()
//   - setupFabAddRepayment()
//   - openRepaymentForLoan()
//   - loadLoans()
//   - refreshLoanTable()
//   - DOMContentLoaded initializer
//   - repayment submit handler
//
// Those functions should exist only once in
// the rebuilt loans.js.
//
// Messaging remains isolated:
//   Loan approval
//       ↓
//   Firestore approval saved
//       ↓
//   messaging.js
//
//   Repayment
//       ↓
//   Firestore repayment saved
//       ↓
//   history saved
//       ↓
//   messaging.js
//
// A messaging failure must NEVER roll back,
// cancel, or invalidate the financial transaction.
// ==========================================================