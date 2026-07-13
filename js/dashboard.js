// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// Version 1.2
// Part 1
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// DASHBOARD COLLECTION TRACKING
// ==========================================

let dashboardLoans = [];
let dashboardRepayments = [];


// LOAD LOANS

onSnapshot(
    collection(db, "loans"),
    (snapshot)=>{

        dashboardLoans = [];

        snapshot.forEach((doc)=>{

            dashboardLoans.push({
                id: doc.id,
                ...doc.data()
            });

        });


        calculateDashboard();

    }
);


// LOAD REPAYMENTS

onSnapshot(
    collection(db, "repayments"),
    (snapshot)=>{

        dashboardRepayments = [];

        snapshot.forEach((doc)=>{

            dashboardRepayments.push({
                id: doc.id,
                ...doc.data()
            });

        });


        calculateDashboard();

    }
);


// ==========================================
// DASHBOARD CALCULATIONS
// ==========================================

function calculateDashboard(){

    const today = new Date()
        .toISOString()
        .split("T")[0];


    let clientsDueToday = [];
    let expectedToday = 0;
    let collectedToday = 0;


    dashboardLoans.forEach((loan)=>{


        if(
            loan.status === "Approved" &&
            loan.repaymentSchedule
        ){


            loan.repaymentSchedule.forEach((payment)=>{


                if(
                    payment.dueDate === today &&
                    payment.status !== "Paid"
                ){


                    let paid = 0;


                    dashboardRepayments.forEach((rep)=>{


                        if(
                            rep.loanId === loan.id &&
                            rep.scheduleId === payment.id
                        ){

                            paid += Number(rep.amount || 0);

                        }

                    });



                    let balance =
                        Number(payment.amount) - paid;



                    if(balance > 0){


                        expectedToday += balance;


                        clientsDueToday.push({

                            client:
                            loan.clientName || "Unknown",

                            amount:
                            balance

                        });


                    }


                }


            });


        }


    });



    console.log(
        "Clients due today:",
        clientsDueToday
    );


    console.log(
        "Expected today:",
        expectedToday
    );


    console.log(
        "Collected today:",
        collectedToday
    );

}

// ==========================================
// ELEMENTS
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
// DATA
// ==========================================

let loans = [];
let repayments = [];
let clientCount = 0;


// ==========================================
// FORMAT MONEY
// ==========================================

function currency(value){

    return new Intl.NumberFormat("en-KE",{

        style:"currency",
        currency:"KES",
        maximumFractionDigits:0

    }).format(Number(value) || 0);

}


// ==========================================
// CLIENTS
// ==========================================

onSnapshot(

    collection(db,"clients"),

    snapshot=>{

        clientCount = snapshot.size;

        if(clientsStat){

            clientsStat.textContent = clientCount;

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

        snapshot.forEach(docSnap=>{

            loans.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });

        updateDashboard();

    }

);


// ==========================================
// REPAYMENTS
// ==========================================

onSnapshot(

    collection(db,"repayments"),

    snapshot=>{

        repayments = [];

        snapshot.forEach(docSnap=>{

            repayments.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });

        updateDashboard();

    }

);// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard(){

    let portfolio = 0;

    let pending = 0;

    let approved = 0;

    let rejected = 0;

    let arrears = 0;

    let completed = 0;

    let monthlyIncome = 0;

    const today = new Date();

    const month = today.getMonth();

    const year = today.getFullYear();


    // ==========================
    // LOAN STATISTICS
    // ==========================

    loans.forEach(loan=>{

        const status = loan.status || "Pending";

        const balance =
            Number(loan.balance ?? loan.amount ?? 0);

        if(status==="Pending"){

            pending++;

        }

        else if(status==="Approved"){

            approved++;

            portfolio += balance;

        }

        else if(status==="Arrears"){

            arrears++;

            portfolio += balance;

        }

        else if(status==="Rejected"){

            rejected++;

        }

        else if(status==="Completed"){

            completed++;

        }

    });


    // ==========================
    // MONTHLY INCOME
    // ==========================

    repayments.forEach(payment=>{

        if(!payment.paymentDate) return;

        const paymentDate =
            new Date(payment.paymentDate);

        if(

            paymentDate.getMonth() !== month ||

            paymentDate.getFullYear() !== year

        ){

            return;

        }

        const loan = loans.find(

            l => l.id === payment.loanId

        );

        if(!loan) return;

        const principal =
            Number(loan.amount || 0);

        const total =
            Number(loan.totalRepayment || principal);

        const interest =
            Math.max(0, total - principal);

        if(total > 0){

            monthlyIncome +=

                interest *

                (Number(payment.amount) / total);

        }

    });


    // ==========================
    // PROCESSING FEES
    // ==========================

    loans.forEach(loan=>{

        if(loan.processingFee){

            monthlyIncome +=

                Number(loan.processingFee);

        }

    });


    // ==========================
    // UPDATE DASHBOARD
    // ==========================

    portfolioStat.textContent =
        currency(portfolio);

    revenueStat.textContent =
        currency(monthlyIncome);

    pendingStat.textContent =
        pending;

    approvedStat.textContent =
        approved;

    rejectedStat.textContent =
        rejected;

    arrearsStat.textContent =
        arrears;

}// ==========================================
// QUICK ACTION BUTTONS
// ==========================================

