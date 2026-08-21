// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 4.5
//
// ✔ Current Outstanding Portfolio
// ✔ Total Portfolio Issued
// ✔ Monthly Portfolio
// ✔ Previous Portfolio
// ✔ Monthly Income
// ✔ Previous Income
// ✔ Total Income
// ✔ Clients
// ✔ Total Loans Issued
// ✔ Active Loans
// ✔ Completed Loans
// ✔ Historical Loans
// ✔ Repeat Clients
// ✔ Pending Loans
// ✔ Approved Loans
// ✔ Rejected Loans
// ✔ Arrears Count
// ✔ Arrears Amount
// ✔ Clients in Arrears List
// ✔ Today's Collection
// ✔ Today's Due List
// ✔ Today's Due + Arrears Visible Together
// ✔ PARTIAL PAYMENT STAYS IN TODAY'S LIST
// ✔ FULL PAYMENT STAYS IN TODAY'S LIST UNTIL NEXT DAY
// ✔ COMPLETED/OFFSET LOANS EXCLUDED FROM TODAY'S COLLECTION
// ✔ AUTOMATIC MIDNIGHT RESET
// ✔ DATE CHANGE DETECTION
// ✔ AUTO REFRESH
// ✔ FIRESTORE REALTIME SYNC
// ✔ ACTIVE LOANS INCLUDED IN OUTSTANDING PORTFOLIO
// ✔ OUTSTANDING PORTFOLIO RECONCILES WITH PRINCIPAL + INTEREST
// ✔ MESSAGE BUTTONS
// ✔ SAFE DATE COMPARISON
//
// STATUS: CORRECTED
// ==========================================


import { db } from "./firebase.js";

import { openMessageComposer } from "./messaging.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// FIRESTORE DATA
// ==========================================

let loans = [];
let clients = [];
let repayments = [];


// ==========================================
// DASHBOARD ELEMENTS
// ==========================================

// Portfolio
const portfolioStat =
    document.getElementById("stat-portfolio");

const totalPortfolioStat =
    document.getElementById("stat-total-portfolio");

const monthlyPortfolioStat =
    document.getElementById("stat-monthly-portfolio");

const previousPortfolioStat =
    document.getElementById("stat-previous-portfolio");

const outstandingPrincipalStat =
    document.getElementById("stat-outstanding-principal");

const outstandingInterestStat =
    document.getElementById("stat-outstanding-interest");


// Clients
const clientsStat =
    document.getElementById("stat-clients");


// Loans
const totalLoansIssuedStat =
    document.getElementById("stat-total-loans-issued");

const activeLoansStat =
    document.getElementById("stat-active-loans");

const completedLoansStat =
    document.getElementById("stat-completed-loans");

const historicalLoansStat =
    document.getElementById("stat-historical-loans");

const repeatLoansStat =
    document.getElementById("stat-repeat-loans");


// Income
const revenueStat =
    document.getElementById("stat-revenue");

const totalIncomeStat =
    document.getElementById("stat-total-income");

const previousIncomeStat =
    document.getElementById("stat-previous-income");

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


// Status
const pendingStat =
    document.getElementById("stat-pending");

const approvedStat =
    document.getElementById("stat-approved");

const rejectedStat =
    document.getElementById("stat-rejected");

const arrearsStat =
    document.getElementById("stat-arrears");


// ==========================================
// TODAY'S COLLECTION ELEMENTS
// ==========================================

const clientsDueTodayElement =
    document.getElementById("clientsDueToday");

const expectedCollectionElement =
    document.getElementById("expectedCollection");

const collectedTodayElement =
    document.getElementById("collectedToday");

const remainingCollectionElement =
    document.getElementById("remainingCollection");

const collectionRateElement =
    document.getElementById("collectionRate");

const todayDueList =
    document.getElementById("todayDueList");


// ==========================================
// ARREARS SECTION
// ==========================================

const arrearsClientCount =
    document.getElementById("arrears-client-count");

const arrearsTotalAmount =
    document.getElementById("arrears-total-amount");

const arrearsClientList =
    document.getElementById("arrears-client-list");


// ==========================================
// MONEY FORMAT
// ==========================================

function currency(value){

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(Number(value) || 0);

}


