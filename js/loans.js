// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 4.1
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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// ADMIN SETTINGS
// ==========================================

const ADMIN_EMAIL = "gayisi0901@gmail.com";

function isAdmin() {

    return (
        (localStorage.getItem("userEmail") || "")
        .toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );

}


// ==========================================
// DOM ELEMENTS
// ==========================================

const loanForm =
    document.getElementById("loan-form");

const loanModal =
    document.getElementById("loan-modal");

const loansTableBody =
document.getElementById("loans-table-body");

const loanSearch =
    document.getElementById("loan-search");

const loanFilter =
    document.getElementById("loan-filter");

const loanId =
    document.getElementById("loan-id");

const loanClient =
    document.getElementById("loan-client");

const loanAmount =
    document.getElementById("loan-amount");

const loanProcessingFee =
    document.getElementById("loan-processing-fee");

const loanInterest =
    document.getElementById("loan-interest");

const loanDuration =
    document.getElementById("loan-duration");

const loanDueDate =
    document.getElementById("loan-due-date");


// ==========================================
// REPAYMENT SCHEDULE MODAL
// ==========================================

const scheduleModal =
    document.getElementById("schedule-modal");

const scheduleClient =
    document.getElementById("schedule-client");

const scheduleBalance =
    document.getElementById("schedule-balance");

const scheduleTableBody =
    document.getElementById("schedule-table-body");

const closeScheduleModal =
    document.getElementById("close-schedule-modal");


// ==========================================
// PREVIEW ELEMENTS
// ==========================================

const previewPrincipal =
    document.getElementById("preview-principal");

const previewInterest =
    document.getElementById("preview-interest");

const previewDuration =
    document.getElementById("preview-duration");

// Weekly repayment preview
const previewWeekly =
    document.getElementById("preview-weekly")
    || document.getElementById("preview-monthly");


// ==========================================
// DATA
// ==========================================

let loans = [];

let clients = [];


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

function formatDate(date){

    return new Date(date)
        .toISOString()
        .split("T")[0];

}

function today(){

    return formatDate(new Date());

}


// ==========================================
// CLOSE SCHEDULE MODAL
// ==========================================

closeScheduleModal?.addEventListener("click",()=>{

    scheduleModal.classList.add("hidden");

});


// ==========================================
// CALCULATE LOAN
// ==========================================

function calculateLoan(){

    const amount =
        Number(loanAmount?.value || 0);

    const interest =
        Number(loanInterest?.value || 0);

    const duration =
        Number(loanDuration?.value || 0);

    const processingFee =
        Number(loanProcessingFee?.value || 0);

    const interestAmount =
        amount * interest / 100;

    const totalRepayment =
        amount + interestAmount;

    const weeklyPayment =
        duration > 0
        ? totalRepayment / duration
        : 0;

    if(previewPrincipal)
        previewPrincipal.textContent =
            currency(amount);

    if(previewInterest)
        previewInterest.textContent =
            currency(interestAmount);

    if(previewDuration)
        previewDuration.textContent =
            duration + " Weeks";

    if(previewWeekly)
        previewWeekly.textContent =
            currency(weeklyPayment);

    return {

        amount,
        interest,
        processingFee,
        interestAmount,
        duration,
        totalRepayment,
        weeklyPayment

    };

}

// ==========================================
// GENERATE WEEKLY REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(
    approvalDate,
    durationWeeks,
    weeklyPayment
){

    const schedule = [];

    const startDate = new Date(approvalDate);

    for(let week = 1; week <= durationWeeks; week++){

        const dueDate = new Date(startDate);

        dueDate.setDate(
            dueDate.getDate() + (week * 7)
        );

        schedule.push({

    week: week,

    amount: Number(weeklyPayment),

    paidAmount: 0,

    remainingAmount: Number(weeklyPayment),

    dueDate: formatDate(dueDate),

    paid: false,

    status: "Pending",

    paidDate: null,

    paymentHistory: []

});

    }

    return schedule;

}


// ==========================================
// LIVE PREVIEW
// ==========================================

[
    loanAmount,
    loanInterest,
    loanDuration,
    loanProcessingFee

].forEach(input=>{

    input?.addEventListener(

        "input",

        calculateLoan

    );

})

;// ==========================================
// PART 3 OF 8
// LOAD CLIENTS & LOAD LOANS
// ==========================================


// ==========================================
// LOAD CLIENTS
// ==========================================

