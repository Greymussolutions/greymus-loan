// =====================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 2.0
// PART 1 OF 8
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

const newRepaymentBtn =
    document.getElementById("new-repayment-btn");


// =====================================
// DATA
// =====================================

let loans = [];

let repayments = [];


// =====================================
// FORMAT MONEY
// =====================================

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


// =====================================
// FORMAT DATE
// =====================================

function formatDate(date){

    return new Date(date)

        .toISOString()

        .split("T")[0];

}


// =====================================
// GET NEXT UNPAID INSTALLMENT
// =====================================

function getNextInstallment(schedule=[]){

    return schedule.find(

        item => !item.paid

    ) || null;

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

                loan.balance ??=
                    Number(
                        loan.totalRepayment || 0
                    );

                loan.amountPaid ??=0;

                loan.completed ??=false;

                loan.repaymentSchedule ??=[];

                loan.remainingInstallments ??=
                    loan.duration || 0;

                loans.push(loan);

            });

            populateLoanDropdown();

            renderRepayments();

        }

    );

}// =====================================
// PART 2 OF 8
// LOAN DROPDOWN & LOAN HELPERS
// =====================================


// =====================================
// POPULATE LOAN DROPDOWN
// =====================================

function populateLoanDropdown(){

    if(!repaymentLoan) return;

    repaymentLoan.innerHTML = `
        <option value="">
            Select Loan
        </option>
    `;

    loans

        .filter(loan=>{

            const status =
                String(loan.status || "")
                .toLowerCase();

            return (

                (status==="approved" ||
                 status==="arrears")

                &&

                !loan.completed

                &&

                Number(loan.balance || 0) > 0

            );

        })

        .sort((a,b)=>

            (a.clientName || "")
            .localeCompare(
                b.clientName || ""
            )

        )

        .forEach(loan=>{

            repaymentLoan.innerHTML += `

                <option value="${loan.id}">

                    ${loan.clientName}

                    •

                    Balance:
                    ${currency(loan.balance)}

                </option>

            `;

        });

}


// =====================================
// GET LOAN
// =====================================

function getLoan(id){

    return loans.find(

        loan=>loan.id===id

    );

}


// =====================================
// LOAN CHANGED
// =====================================

repaymentLoan?.addEventListener(

    "change",

    ()=>{

        const loan = getLoan(

            repaymentLoan.value

        );

        if(!loan) return;

        const next = getNextInstallment(

            loan.repaymentSchedule || []

        );

        alert(

`Client:
${loan.clientName}

Outstanding Balance:
${currency(loan.balance)}

Weekly Installment:
${currency(loan.weeklyPayment)}

Remaining Weeks:
${loan.remainingInstallments}

Next Repayment:
${next ? next.dueDate : "-"}`

        );

    }

);// =====================================
// PART 3 OF 8
// LOAD & DISPLAY REPAYMENTS
// =====================================


// =====================================
// LOAD REPAYMENTS
// =====================================

