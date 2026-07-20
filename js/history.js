// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 2.0
// PART 1 OF 5
// ==========================================


import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const historyBtn =
    document.getElementById("transaction-history-btn");

const historyModal =
    document.getElementById("transaction-history-modal");

const closeHistoryBtn =
    document.getElementById("close-transaction-history");

const historyBody =
    document.getElementById("transaction-history-body");

const historySearch =
    document.getElementById("transaction-search");

const historyFilter =
    document.getElementById("transaction-filter");


// ==========================================
// DATA
// ==========================================

let loans = [];


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

        return date;

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
// OPEN HISTORY MODAL
// ==========================================

historyBtn?.addEventListener("click",()=>{

    historyModal?.classList.remove("hidden");

    renderHistory();

});


// ==========================================
// CLOSE HISTORY MODAL
// ==========================================

closeHistoryBtn?.addEventListener("click",()=>{

    historyModal?.classList.add("hidden");

});


window.addEventListener("click",(e)=>{

    if(e.target === historyModal){

        historyModal.classList.add("hidden");

    }

});


// ==========================================
// LOAD LOANS
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

        renderHistory();

    }

);// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 2.0
// PART 2 OF 5
// ==========================================


// ==========================================
// BUILD TRANSACTION LIST
// ==========================================

function getTransactions(){

    let transactions = [];


    loans.forEach(loan=>{


        // ==================================
        // LOAN DISBURSEMENT RECORD
        // ==================================

        transactions.push({

            id: loan.id,

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
                loan.status || "Pending",

            reference:
                loan.loanNumber || "-"

        });



        // ==================================
        // MANUAL REPAYMENTS RECORD
        // ==================================

        if(Array.isArray(loan.repayments)){


            loan.repayments.forEach(payment=>{


                transactions.push({

                    id:
                        payment.id ||
                        loan.id,


                    type:
                        "Loan Repayment",


                    clientName:
                        loan.clientName ||
                        "Unknown Client",


                    amount:
                        Number(payment.amount) || 0,


                    date:
                        payment.date ||
                        payment.createdAt ||
                        "",


                    status:
                        "Completed",


                    reference:
                        loan.loanNumber || "-"


                });


            });


        }



        // ==================================
        // HISTORICAL PAYMENTS SUPPORT
        // ==================================

        if(
            loan.amountPaid &&
            Number(loan.amountPaid) > 0
        ){

            transactions.push({

                id:
                    loan.id + "-historical",


                type:
                    "Historical Payment",


                clientName:
                    loan.clientName ||
                    "Unknown Client",


                amount:
                    Number(loan.amountPaid),


                date:
                    loan.approvalDate ||
                    loan.createdAt ||
                    "",


                status:
                    "Completed",


                reference:
                    loan.loanNumber || "-"


            });

        }


    });



    return transactions;

}// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 2.0
// PART 3 OF 5
// ==========================================


// ==========================================
// RENDER TRANSACTION HISTORY
// ==========================================

function renderHistory(){


    if(!historyBody) return;



    let transactions = getTransactions();



    // ==================================
    // SEARCH FILTER
    // ==================================

    const searchText =
        historySearch?.value
            ?.toLowerCase()
            .trim() || "";



    if(searchText){


        transactions =
            transactions.filter(transaction=>{


                return (

                    transaction.clientName
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    transaction.type
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    transaction.reference
                        .toLowerCase()
                        .includes(searchText)

                );


            });


    }



    // ==================================
    // STATUS FILTER
    // ==================================

    const selectedFilter =
        historyFilter?.value || "all";



    if(selectedFilter !== "all"){


        transactions =
            transactions.filter(transaction=>{


                return (

                    transaction.type
                        .toLowerCase()
                        .replace(" ","-")
                        === selectedFilter

                    ||

                    transaction.status
                        .toLowerCase()
                        === selectedFilter

                );


            });


    }




    // ==================================
    // SORT NEWEST FIRST
    // ==================================

    transactions.sort((a,b)=>{


        return new Date(b.date)
            -
            new Date(a.date);


    });





    // ==================================
    // EMPTY STATE
    // ==================================

    if(transactions.length === 0){


        historyBody.innerHTML = `

            <tr>

                <td colspan="7"
                    style="text-align:center">

                    No transactions found

                </td>

            </tr>

        `;


        return;


    }





    // ==================================
    // DISPLAY TABLE
    // ==================================

    historyBody.innerHTML = "";


    transactions.forEach(transaction=>{


        historyBody.innerHTML += `

            <tr>

                <td>
                    ${transaction.type}
                </td>


                <td>
                    ${transaction.clientName}
                </td>


                <td>
                    ${currency(transaction.amount)}
                </td>


                <td>
                    ${formatDate(transaction.date)}
                </td>


                <td>
                    ${transaction.status}
                </td>


                <td>
                    ${transaction.reference}
                </td>


            </tr>

        `;


    });


}// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 2.0
// PART 4 OF 5
// ==========================================


// ==========================================
// LIVE SEARCH LISTENER
// ==========================================

historySearch?.addEventListener(
    "input",
    ()=>{

        renderHistory();

    }
);



// ==========================================
// FILTER LISTENER
// ==========================================

historyFilter?.addEventListener(
    "change",
    ()=>{

        renderHistory();

    }
);



// ==========================================
// EXPORT TRANSACTIONS
// ==========================================

function exportHistory(){


    const transactions =
        getTransactions();



    if(transactions.length === 0){

        alert(
            "No transaction records available"
        );

        return;

    }



    let csv =

        "Type,Client,Amount,Date,Status,Reference\n";



    transactions.forEach(transaction=>{


        csv +=

        `"${transaction.type}",` +

        `"${transaction.clientName}",` +

        `"${transaction.amount}",` +

        `"${formatDate(transaction.date)}",` +

        `"${transaction.status}",` +

        `"${transaction.reference}"\n`;


    });




    const blob =
        new Blob(
            [csv],
            {
                type:
                "text/csv"
            }
        );



    const url =
        URL.createObjectURL(blob);



    const link =
        document.createElement("a");



    link.href = url;


    link.download =
        "greymus_transaction_history.csv";



    document.body.appendChild(link);



    link.click();



    document.body.removeChild(link);



    URL.revokeObjectURL(url);


}




// ==========================================
// EXPORT BUTTON
// ==========================================

const exportHistoryBtn =
    document.getElementById(
        "export-transaction-history"
    );



exportHistoryBtn?.addEventListener(
    "click",
    ()=>{

        exportHistory();

    }
);// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 2.0
// PART 5 OF 5
// ==========================================


// ==========================================
// AUTO REFRESH SUPPORT
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
// INITIAL LOAD CHECK
// ==========================================

if(historyBody){

    renderHistory();

}



// ==========================================
// END OF HISTORY MODULE
// ==========================================


// FEATURES INCLUDED:
//
// ✓ Real-time Firestore loan loading
// ✓ Loan disbursement history
// ✓ Manual repayment history
// ✓ Historical payment support
// ✓ Search transactions
// ✓ Filter transactions
// ✓ Sort newest first
// ✓ KES currency formatting
// ✓ Date formatting
// ✓ CSV export
// ✓ Modal open/close handling
//
// ==========================================