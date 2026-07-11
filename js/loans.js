// =====================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// Version 1.1
// Part 1A
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
    ).format(value || 0);

}


// =====================================
// CALCULATE LOAN
// =====================================

function calculateLoan(){

    const amount =
    Number(loanAmount?.value || 0);

    const interest =
    Number(loanInterest?.value || 0);

    const duration =
    Number(loanDuration?.value || 0);

    const interestAmount =
    amount * interest / 100;

    const totalRepayment =
    amount + interestAmount;

    const weeklyPayment =
    duration > 0
    ? totalRepayment / duration
    : 0;

    if(previewPrincipal){

        previewPrincipal.textContent =
        currency(amount);

    }

    if(previewInterest){

        previewInterest.textContent =
        currency(interestAmount);

    }

    if(previewDuration){

        previewDuration.textContent =
        duration + " Weeks";

    }

    if(previewMonthly){

        previewMonthly.textContent =
        currency(weeklyPayment);

    }

    return{

        amount,

        interest,

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
loanDuration

].forEach(input=>{

    if(input){

        input.addEventListener(
            "input",
            calculateLoan
        );

    }

});// =====================================
// LOAD CLIENTS
// =====================================

function loadClients() {

    const clientsRef = collection(db, "clients");

    onSnapshot(clientsRef, (snapshot) => {

        clients = [];

        snapshot.forEach((docSnap) => {

            clients.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

        populateClientDropdown();

        renderLoans(loans);

    });

}


// =====================================
// CLIENT DROPDOWN
// =====================================

function populateClientDropdown() {

    if (!loanClient) return;

    loanClient.innerHTML =
        `<option value="">Select Client</option>`;

    clients.forEach((client) => {

        loanClient.innerHTML += `

            <option value="${client.id}">
                ${client.name}
            </option>

        `;

    });

}


// =====================================
// LOAD LOANS
// =====================================

function loadLoans() {

    const loansRef = collection(db, "loans");

    onSnapshot(loansRef, (snapshot) => {

        loans = [];

        snapshot.forEach((docSnap) => {

            const loan = {

                id: docSnap.id,

                ...docSnap.data()

            };

            // Ensure new fields exist
            if (loan.balance === undefined) {
                loan.balance =
                    Number(
                        loan.totalRepayment || 0
                    );
            }

            if (loan.processingFeeAdded === undefined) {
                loan.processingFeeAdded = false;
            }

            loans.push(loan);

        });

        renderLoans(loans);

    });

}


// =====================================
// OPEN LOAN MODAL
// =====================================

function openLoanModal() {

    if (!loanModal) return;

    loanForm.reset();

    loanId.value = "";

    calculateLoan();

    loanModal.classList.remove("hidden");

}


// =====================================
// NEW LOAN BUTTON
// =====================================

document
.getElementById("new-loan-btn")
?.addEventListener("click", openLoanModal);


document
.getElementById("fab-new-loan")
?.addEventListener("click", openLoanModal);// =====================================
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

        const loanData = {

            clientId: loanClient.value,

            clientName: selectedClient.name,

            amount: calculation.amount,

            processingFee: Number(
                loanProcessingFee.value || 0
            ),

            interest: calculation.interest,

            duration: calculation.duration,

            repayment: calculation.weeklyPayment,

            weeklyPayment: calculation.weeklyPayment,

            totalRepayment: calculation.totalRepayment,

            balance: calculation.totalRepayment,

            dueDate: loanDueDate.value,

            status: "Pending",

            processingFeeAdded: false,

            completed: false,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()

        };

        try {

            if (loanId.value) {

                await updateDoc(

                    doc(db, "loans", loanId.value),

                    {

                        ...loanData,

                        createdAt: undefined,

                        updatedAt: serverTimestamp()

                    }

                );

            } else {

                await addDoc(

                    collection(db, "loans"),

                    loanData

                );

            }

            loanForm.reset();

            loanId.value = "";

            calculateLoan();

            loanModal.classList.add("hidden");

            alert("Loan saved successfully.");

        } catch (error) {

            console.error(error);

            alert("Failed to save loan.");

        }

    });

}// =====================================
// RENDER LOANS TABLE
// =====================================

function renderLoans(list) {

    if (!loansTableBody) return;

    loansTableBody.innerHTML = "";

    list.forEach((loan) => {

        const row = document.createElement("tr");

        const balance =
            Number(
                loan.balance ??
                loan.totalRepayment ??
                0
            );

        row.innerHTML = `

        <tr>

            <td>${loan.id.substring(0,8)}</td>

            <td>${loan.clientName}</td>

            <td>${currency(loan.amount)}</td>

            <td>${loan.interest}%</td>

            <td>${loan.duration} Weeks</td>

            <td>${currency(loan.weeklyPayment || loan.repayment)}</td>

            <td>${currency(balance)}</td>

            <td>${loan.dueDate}</td>

            <td>

                <span class="status ${String(loan.status).toLowerCase()}">

                    ${loan.status}

                </span>

            </td>

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

        </tr>

        `;

        loansTableBody.appendChild(row);

    });

    attachLoanActions();

}


// =====================================
// SEARCH & FILTER
// =====================================

function filterLoans() {

    let filtered = [...loans];

    const search =
        loanSearch?.value
        .toLowerCase()
        .trim() || "";

    const status =
        loanFilter?.value || "ALL";

    filtered = filtered.filter((loan) => {

        const matchesSearch =

            loan.clientName
            ?.toLowerCase()
            .includes(search)

            ||

            loan.id
            .toLowerCase()
            .includes(search);

        const matchesStatus =

            status === "ALL"

            ||

            loan.status === status;

        return matchesSearch && matchesStatus;

    });

    renderLoans(filtered);

}

