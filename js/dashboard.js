// ==========================================================
// GREYMUS LOAN FINANCIAL HUB
// DASHBOARD.JS
// CLEAN CORRECTED VERSION
//
// IMPORTANT FIXES
//
// ✔ Tomorrow's loans do NOT appear in Today's Collection
// ✔ Completed loans do NOT appear in Today's Collection
// ✔ Fully paid installments do NOT appear as due today
// ✔ Loans with balance 0 are excluded from collection
// ✔ Partial today's payments remain visible
// ✔ Today's expected amount is calculated correctly
// ✔ Today's collected amount is calculated correctly
// ✔ Arrears are handled separately
// ✔ Local calendar dates are compared safely
// ✔ Firestore realtime synchronization
// ✔ Automatic refresh when the calendar date changes
// ==========================================================


import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    openMessageComposer
} from "./messaging.js";


// ==========================================================
// FIRESTORE DATA
// ==========================================================

let loans = [];

let clients = [];

let repayments = [];


// ==========================================================
// DASHBOARD ELEMENTS
// ==========================================================

// ----------------------------------------------------------
// PORTFOLIO
// ----------------------------------------------------------

const portfolioStat =
    document.getElementById(
        "stat-portfolio"
    );

const totalPortfolioStat =
    document.getElementById(
        "stat-total-portfolio"
    );

const monthlyPortfolioStat =
    document.getElementById(
        "stat-monthly-portfolio"
    );

const previousPortfolioStat =
    document.getElementById(
        "stat-previous-portfolio"
    );

const outstandingPrincipalStat =
    document.getElementById(
        "stat-outstanding-principal"
    );

const outstandingInterestStat =
    document.getElementById(
        "stat-outstanding-interest"
    );


// ----------------------------------------------------------
// CLIENTS
// ----------------------------------------------------------

const clientsStat =
    document.getElementById(
        "stat-clients"
    );


// ----------------------------------------------------------
// LOANS
// ----------------------------------------------------------

const totalLoansIssuedStat =
    document.getElementById(
        "stat-total-loans-issued"
    );

const activeLoansStat =
    document.getElementById(
        "stat-active-loans"
    );

const completedLoansStat =
    document.getElementById(
        "stat-completed-loans"
    );

const historicalLoansStat =
    document.getElementById(
        "stat-historical-loans"
    );

const repeatLoansStat =
    document.getElementById(
        "stat-repeat-loans"
    );


// ----------------------------------------------------------
// INCOME
// ----------------------------------------------------------

const revenueStat =
    document.getElementById(
        "stat-revenue"
    );

const totalIncomeStat =
    document.getElementById(
        "stat-total-income"
    );

const previousIncomeStat =
    document.getElementById(
        "stat-previous-income"
    );

const previousIncomeCard =
    document.getElementById(
        "previous-income-card"
    );

const previousIncomeModal =
    document.getElementById(
        "previous-months-income-modal"
    );

const closePreviousIncome =
    document.getElementById(
        "close-previous-income"
    );


// ----------------------------------------------------------
// LOAN STATUS
// ----------------------------------------------------------

const pendingStat =
    document.getElementById(
        "stat-pending"
    );

const approvedStat =
    document.getElementById(
        "stat-approved"
    );

const rejectedStat =
    document.getElementById(
        "stat-rejected"
    );

const arrearsStat =
    document.getElementById(
        "stat-arrears"
    );


// ==========================================================
// TODAY'S COLLECTION
// ==========================================================

const clientsDueTodayElement =
    document.getElementById(
        "clientsDueToday"
    );

const expectedCollectionElement =
    document.getElementById(
        "expectedCollection"
    );

const collectedTodayElement =
    document.getElementById(
        "collectedToday"
    );

const remainingCollectionElement =
    document.getElementById(
        "remainingCollection"
    );

const collectionRateElement =
    document.getElementById(
        "collectionRate"
    );

const todayDueList =
    document.getElementById(
        "todayDueList"
    );


// ==========================================================
// ARREARS
// ==========================================================

const arrearsClientCount =
    document.getElementById(
        "arrears-client-count"
    );

const arrearsTotalAmount =
    document.getElementById(
        "arrears-total-amount"
    );

const arrearsClientList =
    document.getElementById(
        "arrears-client-list"
    );


// ==========================================================
// MONEY FORMAT
// ==========================================================

