// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 1 OF 8
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

const portfolioStat =
    document.getElementById("stat-portfolio");

const totalPortfolioStat =
    document.getElementById("stat-total-portfolio");

const monthlyPortfolioStat =
    document.getElementById("stat-monthly-portfolio");

const previousPortfolioStat =
    document.getElementById("stat-previous-portfolio");

const clientsStat =
    document.getElementById("stat-clients");

const totalLoansIssuedStat =
    document.getElementById("stat-total-loans-issued");

const revenueStat =
    document.getElementById("stat-revenue");

const totalIncomeStat =
    document.getElementById("stat-total-income");

const previousIncomeStat =
    document.getElementById("stat-previous-income");

const pendingStat =
    document.getElementById("stat-pending");

const approvedStat =
    document.getElementById("stat-approved");

const rejectedStat =
    document.getElementById("stat-rejected");

const arrearsStat =
    document.getElementById("stat-arrears");

const activeLoansStat =
    document.getElementById("stat-active-loans");

const completedLoansStat =
    document.getElementById("stat-completed-loans");

const historicalLoansStat =
    document.getElementById("stat-historical-loans");

const repeatLoansStat =
    document.getElementById("stat-repeat-loans");

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

    return new Date()
        .toISOString()
        .split("T")[0];

}

function monthKey(date){

    const d = new Date(date);

    return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1)
            .padStart(2, "0")
    );

}// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 2 OF 8
// ==========================================


// ==========================================
// CLIENTS
// ==========================================

onSnapshot(

    collection(db,"clients"),

    snapshot=>{

        clients = [];

        snapshot.forEach(doc=>{

            clients.push({

                id: doc.id,

                ...doc.data()

            });

        });

        if(clientsStat){

            clientsStat.textContent =
                clients.length;

        }

        updateDashboard();

    }

);


// ==========================================
// LOANS
// ==========================================

onSnapshot(

    collection(db,"loans"),

    snapshot=>{

        loans = [];

        snapshot.forEach(doc=>{

            loans.push({

                id: doc.id,

                ...doc.data()

            });

        });

        updateDashboard();

    }

);


// ==========================================
// OPTIONAL REPAYMENTS COLLECTION
// (Backward Compatibility)
// ==========================================

