// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 2.0
// PART 1
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
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
// PREVIEW
// ==========================================

const previewPrincipal =
    document.getElementById("preview-principal");

const previewInterest =
    document.getElementById("preview-interest");

const previewDuration =
    document.getElementById("preview-duration");

const previewMonthly =
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

}// ==========================================
// LOAN CALCULATIONS
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

    if(previewMonthly)
        previewMonthly.textContent =
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
// REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(

    approvalDate,

    weeks

){

    const schedule=[];

    const start=new Date(approvalDate);

    for(let i=1;i<=weeks;i++){

        const due=new Date(start);

        due.setDate(

            due.getDate()+

            (i*7)

        );

        schedule.push({

            week:i,

            dueDate:formatDate(due),

            paid:false,

            paidDate:null

        });

    }

    return schedule;

}


function getNextRepayment(schedule=[]){

    return schedule.find(

        item=>!item.paid

    ) || null;

}// ==========================================
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

            renderLoans(loans);

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

        .sort(

            (a,b)=>

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

                loan.balance ??=

                    Number(

                        loan.totalRepayment||0

                    );

                loan.processingFee ??=0;

                loan.completed ??=false;

                loan.repaymentSchedule ??=[];

                loan.weeklyPayment ??=

                    loan.repayment||0;

                const next=

                    getNextRepayment(

                        loan.repaymentSchedule

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

}// ==========================================
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
);


// ==========================================
// SAVE / UPDATE LOAN
// ==========================================

