// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 4.0
// PART 1 OF 8
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// ADMIN SETTINGS
// ==========================================

const ADMIN_EMAIL = "gayisi0901@gmail.com";

function isAdmin(){

    return (
        localStorage.getItem("userEmail") === ADMIN_EMAIL
    );

}


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

}


// ==========================================
// GET NEXT UNPAID INSTALLMENT
// ==========================================

function getNextInstallment(schedule = []){

    return schedule.find(
        item => !item.paid
    ) || null;

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

            const loan = {

                id:docSnap.id,
                ...docSnap.data()

            };

            // Compatibility
            loan.balance ??=
                Number(loan.totalRepayment || 0);

            loan.amountPaid ??= 0;

            loan.remainingInstallments ??=
                loan.duration || 0;

            loan.repaymentSchedule ??= [];

            loan.weeklyPayment ??=
                loan.repayment || 0;

            loans.push(loan);

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
                Weekly:
                ${currency(loan.weeklyPayment)}
                •
                Balance:
                ${currency(loan.balance)}

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

`CLIENT
${loan.clientName}

LOAN
${currency(loan.amount)}

BALANCE
${currency(loan.balance)}

WEEKLY PAYMENT
${currency(loan.weeklyPayment)}

REMAINING WEEKS
${loan.remainingInstallments}

STATUS
${loan.status}

Tip:
Simply tick the next unpaid installment.
The amount will be filled automatically.`

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

            <td>${payment.installmentWeek || "-"}</td>

            <td>${payment.receivedBy || "-"}</td>

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

}// ==========================================
// PART 4 OF 8
// SAVE REPAYMENT (TICK NEXT INSTALLMENT)
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

    const schedule = [...(loan.repaymentSchedule || [])];

    const nextInstallment = schedule.find(
        item => !item.paid
    );

    if(!nextInstallment){

        alert("This loan has already been fully repaid.");
        return;

    }

    // Automatically use the weekly payment amount
    const amount = Number(nextInstallment.amount);

    nextInstallment.paid = true;
    nextInstallment.paidDate = repaymentDate.value;
    nextInstallment.paidAmount = amount;

    const remainingInstallments =
        schedule.filter(item=>!item.paid).length;

    const nextRepayment =
        schedule.find(item=>!item.paid);

    const totalPaid =
        Number(loan.amountPaid || 0) + amount;

    const balance =
        Math.max(
            0,
            Number(loan.balance) - amount
        );

    let status = "Approved";

    if(balance === 0){

        status = "Completed";

    }else if(

        nextRepayment &&
        nextRepayment.dueDate < today()

    ){

        status = "Arrears";

    }

    try{

        // Save repayment history

        await addDoc(

            collection(db,"repayments"),

            {

                loanId: loan.id,

                loanNumber:
                    loan.id.substring(0,8),

                clientName:
                    loan.clientName,

                installmentWeek:
                    nextInstallment.week,

                amount: amount,

                paymentDate:
                    repaymentDate.value,

                notes:
                    repaymentNotes.value.trim(),

                receivedBy:
                    localStorage.getItem("userName") ||
                    localStorage.getItem("userEmail") ||
                    "Unknown Officer",

                createdAt:
                    serverTimestamp()

            }

        );

        // Update loan

        await updateDoc(

            doc(db,"loans",loan.id),

            {

                repaymentSchedule:
                    schedule,

                amountPaid:
                    totalPaid,

                balance:
                    balance,

                remainingInstallments:
                    remainingInstallments,

                nextRepaymentDate:

                    nextRepayment
                    ? nextRepayment.dueDate
                    : null,

                completed:
                    balance === 0,

                status:
                    status,

                updatedAt:
                    serverTimestamp()

            }

        );

        alert(

`Week ${nextInstallment.week} marked as PAID.

Amount:
${currency(amount)}`

        );

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

Installment:
Week ${payment.installmentWeek || "-"}

Amount:
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

    // Clear old amount
    if(repaymentAmount){

        repaymentAmount.value = "";

        repaymentAmount.readOnly = true;

        repaymentAmount.placeholder =
        "Automatically filled from next weekly installment";

    }

    repaymentModal.classList.remove("hidden");

});


// ==========================================
// AUTO FILL WEEKLY AMOUNT
// ==========================================

repaymentLoan?.addEventListener("change",()=>{

    const loan = loans.find(
        l=>l.id===repaymentLoan.value
    );

    if(!loan) return;

    const nextInstallment =

        (loan.repaymentSchedule || [])
        .find(item=>!item.paid);

    if(nextInstallment && repaymentAmount){

        repaymentAmount.value =
            nextInstallment.amount;

    }

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

        return(

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

            ||

            String(
                payment.installmentWeek || ""
            )
            .toLowerCase()
            .includes(keyword)

        );

    });

    if(!repaymentsTableBody) return;

    repaymentsTableBody.innerHTML = "";

    if(filtered.length===0){

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

    filtered.forEach(payment=>{

        const row=document.createElement("tr");

        row.innerHTML=`

            <td>${payment.clientName}</td>

            <td>${payment.loanNumber}</td>

            <td>${currency(payment.amount)}</td>

            <td>${payment.paymentDate}</td>

            <td>Week ${payment.installmentWeek || "-"}</td>

            <td>${payment.receivedBy || "-"}</td>

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

    if(repaymentAmount){

        repaymentAmount.readOnly = true;

        repaymentAmount.placeholder =
            "Automatically calculated";
    }

}


// ==========================================
// AUTO REFRESH
// ==========================================

// Refresh loan list every 30 seconds
setInterval(()=>{

    refreshLoanDropdown();

},30000);


// Refresh repayments table every 30 seconds
setInterval(()=>{

    renderRepayments();

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

}


// ==========================================
// HELPER
// GET NEXT UNPAID INSTALLMENT
// ==========================================

function getNextInstallment(loan){

    if(!loan) return null;

    return (loan.repaymentSchedule || [])

        .find(item => !item.paid) || null;

}// ==========================================
// PART 8 OF 8
// EXPORTS
// ==========================================

export {

    // Loaders
    loadRepayments,
    loadLoans,

    // Refresh
    refreshRepaymentTable,
    refreshLoanDropdown,

    // Helpers
    getRepaymentById,
    getNextInstallment,
    currency,
    today

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// VERSION 4.0
// ==========================================