onSnapshot(

    collection(db,"repayments"),

    snapshot=>{

        repayments = [];

        snapshot.forEach(doc=>{

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
// START
// ==========================================

function updateDashboard(){

    let currentPortfolio = 0;

    let totalPortfolio = 0;

    let monthlyPortfolio = 0;

    let previousPortfolio = 0;

    let monthlyIncome = 0;

    let totalIncome = 0;

    let previousIncome = 0;

    let pending = 0;

    let approved = 0;

    let rejected = 0;

    let arrears = 0;

    let completed = 0;

    let totalLoansIssued = 0;

    let activeLoans = 0;

    let historicalLoans = 0;

    let repeatLoans = 0;

    let expectedToday = 0;

    let collectedToday = 0;

    const clientsDueToday = [];

    const incomeHistory = {};

    const portfolioHistory = {};

    const today = todayString();

    const now = new Date();

    const currentMonth = now.getMonth();

    const currentYear = now.getFullYear();// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 3 OF 8
// ==========================================


// ==========================================
// LOOP THROUGH LOANS
// ==========================================

    loans.forEach(loan=>{

totalLoansIssued++;

        const status =
            loan.status || "Pending";

        const approvalDate =
            new Date(
                loan.approvalDate ||
                loan.createdAt ||
                Date.now()
            );

        const key =
            monthKey(approvalDate);

        const principal =
            Number(loan.amount || 0);

        const processingFee =
            Number(loan.processingFee || 0);

        const totalRepayment =
            Number(
                loan.totalRepayment ||
                principal
            );

        const interest =
            Math.max(
                0,
                totalRepayment - principal
            );

        const income =
            processingFee + interest;

        const outstanding =
            Number(
                loan.balance ??
                principal
            );


        // ==================================
        // PORTFOLIO HISTORY
        // ==================================

        portfolioHistory[key] =
            (portfolioHistory[key] || 0)
            + principal;

        totalPortfolio += principal;

        if(

            approvalDate.getMonth()
                === currentMonth &&

            approvalDate.getFullYear()
                === currentYear

        ){

            monthlyPortfolio += principal;

        }else{

            previousPortfolio += principal;

        }


        // ==================================
        // INCOME HISTORY
        // ==================================

        incomeHistory[key] =
            (incomeHistory[key] || 0)
            + income;

        totalIncome += income;

        if(

            approvalDate.getMonth()
                === currentMonth &&

            approvalDate.getFullYear()
                === currentYear

        ){

            monthlyIncome += income;

        }else{

            previousIncome += income;

        }


        // ==================================
        // LOAN STATUS COUNTS
        // ==================================

        switch(status){

            case "Pending":

                pending++;

                break;

            case "Approved":

    approved++;
    activeLoans++;
    currentPortfolio += outstanding;

    break;

case "Arrears":

    arrears++;
    activeLoans++;
    currentPortfolio += outstanding;

    break;

case "Completed":

    completed++;
    historicalLoans++;

    break;

        }

// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 4 OF 8
// ==========================================


// ==========================================
// TODAY'S COLLECTION
// ==========================================

        if(

            (status === "Approved" ||

             status === "Arrears") &&

            Array.isArray(
                loan.repaymentSchedule
            )

        ){

            loan.repaymentSchedule.forEach(item=>{

                if(item.dueDate !== today){

                    return;

                }

                const due =
                    Number(item.amount || 0);

                const paid =
                    Number(item.paidAmount || 0);

                const balance =
                    Math.max(
                        0,
                        due - paid
                    );

                expectedToday += due;

                collectedToday += paid;

                clientsDueToday.push({

                    client:
                        loan.clientName ||
                        "Unknown Client",

                    due,

                    paid,

                    balance,

                    status:

                        paid >= due

                        ? "Paid"

                        : paid > 0

                        ? "Partial"

                        : "Pending"

                });

            });

        }

    });


// ==========================================
// UPDATE DASHBOARD CARDS
// ==========================================

if(clientsStat){

    clientsStat.textContent =
        clients.length;

}

if(totalLoansIssuedStat){

    totalLoansIssuedStat.textContent =
        totalLoansIssued;

}

    if(portfolioStat){

        portfolioStat.textContent =
            currency(currentPortfolio);

    }

    if(monthlyPortfolioStat){

        monthlyPortfolioStat.textContent =
            currency(monthlyPortfolio);

    }

    if(totalPortfolioStat){

        totalPortfolioStat.textContent =
            currency(totalPortfolio);

    }

    if(previousPortfolioStat){

        previousPortfolioStat.textContent =
            currency(previousPortfolio);

    }

    if(revenueStat){

        revenueStat.textContent =
            currency(monthlyIncome);

    }

    if(totalIncomeStat){

        totalIncomeStat.textContent =
            currency(totalIncome);

    }

    if(previousIncomeStat){

        previousIncomeStat.textContent =
            currency(previousIncome);

    }

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

if(activeLoansStat){

    activeLoansStat.textContent =
        activeLoans;

}

if(completedLoansStat){

    completedLoansStat.textContent =
        completed;

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
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 5 OF 8
// ==========================================


// ==========================================
// TODAY'S COLLECTION SUMMARY
// ==========================================

    const remaining =

        Math.max(

            0,

            expectedToday - collectedToday

        );

    const collectionRate =

        expectedToday > 0

        ? Math.round(

            (collectedToday / expectedToday) * 100

        )

        : 0;


    if(clientsDueTodayElement){

        clientsDueTodayElement.textContent =

            clientsDueToday.length;

    }


    if(expectedCollectionElement){

        expectedCollectionElement.textContent =

            currency(expectedToday);

    }


    if(collectedTodayElement){

        collectedTodayElement.textContent =

            currency(collectedToday);

    }


    if(remainingCollectionElement){

        remainingCollectionElement.textContent =

            currency(remaining);

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

        if(clientsDueToday.length === 0){

            todayDueList.innerHTML = `

                <div class="empty-state">

                    No repayments are due today.

                </div>

            `;

        }else{

            clientsDueToday.forEach(client=>{

                todayDueList.innerHTML += `

                    <div class="today-card">

                        <h4>${client.client}</h4>

                        <p><strong>Due:</strong>
                            ${currency(client.due)}
                        </p>

                        <p><strong>Paid:</strong>
                            ${currency(client.paid)}
                        </p>

                        <p><strong>Balance:</strong>
                            ${currency(client.balance)}
                        </p>

                        <p><strong>Status:</strong>
                            ${client.status}
                        </p>

                    </div>

                `;

            });

        }

    }

}// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 6 OF 8
// ==========================================


// ==========================================
// TOTAL OUTSTANDING PORTFOLIO
// ==========================================

function getTotalOutstandingBalance(){

    return loans.reduce((total, loan)=>{

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

    }, 0);

}


// ==========================================
// COMPLETED LOANS
// ==========================================

function getCompletedLoans(){

    return loans.filter(

        loan => loan.status === "Completed"

    ).length;

}


// ==========================================
// TOTAL COLLECTED
// ==========================================

function getTotalCollected(){

    let total = 0;

    loans.forEach(loan=>{

        if(Array.isArray(loan.repaymentSchedule)){

            loan.repaymentSchedule.forEach(item=>{

                total += Number(

                    item.paidAmount || 0

                );

            });

        }

    });

    if(total === 0){

        repayments.forEach(payment=>{

            total += Number(

                payment.amount ||

                payment.amountPaid ||

                0

            );

        });

    }

    return total;

}


// ==========================================
// TOTAL EXPECTED REPAYMENT
// ==========================================

function getTotalExpectedRepayment(){

    return loans.reduce(

        (sum, loan)=>

            sum +

            Number(

                loan.totalRepayment ||

                loan.amount ||

                0

            ),

        0

    );

}


// ==========================================
// TOTAL PROCESSING FEES
// ==========================================

function getProcessingFees(){

    return loans.reduce(

        (sum, loan)=>

            sum +

            Number(

                loan.processingFee || 0

            ),

        0

    );

}


// ==========================================
// TOTAL INTEREST
// ==========================================

function getInterestEarned(){

    return loans.reduce((sum, loan)=>{

        const principal =

            Number(loan.amount || 0);

        const totalRepayment =

            Number(

                loan.totalRepayment ||

                principal

            );

        return sum +

            Math.max(

                0,

                totalRepayment - principal

            );

    }, 0);

}// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 7 OF 8
// ==========================================


// ==========================================
// AVERAGE LOAN AMOUNT
// ==========================================

function getAverageLoanAmount(){

    if(loans.length === 0){

        return 0;

    }

    const total = loans.reduce(

        (sum, loan)=>

            sum +

            Number(

                loan.amount || 0

            ),

        0

    );

    return total / loans.length;

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

    console.log("====================================");

    console.log("GREYMUS LOAN FINANCIAL HUB");

    console.log("====================================");

    console.log("Clients:", clients.length);

    console.log("Loans:", loans.length);

    console.log("Approved:",
        approvedStat?.textContent || 0);

    console.log("Pending:",
        pendingStat?.textContent || 0);

    console.log("Rejected:",
        rejectedStat?.textContent || 0);

    console.log("Arrears:",
        arrearsStat?.textContent || 0);

    console.log(
        "Current Portfolio:",
        portfolioStat?.textContent || currency(0)
    );

    console.log(
        "Monthly Portfolio:",
        monthlyPortfolioStat?.textContent || currency(0)
    );

    console.log(
        "Total Portfolio:",
        totalPortfolioStat?.textContent || currency(0)
    );

    console.log(
        "Previous Portfolio:",
        previousPortfolioStat?.textContent || currency(0)
    );

    console.log(
        "Monthly Income:",
        revenueStat?.textContent || currency(0)
    );

    console.log(
        "Total Income:",
        totalIncomeStat?.textContent || currency(0)
    );

    console.log(
        "Previous Income:",
        previousIncomeStat?.textContent || currency(0)
    );

    console.log(
        "Collected:",
        currency(getTotalCollected())
    );

    console.log(
        "Expected Repayment:",
        currency(getTotalExpectedRepayment())
    );

    console.log(
        "Interest:",
        currency(getInterestEarned())
    );

    console.log(
        "Processing Fees:",
        currency(getProcessingFees())
    );

    console.log(
        "Average Loan:",
        currency(getAverageLoanAmount())
    );

    console.log(
        "Completed:",
        getCompletedLoans()
    );

    console.log("====================================");

}// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
// PART 8 OF 8
// ==========================================


// ==========================================
// QUICK ACTION BUTTONS
// ==========================================

function openModal(id){

    const modal =
        document.getElementById(id);

    if(modal){

        modal.classList.remove("hidden");

    }

}


document
.getElementById("new-client-btn")
?.addEventListener("click",()=>{

    openModal("client-modal");

});


document
.getElementById("new-loan-btn")
?.addEventListener("click",()=>{

    openModal("loan-modal");

});


document
.getElementById("fab-new-loan")
?.addEventListener("click",()=>{

    openModal("loan-modal");

});


// ==========================================
// AUTO REFRESH
// ==========================================

setInterval(()=>{

    refreshDashboard();

},60000);


// ==========================================
// INITIAL LOAD
// ==========================================

refreshDashboard();


// ==========================================
// EXPORTS
// ==========================================

export{

    currency,

    refreshDashboard,

    dashboardSummary,

    getTotalOutstandingBalance,

    getCompletedLoans,

    getTotalCollected,

    getTotalExpectedRepayment,

    getProcessingFees,

    getInterestEarned,

    getAverageLoanAmount

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 3.0
//
// ✔ Current Portfolio
// ✔ Monthly Portfolio
// ✔ Previous Portfolio
// ✔ Total Portfolio
// ✔ Monthly Income
// ✔ Previous Income
// ✔ Total Income
// ✔ Income History (internal)
// ✔ Portfolio History (internal)
// ✔ Today's Collections
// ✔ Dashboard Summary
// ✔ Auto Refresh
// ✔ Firestore Realtime Sync
//
// STATUS: ✅ FINISHED
// ==========================================