// ==========================================
// DATE HELPERS
// ==========================================
//
// IMPORTANT
//
// All dashboard "today" calculations use
// the browser's LOCAL calendar date.
//
// The dashboard does NOT depend on a
// hard-coded date.
//
// At midnight, todayString() automatically
// changes to the new date.
//
// ==========================================

function todayString(){

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// ==========================================
// NORMALIZE FIRESTORE / SCHEDULE DATE
// ==========================================
//
// Converts common date formats into:
//
// YYYY-MM-DD
//
// Supports:
//
// YYYY-MM-DD
// YYYY-MM-DDTHH:mm:ss
// JavaScript Date
// Firestore Timestamp-like objects
// ==========================================

function normalizeDateString(value){

    if(!value){

        return "";

    }


    // Already YYYY-MM-DD
    if(
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ){

        return value;

    }


    // ISO date/time string
    if(
        typeof value === "string"
    ){

        const directMatch =
            value.match(
                /^(\d{4}-\d{2}-\d{2})/
            );


        if(directMatch){

            return directMatch[1];

        }

    }


    // Firestore Timestamp
    if(
        typeof value?.toDate === "function"
    ){

        const date =
            value.toDate();

        return formatDateObject(
            date
        );

    }


    // Firestore timestamp object
    if(
        typeof value === "object" &&
        Number.isFinite(
            Number(value.seconds)
        )
    ){

        const date =
            new Date(
                Number(value.seconds) * 1000
            );

        return formatDateObject(
            date
        );

    }


    // JavaScript Date / numeric date
    const date =
        new Date(value);


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";

    }


    return formatDateObject(
        date
    );

}


// ==========================================
// FORMAT DATE OBJECT
// ==========================================

function formatDateObject(date){

    if(
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";

    }


    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// ==========================================
// MONTH KEY
// ==========================================

function monthKey(date){

    const normalized =
        normalizeDateString(date);


    if(!normalized){

        return "";

    }


    return normalized.slice(
        0,
        7
    );

}


// ==========================================
// FIRESTORE LISTENERS
// ==========================================


// ==========================================
// CLIENTS
// ==========================================

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
            "Clients listener error:",
            error
        );

    }

);


// ==========================================
// LOANS
// ==========================================

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
            "Loans listener error:",
            error
        );

    }

);


// ==========================================
// REPAYMENTS
// ==========================================
// Backward compatibility
// ==========================================

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
            "Repayments listener error:",
            error
        );

    }

);


// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateDashboard(){

    let currentPortfolio = 0;

    let outstandingPrincipal = 0;

    let outstandingInterest = 0;

    let totalPortfolio = 0;

    let monthlyPortfolio = 0;

    let previousPortfolio = 0;

    let previousMonthsPortfolio = {};

    let monthlyIncome = 0;

    let totalIncome = 0;

    let previousIncome = 0;

    let previousMonthsIncome = {};

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

    const arrearsClients = [];

    const clientsDueToday = [];

    const today = todayString();

    const now = new Date();

    const currentMonth =
        now.getMonth();

    const currentYear =
        now.getFullYear();

    const repeatTracker = {};


