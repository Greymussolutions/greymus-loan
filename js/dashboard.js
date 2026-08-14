// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 4.4
//
// ✔ Current Outstanding Portfolio
// ✔ Active Loans Included In Outstanding
// ✔ Outstanding Principal
// ✔ Outstanding Interest
// ✔ Total Portfolio Issued
// ✔ Monthly Portfolio
// ✔ Previous Portfolio
//
// ✔ MONTHLY INCOME FROM ACTUAL REPAYMENTS
// ✔ PREVIOUS MONTHS INCOME FROM ACTUAL REPAYMENTS
// ✔ TOTAL INCOME FROM ACTUAL REPAYMENTS
// ✔ Income Based On Repayment Date
// ✔ Principal Portion Of Repayment Excluded From Income
// ✔ Interest Portion Of Repayment Counted As Income
//
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
// ✔ Clients In Arrears List
// ✔ Today's Collection
// ✔ Today's Due List
// ✔ Today's Due + Arrears Visible Together
// ✔ PARTIAL PAYMENT STAYS IN TODAY'S LIST
// ✔ FULL PAYMENT STAYS IN TODAY'S LIST UNTIL NEXT DAY
// ✔ Today's List Changes Only When Calendar Date Changes
// ✔ Auto Refresh
// ✔ Firestore Realtime Sync
//
// STATUS: ✅ CORRECTED
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
// PAYMENT DATE HELPER
// ==========================================
//
// Supports:
// ✔ timestamp
// ✔ date + time
// ✔ date
//
// Date-only values are parsed locally to
// avoid UTC month/day shifting.
// ==========================================

function getPaymentDate(payment){

    if(!payment){

        return null;

    }


    // --------------------------------------
    // FIRESTORE / ISO TIMESTAMP
    // --------------------------------------

    if(
        payment.timestamp &&
        typeof payment.timestamp === "object" &&
        typeof payment.timestamp.toDate === "function"
    ){

        return payment.timestamp.toDate();

    }


    if(
        payment.timestamp &&
        typeof payment.timestamp === "string"
    ){

        const timestampDate =
            new Date(
                payment.timestamp
            );


        if(
            !Number.isNaN(
                timestampDate.getTime()
            )
        ){

            return timestampDate;

        }

    }


    // --------------------------------------
    // DATE + TIME
    // --------------------------------------

    if(
        payment.date &&
        payment.time
    ){

        const combined =
            new Date(
                `${payment.date} ${payment.time}`
            );


        if(
            !Number.isNaN(
                combined.getTime()
            )
        ){

            return combined;

        }

    }


    // --------------------------------------
    // DATE ONLY
    // --------------------------------------

    if(payment.date){

        const dateString =
            String(
                payment.date
            );


        const match =
            dateString.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if(match){

            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );

        }


        const parsed =
            new Date(
                dateString
            );


        if(
            !Number.isNaN(
                parsed.getTime()
            )
        ){

            return parsed;

        }

    }


    return null;

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


// ==========================================
// INCOME
// ==========================================
//
// IMPORTANT:
//
// Income is NO LONGER calculated from the
// loan approval/disbursement date.
//
// Income is calculated from actual repayment
// records inside each loan's repaymentSchedule.
//
// Example:
//
// Loan issued in January
// Repayment received in August
//
// The interest income goes into AUGUST,
// not January.
// ==========================================

    let monthlyIncome = 0;

    let totalIncome = 0;

    let previousIncome = 0;

    let previousMonthsIncome = {};


