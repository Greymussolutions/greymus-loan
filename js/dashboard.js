// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 4.2
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
// ✔ Arrears Amount (Missed Installments Only)
// ✔ Clients in Arrears List
// ✔ Today's Collection
// ✔ Today's Due List
// ✔ Today's Due + Arrears Visible Together
// ✔ PARTIAL PAYMENT STAYS IN TODAY'S LIST
// ✔ FULL PAYMENT STAYS IN TODAY'S LIST UNTIL NEXT DAY
// ✔ Today's List Changes Only When Calendar Date Changes
// ✔ Auto Refresh
// ✔ Firestore Realtime Sync
//
// STATUS: ✅ FINISHED
// ==========================================


import { db } from "./firebase.js";

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


function monthKey(date){

    const d =
        new Date(date);

    return (
        d.getFullYear() +
        "-" +
        String(
            d.getMonth() + 1
        ).padStart(2, "0")
    );

}


// ==========================================
// FIRESTORE LISTENERS
// ==========================================


// CLIENTS
onSnapshot(

    collection(db, "clients"),

    snapshot => {

        clients = [];

        snapshot.forEach(doc => {

            clients.push({

                id: doc.id,

                ...doc.data()

            });

        });

        updateDashboard();

    }

);


// LOANS
onSnapshot(

    collection(db, "loans"),

    snapshot => {

        loans = [];

        snapshot.forEach(doc => {

            loans.push({

                id: doc.id,

                ...doc.data()

            });

        });

        updateDashboard();

    }

);


// REPAYMENTS
// Backward compatibility
onSnapshot(

    collection(db, "repayments"),

    snapshot => {

        repayments = [];

        snapshot.forEach(doc => {

            repayments.push({

                id: doc.id,

                ...doc.data()

            });

        });

        updateDashboard();

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

    loans.forEach(loan => {

        totalLoansIssued++;


        const status =
            loan.status || "Pending";


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


        const approvalDate =
            new Date(
                loan.approvalDate ||
                loan.createdAt ||
                Date.now()
            );


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
// PORTFOLIO
// ==========================================

        if(

            status === "Approved" ||

            status === "Arrears"

        ){

            outstandingPrincipal +=
                remainingPrincipal;

            outstandingInterest +=
                remainingInterest;

        }


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
            loan.clientName;


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

                    const dueDateObj =
                        new Date(
                            item.dueDate
                        );


                    const dueDate =
                        `${dueDateObj.getFullYear()}-${
                            String(
                                dueDateObj.getMonth() + 1
                            ).padStart(2, "0")
                        }-${
                            String(
                                dueDateObj.getDate()
                            ).padStart(2, "0")
                        }`;


                    const due =
                        Number(
                            item.amount || 0
                        );


                    const paid =
                        Number(
                            item.paidAmount || 0
                        );


                    if(

                        dueDate < today &&

                        paid < due

                    ){

                        missedWeeks++;

                        overdueAmount +=
                            due - paid;

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

                currentPortfolio +=
                    outstanding;

                break;


            case "Arrears":

                arrears++;

                activeLoans++;

                currentPortfolio +=
                    outstanding;


                if(
                    missedWeeks > 0
                ){

                    arrearsAmount +=
                        overdueAmount;


                    arrearsClients.push({

                        client:
                            loan.clientName ||
                            "Unknown Client",

                        weeks:
                            missedWeeks,

                        amount:
                            overdueAmount

                    });

                }

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
// IMPORTANT BEHAVIOR:
//
// Today's list is based on the INSTALLMENT
// DUE DATE, not the payment status.
//
// Therefore:
//
// Pending  -> stays today
// Partial  -> stays today
// Paid     -> stays today
//
// The client disappears automatically only
// when the calendar date becomes tomorrow.
//
// This prevents a payment from removing a
// client from today's collection list.
// ==========================================

        if(
            Array.isArray(
                loan.repaymentSchedule
            )
        ){

            loan.repaymentSchedule.forEach(
                item => {

                    const dueDateObj =
                        new Date(
                            item.dueDate
                        );


                    const dueDate =
                        `${dueDateObj.getFullYear()}-${
                            String(
                                dueDateObj.getMonth() + 1
                            ).padStart(2, "0")
                        }-${
                            String(
                                dueDateObj.getDate()
                            ).padStart(2, "0")
                        }`;


                    // --------------------------------------
                    // ONLY THE CALENDAR DATE DETERMINES
                    // WHETHER THIS INSTALLMENT BELONGS
                    // TO "TODAY'S" LIST.
                    // --------------------------------------

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
//
// The client remains in this list regardless
// of whether today's installment is:
//
// Pending
// Partial
// Paid
//
// The status shown on the card changes, but
// the card itself remains until tomorrow.
// ==========================================

                    clientsDueToday.push({

                        client:
                            loan.clientName ||
                            "Unknown Client",

                        due,

                        paid,

                        balance,

                        arrears:
                            status === "Arrears"
                                ? overdueAmount
                                : 0,

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

    });


// ==========================================
// COUNT REPEAT CLIENTS
// ==========================================

    Object.values(
        repeatTracker
    ).forEach(
        count => {

            if(count > 1){

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

                        <div class="today-card">

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

                        <div class="today-card">

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

                            <br><br>

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


// Total Outstanding Portfolio
function getTotalOutstandingBalance(){

    return loans.reduce(
        (total, loan) => {

            if(

                loan.status === "Approved" ||

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


// Completed Loans
function getCompletedLoans(){

    return loans.filter(
        loan =>
            loan.status === "Completed"
    ).length;

}


// Total Collected
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


// Average Loan Amount
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


// Refresh Dashboard
function refreshDashboard(){

    updateDashboard();

}


// Dashboard Summary
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
                .classList.toggle(
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

            todayDueContent.classList.toggle(
                "hidden"
            );


            const isHidden =
                todayDueContent.classList.contains(
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
            .remove("hidden");

    }
);


closePreviousPortfolio?.addEventListener(
    "click",
    () => {

        previousPortfolioModal
            ?.classList
            .add("hidden");

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
            .remove("hidden");

    }
);


closePreviousIncome?.addEventListener(
    "click",
    () => {

        previousIncomeModal
            ?.classList
            .add("hidden");

    }
);


// ==========================================
// AUTO REFRESH
// ==========================================

setInterval(
    () => {

        refreshDashboard();

    },
    60000
);


// ==========================================
// INITIAL LOAD
// ==========================================

refreshDashboard();


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