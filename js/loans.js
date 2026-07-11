// =====================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// Version 1.2
// PART 1
// =====================================

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


// =====================================
// ELEMENTS
// =====================================

const loansTableBody =
    document.querySelector("#loans-table tbody");

const loanForm =
    document.getElementById("loan-form");

const loanModal =
    document.getElementById("loan-modal");

const loanSearch =
    document.getElementById("loan-search");

const loanFilter =
    document.getElementById("loan-filter");

const loanClient =
    document.getElementById("loan-client");

const loanId =
    document.getElementById("loan-id");

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


// =====================================
// PREVIEW
// =====================================

const previewPrincipal =
    document.getElementById("preview-principal");

const previewInterest =
    document.getElementById("preview-interest");

const previewDuration =
    document.getElementById("preview-duration");

const previewMonthly =
    document.getElementById("preview-monthly");


// =====================================
// DATA
// =====================================

let loans = [];

let clients = [];


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
// GENERATE REPAYMENT SCHEDULE
// =====================================

function generateRepaymentSchedule(
    approvalDate,
    durationWeeks
){

    const schedule=[];

    const start=new Date(approvalDate);

    for(let week=1; week<=durationWeeks; week++){

        const due=new Date(start);

        due.setDate(
            due.getDate() + (week*7)
        );

        schedule.push({

            week,

            dueDate:formatDate(due),

            paid:false,

            paidDate:null

        });

    }

    return schedule;

}


// =====================================
// GET NEXT REPAYMENT
// =====================================

function getNextRepayment(schedule=[]){

    return schedule.find(
        item=>!item.paid
    ) || null;

}


// =====================================
// CALCULATE LOAN
// =====================================

function calculateLoan(){

    const amount=
        Number(loanAmount?.value||0);

    const interest=
        Number(loanInterest?.value||0);

    const duration=
        Number(loanDuration?.value||0);

    const processingFee=
        Number(
            loanProcessingFee?.value||0
        );

    const interestAmount=
        amount*interest/100;

    const totalRepayment=
        amount+interestAmount;

    const weeklyPayment=

        duration>0

        ? totalRepayment/duration

        :0;

    if(previewPrincipal){

        previewPrincipal.textContent=
            currency(amount);

    }

    if(previewInterest){

        previewInterest.textContent=
            currency(interestAmount);

    }

    if(previewDuration){

        previewDuration.textContent=
            duration+" Weeks";

    }

    if(previewMonthly){

        previewMonthly.textContent=
            currency(weeklyPayment);

    }

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


// =====================================
// LIVE PREVIEW
// =====================================

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

});// =====================================
// LOAD CLIENTS
// =====================================

function loadClients(){

    onSnapshot(

        collection(db,"clients"),

        snapshot=>{

            clients=[];

            snapshot.forEach(docSnap=>{

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


// =====================================
// CLIENT DROPDOWN
// =====================================

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

        loanClient.innerHTML+=`

            <option value="${client.id}">

                ${client.name}

            </option>

        `;

    });

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

                // Compatibility
                loan.balance ??=
                    Number(
                        loan.totalRepayment||0
                    );

                loan.processingFee ??=0;

                loan.processingFeeAdded ??=false;

                loan.repaymentSchedule ??=[];

                loan.completed ??=false;

                loan.weeklyPayment ??=
                    loan.repayment||0;

                // Determine next repayment

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

            renderLoans(loans);

        }

    );

}


// =====================================
// OPEN LOAN MODAL
// =====================================

function openLoanModal(){

    if(!loanModal) return;

    loanForm.reset();

    loanId.value="";

    calculateLoan();

    // Default Due Date
    if(loanDueDate){

        const today=new Date();

        loanDueDate.value=

            formatDate(today);

    }

    loanModal.classList.remove("hidden");

}


// =====================================
// BUTTONS
// =====================================

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


// =====================================
// HELPER
// =====================================

function getClientName(id){

    const client=

        clients.find(
            c=>c.id===id
        );

    return client
        ? client.name
        : "-";

}// =====================================
// SAVE / UPDATE LOAN
// =====================================

