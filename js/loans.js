// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 3.0
// PART 1
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
// DOM ELEMENTS
// ==========================================

const loanForm = document.getElementById("loan-form");
const loanModal = document.getElementById("loan-modal");

const loansTableBody =
    document.querySelector("#loans-table tbody");

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

const previewWeekly =
    document.getElementById("preview-monthly");


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

closeScheduleModal?.addEventListener("click", () => {

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

    return{

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

});


// ==========================================
// GENERATE WEEKLY REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(
    approvalDate,
    durationWeeks,
    weeklyPayment
){

    const schedule = [];

    const start = new Date(approvalDate);

    for(let week=1; week<=durationWeeks; week++){

        const due = new Date(start);

        due.setDate(
            due.getDate() + (week * 7)
        );

        schedule.push({

            week,

            amount: weeklyPayment,

            dueDate: formatDate(due),

            paid:false,

            paidAmount:0,

            paidDate:null

        });

    }

    return schedule;

}// ==========================================
// PART 2
// LOAD CLIENTS & LOANS
// ==========================================


// ==========================================
// LOAD CLIENTS
// ==========================================

function loadClients(){

    onSnapshot(

        collection(db,"clients"),

        (snapshot)=>{

            clients=[];

            snapshot.forEach((docSnap)=>{

                clients.push({

                    id:docSnap.id,

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

    loanClient.innerHTML=`

        <option value="">
            Select Client
        </option>

    `;

    clients

        .sort((a,b)=>

            (a.name||"")

            .localeCompare(b.name||"")

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

            loans=[];

            snapshot.forEach((docSnap)=>{

                const loan={

                    id:docSnap.id,

                    ...docSnap.data()

                };

                // Compatibility

                loan.processingFee ??=0;

                loan.balance ??=

                    Number(
                        loan.totalRepayment||0
                    );

                loan.amountPaid ??=0;

                loan.completed ??=false;

                loan.repaymentSchedule ??=[];

                loan.weeklyPayment ??=

                    loan.repayment||0;

                const next=

                    loan.repaymentSchedule.find(

                        item=>!item.paid

                    );

                loan.nextRepaymentDate=

                    next
                    ? next.dueDate
                    : "-";

                loans.push(loan);

            });

            filterLoans();

        }

    );

}


// ==========================================
// OPEN NEW LOAN
// ==========================================

function openLoanModal(){

    if(!loanModal) return;

    loanForm.reset();

    if(loanId)
        loanId.value="";

    calculateLoan();

    if(loanDueDate){

        loanDueDate.value=today();

    }

    loanModal.classList.remove("hidden");

}


// ==========================================
// BUTTONS
// ==========================================

document
.getElementById("new-loan-btn")
?.addEventListener(
    "click",
    openLoanModal
);

document
.getElementById("fab-new-loan")
?.addEventListener(
    "click",
    openLoanModal
);// ==========================================
// PART 3
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

            }

            else{

                await addDoc(

                    collection(db,"loans"),

                    loanData

                );

                alert("Loan created successfully.");

            }

            loanForm.reset();

            loanId.value="";

            calculateLoan();

            loanModal.classList.add("hidden");

        }

        catch(error){

            console.error(error);

            alert("Failed to save loan.");

        }

    });

}// ==========================================
// PART 4
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

    list.forEach(loan=>{

        const row = document.createElement("tr");

        row.innerHTML = `

        <td>${loan.id.substring(0,8)}</td>

        <td>${loan.clientName}</td>

        <td>${currency(loan.amount)}</td>

        <td>${currency(loan.processingFee)}</td>

        <td>${loan.interest}%</td>

        <td>${loan.duration} Weeks</td>

        <td>${currency(loan.weeklyPayment)}</td>

        <td>${currency(loan.balance)}</td>

        <td>${loan.nextRepaymentDate || "-"}</td>

        <td>${loan.dueDate || "-"}</td>

        <td>

            <span class="status ${String(loan.status).toLowerCase()}">

                ${loan.status}

            </span>

        </td>

        <td>${loan.createdBy || "-"}</td>

        <td>

            <button
                class="view-loan"
                data-id="${loan.id}">
                👁️
            </button>

            <button
                class="edit-loan"
                data-id="${loan.id}"
                ${loan.status!=="Pending" ? "disabled" : ""}>
                ✏️
            </button>

            <button
                class="approve-loan"
                data-id="${loan.id}"
                ${loan.status!=="Pending" ? "disabled" : ""}>
                ✔️
            </button>

            <button
                class="delete-loan"
                data-id="${loan.id}"
                ${loan.status!=="Pending" ? "disabled" : ""}>
                🗑️
            </button>

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

        filtered = filtered.filter(loan =>

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

            loan => loan.status === status

        );

    }

    renderLoans(filtered);

}

loanSearch?.addEventListener(
    "input",
    filterLoans
);

loanFilter?.addEventListener(
    "change",
    filterLoans
);// ==========================================
// PART 5
// LOAN ACTIONS
// ==========================================

function attachLoanActions(){

// ==========================
// VIEW LOAN
// ==========================

document.querySelectorAll(".view-loan").forEach(button=>{

button.onclick=()=>{

const loan=loans.find(
l=>l.id===button.dataset.id
);

if(!loan) return;

alert(

`LOAN DETAILS

Loan No:
${loan.id.substring(0,8)}

Client:
${loan.clientName}

Principal:
${currency(loan.amount)}

Processing Fee:
${currency(loan.processingFee)}

Interest:
${loan.interest}%

Weekly Repayment:
${currency(loan.weeklyPayment)}

Amount Paid:
${currency(loan.amountPaid||0)}

Outstanding Balance:
${currency(loan.balance)}

Remaining Installments:
${loan.remainingInstallments||loan.duration}

Status:
${loan.status}

Approval Date:
${loan.approvalDate||"-"}

Next Repayment:
${loan.nextRepaymentDate||"-"}

Registered By:
${loan.createdBy||"-"}`

);

};

});


// ==========================
// EDIT LOAN
// ==========================

document.querySelectorAll(".edit-loan").forEach(button=>{

button.onclick=()=>{

const loan=loans.find(
l=>l.id===button.dataset.id
);

if(!loan) return;

if(loan.status!=="Pending"){

alert("Only pending loans can be edited.");

return;

}

loanId.value=loan.id;
loanClient.value=loan.clientId;
loanAmount.value=loan.amount;
loanProcessingFee.value=loan.processingFee;
loanInterest.value=loan.interest;
loanDuration.value=loan.duration;
loanDueDate.value=loan.dueDate;

calculateLoan();

loanModal.classList.remove("hidden");

};

});


// ==========================
// APPROVE LOAN
// ==========================

document.querySelectorAll(".approve-loan").forEach(button=>{

button.onclick=async()=>{

const loan=loans.find(
l=>l.id===button.dataset.id
);

if(!loan) return;

if(loan.status!=="Pending"){

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

}catch(error){

console.error(error);

alert("Failed to approve loan.");

}

};

});


// ==========================
// DELETE LOAN
// ==========================

document.querySelectorAll(".delete-loan").forEach(button=>{

button.onclick=async()=>{

const loan=loans.find(
l=>l.id===button.dataset.id
);

if(!loan) return;

if(loan.status!=="Pending"){

alert("Only pending loans can be deleted.");

return;

}

if(!confirm(`Delete loan for ${loan.clientName}?`))
return;

try{

await deleteDoc(
doc(db,"loans",loan.id)
);

alert("Loan deleted successfully.");

}catch(error){

console.error(error);

alert("Failed to delete loan.");

}

};

});

}// ==========================================
// PART 6
// CHECK LOAN STATUS
// ==========================================

async function checkOverdueLoans(){

    const todayDate = today();

    for(const loan of loans){

        // Ignore pending and completed loans
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

            if(!item.paid){

                if(!nextRepayment){

                    nextRepayment = item.dueDate;

                }

                if(item.dueDate < todayDate){

                    arrears = true;

                }

                break;

            }

        }

        // IMPORTANT:
        // Never mark Completed here.
        // repayments.js is the ONLY file that marks
        // a loan Completed after the final payment.

        let status = "Approved";

        if(arrears){

            status = "Arrears";

        }

        try{

            await updateDoc(

                doc(db,"loans",loan.id),

                {

                    status:status,

                    nextRepaymentDate:
                        nextRepayment,

                    updatedAt:
                        serverTimestamp()

                }

            );

        }catch(error){

            console.error(error);

        }

    }

}// ==========================================
// PART 7
// AUTO REFRESH & INITIALIZE
// ==========================================

// Check loan status every minute

setInterval(()=>{

    if(loans.length){

        checkOverdueLoans();

    }

},60000);


// Refresh table every 30 seconds

setInterval(()=>{

    filterLoans();

},30000);


// ==========================================
// PAGE LOAD
// ==========================================

window.addEventListener("load",()=>{

    calculateLoan();

    loadClients();

    loadLoans();

    checkOverdueLoans();

});


// ==========================================
// HELPERS
// ==========================================

// ==========================================
// RENDER REPAYMENT SCHEDULE
// ==========================================

function renderRepaymentSchedule(loan){

    if(!scheduleModal || !scheduleTableBody) return;

    scheduleClient.textContent =
        loan.clientName || "-";

    scheduleBalance.textContent =
        currency(loan.balance || 0);

    scheduleTableBody.innerHTML = "";

    (loan.repaymentSchedule || []).forEach(item=>{

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${item.week}</td>

            <td>${item.dueDate}</td>

            <td>${currency(item.amount)}</td>

            <td>${item.paid ? "Paid" : "Pending"}</td>

            <td>${item.paidDate || "-"}</td>

        `;

        scheduleTableBody.appendChild(row);

    });

    scheduleModal.classList.remove("hidden");

}

function refreshLoanTable(){

    filterLoans();

}

function getLoanById(id){

    return loans.find(

        loan=>loan.id===id

    );

}

function getNextRepayment(schedule = []) {

    return schedule.find(item => !item.paid) || null;

}

// ==========================================
// PART 8
// EXPORTS
// ==========================================

export {

    loadLoans,
    renderLoans,
    calculateLoan,
    currency,
    refreshLoanTable,
    getLoanById,
    generateRepaymentSchedule,
    getNextRepayment

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 3.0
// ==========================================