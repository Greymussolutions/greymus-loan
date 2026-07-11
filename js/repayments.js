// =====================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// Version 1.0
// Part 1
// =====================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================
// ELEMENTS
// =====================================

const repaymentsTableBody =
    document.querySelector("#repayments-table tbody");

const repaymentForm =
    document.getElementById("repayment-form");

const repaymentModal =
    document.getElementById("repayment-modal");

const repaymentLoan =
    document.getElementById("repayment-loan");

const repaymentAmount =
    document.getElementById("repayment-amount");

const repaymentDate =
    document.getElementById("repayment-date");

const repaymentNotes =
    document.getElementById("repayment-notes");


// =====================================
// DATA
// =====================================

let repayments = [];

let loans = [];


// =====================================
// FORMAT MONEY
// =====================================

function currency(value){

    return new Intl.NumberFormat("en-KE",{

        style:"currency",

        currency:"KES",

        maximumFractionDigits:0

    }).format(Number(value)||0);

}


// =====================================
// LOAD LOANS
// =====================================

function loadLoans(){

    onSnapshot(

        collection(db,"loans"),

        snapshot=>{

            loans=[];

            snapshot.forEach(docSnap=>{

                const loan={

                    id:docSnap.id,

                    ...docSnap.data()

                };

                loans.push(loan);

            });

            populateLoanDropdown();

        }

    );

}


// =====================================
// LOAN DROPDOWN
// =====================================

function populateLoanDropdown(){

    if(!repaymentLoan) return;

    repaymentLoan.innerHTML=`
        <option value="">
            Select Loan
        </option>
    `;

    loans

    .filter(

        loan=>loan.status==="Approved"

    )

    .forEach(loan=>{

        repaymentLoan.innerHTML+=`

            <option value="${loan.id}">

                ${loan.clientName}
                -
                ${currency(loan.balance)}

            </option>

        `;

    });

}// =====================================
// LOAD REPAYMENTS
// =====================================

function loadRepayments(){

    const repaymentsRef = query(

        collection(db,"repayments"),

        orderBy("paymentDate","desc")

    );

    onSnapshot(

        repaymentsRef,

        snapshot=>{

            repayments=[];

            snapshot.forEach(docSnap=>{

                repayments.push({

                    id:docSnap.id,

                    ...docSnap.data()

                });

            });

            renderRepayments();

        }

    );

}


// =====================================
// RENDER REPAYMENTS
// =====================================

function renderRepayments(){

    if(!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML="";

    if(repayments.length===0){

        repaymentsTableBody.innerHTML=`

            <tr>

                <td colspan="6">

                    No repayments found.

                </td>

            </tr>

        `;

        return;

    }

    repayments.forEach(payment=>{

        const loan=

            loans.find(

                l=>l.id===payment.loanId

            );

        const row=document.createElement("tr");

        row.innerHTML=`

            <td>

                ${loan?.clientName || "-"}

            </td>

            <td>

                ${loan?.id?.substring(0,8) || "-"}

            </td>

            <td>

                ${currency(payment.amount)}

            </td>

            <td>

                ${payment.paymentDate || "-"}

            </td>

            <td>

                ${payment.notes || "-"}

            </td>

            <td>

                <button

                    class="view-payment"

                    data-id="${payment.id}">

                    View

                </button>

            </td>

        `;

        repaymentsTableBody.appendChild(row);

    });

    attachRepaymentActions();

}// =====================================
// SAVE REPAYMENT
// =====================================

if (repaymentForm) {

    repaymentForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const loan = loans.find(
            l => l.id === repaymentLoan.value
        );

        if (!loan) {

            alert("Please select a loan.");

            return;

        }

        const amount =
            Number(repaymentAmount.value);

        if (amount <= 0) {

            alert("Enter a valid repayment amount.");

            return;

        }

        const currentBalance =
            Number(loan.balance || 0);

        const newBalance =
            Math.max(0, currentBalance - amount);

        let newStatus =
            loan.status;

        if (newBalance === 0) {

            newStatus = "Completed";

        }

        try {

            await addDoc(

                collection(db, "repayments"),

                {

                    loanId: loan.id,

                    clientName: loan.clientName,

                    amount: amount,

                    paymentDate: repaymentDate.value,

                    notes: repaymentNotes.value.trim(),

                    receivedBy:
                        localStorage.getItem("userName") || "",

                    createdAt:
                        serverTimestamp()

                }

            );

            await updateDoc(

                doc(db, "loans", loan.id),

                {

                    balance: newBalance,

                    status: newStatus,

                    updatedAt:
                        serverTimestamp()

                }

            );

            repaymentForm.reset();

            repaymentModal.classList.add("hidden");

            alert("Repayment recorded successfully.");

        }

        catch (error) {

            console.error(error);

            alert("Failed to save repayment.");

        }

    });

}// =====================================
// VIEW REPAYMENT
// =====================================

function attachRepaymentActions(){

    document
    .querySelectorAll(".view-payment")
    .forEach(button=>{

        button.onclick=()=>{

            const payment=

                repayments.find(

                    p=>p.id===button.dataset.id

                );

            if(!payment) return;

            alert(

`Client: ${payment.clientName}

Amount: ${currency(payment.amount)}

Date: ${payment.paymentDate}

Notes: ${payment.notes || "-"}

Received By: ${payment.receivedBy || "-"}`

            );

        };

    });

}


// =====================================
// OPEN REPAYMENT MODAL
// =====================================

document
.getElementById("new-repayment-btn")
?.addEventListener("click",()=>{

    repaymentForm?.reset();

    repaymentModal?.classList.remove("hidden");

});


// =====================================
// CLOSE MODAL
// =====================================

document
.querySelectorAll(".close-modal")
.forEach(button=>{

    button.addEventListener("click",()=>{

        repaymentModal?.classList.add("hidden");

        repaymentForm?.reset();

    });

});


if(repaymentModal){

    repaymentModal.addEventListener("click",e=>{

        if(e.target===repaymentModal){

            repaymentModal.classList.add("hidden");

            repaymentForm.reset();

        }

    });

}


// =====================================
// DEFAULT PAYMENT DATE
// =====================================

if(repaymentDate){

    repaymentDate.value=

        new Date()

        .toISOString()

        .split("T")[0];

}


// =====================================
// START MODULE
// =====================================

loadLoans();

loadRepayments();


// =====================================
// EXPORTS
// =====================================

export{

    loadRepayments

};

// =====================================
// END OF FILE
// =====================================