function loadClients(){

    onSnapshot(

        collection(db,"clients"),

        (snapshot)=>{

            clients = [];

            snapshot.forEach((docSnap)=>{

                clients.push({

                    id: docSnap.id,
                    ...docSnap.data()

                });

            });

            populateClientDropdown();

        }

    );

}


// ==========================================
// CLIENT DROPDOWN
// ==========================================

function populateClientDropdown(){

    if(!loanClient) return;

    loanClient.innerHTML = `
        <option value="">
            Select Client
        </option>
    `;

    clients
        .sort((a,b)=>
            (a.name || "")
            .localeCompare(b.name || "")
        )
        .forEach(client=>{

            loanClient.innerHTML += `
                <option value="${client.id}">
                    ${client.name}
                </option>
            `;

        });

}


// ==========================================
// LOAD LOANS
// ==========================================

function loadLoans(){

    onSnapshot(

        collection(db,"loans"),

        (snapshot)=>{

            loans = [];

            snapshot.forEach((docSnap)=>{

                const data = docSnap.data();

if (!data) return;

const loan = {
    id: docSnap.id,
    ...data
};

console.log("Loan loaded:", loan);

                // Compatibility for older records

                loan.processingFee ??= 0;

                loan.amountPaid ??= 0;

                loan.balance ??=
                    Number(loan.totalRepayment || 0);

                loan.weeklyPayment ??=
                    Number(loan.repayment || 0);

                loan.repaymentSchedule ??= [];

                loan.remainingInstallments ??=
                    loan.duration || 0;

                loan.completed ??= false;

                const next =
                    loan.repaymentSchedule.find(
                        item => !item.paid
                    );

                loan.nextRepaymentDate =
                    next ? next.dueDate : "-";

                loans.push(loan);

            });

console.log("Loans array:", loans);

            filterLoans();

        }

    );

}// ==========================================
// PART 4 OF 8
// OPEN LOAN MODAL
// SAVE / UPDATE LOAN
// ==========================================

// ==========================================
// OPEN NEW LOAN
// ==========================================

function openLoanModal(){

    if(!loanModal) return;

    loanForm.reset();

    if(loanId){

        loanId.value = "";

    }

    calculateLoan();

    if(loanDueDate){

        loanDueDate.value = today();

    }

    loanModal.classList.remove("hidden");

}


// ==========================================
// BUTTONS
// ==========================================

document
.getElementById("new-loan-btn")
?.addEventListener("click", openLoanModal);

document
.getElementById("fab-new-loan")
?.addEventListener("click", openLoanModal);


// ==========================================
// SAVE / UPDATE LOAN
// ==========================================

if(loanForm){

loanForm.addEventListener("submit", async(e)=>{

e.preventDefault();

const calc = calculateLoan();

const client = clients.find(
c => c.id === loanClient.value
);

if(!client){

alert("Please select a client.");

return;

}

const approvalDate = new Date();

const repaymentSchedule =
generateRepaymentSchedule(

approvalDate,

calc.duration,

calc.weeklyPayment

);

const loanData = {

clientId: client.id,

clientName: client.name,

amount: calc.amount,

processingFee: calc.processingFee,

interest: calc.interest,

duration: calc.duration,

repayment: calc.weeklyPayment,

weeklyPayment: calc.weeklyPayment,

totalRepayment: calc.totalRepayment,

balance: calc.totalRepayment,

amountPaid: 0,

approvalDate: formatDate(approvalDate),

dueDate: loanDueDate.value,

repaymentSchedule,

nextRepaymentDate:
repaymentSchedule[0]?.dueDate || null,

remainingInstallments:
calc.duration,

status: "Pending",

completed: false,

createdBy:
localStorage.getItem("userName") ||
localStorage.getItem("userEmail") ||
"Unknown Officer",

createdAt: serverTimestamp(),

updatedAt: serverTimestamp()

};

try{

if(loanId.value){

await updateDoc(

doc(db,"loans",loanId.value),

{

...loanData,

updatedAt: serverTimestamp()

}

);

alert("Loan updated successfully.");

}else{

await addDoc(

collection(db,"loans"),

loanData

);

alert("Loan created successfully.");

}

loanForm.reset();

loanId.value = "";

calculateLoan();

loanModal.classList.add("hidden");

}catch(error){

console.error(error);

alert("Failed to save loan.");

}

});

}// ==========================================
// PART 5 OF 8
// RENDER LOANS TABLE
// ==========================================