// ==========================================
// LOOP THROUGH LOANS
// ==========================================

    loans.forEach(
        loan => {

            totalLoansIssued++;


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
                Number(
                    loan.balance ??
                    principal
                );


// ==========================================
// OUTSTANDING PRINCIPAL / INTEREST
// ==========================================

            let remainingPrincipal = 0;

            let remainingInterest = 0;


            if(
                totalRepayment > 0 &&
                outstanding > 0
            ){

                const principalRatio =
                    principal /
                    totalRepayment;


                remainingPrincipal =
                    outstanding *
                    principalRatio;


                remainingInterest =
                    outstanding -
                    remainingPrincipal;

            }


// ==========================================
// APPROVAL DATE
// ==========================================

            const approvalDate =
                new Date(
                    loan.approvalDate ||
                    loan.createdAt ||
                    Date.now()
                );


// ==========================================
// INTEREST / INCOME
// ==========================================

            const interest =
                Math.max(
                    0,
                    totalRepayment -
                    principal
                );


            const earnedInterest =
                totalRepayment > 0

                    ? (
                        amountPaid /
                        totalRepayment
                    ) * interest

                    : 0;


            const income =
                processingFee +
                earnedInterest;


// ==========================================
// OUTSTANDING PORTFOLIO
// ==========================================

            const isOutstandingLoan =
                status === "Approved" ||
                status === "Active" ||
                status === "Arrears";


            if(
                isOutstandingLoan
            ){

                outstandingPrincipal +=
                    remainingPrincipal;

                outstandingInterest +=
                    remainingInterest;

                currentPortfolio +=
                    outstanding;

            }


// ==========================================
// TOTAL PORTFOLIO
// ==========================================

            totalPortfolio +=
                principal;


            if(

                approvalDate.getMonth() ===
                    currentMonth &&

                approvalDate.getFullYear() ===
                    currentYear

            ){

                monthlyPortfolio +=
                    principal;

            }else{

                previousPortfolio +=
                    principal;


                const monthName =
                    approvalDate.toLocaleString(
                        "en-US",
                        {
                            month: "long"
                        }
                    );


                const year =
                    approvalDate.getFullYear();


                const key =
                    `${monthName} ${year}`;


                previousMonthsPortfolio[key] =
                    (
                        previousMonthsPortfolio[key]
                        || 0
                    ) + principal;

            }


// ==========================================
// INCOME
// ==========================================

            totalIncome +=
                income;


            if(

                approvalDate.getMonth() ===
                    currentMonth &&

                approvalDate.getFullYear() ===
                    currentYear

            ){

                monthlyIncome +=
                    income;

            }else{

                previousIncome +=
                    income;


                const monthName =
                    approvalDate.toLocaleString(
                        "en-US",
                        {
                            month: "long"
                        }
                    );


                const year =
                    approvalDate.getFullYear();


                const key =
                    `${monthName} ${year}`;


                previousMonthsIncome[key] =
                    (
                        previousMonthsIncome[key]
                        || 0
                    ) + income;

            }


// ==========================================
// REPEAT CLIENTS
// ==========================================

            const clientId =
                loan.clientId ||
                loan.clientName ||
                loan.id;


            repeatTracker[clientId] =
                (
                    repeatTracker[clientId]
                    || 0
                ) + 1;


// ==========================================
// CALCULATE MISSED INSTALLMENTS
// ==========================================

            let missedWeeks = 0;

            let overdueAmount = 0;


            if(
                Array.isArray(
                    loan.repaymentSchedule
                )
            ){

                loan.repaymentSchedule.forEach(
                    item => {

                        const dueDate =
                            normalizeDateString(
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

                            dueDate &&
                            dueDate < today &&
                            paid < due

                        ){

                            missedWeeks++;

                            overdueAmount +=
                                Math.max(
                                    due - paid,
                                    0
                                );

                        }

                    }
                );

            }


// ==========================================
// LOAN STATUS COUNTS
// ==========================================

            switch(status){

                case "Pending":

                    pending++;

                    break;


                case "Approved":

                    approved++;

                    activeLoans++;

                    break;


                case "Active":

                    activeLoans++;

                    break;


                case "Arrears":

                    arrears++;

                    activeLoans++;


                    if(
                        missedWeeks > 0
                    ){

                        arrearsAmount +=
                            overdueAmount;


                        const firstOverdue =
                            (
                                loan.repaymentSchedule ||
                                []
                            ).find(
                                item => {

                                    const itemDate =
                                        normalizeDateString(
                                            item.dueDate
                                        );

                                    return (
                                        itemDate &&
                                        itemDate < today
                                    );

                                }
                            );


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
                                missedWeeks,

                            amount:
                                overdueAmount,

                            outstanding:
                                Number(
                                    loan.balance || 0
                                ),

                            dueDate:
                                firstOverdue?.dueDate ||
                                loan.nextRepaymentDate ||
                                ""

                        });

                    }

                    break;


                case "Rejected":

                    rejected++;

                    break;


                case "Completed":

                    completedLoans++;


                    if(
                        loan.loanType ===
                        "historical"
                    ){

                        historicalLoans++;

                    }

                    break;

            }


