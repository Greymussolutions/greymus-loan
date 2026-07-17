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

const loanPaid =
    document.getElementById("loan-paid");

const loanBalance =
    document.getElementById("loan-balance");

const loanType =
    document.getElementById("loan-type");

const loanInterest =
    document.getElementById("loan-interest");

const loanDuration =
    document.getElementById("loan-duration");

const loanDueDate =
    document.getElementById("loan-due-date");

const loanStartDate =
    document.getElementById("loan-start-date");

// ==========================================
// REPAYMENT MODAL ELEMENTS
// ==========================================

const repaymentModal =
    document.getElementById("repayment-modal");

const repaymentForm =
    document.getElementById("repayment-form");

const repaymentLoanId =
    document.getElementById("repayment-loan-id");

const repaymentClient =
    document.getElementById("repayment-client");

const repaymentBalance =
    document.getElementById("repayment-balance");

const repaymentAmount =
    document.getElementById("repayment-amount");

const repaymentDate =
    document.getElementById("repayment-date");

const repaymentNotes =
    document.getElementById("repayment-notes");

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
// ROUND REPAYMENT TO NEAREST 5
// ==========================================

function roundToNearestFive(amount){

    return Math.ceil(Number(amount) / 5) * 5;

}

function applyHistoricalPayments(schedule, amountPaid) {

    let remaining = Number(amountPaid || 0);

    for (const installment of schedule) {

        if (remaining <= 0) break;

        if (remaining >= installment.amount) {

            installment.paidAmount = installment.amount;
            installment.remainingAmount = 0;
            installment.paid = true;
            installment.status = "Paid";

            remaining -= installment.amount;

        } else {

            installment.paidAmount = remaining;
            installment.remainingAmount =
                installment.amount - remaining;
            installment.status = "Partial";

            remaining = 0;

        }

    }

    return schedule;

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
    ? roundToNearestFive(totalRepayment / duration)
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
    weeklyPayment,
    totalRepayment
){

    const schedule = [];

    const startDate = new Date(approvalDate);

    for(let week = 1; week <= durationWeeks; week++){

    const dueDate = new Date(startDate);

    dueDate.setDate(
        dueDate.getDate() + (week * 7)
    );

    let installmentAmount;

    if (week === durationWeeks) {

        installmentAmount =
            Number(totalRepayment) -
            (Number(weeklyPayment) * (durationWeeks - 1));

    } else {

        installmentAmount =
            Number(weeklyPayment);

    }

    schedule.push({

        week: week,

        amount: installmentAmount,

        paidAmount: 0,

        remainingAmount: installmentAmount,

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

        },

(error)=>{

    console.error(
        "Failed to load loans:",
        error
    );

}

);

}

// ==========================================
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

if (loanPaid) {

    loanPaid.value = 0;

}

if (loanBalance) {

    loanBalance.value = 0;

}

if (loanType) {
    loanType.value = "new";
}

    if(loanId){

        loanId.value = "";

    }

    calculateLoan();

    if(loanDueDate){

        loanDueDate.value = today();

    }

if(loanStartDate){

    loanStartDate.value = today();

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

if (loanForm) {

    loanForm.addEventListener("submit", async (e) => {

        let step = "START";

        try {

            e.preventDefault();

            step = "Submit clicked";

            const calc = calculateLoan();

            step = "calculateLoan()";

            const isHistorical =
                loanType?.value === "historical";

            step = "loanType";

            const amountPaid =
                isHistorical
                    ? Number(loanPaid?.value || 0)
                    : 0;

            step = "amountPaid";

            const outstandingBalance =
                isHistorical
                    ? Number(
                        loanBalance?.value ||
                        calc.totalRepayment
                    )
                    : calc.totalRepayment;

            step = "outstandingBalance";

            const client =
                clients.find(
                    c => c.id === loanClient.value
                );

            step = "client lookup";

            if (!client) {

                throw new Error(
                    "No client selected."
                );

            }

            const approvalDate =
                isHistorical
                    ? new Date(
                        loanStartDate?.value
                    )
                    : new Date();

            step = "approvalDate";

            let repaymentSchedule =
    generateRepaymentSchedule(
        approvalDate,
        calc.duration,
        calc.weeklyPayment,
        calc.totalRepayment
    );

            step = "repaymentSchedule";

            if (isHistorical) {

                repaymentSchedule =
                    applyHistoricalPayments(
                        repaymentSchedule,
                        amountPaid
                    );

            }

            step = "historical payments";

            const loanData = {

    clientId: client.id,

    clientName: client.name,

    loanNumber: "LN-" + Date.now(),

    loanType: loanType?.value || "new",

    amount: calc.amount,

    processingFee: calc.processingFee,

    interest: calc.interest,

    duration: calc.duration,

    repayment: calc.weeklyPayment,

    weeklyPayment: calc.weeklyPayment,

    totalRepayment: calc.totalRepayment,

    balance: outstandingBalance,

    totalIncome: calc.processingFee,

    openingBalance: calc.totalRepayment,

    amountPaid: amountPaid,

    approvalDate: formatDate(approvalDate),

    dueDate: loanDueDate?.value || "",

    repaymentSchedule: repaymentSchedule,

    nextRepaymentDate: repaymentSchedule[0]?.dueDate || null,

    remainingInstallments: calc.duration,

    status: isHistorical
        ? (outstandingBalance <= 0 ? "Completed" : "Approved")
        : "Pending",

    completed: outstandingBalance <= 0,

    createdBy:
        localStorage.getItem("userName") ||
        localStorage.getItem("userEmail") ||
        "Unknown Officer",

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp()

};
             
            step = "loanData created";

            console.log("loanData", loanData);

            if (loanId?.value) {

                step = "updateDoc";

                await updateDoc(

                    doc(db, "loans", loanId.value),

                    {

                        ...loanData,

                        updatedAt:
                            serverTimestamp()

                    }

                );

                alert("Loan updated successfully.");

            } else {

                step = "addDoc";

                await addDoc(

                    collection(db, "loans"),

                    loanData

                );

                alert("Loan created successfully.");

            }

            loanForm.reset();

            loanId.value = "";

            calculateLoan();

            loanModal.classList.add("hidden");

        } catch (error) {

            console.error(error);

            alert(
                "ERROR DETECTED\n\n" +
                "Last Step:\n" + step +
                "\n\nName:\n" + error.name +
                "\n\nMessage:\n" + error.message +
                "\n\nStack:\n" + error.stack
            );

        }

    });

}

// ==========================================
// PART 5 OF 8
// RENDER LOANS TABLE
// ==========================================

function renderLoans(list){

    if(!loansTableBody) return;

    loansTableBody.innerHTML = "";

// ==========================================
// SORT BY DISBURSEMENT DATE (LATEST FIRST)
// GROUP SAME DATES TOGETHER
// ==========================================

list.sort((a, b) => {

    const dateA = a.approvalDate || "";
    const dateB = b.approvalDate || "";

    if (dateA !== dateB) {

        return new Date(dateB) - new Date(dateA);

    }

    return (a.clientName || "")
        .localeCompare(b.clientName || "");

});

    if(list.length === 0){

        loansTableBody.innerHTML = `
            <tr>
                <td colspan="15" style="text-align:center;">
                    No loans found.
                </td>
            </tr>
        `;

        return;

    }

    list.forEach((loan, index) => {

    if (!loan || !loan.id) return;

    const row = document.createElement("tr");

    row.innerHTML = `

        <td>${index + 1}</td>

        <td>${loan.approvalDate || loan.disbursementDate || "-"}</td>

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

            <button class="view-loan"
                data-id="${loan.id}"
                title="View Schedule">
                👁️
            </button>

            ${loan.status !== "Completed" ? `
            <button class="repay-loan"
                data-id="${loan.id}"
                title="Receive Repayment">
                💵
            </button>
            ` : ""}

            ${loan.status === "Pending" ? `
            <button class="edit-loan"
                data-id="${loan.id}"
                title="Edit">
                ✏️
            </button>

            <button class="approve-loan"
                data-id="${loan.id}"
                title="Approve">
                ✔️
            </button>
            ` : ""}

            ${loan.status === "Pending" && isAdmin() ? `
            <button class="delete-loan"
                data-id="${loan.id}"
                title="Delete">
                🗑️
            </button>
            ` : ""}

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

            (loan.clientName || "")
.toLowerCase()
.includes(keyword)

            ||

            String(loan.id)
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
// RECEIVE REPAYMENT
// ==========================================

document.querySelectorAll(".repay-loan").forEach(button => {

    button.onclick = () => {

        const loan = loans.find(
            l => l.id === button.dataset.id
        );

        if (!loan) return;

        repaymentLoanId.value = loan.id;

        repaymentClient.value =
            loan.clientName;

        repaymentBalance.value =
            currency(loan.balance);

const weeklyRepayment =
    document.getElementById("repayment-weekly");

if (weeklyRepayment) {

    weeklyRepayment.value =
        currency(loan.weeklyPayment);

}

        repaymentAmount.value = "";

        repaymentNotes.value = "";

        repaymentDate.value = today();

        repaymentModal.classList.remove("hidden");

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

if (loanType) {

    loanType.value =
        loan.loanType || "new";

}

        calculateLoan();

        loanModal.classList.remove("hidden");

    };

});


// ==========================================
// APPROVE LOAN
// ==========================================

document.querySelectorAll(".approve-loan").forEach(button => {

    button.onclick = async () => {

        const loan = loans.find(
            l => l.id === button.dataset.id
        );

        if (!loan) return;

        if (loan.status !== "Pending") {

            alert("Loan is already approved.");

            return;

        }

        try {

            const approvalDate = new Date();

            const schedule = generateRepaymentSchedule(
    approvalDate,
    loan.duration,
    loan.weeklyPayment,
    loan.totalRepayment
);

            await updateDoc(
                doc(db, "loans", loan.id),
                {

                    approvalDate: formatDate(approvalDate),

                    repaymentSchedule: schedule,

                    nextRepaymentDate:
                        schedule.length
                            ? schedule[0].dueDate
                            : "-",

                    remainingInstallments:
                        schedule.length,

                    status: "Approved",

                    updatedAt: serverTimestamp()

                }
            );

            alert("Loan approved successfully.");

        } catch (error) {

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

                <td>
    ${currency(item.paidAmount)}
    /
    ${currency(item.amount)}
</td>

                <td>

                    ${
    item.paid
        ? "✅ Paid"
        : item.paidAmount > 0
            ? "🟡 Partial"
            : "⏳ Pending"
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
// RECEIVE REPAYMENT
// ==========================================

repaymentForm?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const loan = loans.find(
        l => l.id === repaymentLoanId.value
    );

    if (!loan) {
        alert("Loan not found.");
        return;
    }

    const payment = Number(repaymentAmount.value);

if (payment > loan.balance) {

    alert("Payment cannot exceed the outstanding balance.");

    return;

}

    if (payment <= 0) {
        alert("Enter a valid repayment amount.");
        return;
    }

    let balance = Number(loan.balance);
    let amountPaid = Number(loan.amountPaid || 0);

    balance -= payment;

if (balance < 0) {

    balance = 0;

}

    amountPaid += payment;

const totalInterest =
    Number(loan.totalRepayment) - Number(loan.amount);

const interestRatio =
    totalInterest / Number(loan.totalRepayment);

const incomeEarned =
    payment * interestRatio;

const totalIncome =
    Number(loan.totalIncome || 0) + incomeEarned;

    const schedule = [...loan.repaymentSchedule];

    let remaining = payment;

    for (const item of schedule) {

        if (remaining <= 0) break;

        if (item.paid) continue;

        const unpaid = item.amount - item.paidAmount;

        if (remaining >= unpaid) {

            item.paidAmount += unpaid;
            item.remainingAmount = 0;
            item.paid = true;
            item.status = "Paid";
            item.paidDate = repaymentDate.value;

item.paymentHistory ??= [];

item.paymentHistory.push({
    amount: unpaid,
    date: repaymentDate.value,
    notes: repaymentNotes.value || ""
});

            remaining -= unpaid;

        } else {

            item.paidAmount += remaining;
            item.remainingAmount -= remaining;
            item.status = "Partial";

item.paymentHistory ??= [];

item.paymentHistory.push({
    amount: remaining,
    date: repaymentDate.value,
    notes: repaymentNotes.value || ""
});

            remaining = 0;

        }

    }

    const next = schedule.find(x => !x.paid);

    let status = "Approved";

const todayDate = today();

if (
    next &&
    next.dueDate < todayDate
) {

    status = "Arrears";

}

    if (balance <= 0) {

        status = "Completed";
        balance = 0;

    }

    try {

        await updateDoc(
            doc(db, "loans", loan.id),
            {

                balance,

                amountPaid,

                totalIncome,

                repaymentSchedule: schedule,

                nextRepaymentDate: next ? next.dueDate : "-",

                remainingInstallments: schedule.filter(x => !x.paid).length,

                status,

                updatedAt: serverTimestamp()

            }
        );

        repaymentModal.classList.add("hidden");

        repaymentForm.reset();

        alert("Repayment recorded successfully.");

    } catch (error) {

        console.error(error);

        alert("Failed to record repayment.");

    }

});

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