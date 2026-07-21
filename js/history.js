// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 3.0
// PART 1 OF 4
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// DATA
// ==========================================

let loans = [];

let historyBtn;
let historyModal;
let closeHistoryBtn;
let historyBody;
let historySearch;
let historyFilter;
let exportHistoryBtn;


// ==========================================
// CURRENCY FORMAT
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
// DATE FORMAT
// ==========================================

function formatDate(date){

    if(!date) return "-";

    const d = new Date(date);

    if(isNaN(d.getTime())){

        return "-";

    }

    return d.toLocaleDateString(
        "en-KE",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


// ==========================================
// LOAD LOANS
// ==========================================

onSnapshot(

    collection(db, "loans"),

    (snapshot)=>{

        loans = [];

        snapshot.forEach((doc)=>{

            loans.push({

                id: doc.id,

                ...doc.data()

            });

        });

        renderHistory();

    }

);


// ==========================================
// BUILD TRANSACTIONS
// ==========================================

function getTransactions(){

    const transactions = [];

    loans.forEach((loan)=>{

        transactions.push({

            type: "Loan Disbursement",

            clientName:
                loan.clientName || "Unknown Client",

            amount:
                Number(loan.amount) || 0,

            date:
                loan.approvalDate ||
                loan.createdAt ||
                "",

            status:
                loan.status || "Approved",

            reference:
                loan.loanNumber || "-"

        });

        if(Array.isArray(loan.repayments)){

            loan.repayments.forEach((payment)=>{

                transactions.push({

                    type: "Loan Repayment",

                    clientName:
                        loan.clientName || "Unknown Client",

                    amount:
                        Number(payment.amount) || 0,

                    date:
                        payment.date ||
                        payment.createdAt ||
                        "",

                    status: "Completed",

                    reference:
                        loan.loanNumber || "-"

                });

            });

        }

    });

    return transactions;

}

// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 3.0
// PART 2 OF 4
// ==========================================


// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory(){

    if(!historyBody) return;

    let transactions = getTransactions();

    const search =
        historySearch?.value
        ?.toLowerCase()
        .trim() || "";

    const filter =
        historyFilter?.value || "all";


    // SEARCH

    if(search){

        transactions = transactions.filter((transaction)=>{

            return (

                transaction.clientName
                    .toLowerCase()
                    .includes(search)

                ||

                transaction.type
                    .toLowerCase()
                    .includes(search)

                ||

                transaction.reference
                    .toLowerCase()
                    .includes(search)

            );

        });

    }


    // FILTER

    if(filter !== "all"){

        transactions = transactions.filter((transaction)=>{

            return (

                transaction.type
                    .toLowerCase()
                    .replace(/\s+/g,"-")
                    === filter

            );

        });

    }


    // SORT

    transactions.sort((a,b)=>{

        return new Date(b.date) - new Date(a.date);

    });


    // EMPTY

    if(transactions.length === 0){

        historyBody.innerHTML = `

            <tr>

                <td colspan="7" style="text-align:center">

                    No transaction history found.

                </td>

            </tr>

        `;

        return;

    }


    // TABLE

    historyBody.innerHTML = "";

    transactions.forEach((transaction)=>{

        historyBody.innerHTML += `

            <tr>

                <td>${formatDate(transaction.date)}</td>

                <td>${transaction.type}</td>

                <td>${transaction.clientName}</td>

                <td>${transaction.reference}</td>

                <td>${currency(transaction.amount)}</td>

                <td>-</td>

                <td>-</td>

            </tr>

        `;

    });

}

// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 3.0
// PART 3 OF 4
// ==========================================


// ==========================================
// EXPORT CSV
// ==========================================

function exportHistory(){

    const transactions = getTransactions();

    if(transactions.length === 0){

        alert("No transaction history available.");

        return;

    }

    let csv =
        "Date,Transaction,Client,Loan Number,Amount,Status\n";

    transactions.forEach((transaction)=>{

        csv +=

            `"${formatDate(transaction.date)}",` +

            `"${transaction.type}",` +

            `"${transaction.clientName}",` +

            `"${transaction.reference}",` +

            `"${transaction.amount}",` +

            `"${transaction.status}"\n";

    });

    const blob = new Blob(
        [csv],
        {
            type: "text/csv"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "greymus_transaction_history.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}


// ==========================================
// INITIALIZE HISTORY MODULE
// ==========================================

function initializeHistory(){

    historyBtn =
        document.getElementById("transaction-history-btn");

    historyModal =
        document.getElementById("transaction-history-modal");

    closeHistoryBtn =
        document.getElementById("close-transaction-history");

    historyBody =
        document.getElementById("transaction-history-body");

    historySearch =
        document.getElementById("transaction-search");

    historyFilter =
        document.getElementById("transaction-filter");

    exportHistoryBtn =
        document.getElementById("export-transaction-history");


    historyBtn?.addEventListener("click", ()=>{

        historyModal?.classList.remove("hidden");

        renderHistory();

    });


    closeHistoryBtn?.addEventListener("click", ()=>{

        historyModal?.classList.add("hidden");

    });


    historySearch?.addEventListener("input", renderHistory);

    historyFilter?.addEventListener("change", renderHistory);

    exportHistoryBtn?.addEventListener("click", exportHistory);

}

// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 3.0
// PART 4 OF 4
// ==========================================


// ==========================================
// START MODULE
// ==========================================

window.addEventListener("DOMContentLoaded", ()=>{

    initializeHistory();

});


// ==========================================
// CLOSE WHEN CLICKING OUTSIDE
// ==========================================

window.addEventListener("click",(event)=>{

    if(
        historyModal &&
        event.target === historyModal
    ){

        historyModal.classList.add("hidden");

    }

});


// ==========================================
// REFRESH WHEN PAGE BECOMES ACTIVE
// ==========================================

document.addEventListener(
    "visibilitychange",
    ()=>{

        if(
            document.visibilityState === "visible"
        ){

            renderHistory();

        }

    }
);


// ==========================================
// END OF FILE
// ==========================================