// ==========================================
// TODAY'S COLLECTION
// ==========================================
//
// Only Approved, Active and Arrears loans
// can generate today's collection.
//
// Completed loans are excluded.
//
// The date is always recalculated using
// todayString(), so after midnight the old
// day's entries disappear automatically.
// ==========================================

            const isCurrentLoanForCollection =
                status === "Approved" ||
                status === "Active" ||
                status === "Arrears";


            if(
                !isCurrentLoanForCollection
            ){

                return;

            }


            if(
                !Array.isArray(
                    loan.repaymentSchedule
                )
            ){

                return;

            }


            loan.repaymentSchedule.forEach(
                item => {

                    const dueDate =
                        normalizeDateString(
                            item.dueDate
                        );


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


                    const balance =
                        Math.max(
                            0,
                            due - paid
                        );


                    expectedToday +=
                        due;


                    collectedToday +=
                        paid;


// ==========================================
// CLIENT DUE TODAY RECORD
// ==========================================

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

                        balance,

                        outstanding:
                            Number(
                                loan.balance || 0
                            ),

                        arrears:
                            overdueAmount,

                        status:

                            paid >= due

                                ? "Paid"

                                : paid > 0

                                    ? "Partial"

                                    : "Pending"

                    });

                }
            );

        }
    );


// ==========================================
// COUNT REPEAT CLIENTS
// ==========================================

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


// ==========================================
// UPDATE DASHBOARD CARDS
// ==========================================

    if(portfolioStat){

        portfolioStat.textContent =
            currency(
                currentPortfolio
            );

    }


    if(totalPortfolioStat){

        totalPortfolioStat.textContent =
            currency(
                totalPortfolio
            );

    }


    if(monthlyPortfolioStat){

        monthlyPortfolioStat.textContent =
            currency(
                monthlyPortfolio
            );

    }


    if(outstandingPrincipalStat){

        outstandingPrincipalStat.textContent =
            currency(
                outstandingPrincipal
            );

    }


    if(outstandingInterestStat){

        outstandingInterestStat.textContent =
            currency(
                outstandingInterest
            );

    }


    if(previousPortfolioStat){

        previousPortfolioStat.textContent =
            currency(
                previousPortfolio
            );

    }


// ==========================================
// PREVIOUS MONTHS PORTFOLIO
// ==========================================

    const previousMonthsList =
        document.getElementById(
            "previous-months-portfolio-list"
        );


    if(previousMonthsList){

        previousMonthsList.innerHTML = "";


        Object.entries(
            previousMonthsPortfolio
        ).forEach(
            ([month, amount]) => {

                previousMonthsList.innerHTML += `

                    <div class="today-card">

                        <h4>
                            ${month} Portfolio
                        </h4>

                        <p>
                            ${currency(amount)}
                        </p>

                    </div>

                `;

            }
        );


        if(
            Object.keys(
                previousMonthsPortfolio
            ).length === 0
        ){

            previousMonthsList.innerHTML = `

                <p>
                    No previous months portfolio records.
                </p>

            `;

        }

    }


    if(clientsStat){

        clientsStat.textContent =
            clients.length;

    }


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


// ==========================================
// PREVIOUS MONTHS INCOME
// ==========================================

    const previousIncomeList =
        document.getElementById(
            "previous-months-income-list"
        );


    if(previousIncomeList){

        previousIncomeList.innerHTML = "";


        Object.entries(
            previousMonthsIncome
        )
        .sort(
            (a, b) => {

                return (
                    new Date(b[0]) -
                    new Date(a[0])
                );

            }
        )
        .forEach(
            ([month, amount]) => {

                previousIncomeList.innerHTML += `

                    <div class="today-card">

                        <h4>
                            ${month} Income
                        </h4>

                        <p>
                            ${currency(amount)}
                        </p>

                    </div>

                `;

            }
        );


        if(
            Object.keys(
                previousMonthsIncome
            ).length === 0
        ){

            previousIncomeList.innerHTML = `

                <p>
                    No previous months income records.
                </p>

            `;

        }

    }


// ==========================================
// STATUS CARDS
// ==========================================

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