if(loanForm){

loanForm.addEventListener(

"submit",

async(e)=>{

e.preventDefault();

const calc=calculateLoan();

const client=

clients.find(

c=>c.id===loanClient.value

);

if(!client){

alert("Please select a client.");

return;

}

const approvalDate=new Date();

const schedule=

generateRepaymentSchedule(

approvalDate,

calc.duration

);

const next=

getNextRepayment(schedule);

const loanData={

clientId:client.id,

clientName:client.name,

amount:calc.amount,

processingFee:calc.processingFee,

interest:calc.interest,

duration:calc.duration,

repayment:calc.weeklyPayment,

weeklyPayment:calc.weeklyPayment,

totalRepayment:calc.totalRepayment,

balance:calc.totalRepayment,

approvalDate:formatDate(approvalDate),

dueDate:loanDueDate.value,

repaymentSchedule:schedule,

nextRepaymentDate:

next ? next.dueDate : null,

remainingInstallments:

calc.duration,

status:"Pending",

completed:false,

createdBy:

localStorage.getItem("userName") ||

localStorage.getItem("userEmail") ||

"Unknown Officer",

createdAt:serverTimestamp(),

updatedAt:serverTimestamp()

};

try{

if(loanId.value){

await updateDoc(

doc(db,"loans",loanId.value),

{

...loanData,

updatedAt:serverTimestamp()

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

loanModal.classList.add("hidden");

loanForm.reset();

calculateLoan();

}catch(error){

console.error(error);

alert("Failed to save loan.");

}

});

}// ==========================================
// RENDER LOANS TABLE
// ==========================================

function renderLoans(list){

    if(!loansTableBody) return;

    loansTableBody.innerHTML="";

    if(list.length===0){

        loansTableBody.innerHTML=`

        <tr>

            <td colspan="13"
                style="text-align:center;padding:20px;">

                No loans found.

            </td>

        </tr>

        `;

        return;

    }

    list.forEach((loan)=>{

        const row=document.createElement("tr");

        row.innerHTML=`

        <td>${loan.id.substring(0,8)}</td>

        <td>${loan.clientName}</td>

        <td>${currency(loan.amount)}</td>

        <td>${currency(loan.processingFee)}</td>

        <td>${loan.interest}%</td>

        <td>${loan.duration} Weeks</td>

        <td>${currency(loan.weeklyPayment)}</td>

        <td>${currency(loan.balance)}</td>

        <td>${loan.nextRepaymentDate || "-"}</td>

        <td>${loan.dueDate}</td>

        <td>${loan.status}</td>

        <td>${loan.createdBy || "-"}</td>

        <td>

            <button
                class="view-loan"
                data-id="${loan.id}">
                👁️
            </button>

            <button
                class="edit-loan"
                data-id="${loan.id}">
                ✏️
            </button>

            <button
                class="approve-loan"
                data-id="${loan.id}">
                ✔️
            </button>

            <button
                class="delete-loan"
                data-id="${loan.id}">
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

    let filtered=[...loans];

    const keyword=

        loanSearch?.value

        ?.trim()

        .toLowerCase() || "";

    const status=

        loanFilter?.value || "ALL";

    if(keyword){

        filtered=filtered.filter((loan)=>{

            return(

                loan.clientName

                ?.toLowerCase()

                .includes(keyword)

                ||

                loan.id

                .toLowerCase()

                .includes(keyword)

            );

        });

    }

    if(status!=="ALL"){

        filtered=filtered.filter(

            loan=>loan.status===status

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
// LOAN ACTIONS
// ==========================================

function attachLoanActions(){

// ==========================
// VIEW
// ==========================

document.querySelectorAll(".view-loan").forEach((button)=>{

button.onclick=()=>{

const loan=

loans.find(

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

Total Repayment:
${currency(loan.totalRepayment)}

Outstanding Balance:
${currency(loan.balance)}

Duration:
${loan.duration} Weeks

Approval Date:
${loan.approvalDate || "-"}

Next Repayment:
${loan.nextRepaymentDate || "-"}

Due Date:
${loan.dueDate}

Status:
${loan.status}

Registered By:
${loan.createdBy || "-"}`

);

};

});


// ==========================
// EDIT
// ==========================

document.querySelectorAll(".edit-loan").forEach((button)=>{

button.onclick=()=>{

const loan=

loans.find(

l=>l.id===button.dataset.id

);

if(!loan) return;

if(

loan.status==="Approved" ||

loan.status==="Completed"

){

alert(

"This loan cannot be edited."

);

return;

}

loanId.value=loan.id;

loanClient.value=loan.clientId;

loanAmount.value=loan.amount;

loanProcessingFee.value=

loan.processingFee;

loanInterest.value=

loan.interest;

loanDuration.value=

loan.duration;

loanDueDate.value=

loan.dueDate;

calculateLoan();

loanModal.classList.remove("hidden");

};

});


// ==========================
// APPROVE
// ==========================

document.querySelectorAll(".approve-loan").forEach((button)=>{

button.onclick=async()=>{

const loan=

loans.find(

l=>l.id===button.dataset.id

);

if(!loan) return;

if(loan.status!=="Pending"){

alert(

"Loan already approved."

);

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

alert(

"Loan approved successfully."

);

}catch(error){

console.error(error);

alert(

"Failed to approve loan."

);

}

};

});


// ==========================
// DELETE
// ==========================

document.querySelectorAll(".delete-loan").forEach((button)=>{

button.onclick=async()=>{

const loan=

loans.find(

l=>l.id===button.dataset.id

);

if(!loan) return;

if(

loan.status==="Approved" ||

loan.status==="Completed"

){

alert(

"Approved or completed loans cannot be deleted."

);

return;

}

if(

!confirm(

`Delete loan for ${loan.clientName}?`

)

) return;

try{

await deleteDoc(

doc(db,"loans",loan.id)

);

alert(

"Loan deleted successfully."

);

}catch(error){

console.error(error);

alert(

"Failed to delete loan."

);

}

};

});

}// ==========================================
// CHECK FOR OVERDUE LOANS
// ==========================================

async function checkOverdueLoans(){

    const todayDate = today();

    for(const loan of loans){

        if(loan.status !== "Approved") continue;

        const schedule =
            loan.repaymentSchedule || [];

        let remaining = 0;
        let nextRepayment = null;
        let arrears = false;

        schedule.forEach(item=>{

            if(!item.paid){

                remaining++;

                if(!nextRepayment){

                    nextRepayment = item.dueDate;

                }

                if(item.dueDate < todayDate){

                    arrears = true;

                }

            }

        });

        let status = "Approved";

        if(remaining === 0){

            status = "Completed";

        }
        else if(arrears){

            status = "Arrears";

        }

        try{

            await updateDoc(

                doc(db,"loans",loan.id),

                {

                    status,

                    completed:
                        remaining===0,

                    remainingInstallments:
                        remaining,

                    nextRepaymentDate:
                        nextRepayment,

                    updatedAt:
                        serverTimestamp()

                }

            );

        }

        catch(error){

            console.error(error);

        }

    }

}


// ==========================================
// AUTO REFRESH
// ==========================================

setInterval(()=>{

    if(loans.length){

        checkOverdueLoans();

    }

},60000);


// ==========================================
// INITIALIZE
// ==========================================

window.addEventListener("load",()=>{

    calculateLoan();

    loadClients();

    loadLoans();

});// ==========================================
// REFRESH LOAN TABLE
// ==========================================

function refreshLoanTable(){

    filterLoans();

}


// ==========================================
// GET LOAN BY ID
// ==========================================

function getLoanById(id){

    return loans.find(

        loan => loan.id === id

    );

}


// ==========================================
// MANUAL REFRESH
// ==========================================

setInterval(

    refreshLoanTable,

    30000

);


// ==========================================
// EXPORTS
// ==========================================

export {

    loadLoans,

    renderLoans,

    calculateLoan,

    currency,

    getLoanById,

    refreshLoanTable,

    generateRepaymentSchedule,

    getNextRepayment

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 2.0
// ==========================================