function openModal(id){

    const modal = document.getElementById(id);

    if(modal){

        modal.classList.remove("hidden");

    }

}


// ==========================================
// NEW CLIENT
// ==========================================

document
.getElementById("new-client-btn")
?.addEventListener("click",()=>{

    openModal("client-modal");

});


// ==========================================
// NEW LOAN
// ==========================================

document
.getElementById("new-loan-btn")
?.addEventListener("click",()=>{

    openModal("loan-modal");

});


// ==========================================
// FLOATING ACTION BUTTON
// ==========================================

document
.getElementById("fab-new-loan")
?.addEventListener("click",()=>{

    openModal("loan-modal");

});


// ==========================================
// DASHBOARD HELPERS
// ==========================================

function getTotalOutstandingBalance(){

    return loans.reduce((total, loan)=>{

        if(

            loan.status==="Approved" ||

            loan.status==="Arrears"

        ){

            return total +

                Number(

                    loan.balance ||

                    loan.amount ||

                    0

                );

        }

        return total;

    },0);

}


function getCompletedLoans(){

    return loans.filter(

        loan=>loan.status==="Completed"

    ).length;

}


function getTotalCollected(){

    return repayments.reduce(

        (sum,payment)=>

            sum +

            Number(payment.amount || 0),

        0

    );

}


function getAverageLoanAmount(){

    if(loans.length===0){

        return 0;

    }

    const total = loans.reduce(

        (sum,loan)=>

            sum +

            Number(loan.amount || 0),

        0

    );

    return total / loans.length;

}// ==========================================
// REFRESH DASHBOARD
// ==========================================

function refreshDashboard(){

    updateDashboard();

}


// ==========================================
// OPTIONAL SUMMARY
// ==========================================

function dashboardSummary(){

    console.log("================================");

    console.log("GREYMUS DASHBOARD");

    console.log("================================");

    console.log("Clients:", clientCount);

    console.log("Loans:", loans.length);

    console.log("Approved:", approvedStat?.textContent);

    console.log("Pending:", pendingStat?.textContent);

    console.log("Arrears:", arrearsStat?.textContent);

    console.log("Rejected:", rejectedStat?.textContent);

    console.log(
        "Outstanding:",
        currency(getTotalOutstandingBalance())
    );

    console.log(
        "Collected:",
        currency(getTotalCollected())
    );

    console.log(
        "Average Loan:",
        currency(getAverageLoanAmount())
    );

    console.log(
        "Completed:",
        getCompletedLoans()
    );

    console.log("================================");

}


// ==========================================
// AUTO REFRESH
// ==========================================

setInterval(()=>{

    refreshDashboard();

},60000);


// ==========================================
// EXPORTS
// ==========================================

export{

    currency,

    refreshDashboard,

    getTotalOutstandingBalance,

    getCompletedLoans,

    getTotalCollected,

    getAverageLoanAmount

};


// ==========================================
// END OF FILE
// ==========================================