// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// dashboard.js
// Version 1.1
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const portfolioStat = document.getElementById("stat-portfolio");
const clientsStat = document.getElementById("stat-clients");
const revenueStat = document.getElementById("stat-revenue");

const pendingStat = document.getElementById("stat-pending");
const approvedStat = document.getElementById("stat-approved");
const rejectedStat = document.getElementById("stat-rejected");
const arrearsStat = document.getElementById("stat-arrears");


// ==========================================
// FORMAT MONEY
// ==========================================

function currency(value){

    return new Intl.NumberFormat("en-KE",{

        style:"currency",
        currency:"KES",
        maximumFractionDigits:0

    }).format(value || 0);

}


// ==========================================
// CLIENTS
// ==========================================

onSnapshot(

    collection(db,"clients"),

    snapshot=>{

        if(clientsStat){

            clientsStat.textContent=snapshot.size;

        }

    }

);


// ==========================================
// LOANS
// ==========================================

let loans=[];

onSnapshot(

    collection(db,"loans"),

    snapshot=>{

        loans=[];

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
// REPAYMENTS
// ==========================================

let repayments=[];

onSnapshot(

    collection(db,"repayments"),

    snapshot=>{

        repayments=[];

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
// DASHBOARD
// ==========================================

function updateDashboard(){

    let portfolio=0;

    let pending=0;

    let approved=0;

    let rejected=0;

    let arrears=0;

    let monthlyIncome=0;


    const today=new Date();

    const month=today.getMonth();

    const year=today.getFullYear();


    loans.forEach(loan=>{

        const status=loan.status || "Pending";

        if(status==="Approved"){

            approved++;

            portfolio+=Number(loan.amount || 0);

        }

        if(status==="Pending"){

            pending++;

        }

        if(status==="Rejected"){

            rejected++;

        }

        if(status==="Arrears"){

            arrears++;

            portfolio+=Number(loan.amount || 0);

        }

    });


    repayments.forEach(payment=>{

        if(!payment.paymentDate) return;

        const date=new Date(payment.paymentDate);

        if(

            date.getMonth()===month &&

            date.getFullYear()===year

        ){

            const loan=loans.find(

                l=>l.id===payment.loanId

            );

            if(!loan) return;

            const interestRate=

                Number(loan.interest || 0);

            const total=

                Number(loan.totalRepayment || 0);

            const principal=

                Number(loan.amount || 0);

            const interest=

                total-principal;

            const ratio=

                Number(payment.amount)/total;

            monthlyIncome+=

                interest*ratio;

        }

    });


    loans.forEach(loan=>{

        if(

            loan.processingFeeAdded===true

        ){

            monthlyIncome+=

                Number(

                    loan.processingFee || 0

                );

        }

    });


    if(portfolioStat){

        portfolioStat.textContent=

            currency(portfolio);

    }

    if(revenueStat){

        revenueStat.textContent=

            currency(monthlyIncome);

    }

    if(pendingStat){

        pendingStat.textContent=pending;

    }

    if(approvedStat){

        approvedStat.textContent=approved;

    }

    if(rejectedStat){

        rejectedStat.textContent=rejected;

    }

    if(arrearsStat){

        arrearsStat.textContent=arrears;

    }

}


// ==========================================
// QUICK ACTION BUTTONS
// ==========================================

function openModal(id){

    const modal=document.getElementById(id);

    if(modal){

        modal.classList.remove("hidden");

    }

}


document.getElementById("new-client-btn")
?.addEventListener("click",()=>{

    openModal("client-modal");

});


document.getElementById("new-loan-btn")
?.addEventListener("click",()=>{

    openModal("loan-modal");

});


document.getElementById("fab-new-loan")
?.addEventListener("click",()=>{

    openModal("loan-modal");

});


// ==========================================
// EXPORT
// ==========================================

export{

    currency

};