// ==========================================
// OTHER COUNTERS
// ==========================================

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
// LOAN INTEREST
// ==========================================

        const totalLoanInterest =
            Math.max(
                0,
                totalRepayment -
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
// OUTSTANDING PORTFOLIO
// ==========================================
//
// Approved + Active + Arrears
//
// All three are treated consistently.
// Therefore:
//
// Outstanding Portfolio
// = Outstanding Principal
// + Outstanding Interest
// ==========================================

        const isOutstandingLoan =
            status === "Approved" ||
            status === "Active" ||
            status === "Arrears";


        if(isOutstandingLoan){

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
// REPAYMENT-BASED INCOME
// ==========================================
//
// Income is calculated from actual payment
// history.
//
// Each repayment is divided proportionally:
//
// Principal portion = repayment ×
/* principal / totalRepayment */

// Interest portion = repayment ×
/* interest / totalRepayment */

// ONLY the interest portion is income.
//
// The payment's actual date determines the
// month in which the income is recorded.
// ==========================================

        let interestCollectedForLoan = 0;


        if(
            Array.isArray(
                loan.repaymentSchedule
            )
        ){

            // --------------------------------------
            // Process installments in their existing
            // schedule order.
            // --------------------------------------

            loan.repaymentSchedule.forEach(
                item => {

                    if(
                        !Array.isArray(
                            item.paymentHistory
                        )
                    ){

                        return;

                    }


                    item.paymentHistory.forEach(
                        payment => {

                            const paymentAmount =
                                Number(
                                    payment.amount || 0
                                );


                            if(
                                paymentAmount <= 0
                            ){

                                return;

                            }


                            const paymentDate =
                                getPaymentDate(
                                    payment
                                );


                            if(!paymentDate){

                                return;

                            }


                            // ----------------------------------
                            // Calculate interest portion
                            // ----------------------------------

                            let paymentInterest =
                                0;


                            if(
                                totalRepayment > 0 &&
                                totalLoanInterest > 0
                            ){

                                paymentInterest =
                                    (
                                        paymentAmount /
                                        totalRepayment
                                    ) *
                                    totalLoanInterest;

                            }


                            // ----------------------------------
                            // Do not count more interest than
                            // the loan actually contains.
                            // ----------------------------------

                            const remainingLoanInterest =
                                Math.max(
                                    0,
                                    totalLoanInterest -
                                    interestCollectedForLoan
                                );


                            paymentInterest =
                                Math.min(
                                    paymentInterest,
                                    remainingLoanInterest
                                );


                            interestCollectedForLoan +=
                                paymentInterest;


                            totalIncome +=
                                paymentInterest;


                            // ----------------------------------
                            // Current month income
                            // ----------------------------------

                            if(

                                paymentDate.getMonth() ===
                                    currentMonth &&

                                paymentDate.getFullYear() ===
                                    currentYear

                            ){

                                monthlyIncome +=
                                    paymentInterest;

                            }else{

                                // ----------------------------------
                                // Previous month income
                                // ----------------------------------

                                previousIncome +=
                                    paymentInterest;


                                const monthName =
                                    paymentDate.toLocaleString(
                                        "en-US",
                                        {
                                            month: "long"
                                        }
                                    );


                                const year =
                                    paymentDate.getFullYear();


                                const key =
                                    `${monthName} ${year}`;


                                previousMonthsIncome[key] =
                                    (
                                        previousMonthsIncome[key]
                                        || 0
                                    ) +
                                    paymentInterest;

                            }

                        }
                    );

                }
            );

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
// Today's list is based ONLY on the
// installment due date.
//
// Payment status does not remove the
// installment from today's list.
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
        )
        .sort(
            (a, b) => {

                return (
                    new Date(
                        `1 ${b[0]}`
                    ) -
                    new Date(
                        `1 ${a[0]}`
                    )
                );

            }
        )
        .forEach(
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


// ==========================================
// CLIENTS / LOANS
// ==========================================

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


// ==========================================
// INCOME CARDS
// ==========================================
//
// revenueStat = CURRENT MONTH'S ACTUAL
// REPAYMENT INCOME.
//
// totalIncomeStat = ALL INTEREST ACTUALLY
// COLLECTED THROUGH REPAYMENTS.
//
// previousIncomeStat = INTEREST ACTUALLY
// COLLECTED IN PREVIOUS MONTHS.
//
// Processing fees are intentionally NOT
// included here.
// ==========================================

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
                    new Date(
                        `1 ${b[0]}`
                    ) -
                    new Date(
                        `1 ${a[0]}`
                    )
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


// ==========================================
// TOTAL OUTSTANDING BALANCE
// ==========================================
//
// Approved + Active + Arrears
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
//
// This is the total money received from
// repayment installments.
//
// It includes principal + interest.
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
// TOTAL REPAYMENT INTEREST COLLECTED
// ==========================================
//
// This helper calculates the actual interest
// collected through repayment history.
// ==========================================

function getTotalIncome(){

    let totalIncome = 0;


    loans.forEach(
        loan => {

            const principal =
                Number(
                    loan.amount || 0
                );


            const totalRepayment =
                Number(
                    loan.totalRepayment ||
                    principal
                );


            const totalInterest =
                Math.max(
                    0,
                    totalRepayment -
                    principal
                );


            let interestCollected =
                0;


            if(
                !Array.isArray(
                    loan.repaymentSchedule
                )
            ){

                return;

            }


            loan.repaymentSchedule.forEach(
                item => {

                    if(
                        !Array.isArray(
                            item.paymentHistory
                        )
                    ){

                        return;

                    }


                    item.paymentHistory.forEach(
                        payment => {

                            const paymentAmount =
                                Number(
                                    payment.amount || 0
                                );


                            if(
                                paymentAmount <= 0
                            ){

                                return;

                            }


                            if(
                                totalRepayment <= 0 ||
                                totalInterest <= 0
                            ){

                                return;

                            }


                            const paymentInterest =
                                (
                                    paymentAmount /
                                    totalRepayment
                                ) *
                                totalInterest;


                            const remainingInterest =
                                Math.max(
                                    0,
                                    totalInterest -
                                    interestCollected
                                );


                            const actualInterest =
                                Math.min(
                                    paymentInterest,
                                    remainingInterest
                                );


                            interestCollected +=
                                actualInterest;


                            totalIncome +=
                                actualInterest;

                        }
                    );

                }
            );

        }
    );


    return totalIncome;

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
        "Previous Income:",
        previousIncomeStat?.textContent
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

    getTotalIncome,

    getAverageLoanAmount

};


// ==========================================
// END OF FILE
// ==========================================