if (loanForm) {

    loanForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const calculation = calculateLoan();

        const selectedClient = clients.find(
            c => c.id === loanClient.value
        );

        if (!selectedClient) {

            alert("Please select a client.");

            return;

        }

        const approvalDate = new Date();

        const repaymentSchedule =
            generateRepaymentSchedule(
                approvalDate,
                calculation.duration
            );

        const nextRepayment =
            getNextRepayment(
                repaymentSchedule
            );

        const loanData = {

            clientId: loanClient.value,

            clientName: selectedClient.name,

            amount: calculation.amount,

            processingFee:
                calculation.processingFee,

            interest:
                calculation.interest,

            duration:
                calculation.duration,

            repayment:
                calculation.weeklyPayment,

            weeklyPayment:
                calculation.weeklyPayment,

            totalRepayment:
                calculation.totalRepayment,

            balance:
                calculation.totalRepayment,

            approvalDate:
                formatDate(approvalDate),

            nextRepaymentDate:
                nextRepayment
                ? nextRepayment.dueDate
                : null,

            dueDate:
                loanDueDate.value,

            repaymentSchedule:
                repaymentSchedule,

            remainingInstallments:
                calculation.duration,

            status:"Pending",

            completed:false,

            processingFeeAdded:false,

            createdBy:
                localStorage.getItem("userName")
                || "",

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };

        try{

            if(loanId.value){

                await updateDoc(

                    doc(
                        db,
                        "loans",
                        loanId.value
                    ),

                    {

                        ...loanData,

                        createdAt:undefined,

                        updatedAt:
                            serverTimestamp()

                    }

                );

            }

            else{

                await addDoc(

                    collection(
                        db,
                        "loans"
                    ),

                    loanData

                );

            }

            loanForm.reset();

            loanId.value="";

            calculateLoan();

            loanModal.classList.add("hidden");

            alert(
                "Loan saved successfully."
            );

        }

        catch(error){

            console.error(error);

            alert(
                "Failed to save loan."
            );

        }

    });

}// =====================================
// RENDER LOANS TABLE
// =====================================

function renderLoans(list){

    if(!loansTableBody) return;

    loansTableBody.innerHTML="";

    list.forEach(loan=>{

        const row=document.createElement("tr");

        const balance=
            Number(
                loan.balance ??
                loan.totalRepayment ??
                0
            );

        const nextRepayment=

            loan.nextRepaymentDate ||

            getNextRepayment(
                loan.repaymentSchedule || []
            )?.dueDate ||

            "-";

        row.innerHTML=`

            <td>${loan.id.substring(0,8)}</td>

            <td>${loan.clientName}</td>

            <td>${currency(loan.amount)}</td>

            <td>${currency(loan.processingFee || 0)}</td>

            <td>${loan.interest}%</td>

            <td>${loan.duration} Weeks</td>

            <td>${currency(loan.weeklyPayment || 0)}</td>

            <td>${currency(balance)}</td>

            <td>${nextRepayment}</td>

            <td>${loan.dueDate}</td>

            <td>

                <span class="status ${String(loan.status).toLowerCase()}">

                    ${loan.status}

                </span>

            </td>

            <td>${loan.createdBy || "-"}</td>

            <td>

                <button
                    class="btn-icon view-loan"
                    data-id="${loan.id}">
                    👁️
                </button>

                <button
                    class="btn-icon edit-loan"
                    data-id="${loan.id}"
                    ${loan.status==="Completed"?"disabled":""}>
                    ✏️
                </button>

                <button
                    class="btn-icon approve-loan"
                    data-id="${loan.id}"
                    ${loan.status!=="Pending"?"disabled":""}>
                    ✔
                </button>

                <button
                    class="btn-icon delete-loan"
                    data-id="${loan.id}"
                    ${loan.status==="Completed"?"disabled":""}>
                    🗑️
                </button>

            </td>

        `;

        loansTableBody.appendChild(row);

    });

    attachLoanActions();

}// ==========================
// VIEW LOAN
// ==========================

document.querySelectorAll(".view-loan").forEach((button)=>{

    button.onclick=()=>{

        const loan=

            loans.find(
                l=>l.id===button.dataset.id
            );

        if(!loan) return;

        let scheduleText="";

        if(
            loan.repaymentSchedule &&
            loan.repaymentSchedule.length>0
        ){

            loan.repaymentSchedule.forEach(item=>{

                const today=
                    new Date()
                    .toISOString()
                    .split("T")[0];

                let status="⏳ Pending";

                if(item.paid){

                    status="✅ Paid";

                }

                else if(item.dueDate<today){

                    status="🔴 Overdue";

                }

                else if(item.dueDate===today){

                    status="🟡 Due Today";

                }

                scheduleText+=

`Week ${item.week}
${item.dueDate}
${status}

`;

            });

        }

        else{

            scheduleText=
                "No repayment schedule available.";

        }

        alert(

`=============================
LOAN DETAILS
=============================

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

Final Due Date:
${loan.dueDate}

Status:
${loan.status}

=============================
REPAYMENT SCHEDULE
=============================

${scheduleText}`

        );

    };

});// ==========================
// APPROVE LOAN
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
                "Only pending loans can be approved."
            );

            return;

        }

        try{

            const approvalDate=
                new Date();

            const schedule=

                generateRepaymentSchedule(

                    approvalDate,

                    Number(loan.duration)

                );

            const next=

                getNextRepayment(schedule);

            await updateDoc(

                doc(db,"loans",loan.id),

                {

                    status:"Approved",

                    approvalDate:
                        formatDate(approvalDate),

                    repaymentSchedule:
                        schedule,

                    nextRepaymentDate:
                        next
                        ? next.dueDate
                        : null,

                    remainingInstallments:
                        Number(loan.duration),

                    balance:
                        Number(
                            loan.totalRepayment
                        ),

                    completed:false,

                    updatedAt:
                        serverTimestamp()

                }

            );

            alert(
                "Loan approved successfully."
            );

        }

        catch(error){

            console.error(error);

            alert(
                "Failed to approve loan."
            );

        }

    };

});// ==========================
// EDIT LOAN
// ==========================