function currency(value){

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


// ==========================================================
// SAFE LOCAL DATE
//
// IMPORTANT
//
// Do NOT use:
//
// new Date("2026-08-21")
//
// for dashboard date comparisons.
//
// JavaScript can interpret YYYY-MM-DD as UTC,
// which can cause a date to shift depending on
// timezone.
//
// This function always works with the local
// calendar date.
// ==========================================================

function todayString(){

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
// NORMALIZE STORED DATE
// ==========================================================
//
// Converts a stored Firestore/date value into:
//
// YYYY-MM-DD
//
// without allowing timezone conversion to move the
// calendar date unexpectedly.
// ==========================================================

function normalizeDate(value){

    if(!value){

        return "";

    }


    if(
        typeof value === "string"
    ){

        return value
            .slice(
                0,
                10
            );

    }


    if(
        value?.toDate &&
        typeof value.toDate === "function"
    ){

        const date =
            value.toDate();


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


    if(
        value instanceof Date
    ){

        if(
            Number.isNaN(
                value.getTime()
            )
        ){

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


    return "";

}


// ==========================================================
// MONTH KEY
// ==========================================================

function monthKey(value){

    const normalized =
        normalizeDate(
            value
        );


    if(!normalized){

        return "";

    }


    return normalized.slice(
        0,
        7
    );

}


// ==========================================================
// LOAN COMPLETION CHECK
// ==========================================================
//
// A loan is completed if:
//
// ✔ status is Completed
// OR
// ✔ completed is true
// OR
// ✔ balance is zero or below
//
// This is one of the main protections against a client
// whose loan was cleared last week appearing again today.
// ==========================================================

function isCompletedLoan(loan){

    const balance =
        Number(
            loan?.balance || 0
        );


    return (
        loan?.status === "Completed" ||
        loan?.completed === true ||
        balance <= 0
    );

}


// ==========================================================
// FIRESTORE CLIENT LISTENER
// ==========================================================

onSnapshot(

    collection(
        db,
        "clients"
    ),

    snapshot => {

        clients = [];


        snapshot.forEach(
            doc => {

                clients.push({

                    id:
                        doc.id,

                    ...doc.data()

                });

            }
        );


        updateDashboard();

    },

    error => {

        console.error(
            "GREYMUS: Clients listener error:",
            error
        );

    }

);


// ==========================================================
// FIRESTORE LOAN LISTENER
// ==========================================================

onSnapshot(

    collection(
        db,
        "loans"
    ),

    snapshot => {

        loans = [];


        snapshot.forEach(
            doc => {

                loans.push({

                    id:
                        doc.id,

                    ...doc.data()

                });

            }
        );


        updateDashboard();

    },

    error => {

        console.error(
            "GREYMUS: Loans listener error:",
            error
        );

    }

);


// ==========================================================
// FIRESTORE REPAYMENT LISTENER
// ==========================================================

onSnapshot(

    collection(
        db,
        "repayments"
    ),

    snapshot => {

        repayments = [];


        snapshot.forEach(
            doc => {

                repayments.push({

                    id:
                        doc.id,

                    ...doc.data()

                });

            }
        );


        updateDashboard();

    },

    error => {

        console.error(
            "GREYMUS: Repayments listener error:",
            error
        );

    }

);// ==========================================================
// DASHBOARD CALCULATION
// ==========================================================

function updateDashboard(){

    // ======================================================
    // RESET VALUES
    // ======================================================

    let currentPortfolio = 0;

    let totalPortfolio = 0;

    let monthlyPortfolio = 0;

    let previousPortfolio = 0;

    let monthlyIncome = 0;

    let previousIncome = 0;

    let totalIncome = 0;

    let outstandingPrincipal = 0;

    let outstandingInterest = 0;

    let pending = 0;

    let approved = 0;

    let rejected = 0;

    let arrears = 0;

    let activeLoans = 0;

    let completedLoans = 0;

    let totalLoansIssued = 0;

    let historicalLoans = 0;

    let repeatLoans = 0;

    let expectedToday = 0;

    let collectedToday = 0;

    let arrearsAmount = 0;


    // ======================================================
    // COLLECTION ARRAYS
    // ======================================================

    const clientsDueToday = [];

    const arrearsClients = [];


    // ======================================================
    // CURRENT DATE
    // ======================================================

    const today =
        todayString();


    const currentMonth =
        today.slice(
            0,
            7
        );


    // ======================================================
    // REPEAT CLIENT TRACKER
    // ======================================================

    const repeatTracker = {};


    // ======================================================
    // PROCESS EVERY LOAN
    // ======================================================

    loans.forEach(
        loan => {

            totalLoansIssued++;


            // ==================================================
            // BASIC VALUES
            // ==================================================

            const status =
                loan.status ||
                "Pending";


            const principal =
                Number(
                    loan.amount || 0
                );


            const processingFee =
                Number(
                    loan.processingFee || 0
                );


            const totalRepayment =
                Number(
                    loan.totalRepayment ||
                    principal
                );


            const amountPaid =
                Number(
                    loan.amountPaid || 0
                );


            const outstanding =
                Math.max(
                    0,
                    Number(
                        loan.balance ??
                        principal
                    )
                );


            // ==================================================
            // COMPLETED LOAN
            // ==================================================

            const completed =
                isCompletedLoan(
                    loan
                );


            // ==================================================
            // APPROVAL DATE
            // ==================================================

            const approvalDate =
                normalizeDate(
                    loan.approvalDate ||
                    loan.createdAt
                );


            // ==================================================
            // INTEREST
            // ==================================================

            const interest =
                Math.max(
                    0,
                    totalRepayment -
                    principal
                );


            // ==================================================
            // EARNED INTEREST
            // ==================================================

            const repaymentRatio =
                totalRepayment > 0

                    ? Math.min(
                        1,
                        Math.max(
                            0,
                            amountPaid /
                            totalRepayment
                        )
                    )

                    : 0;


            const earnedInterest =
                interest *
                repaymentRatio;


            // ==================================================
            // INCOME
            // ==================================================

            const income =
                processingFee +
                earnedInterest;


            // ==================================================
            // TOTAL PORTFOLIO
            // ==================================================

            totalPortfolio +=
                principal;


            // ==================================================
            // MONTHLY / PREVIOUS PORTFOLIO
            // ==================================================

            if(
                approvalDate &&
                monthKey(
                    approvalDate
                ) === currentMonth
            ){

                monthlyPortfolio +=
                    principal;

            }else{

                previousPortfolio +=
                    principal;

            }


            // ==================================================
            // TOTAL INCOME
            // ==================================================

            totalIncome +=
                income;


            // ==================================================
            // MONTHLY / PREVIOUS INCOME
            // ==================================================

            if(
                approvalDate &&
                monthKey(
                    approvalDate
                ) === currentMonth
            ){

                monthlyIncome +=
                    income;

            }else{

                previousIncome +=
                    income;

            }


            // ==================================================
            // REPEAT CLIENT TRACKING
            // ==================================================

            const clientKey =
                loan.clientId ||
                loan.clientName ||
                loan.phone ||
                loan.id;


            repeatTracker[clientKey] =
                (
                    repeatTracker[clientKey] ||
                    0
                ) + 1;


            // ==================================================
            // COMPLETED LOAN
            //
            // VERY IMPORTANT:
            //
            // We count the loan as completed,
            // but immediately stop it from entering
            // active collection calculations.
            // ==================================================

            if(completed){

                completedLoans++;


                if(
                    String(
                        loan.loanType || ""
                    ).toLowerCase() ===
                    "historical"
                ){

                    historicalLoans++;

                }


                return;

            }


            // ==================================================
            // OUTSTANDING PORTFOLIO
            // ==================================================

            const activeStatus =
                status === "Approved" ||
                status === "Active" ||
                status === "Arrears";


            if(
                activeStatus &&
                outstanding > 0
            ){

                currentPortfolio +=
                    outstanding;


                // ----------------------------------------------
                // Remaining principal / interest
                // ----------------------------------------------

                if(
                    totalRepayment > 0
                ){

                    const principalRatio =
                        principal /
                        totalRepayment;


                    outstandingPrincipal +=
                        outstanding *
                        principalRatio;


                    outstandingInterest +=
                        outstanding -
                        (
                            outstanding *
                            principalRatio
                        );

                }else{

                    outstandingPrincipal +=
                        outstanding;

                }

            }


            // ==================================================
            // LOAN STATUS COUNTS
            // ==================================================

            if(
                status === "Pending"
            ){

                pending++;

            }


            if(
                status === "Approved"
            ){

                approved++;

                activeLoans++;

            }


            if(
                status === "Active"
            ){

                activeLoans++;

            }


            if(
                status === "Arrears"
            ){

                arrears++;

                activeLoans++;

            }


            if(
                status === "Rejected"
            ){

                rejected++;

            }


            // ==================================================
            // REPAYMENT SCHEDULE SAFETY
            // ==================================================

            const schedule =
                Array.isArray(
                    loan.repaymentSchedule
                )

                    ? loan.repaymentSchedule

                    : [];


            // ==================================================
            // ARREARS CALCULATION
            //
            // ONLY installments before today
            // are arrears.
            //
            // Tomorrow is NEVER arrears.
            // Today is NEVER treated as arrears.
            // ==================================================

            let loanArrearsAmount = 0;

            let loanMissedInstallments = 0;


            schedule.forEach(
                item => {

                    const dueDate =
                        normalizeDate(
                            item.dueDate
                        );


                    const due =
                        Number(
                            item.amount || 0
                        );


                    const paid =
                        Number(
                            item.paidAmount || 0
                        );


                    if(
                        !dueDate ||
                        due <= 0
                    ){

                        return;

                    }


                    // ------------------------------------------
                    // PAST-DUE INSTALLMENT
                    // ------------------------------------------

                    if(
                        dueDate < today &&
                        paid < due
                    ){

                        const unpaid =
                            Math.max(
                                0,
                                due - paid
                            );


                        if(
                            unpaid > 0
                        ){

                            loanMissedInstallments++;

                            loanArrearsAmount +=
                                unpaid;

                        }

                    }

                }
            );


            // ==================================================
            // ARREARS RECORD
            // ==================================================

            if(
                loanArrearsAmount > 0
            ){

                arrearsAmount +=
                    loanArrearsAmount;


                // Avoid duplicating an already displayed
                // Arrears status count.
                //
                // A loan can have arrears even before another
                // routine updates its status.

                if(
                    status !== "Arrears"
                ){

                    // The loan is financially in arrears,
                    // but we don't alter Firestore here.
                    // Dashboard only reports the condition.

                }


                arrearsClients.push({

                    client:
                        loan.clientName ||
                        "Unknown Client",

                    clientId:
                        loan.clientId ||
                        "",

                    loanId:
                        loan.id,

                    loan,

                    weeks:
                        loanMissedInstallments,

                    amount:
                        loanArrearsAmount,

                    outstanding:
                        outstanding,

                    dueDate:
                        schedule.find(
                            item =>
                                normalizeDate(
                                    item.dueDate
                                ) < today &&
                                Number(
                                    item.paidAmount || 0
                                ) <
                                Number(
                                    item.amount || 0
                                )
                        )?.dueDate ||

                        loan.nextRepaymentDate ||

                        ""

                });

            }


            // ==================================================
            // TODAY'S COLLECTION
            //
            // THIS IS THE MAIN FIX.
            //
            // We only accept:
            //
            // dueDate === today
            //
            // Nothing else.
            //
            // Therefore:
            //
            // ✔ Tomorrow = excluded
            // ✔ Yesterday = excluded
            // ✔ Completed loan = excluded
            // ✔ Balance zero = excluded
            // ✔ Fully paid installment = excluded
            // ✔ Partial payment = included
            // ✔ Unpaid installment = included
            // ==================================================

            if(
                outstanding > 0 &&
                schedule.length > 0
            ){

                schedule.forEach(
                    item => {

                        const dueDate =
                            normalizeDate(
                                item.dueDate
                            );


                        // ------------------------------------------
                        // STRICT TODAY CHECK
                        // ------------------------------------------

                        if(
                            dueDate !== today
                        ){

                            return;

                        }


                        const due =
                            Number(
                                item.amount || 0
                            );


                        const paid =
                            Number(
                                item.paidAmount || 0
                            );


                        if(
                            due <= 0
                        ){

                            return;

                        }


                        // ------------------------------------------
                        // FULLY PAID TODAY
                        //
                        // Do NOT show as due.
                        // ------------------------------------------

                        if(
                            paid >= due
                        ){

                            return;

                        }


                        const unpaidToday =
                            Math.max(
                                0,
                                due - paid
                            );


                        // ------------------------------------------
                        // EXPECTED
                        //
                        // The original scheduled amount is the
                        // expected collection.
                        // ------------------------------------------

                        expectedToday +=
                            due;


                        // ------------------------------------------
                        // COLLECTED
                        //
                        // Amount already paid toward this
                        // installment.
                        // ------------------------------------------

                        collectedToday +=
                            Math.min(
                                paid,
                                due
                            );


                        // ------------------------------------------
                        // CLIENT DUE TODAY
                        // ------------------------------------------

                        clientsDueToday.push({

                            client:
                                loan.clientName ||
                                "Unknown Client",

                            clientId:
                                loan.clientId ||
                                "",

                            loanId:
                                loan.id,

                            loan,

                            dueDate:
                                item.dueDate,

                            due,

                            paid,

                            balance:
                                unpaidToday,

                            outstanding,

                            arrears:
                                loanArrearsAmount,

                            status:
                                paid > 0
                                    ? "Partial"
                                    : "Pending"

                        });

                    }
                );

            }

        }
    );// ==========================================================
// REPEAT CLIENT COUNT
// ==========================================================

Object.values(
    repeatTracker
).forEach(
    count => {

        if(
            count > 1
        ){

            repeatLoans++;

        }

    }
);


// ==========================================================
// DASHBOARD CARD VALUES
// ==========================================================

// ----------------------------------------------------------
// OUTSTANDING PORTFOLIO
// ----------------------------------------------------------

if(portfolioStat){

    portfolioStat.textContent =
        currency(
            currentPortfolio
        );

}


// ----------------------------------------------------------
// TOTAL PORTFOLIO
// ----------------------------------------------------------

if(totalPortfolioStat){

    totalPortfolioStat.textContent =
        currency(
            totalPortfolio
        );

}


// ----------------------------------------------------------
// MONTHLY PORTFOLIO
// ----------------------------------------------------------

if(monthlyPortfolioStat){

    monthlyPortfolioStat.textContent =
        currency(
            monthlyPortfolio
        );

}


// ----------------------------------------------------------
// PREVIOUS PORTFOLIO
// ----------------------------------------------------------

if(previousPortfolioStat){

    previousPortfolioStat.textContent =
        currency(
            previousPortfolio
        );

}


// ----------------------------------------------------------
// OUTSTANDING PRINCIPAL
// ----------------------------------------------------------

if(outstandingPrincipalStat){

    outstandingPrincipalStat.textContent =
        currency(
            outstandingPrincipal
        );

}


// ----------------------------------------------------------
// OUTSTANDING INTEREST
// ----------------------------------------------------------

if(outstandingInterestStat){

    outstandingInterestStat.textContent =
        currency(
            outstandingInterest
        );

}


// ==========================================================
// CLIENT COUNT
// ==========================================================

if(clientsStat){

    clientsStat.textContent =
        clients.length;

}


// ==========================================================
// LOAN COUNTS
// ==========================================================

if(totalLoansIssuedStat){

    totalLoansIssuedStat.textContent =
        totalLoansIssued;

}


if(activeLoansStat){

    activeLoansStat.textContent =
        activeLoans;

}


if(completedLoansStat){

    completedLoansStat.textContent =
        completedLoans;

}


if(historicalLoansStat){

    historicalLoansStat.textContent =
        historicalLoans;

}


if(repeatLoansStat){

    repeatLoansStat.textContent =
        repeatLoans;

}


// ==========================================================
// INCOME
// ==========================================================

if(revenueStat){

    revenueStat.textContent =
        currency(
            monthlyIncome
        );

}


if(totalIncomeStat){

    totalIncomeStat.textContent =
        currency(
            totalIncome
        );

}


if(previousIncomeStat){

    previousIncomeStat.textContent =
        currency(
            previousIncome
        );

}


// ==========================================================
// LOAN STATUS
// ==========================================================

if(pendingStat){

    pendingStat.textContent =
        pending;

}


if(approvedStat){

    approvedStat.textContent =
        approved;

}


if(rejectedStat){

    rejectedStat.textContent =
        rejected;

}


if(arrearsStat){

    arrearsStat.textContent =
        arrears;

}


// ==========================================================
// TODAY'S COLLECTION CALCULATIONS
// ==========================================================
//
// At this point:
//
// expectedToday
//     = only unpaid/partially-paid installments
//       whose dueDate is TODAY
//
// collectedToday
//     = amount already paid toward those
//       same today's installments
//
// Nothing from tomorrow or yesterday is included.
// Completed loans were already excluded earlier.
// ==========================================================

const remainingToday =
    Math.max(
        0,
        expectedToday -
        collectedToday
    );


const collectionRate =
    expectedToday > 0

        ? Math.round(
            (
                collectedToday /
                expectedToday
            ) * 100
        )

        : 0;


// ==========================================================
// CLIENTS DUE TODAY
// ==========================================================

if(clientsDueTodayElement){

    clientsDueTodayElement.textContent =
        clientsDueToday.length;

}


// ==========================================================
// EXPECTED TODAY
// ==========================================================

if(expectedCollectionElement){

    expectedCollectionElement.textContent =
        currency(
            expectedToday
        );

}


// ==========================================================
// COLLECTED TODAY
// ==========================================================

if(collectedTodayElement){

    collectedTodayElement.textContent =
        currency(
            collectedToday
        );

}


// ==========================================================
// REMAINING TODAY
// ==========================================================

if(remainingCollectionElement){

    remainingCollectionElement.textContent =
        currency(
            remainingToday
        );

}


// ==========================================================
// COLLECTION RATE
// ==========================================================

if(collectionRateElement){

    collectionRateElement.textContent =
        `${collectionRate}%`;

}


// ==========================================================
// ARREARS SUMMARY
// ==========================================================

if(arrearsClientCount){

    arrearsClientCount.textContent =
        arrearsClients.length;

}


if(arrearsTotalAmount){

    arrearsTotalAmount.textContent =
        currency(
            arrearsAmount
        );

}


// ==========================================================
// ARREARS CLIENT LIST
// ==========================================================

if(arrearsClientList){

    arrearsClientList.innerHTML = "";


    if(
        arrearsClients.length === 0
    ){

        arrearsClientList.innerHTML = `

            <p class="empty-state">

                No clients in arrears.

            </p>

        `;

    }else{

        arrearsClients.forEach(
            client => {

                arrearsClientList.innerHTML += `

                    <div
                        class="today-card message-enabled-card"
                    >

                        <div
                            class="message-card-main"
                        >

                            <h4>
                                ${client.client}
                            </h4>


                            <p>

                                <strong>
                                    Missed Installments:
                                </strong>

                                ${client.weeks}

                            </p>


                            <p>

                                <strong>
                                    Arrears Amount:
                                </strong>

                                ${currency(
                                    client.amount
                                )}

                            </p>


                            <p>

                                <strong>
                                    Outstanding Balance:
                                </strong>

                                ${currency(
                                    client.outstanding
                                )}

                            </p>

                        </div>


                        <button
                            type="button"
                            class="message-client-btn"
                            data-message-type="arrears"
                            data-message-loan-id="${client.loanId}"
                        >
                            💬 Message
                        </button>

                    </div>

                `;

            }
        );

    }

}


// ==========================================================
// TODAY'S DUE LIST
// ==========================================================

if(todayDueList){

    todayDueList.innerHTML = "";


    if(
        clientsDueToday.length === 0
    ){

        todayDueList.innerHTML = `

            <p class="empty-state">

                No clients due today.

            </p>

        `;

    }else{

        clientsDueToday.forEach(
            client => {

                const hasArrears =
                    Number(
                        client.arrears || 0
                    ) > 0;


                // ==================================================
                // IMPORTANT:
                //
                // Due Today + Arrears
                //
                // The arrears amount is added to today's
                // collection requirement for display.
                // ==================================================

                const totalDue =
                    client.due +
                    (
                        hasArrears
                            ? client.arrears
                            : 0
                    );


                const paidToday =
                    Math.min(
                        Number(
                            client.paid || 0
                        ),
                        Number(
                            client.due || 0
                        )
                    );


                const remainingDue =
                    Math.max(
                        0,
                        totalDue -
                        paidToday
                    );


                const statusLabel =
                    client.status === "Partial"
                        ? "Partial"
                        : "Pending";


                todayDueList.innerHTML += `

                    <div
                        class="today-card message-enabled-card"
                    >

                        <div
                            class="message-card-main"
                        >

                            <h4>
                                ${client.client}
                            </h4>


                            <p>

                                <strong>
                                    Due Today:
                                </strong>

                                ${currency(
                                    client.due
                                )}

                            </p>


                            ${
                                hasArrears

                                ? `

                                    <p>

                                        <strong>
                                            Arrears:
                                        </strong>

                                        ${currency(
                                            client.arrears
                                        )}

                                    </p>


                                    <p>

                                        <strong>
                                            Total Due:
                                        </strong>

                                        ${currency(
                                            totalDue
                                        )}

                                    </p>

                                `

                                : ""

                            }


                            <p>

                                <strong>
                                    Paid Today:
                                </strong>

                                ${currency(
                                    paidToday
                                )}

                            </p>


                            <p>

                                <strong>
                                    Remaining:
                                </strong>

                                ${currency(
                                    remainingDue
                                )}

                            </p>


                            <p>

                                <strong>
                                    Outstanding Balance:
                                </strong>

                                ${currency(
                                    client.outstanding
                                )}

                            </p>


                            <p>

                                <strong>
                                    Status:
                                </strong>

                                ${statusLabel}

                            </p>

                        </div>


                        <button
                            type="button"
                            class="message-client-btn"
                            data-message-type="${
                                hasArrears
                                    ? "due-arrears"
                                    : "due"
                            }"
                            data-message-loan-id="${client.loanId}"
                        >
                            💬 Message
                        </button>

                    </div>

                `;

            }
        );

    }

}


// ==========================================================
// END OF updateDashboard()
// ==========================================================

}// ==========================================================
// HELPER FUNCTIONS
// ==========================================================


// ==========================================================
// TOTAL OUTSTANDING BALANCE
// ==========================================================

function getTotalOutstandingBalance(){

    return loans.reduce(

        (
            total,
            loan
        ) => {

            const balance =
                Math.max(
                    0,
                    Number(
                        loan.balance ??
                        loan.amount ??
                        0
                    )
                );


            // Completed loans must never contribute
            // to the outstanding portfolio.

            if(
                isCompletedLoan(
                    loan
                )
            ){

                return total;

            }


            const status =
                loan.status ||
                "";


            if(
                status === "Approved" ||
                status === "Active" ||
                status === "Arrears"
            ){

                return (
                    total +
                    balance
                );

            }


            return total;

        },

        0

    );

}


// ==========================================================
// COMPLETED LOAN COUNT
// ==========================================================

function getCompletedLoans(){

    return loans.filter(

        loan =>
            isCompletedLoan(
                loan
            )

    ).length;

}


// ==========================================================
// TOTAL COLLECTED
// ==========================================================
//
// This is the total amount recorded as paid across
// repayment schedules.
//
// It is NOT used to calculate Today's Collection.
// Today's Collection is calculated separately using
// only today's unpaid/partially-paid installment.
// ==========================================================

function getTotalCollected(){

    let total = 0;


    loans.forEach(

        loan => {

            const schedule =
                Array.isArray(
                    loan.repaymentSchedule
                )

                    ? loan.repaymentSchedule

                    : [];


            schedule.forEach(

                item => {

                    total +=
                        Number(
                            item.paidAmount || 0
                        );

                }

            );

        }

    );


    return total;

}


// ==========================================================
// AVERAGE LOAN AMOUNT
// ==========================================================

function getAverageLoanAmount(){

    if(
        loans.length === 0
    ){

        return 0;

    }


    const total =
        loans.reduce(

            (
                sum,
                loan
            ) => {

                return (
                    sum +
                    Number(
                        loan.amount || 0
                    )
                );

            },

            0

        );


    return (
        total /
        loans.length
    );

}


// ==========================================================
// REFRESH DASHBOARD
// ==========================================================

function refreshDashboard(){

    updateDashboard();

}


// ==========================================================
// DASHBOARD SUMMARY
// ==========================================================

function dashboardSummary(){

    console.log(
        "=========================================="
    );


    console.log(
        "GREYMUS LOAN FINANCIAL HUB"
    );


    console.log(
        "=========================================="
    );


    console.log(
        "Today:",
        todayString()
    );


    console.log(
        "Clients:",
        clients.length
    );


    console.log(
        "Loans:",
        loans.length
    );


    console.log(
        "Pending:",
        pendingStat?.textContent ||
        "0"
    );


    console.log(
        "Approved:",
        approvedStat?.textContent ||
        "0"
    );


    console.log(
        "Arrears:",
        arrearsStat?.textContent ||
        "0"
    );


    console.log(
        "Completed:",
        completedLoansStat?.textContent ||
        "0"
    );


    console.log(
        "Outstanding:",
        portfolioStat?.textContent ||
        "KES 0"
    );


    console.log(
        "Monthly Income:",
        revenueStat?.textContent ||
        "KES 0"
    );


    console.log(
        "Total Income:",
        totalIncomeStat?.textContent ||
        "KES 0"
    );


    console.log(
        "Total Collected:",
        currency(
            getTotalCollected()
        )
    );


    console.log(
        "Average Loan:",
        currency(
            getAverageLoanAmount()
        )
    );


    console.log(
        "=========================================="
    );

}


// ==========================================================
// GENERIC MODAL OPENER
// ==========================================================

function openModal(id){

    const modal =
        document.getElementById(
            id
        );


    if(
        modal
    ){

        modal.classList.remove(
            "hidden"
        );

    }

}


// ==========================================================
// NEW CLIENT BUTTON
// ==========================================================

document
    .getElementById(
        "new-client-btn"
    )
    ?.addEventListener(
        "click",
        () => {

            openModal(
                "client-modal"
            );

        }
    );


// ==========================================================
// NEW LOAN BUTTON
// ==========================================================

document
    .getElementById(
        "new-loan-btn"
    )
    ?.addEventListener(
        "click",
        () => {

            openModal(
                "loan-modal"
            );

        }
    );


// ==========================================================
// FAB NEW LOAN
// ==========================================================

document
    .getElementById(
        "fab-new-loan"
    )
    ?.addEventListener(
        "click",
        () => {

            openModal(
                "loan-modal"
            );

        }
    );


// ==========================================================
// PREVIOUS PORTFOLIO ELEMENTS
// ==========================================================

const previousPortfolioCard =
    document.getElementById(
        "previous-portfolio-card"
    );


const previousPortfolioModal =
    document.getElementById(
        "previous-months-portfolio-modal"
    );


const closePreviousPortfolio =
    document.getElementById(
        "close-previous-portfolio"
    );


// ==========================================================
// PREVIOUS INCOME ELEMENTS
// ==========================================================

previousPortfolioCard?.addEventListener(
    "click",
    () => {

        previousPortfolioModal
            ?.classList
            .remove(
                "hidden"
            );

    }
);


closePreviousPortfolio?.addEventListener(
    "click",
    () => {

        previousPortfolioModal
            ?.classList
            .add(
                "hidden"
            );

    }
);// ==========================================================
// PREVIOUS INCOME MODAL
// ==========================================================

previousIncomeCard?.addEventListener(
    "click",
    () => {

        previousIncomeModal
            ?.classList
            .remove(
                "hidden"
            );

    }
);


closePreviousIncome?.addEventListener(
    "click",
    () => {

        previousIncomeModal
            ?.classList
            .add(
                "hidden"
            );

    }
);


// ==========================================================
// EXPANDABLE OUTSTANDING PORTFOLIO
// ==========================================================

const portfolioSummaryToggle =
    document.getElementById(
        "portfolio-summary-toggle"
    );


const portfolioSummaryContent =
    document.getElementById(
        "portfolio-summary-content"
    );


const portfolioSummaryButton =
    document.getElementById(
        "portfolio-summary-btn"
    );


if(
    portfolioSummaryToggle &&
    portfolioSummaryContent &&
    portfolioSummaryButton
){

    portfolioSummaryContent.classList.add(
        "hidden"
    );


    portfolioSummaryToggle.addEventListener(
        "click",
        () => {

            portfolioSummaryContent.classList.toggle(
                "hidden"
            );


            const isHidden =
                portfolioSummaryContent
                    .classList
                    .contains(
                        "hidden"
                    );


            portfolioSummaryButton.textContent =
                isHidden
                    ? "▼"
                    : "▲";


            portfolioSummaryButton.setAttribute(
                "aria-label",
                isHidden
                    ? "Expand outstanding portfolio"
                    : "Collapse outstanding portfolio"
            );

        }
    );

}


// ==========================================================
// EXPANDABLE CLIENTS DUE TODAY
// ==========================================================

const todayDueToggle =
    document.getElementById(
        "today-due-toggle"
    );


const todayDueContent =
    document.getElementById(
        "today-due-content"
    );


const todayDueButton =
    document.getElementById(
        "today-due-btn"
    );


if(
    todayDueToggle &&
    todayDueContent &&
    todayDueButton
){

    todayDueContent.classList.add(
        "hidden"
    );


    todayDueToggle.addEventListener(
        "click",
        () => {

            todayDueContent.classList.toggle(
                "hidden"
            );


            const isHidden =
                todayDueContent
                    .classList
                    .contains(
                        "hidden"
                    );


            todayDueButton.textContent =
                isHidden
                    ? "▼"
                    : "▲";


            todayDueButton.setAttribute(
                "aria-label",
                isHidden
                    ? "Expand clients due today"
                    : "Collapse clients due today"
            );

        }
    );

}


// ==========================================================
// EXPANDABLE MONTHLY PORTFOLIO
// ==========================================================

const monthlyPortfolioToggle =
    document.getElementById(
        "monthly-portfolio-toggle"
    );


const monthlyPortfolioContent =
    document.getElementById(
        "monthly-portfolio-content"
    );


const monthlyPortfolioButton =
    document.getElementById(
        "monthly-portfolio-btn"
    );


if(
    monthlyPortfolioToggle &&
    monthlyPortfolioContent &&
    monthlyPortfolioButton
){

    monthlyPortfolioContent.classList.add(
        "hidden"
    );


    monthlyPortfolioToggle.addEventListener(
        "click",
        () => {

            monthlyPortfolioContent.classList.toggle(
                "hidden"
            );


            const isHidden =
                monthlyPortfolioContent
                    .classList
                    .contains(
                        "hidden"
                    );


            monthlyPortfolioButton.textContent =
                isHidden
                    ? "▼"
                    : "▲";


            monthlyPortfolioButton.setAttribute(
                "aria-label",
                isHidden
                    ? "Expand monthly portfolio"
                    : "Collapse monthly portfolio"
            );

        }
    );

}


// ==========================================================
// EXPANDABLE TODAY'S COLLECTION
// ==========================================================

const todayCollectionToggle =
    document.getElementById(
        "today-collection-toggle"
    );


const todayCollectionContent =
    document.getElementById(
        "today-collection-content"
    );


const todayCollectionButton =
    document.getElementById(
        "today-collection-btn"
    );


if(
    todayCollectionToggle &&
    todayCollectionContent &&
    todayCollectionButton
){

    todayCollectionContent.classList.add(
        "hidden"
    );


    todayCollectionToggle.addEventListener(
        "click",
        () => {

            todayCollectionContent.classList.toggle(
                "hidden"
            );


            const isHidden =
                todayCollectionContent
                    .classList
                    .contains(
                        "hidden"
                    );


            todayCollectionButton.textContent =
                isHidden
                    ? "▼"
                    : "▲";


            todayCollectionButton.setAttribute(
                "aria-label",
                isHidden
                    ? "Expand today's collection"
                    : "Collapse today's collection"
            );

        }
    );

}// ==========================================================
// EXPANDABLE ARREARS
// ==========================================================

const arrearsSummaryToggle =
    document.getElementById(
        "arrears-summary-toggle"
    );


const arrearsSummaryContent =
    document.getElementById(
        "arrears-summary-content"
    );


const arrearsSummaryButton =
    document.getElementById(
        "arrears-summary-btn"
    );


if(
    arrearsSummaryToggle &&
    arrearsSummaryContent &&
    arrearsSummaryButton
){

    arrearsSummaryContent.classList.add(
        "hidden"
    );


    arrearsSummaryToggle.addEventListener(
        "click",
        () => {

            arrearsSummaryContent.classList.toggle(
                "hidden"
            );


            const isHidden =
                arrearsSummaryContent
                    .classList
                    .contains(
                        "hidden"
                    );


            arrearsSummaryButton.textContent =
                isHidden
                    ? "▼"
                    : "▲";


            arrearsSummaryButton.setAttribute(
                "aria-label",
                isHidden
                    ? "Expand arrears"
                    : "Collapse arrears"
            );

        }
    );

}


// ==========================================================
// EXPANDABLE OUTSTANDING BALANCE
// ==========================================================

const outstandingSummaryToggle =
    document.getElementById(
        "outstanding-summary-toggle"
    );


const outstandingSummaryContent =
    document.getElementById(
        "outstanding-summary-content"
    );


const outstandingSummaryButton =
    document.getElementById(
        "outstanding-summary-btn"
    );


if(
    outstandingSummaryToggle &&
    outstandingSummaryContent &&
    outstandingSummaryButton
){

    outstandingSummaryContent.classList.add(
        "hidden"
    );


    outstandingSummaryToggle.addEventListener(
        "click",
        () => {

            outstandingSummaryContent.classList.toggle(
                "hidden"
            );


            const isHidden =
                outstandingSummaryContent
                    .classList
                    .contains(
                        "hidden"
                    );


            outstandingSummaryButton.textContent =
                isHidden
                    ? "▼"
                    : "▲";


            outstandingSummaryButton.setAttribute(
                "aria-label",
                isHidden
                    ? "Expand outstanding balance"
                    : "Collapse outstanding balance"
            );

        }
    );

}


// ==========================================================
// DASHBOARD MESSAGE BUTTON HANDLER
// ==========================================================
//
// Buttons are generated dynamically by
// updateDashboard(), so event delegation is used.
//
// Supported message types:
//
// ✔ due
// ✔ due-arrears
// ✔ arrears
// ==========================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".message-client-btn"
            );


        if(
            !button
        ){

            return;

        }


        event.preventDefault();


        const loanId =
            button.dataset.messageLoanId;


        const messageType =
            button.dataset.messageType ||
            "due";


        if(
            !loanId
        ){

            console.error(
                "GREYMUS: Message button has no loan ID."
            );

            return;

        }


        const loan =
            loans.find(
                item =>
                    item.id === loanId
            );


        if(
            !loan
        ){

            alert(
                "The selected loan could not be found."
            );

            return;

        }


        const client =
            clients.find(
                item =>
                    item.id === loan.clientId
            );


        if(
            !client
        ){

            alert(
                "The client for this loan could not be found."
            );

            return;

        }


        // ==================================================
        // NEVER MESSAGE A COMPLETED LOAN
        // ==================================================

        if(
            isCompletedLoan(
                loan
            )
        ){

            alert(
                "This loan has already been completed."
            );

            return;

        }


        // ==================================================
        // ARREARS MESSAGE
        // ==================================================

        if(
            messageType === "arrears"
        ){

            const today =
                todayString();


            const overdueItems =
                (
                    loan.repaymentSchedule ||
                    []
                ).filter(
                    item => {

                        const dueDate =
                            normalizeDate(
                                item.dueDate
                            );


                        const due =
                            Number(
                                item.amount || 0
                            );


                        const paid =
                            Number(
                                item.paidAmount || 0
                            );


                        return (
                            dueDate &&
                            dueDate < today &&
                            paid < due
                        );

                    }
                );


            const arrearsAmount =
                overdueItems.reduce(
                    (
                        sum,
                        item
                    ) => {

                        const due =
                            Number(
                                item.amount || 0
                            );


                        const paid =
                            Number(
                                item.paidAmount || 0
                            );


                        return (
                            sum +
                            Math.max(
                                0,
                                due - paid
                            )
                        );

                    },
                    0
                );


            if(
                arrearsAmount <= 0
            ){

                alert(
                    "This client has no outstanding arrears."
                );

                return;

            }


            openMessageComposer({

                type:
                    "arrears",

                loan,

                client,

                arrears:
                    arrearsAmount,

                overdueInstallments:
                    overdueItems.length,

                outstanding:
                    Number(
                        loan.balance || 0
                    ),

                dueDate:
                    overdueItems[0]?.dueDate ||
                    loan.nextRepaymentDate

            });


            return;

        }


        // ==================================================
        // TODAY'S INSTALLMENT
        // ==================================================

        const today =
            todayString();


        const dueItem =
            (
                loan.repaymentSchedule ||
                []
            ).find(
                item =>
                    normalizeDate(
                        item.dueDate
                    ) === today
            );


        if(
            !dueItem
        ){

            alert(
                "Today's repayment could not be found for this loan."
            );

            return;

        }


        // ==================================================
        // INSTALLMENT VALUES
        // ==================================================

        const due =
            Number(
                dueItem.amount || 0
            );


        const paid =
            Number(
                dueItem.paidAmount || 0
            );


        // ==================================================
        // FULLY PAID TODAY
        // ==================================================

        if(
            due > 0 &&
            paid >= due
        ){

            alert(
                "Today's repayment has already been fully paid."
            );

            return;

        }


        // ==================================================
        // OPEN MESSAGE COMPOSER
        // ==================================================

        openMessageComposer({

            type:
                messageType,

            loan,

            client,

            due,

            dueDate:
                dueItem.dueDate,

            outstanding:
                Number(
                    loan.balance || 0
                )

        });

    }
);


// ==========================================================
// DATE CHANGE DETECTION
// ==========================================================
//
// Firestore may not change at midnight.
//
// Therefore the dashboard checks the calendar date
// periodically and recalculates Today's Collection
// when the date changes.
// ==========================================================

let lastDashboardDate =
    todayString();


setInterval(
    () => {

        const currentDate =
            todayString();


        if(
            currentDate !==
            lastDashboardDate
        ){

            lastDashboardDate =
                currentDate;


            updateDashboard();

        }

    },
    30000
);// ==========================================================
// DASHBOARD AUTO REFRESH
// ==========================================================
//
// Refresh every 60 seconds.
//
// This does NOT modify Firestore.
// It only recalculates dashboard figures from the
// current in-memory data.
//
// This is especially useful for date-sensitive
// Today's Collection calculations.
// ==========================================================

setInterval(
    () => {

        refreshDashboard();

    },
    60000
);


// ==========================================================
// INITIAL DASHBOARD LOAD
// ==========================================================
//
// Firestore listeners will also call updateDashboard()
// when data arrives.
//
// This initial call makes sure the dashboard is
// immediately initialized.
// ==========================================================

refreshDashboard();


// ==========================================================
// DASHBOARD EXPORTS
// ==========================================================
//
// These exports allow other modules to use the
// dashboard helper functions if needed.
// ==========================================================

export {

    currency,

    refreshDashboard,

    dashboardSummary,

    getTotalOutstandingBalance,

    getCompletedLoans,

    getTotalCollected,

    getAverageLoanAmount

};


// ==========================================================
// DEBUG ACCESS
// ==========================================================
//
// Available in browser console as:
//
// GREYMUS_DASHBOARD.refresh()
//
// GREYMUS_DASHBOARD.summary()
//
// GREYMUS_DASHBOARD.getOutstanding()
//
// GREYMUS_DASHBOARD.getCompleted()
//
// GREYMUS_DASHBOARD.getCollected()
//
// GREYMUS_DASHBOARD.getAverageLoan()
// ==========================================================

window.GREYMUS_DASHBOARD = {

    refresh:
        refreshDashboard,

    summary:
        dashboardSummary,

    getOutstanding:
        getTotalOutstandingBalance,

    getCompleted:
        getCompletedLoans,

    getCollected:
        getTotalCollected,

    getAverageLoan:
        getAverageLoanAmount

};// ==========================================================
// FINAL SAFETY CHECKS
// ==========================================================
//
// This final section is intentionally small.
//
// It does NOT calculate figures again.
// It does NOT add another Firestore listener.
// It does NOT create another Today's Collection list.
//
// All calculations are already handled by updateDashboard().
//
// The important date rules are:
//
// TODAY:
//     dueDate === todayString()
//
// TOMORROW:
//     dueDate > todayString()
//     → NEVER shown in Today's Collection
//
// YESTERDAY / ARREARS:
//     dueDate < todayString()
//     → NEVER counted as today's installment
//
// COMPLETED:
//     status === "Completed"
//     OR completed === true
//     OR balance <= 0
//     → NEVER shown in Today's Collection
//
// FULLY PAID TODAY:
//     paidAmount >= installment amount
//     → NEVER shown as still due
//
// PARTIAL PAYMENT:
//     paidAmount < installment amount
//     → REMAINS in Today's Collection
// ==========================================================


// ==========================================================
// FINAL DASHBOARD REFRESH
// ==========================================================

if(
    typeof updateDashboard === "function"
){

    updateDashboard();

}


// ==========================================================
// OPTIONAL DEBUG INFORMATION
// ==========================================================
//
// Open browser console and run:
//
// GREYMUS_DASHBOARD.refresh()
//
// to manually refresh the dashboard.
//
// This can also help confirm the current date:
//
// GREYMUS_DASHBOARD.summary()
// ==========================================================

console.log(
    "GREYMUS Dashboard loaded successfully."
);


// ==========================================================
// END OF DASHBOARD.JS
// ==========================================================