function loadRepayments(){

    const repaymentsRef = query(

        collection(db,"repayments"),

        orderBy("createdAt","desc")

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

                <td colspan="7"
                    style="text-align:center;padding:20px;">

                    No repayments recorded.

                </td>

            </tr>

        `;

        return;

    }

    repayments.forEach(payment=>{

        const row=document.createElement("tr");

        row.innerHTML=`

            <tr>

                <td>${payment.clientName || "-"}</td>

                <td>${payment.loanNumber || "-"}</td>

                <td>${currency(payment.amount)}</td>

                <td>${payment.paymentDate || "-"}</td>

                <td>${payment.receivedBy || "-"}</td>

                <td>${payment.notes || "-"}</td>

                <td>

                    <button
                        class="view-payment"
                        data-id="${payment.id}">

                        👁️

                    </button>

                </td>

            </tr>

        `;

        repaymentsTableBody.appendChild(row);

    });

    attachRepaymentActions();

}// =====================================
// PART 4 OF 8
// SAVE REPAYMENT
// =====================================

if(repaymentForm){

    repaymentForm.addEventListener(

        "submit",

        async(e)=>{

            e.preventDefault();

            const loan = getLoan(

                repaymentLoan.value

            );

            if(!loan){

                alert("Please select a loan.");

                return;

            }

            const amount = Number(

                repaymentAmount.value

            );

            if(amount <= 0){

                alert("Enter a valid amount.");

                return;

            }

            if(amount > Number(loan.balance)){

                alert("Repayment exceeds remaining balance.");

                return;

            }

            const schedule =

                [...(loan.repaymentSchedule || [])];

            const installment =

                getNextInstallment(schedule);

            if(installment){

                installment.paid = true;

                installment.paidDate =

                    repaymentDate.value;

            }

            const remainingInstallments =

                schedule.filter(

                    item=>!item.paid

                ).length;

            const nextInstallment =

                getNextInstallment(schedule);

            const newBalance =

                Number(loan.balance) - amount;

            const newAmountPaid =

                Number(loan.amountPaid || 0)

                + amount;

            let status = "Approved";

            let completed = false;

            if(newBalance <= 0){

                status = "Completed";

                completed = true;

            }

            try{

                await addDoc(

                    collection(db,"repayments"),

                    {

                        loanId:loan.id,

                        loanNumber:

                            loan.id.substring(0,8),

                        clientName:

                            loan.clientName,

                        amount:amount,

                        paymentDate:

                            repaymentDate.value,

                        notes:

                            repaymentNotes.value.trim(),

                        receivedBy:

                            localStorage.getItem("userName") || "",

                        createdAt:

                            serverTimestamp()

                    }

                );                await updateDoc(

                    doc(db,"loans",loan.id),

                    {

                        amountPaid:
                            newAmountPaid,

                        balance:
                            newBalance,

                        repaymentSchedule:
                            schedule,

                        nextRepaymentDate:

                            nextInstallment
                            ? nextInstallment.dueDate
                            : null,

                        remainingInstallments:

                            remainingInstallments,

                        completed:
                            completed,

                        status:
                            status,

                        updatedAt:
                            serverTimestamp()

                    }

                );

                repaymentForm.reset();

                repaymentDate.value =

                    new Date()
                    .toISOString()
                    .split("T")[0];

                repaymentModal
                    ?.classList
                    .add("hidden");

                alert(
                    "Repayment recorded successfully."
                );

            }

            catch(error){

                console.error(error);

                alert(
                    "Failed to record repayment."
                );

            }

        }

    );

}// =====================================
// PART 6 OF 8
// VIEW REPAYMENT
// =====================================

function attachRepaymentActions(){

    document

        .querySelectorAll(".view-payment")

        .forEach(button=>{

            button.onclick=()=>{

                const payment = repayments.find(

                    p=>p.id===button.dataset.id

                );

                if(!payment) return;

                alert(

`=============================
REPAYMENT DETAILS
=============================

Client:
${payment.clientName}

Loan No:
${payment.loanNumber || "-"}

Amount Paid:
${currency(payment.amount)}

Payment Date:
${payment.paymentDate}

Received By:
${payment.receivedBy || "-"}

Notes:
${payment.notes || "-"}

Recorded:
${payment.createdAt?.toDate
    ? payment.createdAt.toDate().toLocaleString()
    : "-"}

=============================`

                );

            };

        });

}// =====================================
// PART 7 OF 8
// MODAL CONTROLS
// =====================================

// Open repayment modal
document
.getElementById("new-repayment-btn")
?.addEventListener("click",()=>{

    repaymentForm?.reset();

    repaymentDate.value =
        new Date()
        .toISOString()
        .split("T")[0];

    repaymentModal
        ?.classList
        .remove("hidden");

});


// Close buttons
document
.querySelectorAll(".close-modal")
.forEach(button=>{

    button.addEventListener("click",()=>{

        repaymentModal
            ?.classList
            .add("hidden");

        repaymentForm?.reset();

    });

});


// Close when clicking outside
if(repaymentModal){

    repaymentModal.addEventListener(

        "click",

        e=>{

            if(e.target===repaymentModal){

                repaymentModal
                    .classList
                    .add("hidden");

                repaymentForm.reset();

            }

        }

    );

}


// Default payment date
if(repaymentDate){

    repaymentDate.value =

        new Date()

        .toISOString()

        .split("T")[0];

}// =====================================
// PART 8 OF 8
// INITIALIZE
// =====================================

loadLoans();

loadRepayments();


// =====================================
// REFRESH
// =====================================

function refreshRepayments(){

    renderRepayments();

}


// =====================================
// GET REPAYMENT
// =====================================

function getRepaymentById(id){

    return repayments.find(

        repayment=>repayment.id===id

    );

}


// =====================================
// AUTO REFRESH
// =====================================

setInterval(()=>{

    refreshRepayments();

},30000);


// =====================================
// STARTUP
// =====================================

window.addEventListener(

    "load",

    ()=>{

        loadLoans();

        loadRepayments();

    }

);


// =====================================
// EXPORTS
// =====================================

export{

    loadRepayments,

    refreshRepayments,

    getRepaymentById

};


// =====================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 2.0 COMPLETE
// =====================================