function renderLoans(list){

    if(!loansTableBody) return;

    loansTableBody.innerHTML = "";

    if(list.length === 0){

        loansTableBody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align:center;">
                    No loans found.
                </td>
            </tr>
        `;

        return;

    }

    list.forEach((loan) => {

    if (!loan || !loan.id) return;

    const row = document.createElement("tr");

    row.innerHTML = `

        <td>${String(loan.id).substring(0,8)}</td>

        <td>${loan.clientName || "-"}</td>

        <td>${currency(loan.amount || 0)}</td>

        <td>${currency(loan.processingFee || 0)}</td>

        <td>${loan.interest || 0}%</td>

        <td>${loan.duration || 0} Weeks</td>

        <td>${currency(loan.weeklyPayment || 0)}</td>

        <td>${currency(loan.balance || 0)}</td>

        <td>${loan.nextRepaymentDate || "-"}</td>

        <td>${loan.dueDate || "-"}</td>

        <td>
            <span class="status ${(loan.status || "Pending").toLowerCase()}">
                ${loan.status || "Pending"}
            </span>
        </td>

        <td>${loan.createdBy || "-"}</td>

        <td class="loan-actions">

    <button class="view-loan" data-id="${loan.id}">👁️</button>

    <button class="edit-loan" data-id="${loan.id}">✏️</button>

    <button class="approve-loan" data-id="${loan.id}">✔️</button>

    <button class="delete-loan" data-id="${loan.id}">🗑️</button>

</td>

    `;

    loansTableBody.appendChild(row);

});


    attachLoanActions();

}


// ==========================================
// SEARCH & FILTER
// ==========================================

function filterLoans(){

    let filtered = [...loans];

    const keyword =
        loanSearch?.value
        ?.trim()
        .toLowerCase() || "";

    const status =
        loanFilter?.value || "ALL";

    if(keyword){

        filtered = filtered.filter(loan=>

            loan.clientName
            ?.toLowerCase()
            .includes(keyword)

            ||

            loan.id
            .toLowerCase()
            .includes(keyword)

        );

    }

    if(status !== "ALL"){

        filtered = filtered.filter(

            loan=>loan.status===status

        );

    }

    renderLoans(filtered);

}

loanSearch?.addEventListener("input", filterLoans);

loanFilter?.addEventListener("change", filterLoans);// ==========================================
// PART 6 OF 8
// LOAN ACTIONS
// ==========================================

function attachLoanActions(){

// ==========================================
// VIEW LOAN
// ==========================================

document.querySelectorAll(".view-loan").forEach(button=>{

    button.onclick=()=>{

        const loan = loans.find(
            l => l.id === button.dataset.id
        );

        if(!loan) return;

        renderRepaymentSchedule(loan);

    };

});


// ==========================================
// EDIT LOAN
// ==========================================

document.querySelectorAll(".edit-loan").forEach(button=>{

    button.onclick=()=>{

        const loan = loans.find(
            l => l.id === button.dataset.id
        );

        if(!loan) return;

        if(loan.status !== "Pending"){

            alert("Only pending loans can be edited.");

            return;

        }

        loanId.value = loan.id;
        loanClient.value = loan.clientId;
        loanAmount.value = loan.amount;
        loanProcessingFee.value = loan.processingFee || 0;
        loanInterest.value = loan.interest;
        loanDuration.value = loan.duration;
        loanDueDate.value = loan.dueDate || today();

        calculateLoan();

        loanModal.classList.remove("hidden");

    };

});


// ==========================================
// APPROVE LOAN
// ==========================================

document.querySelectorAll(".approve-loan").forEach(button=>{

    button.onclick = async()=>{

        const loan = loans.find(
            l => l.id === button.dataset.id
        );

        if(!loan) return;

        if(loan.status !== "Pending"){

            alert("Loan is already approved.");

            return;

        }

        try{

            await updateDoc(

                doc(db,"loans",loan.id),

                {

                    status:"Approved",

                    updatedAt:serverTimestamp()

                }

            );

            alert("Loan approved successfully.");

        }

        catch(error){

            console.error(error);

            alert("Failed to approve loan.");

        }

    };

});


// ==========================================
// DELETE LOAN (ADMIN ONLY)
// ==========================================

document.querySelectorAll(".delete-loan").forEach(button=>{

    button.onclick = async()=>{

        if(!isAdmin()){

            alert("Only the Administrator can delete loans.");

            return;

        }

        const loan = loans.find(
            l => l.id === button.dataset.id
        );

        if(!loan) return;

        if(loan.status !== "Pending"){

            alert("Only pending loans can be deleted.");

            return;

        }

        if(!confirm(`Delete loan for ${loan.clientName}?`)){

            return;

        }

        try{

            await deleteDoc(

                doc(db,"loans",loan.id)

            );

            alert("Loan deleted successfully.");

        }

        catch(error){

            console.error(error);

            alert("Failed to delete loan.");

        }

    };

});

}// ==========================================
// PART 7 OF 8
// CHECK LOAN STATUS
// AUTO REFRESH & INITIALIZE
// ==========================================


// ==========================================
// CHECK OVERDUE LOANS
// ==========================================

async function checkOverdueLoans(){

    const todayDate = today();

    for(const loan of loans){

        // Ignore Pending and Completed loans

        if(
            loan.status === "Pending" ||
            loan.status === "Completed"
        ){
            continue;
        }

        const schedule =
            loan.repaymentSchedule || [];

        let arrears = false;
        let nextRepayment = null;

        for(const item of schedule){

            if(item.paid){
                continue;
            }

            nextRepayment = item.dueDate;

            if(item.dueDate < todayDate){

                arrears = true;

            }

            break;

        }

        let status = "Approved";

        if(arrears){

            status = "Arrears";

        }

        // Skip unnecessary Firestore updates

        if(
            loan.status === status &&
            loan.nextRepaymentDate === nextRepayment
        ){

            continue;

        }

        try{

            await updateDoc(

                doc(db,"loans",loan.id),

                {

                    status: status,

                    nextRepaymentDate: nextRepayment,

                    updatedAt: serverTimestamp()

                }

            );

        }

        catch(error){

            console.error(error);

        }

    }

}


// ==========================================
// AUTO CHECK EVERY MINUTE
// ==========================================

setInterval(()=>{

    if(loans.length){

        checkOverdueLoans();

    }

},60000);


// ==========================================
// AUTO REFRESH TABLE
// ==========================================

setInterval(()=>{

    filterLoans();

},30000);


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded",()=>{

    calculateLoan();

    loadClients();

    loadLoans();

    checkOverdueLoans();

});// ==========================================
// PART 8 OF 8
// HELPERS & EXPORTS
// ==========================================


// ==========================================
// RENDER REPAYMENT SCHEDULE
// ==========================================

function renderRepaymentSchedule(loan){

    if(
        !scheduleModal ||
        !scheduleTableBody
    ){
        return;
    }

    scheduleClient.textContent =
        loan.clientName || "-";

    scheduleBalance.textContent =
        currency(loan.balance || 0);

    scheduleTableBody.innerHTML = "";

    const schedule =
        loan.repaymentSchedule || [];

    if(schedule.length === 0){

        scheduleTableBody.innerHTML = `

            <tr>

                <td colspan="5"
                    style="text-align:center;">

                    No repayment schedule available.

                </td>

            </tr>

        `;

    }else{

        schedule.forEach(item=>{

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>${item.week}</td>

                <td>${item.dueDate}</td>

                <td>${currency(item.amount)}</td>

                <td>

                    ${
                        item.paid
                        ? "Paid ✅"
                        : "Pending"
                    }

                </td>

                <td>

                    ${
                        item.paidDate || "-"
                    }

                </td>

            `;

            scheduleTableBody.appendChild(row);

        });

    }

    scheduleModal.classList.remove("hidden");

}


