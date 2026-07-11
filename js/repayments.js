// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 2.0
// PART 1
// ==========================================

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


// ==========================================
// DOM ELEMENTS
// ==========================================

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


// ==========================================
// DATA
// ==========================================

let loans = [];

let repayments = [];


// ==========================================
// HELPERS
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

function today(){

    return new Date()

        .toISOString()

        .split("T")[0];

}// ==========================================
// PART 2
// LOAD LOANS
// ==========================================

function loadLoans(){

    onSnapshot(

        collection(db,"loans"),

        (snapshot)=>{

            loans=[];

            snapshot.forEach((docSnap)=>{

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


// ==========================================
// LOAN DROPDOWN
// ==========================================

function populateLoanDropdown(){

    if(!repaymentLoan) return;

    repaymentLoan.innerHTML=`

        <option value="">
            Select Loan
        </option>

    `;

    loans

        .filter(loan=>

            loan.status==="Approved" ||

            loan.status==="Arrears"

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


// ==========================================
// SHOW BALANCE
// ==========================================

repaymentLoan?.addEventListener(

    "change",

    ()=>{

        const loan=

            loans.find(

                l=>l.id===repaymentLoan.value

            );

        if(!loan) return;

        alert(

`Client:
${loan.clientName}

Outstanding Balance:
${currency(loan.balance)}

Weekly Repayment:
${currency(loan.weeklyPayment)}

Status:
${loan.status}`

        );

    }

);// ==========================================
// PART 3
// LOAD REPAYMENTS
// ==========================================

function loadRepayments(){

    const repaymentsQuery = query(

        collection(db,"repayments"),

        orderBy("createdAt","desc")

    );

    onSnapshot(

        repaymentsQuery,

        (snapshot)=>{

            repayments=[];

            snapshot.forEach((docSnap)=>{

                repayments.push({

                    id:docSnap.id,

                    ...docSnap.data()

                });

            });

            renderRepayments();

        }

    );

}


// ==========================================
// RENDER REPAYMENTS
// ==========================================

function renderRepayments(){

    if(!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML="";

    if(repayments.length===0){

        repaymentsTableBody.innerHTML=`

            <tr>

                <td colspan="7"
                    style="text-align:center;">

                    No repayments found.

                </td>

            </tr>

        `;

        return;

    }

    repayments.forEach(payment=>{

        const row=document.createElement("tr");

        row.innerHTML=`

            <tr>

                <td>${payment.clientName}</td>

                <td>${payment.loanNumber || payment.loanId.substring(0,8)}</td>

                <td>${currency(payment.amount)}</td>

                <td>${payment.paymentDate}</td>

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

}// ==========================================
// PART 4
// SAVE REPAYMENT
// ==========================================

if(repaymentForm){

repaymentForm.addEventListener(

"submit",

async(e)=>{

e.preventDefault();

const loan=loans.find(

l=>l.id===repaymentLoan.value

);

if(!loan){

alert("Please select a loan.");

return;

}

const amount=

Number(repaymentAmount.value);

if(amount<=0){

alert("Enter a valid repayment amount.");

return;

}

if(amount>Number(loan.balance)){

alert("Payment cannot exceed remaining balance.");

return;

}

// Update repayment schedule

const schedule=[

...(loan.repaymentSchedule||[])

];

let remainingPayment=amount;

for(const installment of schedule){

if(installment.paid) continue;

const installmentAmount=

Number(loan.weeklyPayment);

if(remainingPayment>=installmentAmount){

installment.paid=true;

installment.paidDate=

repaymentDate.value;

remainingPayment-=

installmentAmount;

}else{

break;

}

}

const nextInstallment=

schedule.find(

item=>!item.paid

);

const remainingInstallments=

schedule.filter(

item=>!item.paid

).length;

const newBalance=

Number(loan.balance)-amount;

let newStatus="Approved";

if(newBalance<=0){

newStatus="Completed";

}

else if(

nextInstallment &&

nextInstallment.dueDate<today()

){

newStatus="Arrears";

}

try{

// Save repayment

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

repaymentNotes.value,

receivedBy:

localStorage.getItem("userName")

||

localStorage.getItem("userEmail")

||

"Unknown Officer",

createdAt:

serverTimestamp()

}

);

// Update loan

await updateDoc(

doc(db,"loans",loan.id),

{

amountPaid:

Number(loan.amountPaid||0)

+

amount,

balance:newBalance,

status:newStatus,

completed:

newStatus==="Completed",

repaymentSchedule:schedule,

remainingInstallments,

nextRepaymentDate:

nextInstallment

?

nextInstallment.dueDate

:null,

updatedAt:

serverTimestamp()

}

);

alert(

"Repayment recorded successfully."

);

repaymentForm.reset();

repaymentDate.value=today();

repaymentModal.classList.add("hidden");

}catch(error){

console.error(error);

alert("Failed to save repayment.");

}

});

}// ==========================================
// PART 5
// VIEW REPAYMENT
// ==========================================

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

`REPAYMENT DETAILS

Client:
${payment.clientName}

Loan Number:
${payment.loanNumber}

Amount Paid:
${currency(payment.amount)}

Payment Date:
${payment.paymentDate}

Received By:
${payment.receivedBy || "-"}

Notes:
${payment.notes || "-"}`

            );

        };

    });

}


// ==========================================
// OPEN REPAYMENT MODAL
// ==========================================

document

.getElementById("new-repayment-btn")

?.addEventListener("click",()=>{

    repaymentForm.reset();

    repaymentDate.value=today();

    repaymentModal.classList.remove("hidden");

});


// ==========================================
// CLOSE MODAL
// ==========================================

document

.querySelectorAll(".close-modal")

.forEach(button=>{

    button.addEventListener("click",()=>{

        repaymentModal.classList.add("hidden");

        repaymentForm.reset();

    });

});


repaymentModal?.addEventListener("click",(e)=>{

    if(e.target===repaymentModal){

        repaymentModal.classList.add("hidden");

        repaymentForm.reset();

    }

});// ==========================================
// PART 6
// DEFAULT DATE
// ==========================================

if(repaymentDate){

    repaymentDate.value = today();

}


// ==========================================
// REFRESH LOANS AFTER PAYMENT
// ==========================================

function refreshLoanDropdown(){

    populateLoanDropdown();

}


// ==========================================
// SEARCH REPAYMENTS
// ==========================================

function searchRepayments(keyword){

    keyword = keyword.toLowerCase();

    const filtered = repayments.filter(payment=>{

        return (

            payment.clientName
            ?.toLowerCase()
            .includes(keyword)

            ||

            payment.loanNumber
            ?.toLowerCase()
            .includes(keyword)

            ||

            payment.receivedBy
            ?.toLowerCase()
            .includes(keyword)

        );

    });

    if(!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML="";

    filtered.forEach(payment=>{

        const row=document.createElement("tr");

        row.innerHTML=`

            <td>${payment.clientName}</td>

            <td>${payment.loanNumber}</td>

            <td>${currency(payment.amount)}</td>

            <td>${payment.paymentDate}</td>

            <td>${payment.receivedBy || "-"}</td>

            <td>${payment.notes || "-"}</td>

            <td>

                <button
                    class="view-payment"
                    data-id="${payment.id}">

                    👁️

                </button>

            </td>

        `;

        repaymentsTableBody.appendChild(row);

    });

    attachRepaymentActions();

}// ==========================================
// PART 7
// INITIALIZE
// ==========================================

function initializeRepayments(){

    loadLoans();

    loadRepayments();

    if(repaymentDate){

        repaymentDate.value = today();

    }

}


// ==========================================
// AUTO REFRESH
// ==========================================

setInterval(()=>{

    loadLoans();

},30000);


// ==========================================
// PAGE LOAD
// ==========================================

window.addEventListener(

    "load",

    ()=>{

        initializeRepayments();

    }

);


// ==========================================
// REFRESH TABLE
// ==========================================

function refreshRepaymentTable(){

    renderRepayments();

}


// ==========================================
// GET REPAYMENT
// ==========================================

function getRepaymentById(id){

    return repayments.find(

        payment=>payment.id===id

    );

}// ==========================================
// PART 8
// EXPORTS
// ==========================================

export {

    loadRepayments,

    refreshRepaymentTable,

    getRepaymentById,

    currency

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 2.0
// ==========================================