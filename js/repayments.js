// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 3.0
// PART 1 OF 8
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

    return new Intl.NumberFormat("en-KE",{

        style:"currency",
        currency:"KES",
        maximumFractionDigits:0

    }).format(Number(value)||0);

}

function today(){

    return new Date().toISOString().split("T")[0];

}// ==========================================
// PART 2 OF 8
// LOAD LOANS
// ==========================================

function loadLoans(){

    const loansQuery = query(
        collection(db,"loans"),
        orderBy("createdAt","desc")
    );

    onSnapshot(loansQuery,(snapshot)=>{

        loans = [];

        snapshot.forEach((docSnap)=>{

            loans.push({

                id:docSnap.id,
                ...docSnap.data()

            });

        });

        populateLoanDropdown();

    });

}


// ==========================================
// POPULATE LOAN DROPDOWN
// ==========================================

function populateLoanDropdown(){

    if(!repaymentLoan) return;

    repaymentLoan.innerHTML = `

        <option value="">

            Select Loan

        </option>

    `;

    loans
    .filter(loan=>

        loan.status !== "Completed"

    )
    .forEach(loan=>{

        repaymentLoan.innerHTML += `

            <option value="${loan.id}">

                ${loan.clientName}
                •
                Balance: ${currency(loan.balance)}

            </option>

        `;

    });

}


// ==========================================
// SHOW LOAN DETAILS
// ==========================================

repaymentLoan?.addEventListener("change",()=>{

    const loan = loans.find(

        l => l.id === repaymentLoan.value

    );

    if(!loan) return;

    alert(

`Client:
${loan.clientName}

Loan Amount:
${currency(loan.amount)}

Outstanding Balance:
${currency(loan.balance)}

Weekly Repayment:
${currency(loan.weeklyPayment || 0)}

Remaining Installments:
${loan.remainingInstallments || 0}

Status:
${loan.status}`

    );

});// ==========================================
// PART 3 OF 8
// LOAD & RENDER REPAYMENTS
// ==========================================

function loadRepayments(){

    const repaymentsQuery = query(

        collection(db,"repayments"),

        orderBy("createdAt","desc")

    );

    onSnapshot(repaymentsQuery,(snapshot)=>{

        repayments = [];

        snapshot.forEach((docSnap)=>{

            repayments.push({

                id:docSnap.id,
                ...docSnap.data()

            });

        });

        renderRepayments();

    });

}


// ==========================================
// RENDER REPAYMENTS TABLE
// ==========================================

function renderRepayments(){

    if(!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML = "";

    if(repayments.length === 0){

        repaymentsTableBody.innerHTML = `

            <tr>

                <td colspan="7" style="text-align:center;">

                    No repayments found.

                </td>

            </tr>

        `;

        return;

    }

    repayments.forEach(payment=>{

        const row = document.createElement("tr");

        row.innerHTML = `

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

        `;

        repaymentsTableBody.appendChild(row);

    });

    attachRepaymentActions();

}// ==========================================
// PART 4 OF 8
// SAVE REPAYMENT
// ==========================================

if(repaymentForm){

repaymentForm.addEventListener("submit", async(e)=>{

e.preventDefault();

const loan = loans.find(
    l => l.id === repaymentLoan.value
);

if(!loan){

    alert("Please select a loan.");

    return;

}

const amount = Number(repaymentAmount.value);

if(amount <= 0){

    alert("Enter a valid repayment amount.");

    return;

}

if(amount > Number(loan.balance)){

    alert("Payment cannot exceed remaining balance.");

    return;

}

const schedule = [...(loan.repaymentSchedule || [])];

let paymentRemaining = amount;

for(const installment of schedule){

    if(installment.paid) continue;

    const weeklyAmount = Number(loan.weeklyPayment || 0);

    if(paymentRemaining >= weeklyAmount){

        installment.paid = true;

        installment.paidDate = repaymentDate.value;

        installment.paidAmount = weeklyAmount;

        paymentRemaining -= weeklyAmount;

    }else{

        break;

    }

}

const remainingInstallments =
schedule.filter(item => !item.paid).length;

const nextInstallment =
schedule.find(item => !item.paid);

const newBalance =
Math.max(0, Number(loan.balance) - amount);

const totalPaid =
Number(loan.amountPaid || 0) + amount;

let status = "Approved";

if(remainingInstallments === 0 || newBalance === 0){

    status = "Completed";

}
else if(
    nextInstallment &&
    nextInstallment.dueDate < today()
){

    status = "Arrears";

}

try{

await addDoc(

collection(db,"repayments"),

{

    loanId: loan.id,

    loanNumber: loan.id.substring(0,8),

    clientName: loan.clientName,

    amount: amount,

    paymentDate: repaymentDate.value,

    notes: repaymentNotes.value.trim(),

    receivedBy:
        localStorage.getItem("userName") ||
        localStorage.getItem("userEmail") ||
        "Unknown Officer",

    createdAt: serverTimestamp()

}

);

await updateDoc(

doc(db,"loans",loan.id),

{

    amountPaid: totalPaid,

    balance: newBalance,

    repaymentSchedule: schedule,

    remainingInstallments: remainingInstallments,

    nextRepaymentDate:
        nextInstallment
        ? nextInstallment.dueDate
        : null,

    completed:
        status === "Completed",

    status: status,

    updatedAt: serverTimestamp()

}

);

alert("Repayment recorded successfully.");

repaymentForm.reset();

repaymentDate.value = today();

repaymentModal.classList.add("hidden");

}
catch(error){

console.error(error);

alert(error.message);

}

});

}// ==========================================
// PART 5 OF 8
// VIEW REPAYMENTS
// ==========================================

function attachRepaymentActions(){

    document.querySelectorAll(".view-payment").forEach(button=>{

        button.onclick = ()=>{

            const payment = repayments.find(

                p => p.id === button.dataset.id

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

    repaymentDate.value = today();

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

    if(e.target === repaymentModal){

        repaymentModal.classList.add("hidden");

        repaymentForm.reset();

    }

});// ==========================================
// PART 6 OF 8
// DEFAULT DATE
// ==========================================

if(repaymentDate){

    repaymentDate.value = today();

}


// ==========================================
// REFRESH LOAN DROPDOWN
// ==========================================

function refreshLoanDropdown(){

    populateLoanDropdown();

}


// ==========================================
// SEARCH REPAYMENTS
// ==========================================

function searchRepayments(keyword){

    keyword = keyword.trim().toLowerCase();

    const filtered = repayments.filter(payment=>{

        return (

            payment.clientName?.toLowerCase().includes(keyword) ||

            payment.loanNumber?.toLowerCase().includes(keyword) ||

            payment.receivedBy?.toLowerCase().includes(keyword)

        );

    });

    if(!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML = "";

    if(filtered.length === 0){

        repaymentsTableBody.innerHTML = `

        <tr>

            <td colspan="7" style="text-align:center;">

                No repayments found.

            </td>

        </tr>

        `;

        return;

    }

    filtered.forEach(payment=>{

        const row = document.createElement("tr");

        row.innerHTML = `

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
// PART 7 OF 8
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

    refreshLoanDropdown();

},30000);


// ==========================================
// PAGE LOAD
// ==========================================

window.addEventListener("load",()=>{

    initializeRepayments();

});


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

        payment => payment.id === id

    );

}// ==========================================
// PART 8 OF 8
// EXPORTS
// ==========================================

export {

    loadRepayments,

    refreshRepaymentTable,

    getRepaymentById,

    refreshLoanDropdown,

    currency

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 3.0
// ==========================================