// ==========================================
// UPDATE ARREARS SECTION
// ==========================================

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


    if(arrearsClientList){

        arrearsClientList.innerHTML = "";


        if(
            arrearsClients.length === 0
        ){

            arrearsClientList.innerHTML = `

                <p>
                    No clients in arrears.
                </p>

            `;

        }else{

            arrearsClients.forEach(
                client => {

                    arrearsClientList.innerHTML += `

                        <div class="today-card message-enabled-card">

                            <div class="message-card-main">

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


// ==========================================
// TODAY'S COLLECTION SUMMARY
// ==========================================

    const remaining =
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


    if(clientsDueTodayElement){

        clientsDueTodayElement.textContent =
            clientsDueToday.length;

    }


    if(expectedCollectionElement){

        expectedCollectionElement.textContent =
            currency(
                expectedToday
            );

    }


    if(collectedTodayElement){

        collectedTodayElement.textContent =
            currency(
                collectedToday
            );

    }


    if(remainingCollectionElement){

        remainingCollectionElement.textContent =
            currency(
                remaining
            );

    }


    if(collectionRateElement){

        collectionRateElement.textContent =
            collectionRate + "%";

    }


// ==========================================
// CLIENTS DUE TODAY LIST
// ==========================================

    if(todayDueList){

        todayDueList.innerHTML = "";


        if(
            clientsDueToday.length === 0
        ){

            todayDueList.innerHTML = `

                <div class="empty-state">

                    <p>
                        No repayments due today.
                    </p>

                </div>

            `;

        }else{

            clientsDueToday.forEach(
                client => {

                    todayDueList.innerHTML += `

                        <div class="today-card message-enabled-card">

                            <div class="message-card-main">

                                <h4>
                                    ${client.client}
                                </h4>

                                <p>
                                    <strong>
                                        Due:
                                    </strong>
                                    ${currency(
                                        client.due
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Paid:
                                    </strong>
                                    ${currency(
                                        client.paid
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Balance:
                                    </strong>
                                    ${currency(
                                        client.balance
                                    )}
                                </p>

                                ${
                                    Number(
                                        client.arrears || 0
                                    ) > 0
                                    ? `
                                        <p>
                                            <strong>
                                                Arrears:
                                            </strong>
                                            ${currency(
                                                client.arrears
                                            )}
                                        </p>
                                    `
                                    : ""
                                }

                                <p>
                                    <strong>
                                        Status:
                                    </strong>
                                    ${client.status}
                                </p>

                            </div>

                            <button
                                type="button"
                                class="message-client-btn"
                                data-message-type="due"
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

}


// ==========================================
// HELPER FUNCTIONS
// ==========================================


// ==========================================
// TOTAL OUTSTANDING PORTFOLIO
// ==========================================

function getTotalOutstandingBalance(){

    return loans.reduce(
        (total, loan) => {

            if(

                loan.status === "Approved" ||

                loan.status === "Active" ||

                loan.status === "Arrears"

            ){

                return total +

                    Number(

                        loan.balance ??

                        loan.amount ??

                        0

                    );

            }

            return total;

        },
        0
    );

}


// ==========================================
// COMPLETED LOANS
// ==========================================

function getCompletedLoans(){

    return loans.filter(
        loan =>
            loan.status === "Completed"
    ).length;

}


// ==========================================
// TOTAL COLLECTED
// ==========================================

function getTotalCollected(){

    let total = 0;


    loans.forEach(
        loan => {

            if(
                Array.isArray(
                    loan.repaymentSchedule
                )
            ){

                loan.repaymentSchedule.forEach(
                    item => {

                        total +=
                            Number(
                                item.paidAmount || 0
                            );

                    }
                );

            }

        }
    );


    return total;

}


// ==========================================
// AVERAGE LOAN AMOUNT
// ==========================================

function getAverageLoanAmount(){

    if(
        loans.length === 0
    ){

        return 0;

    }


    const total =
        loans.reduce(
            (sum, loan) =>

                sum +

                Number(
                    loan.amount || 0
                ),

            0
        );


    return (
        total /
        loans.length
    );

}


// ==========================================
// REFRESH DASHBOARD
// ==========================================

function refreshDashboard(){

    updateDashboard();

}


// ==========================================
// DASHBOARD SUMMARY
// ==========================================

function dashboardSummary(){

    console.log(
        "===================================="
    );

    console.log(
        "GREYMUS LOAN FINANCIAL HUB"
    );

    console.log(
        "===================================="
    );

    console.log(
        "Dashboard Date:",
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
        "Approved:",
        approvedStat?.textContent || 0
    );

    console.log(
        "Arrears:",
        arrearsStat?.textContent || 0
    );

    console.log(
        "Pending:",
        pendingStat?.textContent || 0
    );

    console.log(
        "Completed:",
        completedLoansStat?.textContent || 0
    );

    console.log(
        "Outstanding:",
        portfolioStat?.textContent
    );

    console.log(
        "Monthly Income:",
        revenueStat?.textContent
    );

    console.log(
        "Total Income:",
        totalIncomeStat?.textContent
    );

    console.log(
        "Collected:",
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
        "===================================="
    );

}


// ==========================================
// QUICK ACTION BUTTONS
// ==========================================

function openModal(id){

    const modal =
        document.getElementById(id);

    if(modal){

        modal.classList.remove(
            "hidden"
        );

    }

}


document
    .getElementById("new-client-btn")
    ?.addEventListener(
        "click",
        () => {

            openModal(
                "client-modal"
            );

        }
    );


document
    .getElementById("new-loan-btn")
    ?.addEventListener(
        "click",
        () => {

            openModal(
                "loan-modal"
            );

        }
    );


document
    .getElementById("fab-new-loan")
    ?.addEventListener(
        "click",
        () => {

            openModal(
                "loan-modal"
            );

        }
    );


// ==========================================
// EXPANDABLE TOTAL LOANS CARD
// ==========================================

const summaryToggle =
    document.getElementById(
        "loan-summary-toggle"
    );

const loanSummaryContent =
    document.getElementById(
        "loan-summary-content"
    );

const summaryButton =
    document.getElementById(
        "loan-summary-btn"
    );


if(
    summaryToggle &&
    loanSummaryContent &&
    summaryButton
){

    loanSummaryContent.classList.add(
        "hidden"
    );


    summaryToggle.addEventListener(
        "click",
        () => {

            loanSummaryContent
                .classList
                .toggle(
                    "hidden"
                );


            summaryButton.textContent =
                loanSummaryContent
                    .classList
                    .contains("hidden")

                    ? "▼"

                    : "▲";

        }
    );

}


// ==========================================
// EXPANDABLE OUTSTANDING PORTFOLIO
// ==========================================

const portfolioSummaryButton =
    document.getElementById(
        "portfolio-summary-btn"
    );

const portfolioSummaryContent =
    document.getElementById(
        "portfolio-summary-content"
    );


if(
    portfolioSummaryButton &&
    portfolioSummaryContent
){

    portfolioSummaryContent.classList.add(
        "hidden"
    );


    portfolioSummaryButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            portfolioSummaryContent
                .classList
                .toggle(
                    "hidden"
                );


            const isHidden =
                portfolioSummaryContent
                    .classList
                    .contains("hidden");


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


// ==========================================
// EXPANDABLE CLIENTS DUE TODAY
// ==========================================

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

            todayDueContent
                .classList
                .toggle(
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


// ==========================================
// PREVIOUS MONTHS PORTFOLIO CLICK
// ==========================================

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
);


// ==========================================
// PREVIOUS MONTHS INCOME CLICK
// ==========================================

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


// ==========================================
// AUTO REFRESH
// ==========================================
//
// Normal refresh every minute.
//
// This is NOT the midnight reset itself.
// The midnight scheduler below handles the
// calendar-day transition precisely.
// ==========================================

const DASHBOARD_REFRESH_INTERVAL =
    60 * 1000;


setInterval(
    () => {

        refreshDashboard();

    },
    DASHBOARD_REFRESH_INTERVAL
);


// ==========================================
// AUTOMATIC MIDNIGHT RESET
// ==========================================
//
// IMPORTANT
//
// The dashboard is NOT storing "today"
// collection values permanently.
//
// Instead, Today's Collection is rebuilt
// from today's actual calendar date.
//
// This scheduler makes sure that when the
// browser reaches midnight:
//
// Yesterday's collection:
//     disappears from Today's Collection
//
// Today's collection:
//     appears automatically
//
// Historical data:
//     remains untouched
//
// Portfolio:
//     remains untouched
//
// Income:
//     remains untouched
//
// Arrears:
//     remains calculated
//
// ==========================================

let dashboardDate =
    todayString();

let midnightTimer = null;


// ==========================================
// CHECK FOR DATE CHANGE
// ==========================================

function checkDashboardDate(){

    const currentDate =
        todayString();


    if(
        currentDate !==
        dashboardDate
    ){

        console.log(
            "GREYMUS Dashboard date changed:",
            dashboardDate,
            "→",
            currentDate
        );


        dashboardDate =
            currentDate;


        // Immediately rebuild dashboard
        // using the new calendar date.
        updateDashboard();

    }

}


// ==========================================
// SCHEDULE NEXT MIDNIGHT
// ==========================================

function scheduleMidnightRefresh(){

    if(midnightTimer){

        clearTimeout(
            midnightTimer
        );

    }


    const now =
        new Date();


    const nextMidnight =
        new Date(
            now
        );


    nextMidnight.setHours(
        24,
        0,
        0,
        50
    );


    const millisecondsUntilMidnight =
        Math.max(
            1000,
            nextMidnight.getTime() -
            now.getTime()
        );


    midnightTimer =
        setTimeout(
            () => {

                // Check the date first.
                checkDashboardDate();


                // Force another complete refresh.
                refreshDashboard();


                // Schedule the following midnight.
                scheduleMidnightRefresh();

            },
            millisecondsUntilMidnight
        );

}


// ==========================================
// BACKUP DATE CHECK
// ==========================================
//
// If the device/browser sleeps at midnight,
// the timeout above may execute late.
//
// This backup check guarantees that the
// dashboard catches the new date as soon as
// JavaScript becomes active again.
// ==========================================

setInterval(
    () => {

        checkDashboardDate();

    },
    30 * 1000
);


// ==========================================
// START MIDNIGHT SYSTEM
// ==========================================

scheduleMidnightRefresh();


// ==========================================
// INITIAL LOAD
// ==========================================

refreshDashboard();


// ==========================================
// DASHBOARD MESSAGE BUTTONS
// ==========================================
//
// Handles:
//
// ✔ Message button in Today's Due list
// ✔ Message button in Arrears list
// ✔ Finds selected loan
// ✔ Finds selected client
// ✔ Finds today's repayment
// ✔ Calculates arrears
// ✔ Opens messaging.js composer
//
// IMPORTANT:
//
// All repayment dates are normalized before
// comparison. This prevents a Timestamp,
// ISO date/time or YYYY-MM-DD value from
// causing today's message lookup to fail.
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".message-client-btn"
            );


        if(!button){

            return;

        }


        // ==========================================
        // GET BUTTON DATA
        // ==========================================

        const loanId =
            button.dataset.messageLoanId;

        const type =
            button.dataset.messageType;


        // ==========================================
        // FIND LOAN
        // ==========================================

        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if(!loan){

            alert(
                "The selected loan could not be found."
            );

            return;

        }


        // ==========================================
        // FIND CLIENT
        // ==========================================

        const client =
            clients.find(
                item =>
                    item.id ===
                    loan.clientId
            );


        if(!client){

            alert(
                "The client for this loan could not be found."
            );

            return;

        }


// ==========================================
// ARREARS MESSAGE
// ==========================================

        if(
            type === "arrears"
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
                            normalizeDateString(
                                item.dueDate
                            );


                        if(!dueDate){

                            return false;

                        }


                        const due =
                            Number(
                                item.amount || 0
                            );


                        const paid =
                            Number(
                                item.paidAmount || 0
                            );


                        return (

                            dueDate < today &&

                            paid < due

                        );

                    }
                );


// ==========================================
// TOTAL ARREARS
// ==========================================

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
                                due - paid,
                                0
                            )
                        );

                    },
                    0
                );


// ==========================================
// OPEN MESSAGE COMPOSER
// ==========================================

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


// ==========================================
// TODAY'S DUE MESSAGE
// ==========================================

        const today =
            todayString();


        const dueItem =
            (
                loan.repaymentSchedule ||
                []
            ).find(
                item => {

                    return (
                        normalizeDateString(
                            item.dueDate
                        ) === today
                    );

                }
            );


        if(!dueItem){

            alert(
                "Today's repayment could not be found for this loan."
            );

            return;

        }


// ==========================================
// OPEN MESSAGE COMPOSER
// ==========================================

        openMessageComposer({

            type:
                "due",

            loan,

            client,

            due:
                Number(
                    dueItem.amount || 0
                ),

            dueDate:
                dueItem.dueDate,

            outstanding:
                Number(
                    loan.balance || 0
                )

        });

    }
);


// ==========================================
// EXPORTS
// ==========================================

export {

    currency,

    refreshDashboard,

    dashboardSummary,

    getTotalOutstandingBalance,

    getCompletedLoans,

    getTotalCollected,

    getAverageLoanAmount

};


// ==========================================
// END OF FILE
// ==========================================