// ==========================================
// CLOSE SCHEDULE
// ==========================================

closeScheduleModal?.addEventListener("click",()=>{

    scheduleModal.classList.add("hidden");

});

scheduleModal?.addEventListener("click",(e)=>{

    if(e.target===scheduleModal){

        scheduleModal.classList.add("hidden");

    }

});


// ==========================================
// REFRESH TABLE
// ==========================================

function refreshLoanTable(){

    filterLoans();

}


// ==========================================
// GET LOAN
// ==========================================

function getLoanById(id){

    return loans.find(

        loan=>loan.id===id

    );

}


// ==========================================
// GET NEXT REPAYMENT
// ==========================================

function getNextRepayment(schedule=[]){

    return schedule.find(

        item=>!item.paid

    ) || null;

}


// ==========================================
// EXPORTS
// ==========================================

export{

    loadLoans,

    renderLoans,

    calculateLoan,

    currency,

    generateRepaymentSchedule,

    refreshLoanTable,

    getLoanById,

    getNextRepayment

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 4.1
//
// ✔ Weekly repayments
// ✔ Loan calculator
// ✔ Repayment schedules
// ✔ Admin-only delete
// ✔ Officer tracking
// ✔ Automatic arrears detection
// ✔ Automatic status updates
// ✔ View / Edit / Approve
// ✔ Firestore realtime sync
// ==========================================