// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 2.0
// PART 1A
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

const clientsStat =
    document.getElementById("stat-clients");

const revenueStat =
    document.getElementById("stat-revenue");

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
// MONEY FORMAT
// ==========================================

function currency(value){

    return new Intl.NumberFormat(
        "en-KE",
        {
            style:"currency",
            currency:"KES",
            maximumFractionDigits:0
        }
    ).format(Number(value)||0);

}


// ==========================================
// DATE
// ==========================================

function todayString(){

    return new Date()
        .toISOString()
        .split("T")[0];

}


// ==========================================
// CLIENTS
// ==========================================

onSnapshot(

    collection(db,"clients"),

    snapshot=>{

        clients = [];

        snapshot.forEach(doc=>{

            clients.push({

                id:doc.id,

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

                id:doc.id,

                ...doc.data()

            });

        });

        updateDashboard();

    }

);


// ==========================================
// OPTIONAL REPAYMENTS COLLECTION
// (kept for compatibility)
// ==========================================

onSnapshot(

    collection(db,"repayments"),

    snapshot=>{

        repayments = [];

        snapshot.forEach(doc=>{

            repayments.push({

                id:doc.id,

                ...doc.data()

            });

        });

        updateDashboard();

    }

);


// ==========================================
// UPDATE DASHBOARD
// Continues in PART 1B
// ==========================================// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 2.0
// PART 1B
// Continues from Part 1A
// ==========================================

function updateDashboard(){

    let portfolio = 0;

    let pending = 0;

    let approved = 0;

    let rejected = 0;

    let arrears = 0;

    let completed = 0;

    let monthlyIncome = 0;

    let expectedToday = 0;

    let collectedToday = 0;

    const clientsDueToday = [];

    const today = todayString();

    const now = new Date();

    const month = now.getMonth();

    const year = now.getFullYear();


    // ======================================
    // LOAN STATISTICS
    // ======================================

    loans.forEach(loan=>{

        const status = loan.status || "Pending";

        const balance =
            Number(
                loan.balance ??
                loan.amount ??
                0
            );

        switch(status){

            case "Pending":
                pending++;
                break;

            case "Approved":
                approved++;
                portfolio += balance;
                break;

            case "Rejected":
                rejected++;
                break;

            case "Arrears":
                arrears++;
                portfolio += balance;
                break;

            case "Completed":
                completed++;
                break;

        }


        // ======================================
        // TODAY'S COLLECTION
        // ======================================

        if(
            status==="Approved" &&
            Array.isArray(loan.repaymentSchedule)
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
                    Math.max(0,due-paid);

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


        // ======================================
        // PROCESSING FEES
        // ======================================

        monthlyIncome += Number(
            loan.processingFee || 0
        );

    });


    // ======================================
    // INTEREST EARNED
    // ======================================

    repayments.forEach(payment=>{

        if(!payment.paymentDate) return;

        const paymentDate =
            new Date(payment.paymentDate);

        if(
            paymentDate.getMonth()!==month ||
            paymentDate.getFullYear()!==year
        ){

            return;

        }

        const loan =
            loans.find(
                l=>l.id===payment.loanId
            );

        if(!loan) return;

        const principal =
            Number(loan.amount||0);

        const total =
            Number(
                loan.totalRepayment ||
                principal
            );

        const interest =
            Math.max(
                0,
                total-principal
            );

        if(total>0){

            monthlyIncome +=

                interest *

                (
                    Number(payment.amount||0)
                    / total
                );

        }

    });


    // ======================================
    // UPDATE MAIN DASHBOARD
    // Continues in PART 1C
    // ======================================    // ======================================
    // UPDATE MAIN DASHBOARD
    // ======================================

    if(portfolioStat){

        portfolioStat.textContent =
            currency(portfolio);

    }

    if(revenueStat){

        revenueStat.textContent =
            currency(monthlyIncome);

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


    // ======================================
    // TODAY'S COLLECTION SUMMARY
    // ======================================

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


    // ======================================
    // CLIENTS DUE TODAY LIST
    // ======================================

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

                    <p><strong>Due:</strong> ${currency(client.due)}</p>

                    <p><strong>Paid:</strong> ${currency(client.paid)}</p>

                    <p><strong>Balance:</strong> ${currency(client.balance)}</p>

                    <p><strong>Status:</strong> ${client.status}</p>

                </div>

                `;

            });

        }

    }

}


// ==========================================
// CONTINUES IN PART 2A
// Helper functions, Quick Actions,
// Dashboard Summary, Auto Refresh,
// and Exports.
// ==========================================// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 2.0
// PART 2A
// Helper Functions
// ==========================================


// ==========================================
// TOTAL OUTSTANDING BALANCE
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

    },0);

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
// Reads repaymentSchedule first,
// falls back to repayments collection.
// ==========================================

function getTotalCollected(){

    let total = 0;

    loans.forEach(loan=>{

        if(

            Array.isArray(
                loan.repaymentSchedule
            )

        ){

            loan.repaymentSchedule.forEach(item=>{

                total += Number(
                    item.paidAmount || 0
                );

            });

        }

    });


    // Compatibility with old repayment collection

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

        (sum,loan)=>

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
// AVERAGE LOAN
// ==========================================

function getAverageLoanAmount(){

    if(loans.length===0){

        return 0;

    }

    const total = loans.reduce(

        (sum,loan)=>

            sum +

            Number(

                loan.amount || 0

            ),

        0

    );

    return total / loans.length;

}


// ==========================================
// TOTAL PROCESSING FEES
// ==========================================

function getProcessingFees(){

    return loans.reduce(

        (sum,loan)=>

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

    return loans.reduce((sum,loan)=>{

        const principal =
            Number(loan.amount || 0);

        const total =
            Number(

                loan.totalRepayment ||

                principal

            );

        return sum +

            Math.max(
                0,
                total - principal
            );

    },0);

}


// ==========================================
// CONTINUES IN PART 2B
// Dashboard Summary,
// Refresh,
// Quick Actions,
// Exports.
// ==========================================// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// VERSION 2.0
// PART 2B (FINAL)
// ==========================================


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
        "Pending:",
        pendingStat?.textContent || 0
    );

    console.log(
        "Rejected:",
        rejectedStat?.textContent || 0
    );

    console.log(
        "Arrears:",
        arrearsStat?.textContent || 0
    );

    console.log(
        "Outstanding:",
        currency(
            getTotalOutstandingBalance()
        )
    );

    console.log(
        "Collected:",
        currency(
            getTotalCollected()
        )
    );

    console.log(
        "Expected Repayment:",
        currency(
            getTotalExpectedRepayment()
        )
    );

    console.log(
        "Interest:",
        currency(
            getInterestEarned()
        )
    );

    console.log(
        "Processing Fees:",
        currency(
            getProcessingFees()
        )
    );

    console.log(
        "Average Loan:",
        currency(
            getAverageLoanAmount()
        )
    );

    console.log(
        "Completed:",
        getCompletedLoans()
    );

    console.log("====================================");

}


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
// dashboard.js
// VERSION 2.0
// STATUS: ✅ FINISHED
// ==========================================