loanSearch?.addEventListener(
    "input",
    filterLoans
);

loanFilter?.addEventListener(
    "change",
    filterLoans
);// =====================================
// LOAN ACTIONS
// =====================================

function attachLoanActions() {

    // ==========================
    // VIEW LOAN
    // ==========================

    document.querySelectorAll(".view-loan").forEach((button) => {

        button.onclick = () => {

            const loan = loans.find(
                l => l.id === button.dataset.id
            );

            if (!loan) return;

            alert(

`Loan Number: ${loan.id.substring(0,8)}

Client: ${loan.clientName}

Principal: ${currency(loan.amount)}

Interest: ${loan.interest}%

Processing Fee: ${currency(loan.processingFee)}

Weekly Payment: ${currency(loan.weeklyPayment)}

Total Repayment: ${currency(loan.totalRepayment)}

Outstanding Balance: ${currency(loan.balance)}

Duration: ${loan.duration} Weeks

Due Date: ${loan.dueDate}

Status: ${loan.status}`

            );

        };

    });


    // ==========================
    // APPROVE LOAN
    // ==========================

    document.querySelectorAll(".approve-loan").forEach((button) => {

        button.onclick = async () => {

            const loan = loans.find(
                l => l.id === button.dataset.id
            );

            if (!loan) return;

            if (loan.status !== "Pending") {

                alert("Only pending loans can be approved.");

                return;

            }

            try {

                await updateDoc(

                    doc(db, "loans", loan.id),

                    {

                        status: "Approved",

                        updatedAt: serverTimestamp()

                    }

                );

                alert("Loan approved successfully.");

            }

            catch (error) {

                console.error(error);

                alert("Failed to approve loan.");

            }

        };

    });

}    // ==========================
    // EDIT LOAN
    // ==========================

    document.querySelectorAll(".edit-loan").forEach((button) => {

        button.onclick = () => {

            const loan = loans.find(
                l => l.id === button.dataset.id
            );

            if (!loan) return;

            if (loan.status === "Completed") {

                alert("Completed loans cannot be edited.");

                return;

            }

            loanId.value = loan.id;

            loanClient.value = loan.clientId;

            loanAmount.value = loan.amount;

            loanProcessingFee.value =
                loan.processingFee || 0;

            loanInterest.value =
                loan.interest;

            loanDuration.value =
                loan.duration;

            loanDueDate.value =
                loan.dueDate;

            calculateLoan();

            loanModal.classList.remove("hidden");

        };

    });


    // ==========================
    // DELETE LOAN
    // ==========================

    document.querySelectorAll(".delete-loan").forEach((button) => {

        button.onclick = async () => {

            const loan = loans.find(
                l => l.id === button.dataset.id
            );

            if (!loan) return;

            if (loan.status === "Completed") {

                alert("Completed loans cannot be deleted.");

                return;

            }

            const confirmed = confirm(
                "Are you sure you want to delete this loan?"
            );

            if (!confirmed) return;

            try {

                await deleteDoc(

                    doc(
                        db,
                        "loans",
                        loan.id
                    )

                );

                alert("Loan deleted successfully.");

            }

            catch (error) {

                console.error(error);

                alert("Failed to delete loan.");

            }

        };

    });

}// =====================================
// CLOSE LOAN MODAL
// =====================================

document.querySelectorAll(".close-modal").forEach((button) => {

    button.addEventListener("click", () => {

        if (loanModal) {

            loanModal.classList.add("hidden");

        }

        if (loanForm) {

            loanForm.reset();

        }

        if (loanId) {

            loanId.value = "";

        }

        calculateLoan();

    });

});


// =====================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================

if (loanModal) {

    loanModal.addEventListener("click", (e) => {

        if (e.target === loanModal) {

            loanModal.classList.add("hidden");

            loanForm.reset();

            loanId.value = "";

            calculateLoan();

        }

    });

}


// =====================================
// INITIALIZE PREVIEW
// =====================================

calculateLoan();


// =====================================
// START MODULE
// =====================================

loadClients();

loadLoans();


// =====================================
// EXPORTS
// =====================================

export {

    loadLoans,

    renderLoans,

    calculateLoan,

    currency

};// =====================================
// HELPER FUNCTIONS
// =====================================

function getLoanById(id) {

    return loans.find(loan => loan.id === id);

}

function refreshLoanTable() {

    filterLoans();

}


// =====================================
// CHECK FOR OVERDUE LOANS
// =====================================

function checkOverdueLoans() {

    const today = new Date();

    loans.forEach(async (loan) => {

        if (
            loan.status === "Approved" &&
            Number(loan.balance || 0) > 0 &&
            loan.dueDate
        ) {

            const dueDate = new Date(loan.dueDate);

            if (today > dueDate) {

                try {

                    await updateDoc(

                        doc(db, "loans", loan.id),

                        {

                            status: "Arrears",

                            updatedAt: serverTimestamp()

                        }

                    );

                } catch (error) {

                    console.error(
                        "Failed to update arrears:",
                        error
                    );

                }

            }

        }

    });

}


// =====================================
// REFRESH TABLE AFTER REALTIME CHANGES
// =====================================

setInterval(() => {

    if (loans.length > 0) {

        checkOverdueLoans();

    }

}, 60000);


// =====================================
// END OF FILE
// =====================================