document.querySelectorAll(".edit-loan").forEach((button)=>{

    button.onclick=()=>{

        const loan=

            loans.find(
                l=>l.id===button.dataset.id
            );

        if(!loan) return;

        if(
            loan.status==="Completed"
        ){

            alert(
                "Completed loans cannot be edited."
            );

            return;

        }

        if(
            loan.status==="Approved"
        ){

            alert(
                "Approved loans cannot be edited. Create a new loan if changes are required."
            );

            return;

        }

        loanId.value=loan.id;

        loanClient.value=
            loan.clientId;

        loanAmount.value=
            loan.amount;

        loanProcessingFee.value=
            loan.processingFee || 0;

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
// DELETE LOAN
// ==========================

document.querySelectorAll(".delete-loan").forEach((button)=>{

    button.onclick=async()=>{

        const loan=

            loans.find(
                l=>l.id===button.dataset.id
            );

        if(!loan) return;

        if(
            loan.status==="Approved"
        ){

            alert(
                "Approved loans cannot be deleted."
            );

            return;

        }

        if(
            loan.status==="Completed"
        ){

            alert(
                "Completed loans cannot be deleted."
            );

            return;

        }

        const confirmed=confirm(

            `Delete loan for ${loan.clientName}?`

        );

        if(!confirmed) return;

        try{

            await deleteDoc(

                doc(
                    db,
                    "loans",
                    loan.id
                )

            );

            alert(
                "Loan deleted successfully."
            );

        }

        catch(error){

            console.error(error);

            alert(
                "Failed to delete loan."
            );

        }

    };

});// =====================================
// CHECK FOR OVERDUE LOANS
// =====================================

async function checkOverdueLoans(){

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    for(const loan of loans){

        if(
            loan.status !== "Approved"
        ) continue;

        const schedule =
            loan.repaymentSchedule || [];

        if(schedule.length===0)
            continue;

        let hasOverdue=false;

        let nextRepayment=null;

        let remaining=0;

        const updatedSchedule =

            schedule.map(item=>{

                if(!item.paid){

                    remaining++;

                    if(
                        !nextRepayment
                    ){

                        nextRepayment=
                            item.dueDate;

                    }

                    if(
                        item.dueDate < today
                    ){

                        hasOverdue=true;

                    }

                }

                return item;

            });

        let status="Approved";

        if(remaining===0){

            status="Completed";

        }

        else if(hasOverdue){

            status="Arrears";

        }

        try{

            await updateDoc(

                doc(db,"loans",loan.id),

                {

                    repaymentSchedule:
                        updatedSchedule,

                    nextRepaymentDate:
                        nextRepayment,

                    remainingInstallments:
                        remaining,

                    completed:
                        remaining===0,

                    status:status,

                    updatedAt:
                        serverTimestamp()

                }

            );

        }

        catch(error){

            console.error(

                "Failed updating loan:",

                error

            );

        }

    }

}


// =====================================
// RUN OVERDUE CHECK
// =====================================

setInterval(()=>{

    if(loans.length){

        checkOverdueLoans();

    }

},60000);


// Run immediately after loans load

setTimeout(()=>{

    checkOverdueLoans();

},3000);// =====================================
// INITIALIZE
// =====================================

calculateLoan();

loadClients();

loadLoans();


// =====================================
// REFRESH LOAN TABLE
// =====================================

function refreshLoanTable(){

    filterLoans();

}


// =====================================
// GET LOAN
// =====================================

function getLoanById(id){

    return loans.find(

        loan=>loan.id===id

    );

}


// =====================================
// AUTO REFRESH
// =====================================

setInterval(()=>{

    refreshLoanTable();

},30000);


// =====================================
// DAILY ARREARS CHECK
// =====================================

setInterval(()=>{

    if(loans.length){

        checkOverdueLoans();

    }

},60000);


// =====================================
// STARTUP CHECK
// =====================================

window.addEventListener(

    "load",

    ()=>{

        calculateLoan();

        checkOverdueLoans();

    }

);


// =====================================
// EXPORTS
// =====================================

export{

    loadLoans,

    renderLoans,

    calculateLoan,

    currency,

    getLoanById,

    refreshLoanTable,

    generateRepaymentSchedule,

    getNextRepayment

};


// =====================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 1.2 COMPLETE
// =====================================