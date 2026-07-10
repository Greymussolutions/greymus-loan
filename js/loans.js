// js/loans.js

import {
    db
} from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ELEMENTS

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


// INPUTS

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


// PREVIEW

const previewPrincipal =
    document.getElementById("preview-principal");

const previewInterest =
    document.getElementById("preview-interest");

const previewDuration =
    document.getElementById("preview-duration");

const previewMonthly =
    document.getElementById("preview-monthly");


// DATA

let loans = [];


// FORMAT MONEY

function currency(value) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(value || 0);

}


// LOAD CLIENT OPTIONS

function loadLoanClients() {


    const clientsRef =
        collection(
            db,
            "clients"
        );


    onSnapshot(
        clientsRef,
        (snapshot) => {


            if (!loanClient) return;


            loanClient.innerHTML = `

                <option value="">
                    Select Client
                </option>

            `;


            snapshot.forEach(
                (item) => {


                    const client =
                        item.data();


                    loanClient.innerHTML += `

                        <option value="${item.id}">
                            ${client.name}
                        </option>

                    `;


                }
            );


        }
    );


}


// CALCULATE LOAN

function calculateLoan() {


    const amount =
        Number(
            loanAmount?.value || 0
        );


    const interest =
        Number(
            loanInterest?.value || 0
        );


    const duration =
        Number(
            loanDuration?.value || 0
        );


    const total =
        amount +
        (amount * interest / 100);


    const monthly =
        duration > 0
            ? total / duration
            : 0;



    if (previewPrincipal)
        previewPrincipal.textContent =
            currency(amount);


    if (previewInterest)
        previewInterest.textContent =
            `${interest}%`;


    if (previewDuration)
        previewDuration.textContent =
            `${duration} Months`;


    if (previewMonthly)
        previewMonthly.textContent =
            currency(monthly);


}


[
    loanAmount,
    loanInterest,
    loanDuration

].forEach(
    input => {

        if (input) {

            input.addEventListener(
                "input",
                calculateLoan
            );

        }

    }
);


// RENDER LOANS

function renderLoans(list) {


    if (!loansTableBody) return;


    loansTableBody.innerHTML = "";


    list.forEach(
        (loan) => {


            const row =
                document.createElement("tr");


            row.innerHTML = `

            <td>${loan.id.slice(0,8)}</td>

            <td>${loan.clientName || "-"}</td>

            <td>${currency(loan.amount)}</td>

            <td>${loan.interest || 0}%</td>

            <td>${loan.duration || 0} Months</td>

            <td>${currency(loan.repayment)}</td>

            <td>${loan.dueDate || "-"}</td>

            <td><span class="status ${loan.status?.toLowerCase()}">${loan.status || "Pending"}</span></td>

            <td>${loan.officer || "-"}</td>

            <td>

            <button class="btn-icon btn-edit edit-loan"
            data-id="${loan.id}"
            title="Edit">
            ✏️
            </button>

            <button class="btn-icon btn-view approve-loan"
            data-id="${loan.id}"
            title="Approve">
            ✓
            </button>

            <button class="btn-icon btn-delete delete-loan"
            data-id="${loan.id}"
            title="Delete">
            🗑️
            </button>

            </td>

            `;


            loansTableBody.appendChild(row);


        }
    );


    attachLoanActions();

}


// LOAD LOANS

function loadLoans() {


    const loansRef =
        collection(
            db,
            "loans"
        );


    onSnapshot(
        loansRef,
        (snapshot) => {


            loans = [];


            snapshot.forEach(
                (item) => {


                    loans.push({

                        id:item.id,

                        ...item.data()

                    });


                }
            );


            renderLoans(
                loans
            );


        }
    );


}


// SAVE LOAN

if (loanForm) {


loanForm.addEventListener(
"submit",
async(e)=>{


e.preventDefault();


const amount =
Number(loanAmount.value || 0);


const interest =
Number(loanInterest.value || 0);


const duration =
Number(loanDuration.value || 0);


const repayment =
(
amount +
(amount * interest /100)
)
/ duration;



const data = {


clientId:
loanClient.value,


amount,

processingFee:
Number(
loanProcessingFee?.value || 0
),


interest,

duration,


repayment,


dueDate:
loanDueDate.value,


status:
"Pending",


officer:
localStorage.getItem(
"userRole"
)
|| "User",


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

data

);


}else{


await addDoc(

collection(
db,
"loans"
),

{

...data,

createdAt:
serverTimestamp()

}

);


}


loanForm.reset();

loanId.value="";


loanModal.classList.add(
"hidden"
);


}catch(error){

console.error(
"Loan error:",
error
);

}


});

}


// SEARCH AND FILTER

function filterLoans(){


let result =
[...loans];


const search =
loanSearch?.value
.toLowerCase()
|| "";


const status =
loanFilter?.value
|| "ALL";



result =
result.filter(
loan => {


const matchesSearch =

loan.clientName
?.toLowerCase()
.includes(search)

||

loan.id
.includes(search);



const matchesStatus =

status === "ALL"

||

loan.status === status;



return matchesSearch &&
matchesStatus;


});


renderLoans(
result
);


}


if(loanSearch)

loanSearch.addEventListener(
"input",
filterLoans
);


if(loanFilter)

loanFilter.addEventListener(
"change",
filterLoans
);


// ACTIONS

function attachLoanActions(){


document
.querySelectorAll(".delete-loan")
.forEach(
button=>{


button.addEventListener(
"click",
async()=>{

if(confirm("Delete this loan?")){

await deleteDoc(

doc(
db,
"loans",
button.dataset.id
)

);

}

});


});


document
.querySelectorAll(".approve-loan")
.forEach(
button=>{


button.addEventListener(
"click",
async()=>{

try{

await updateDoc(

doc(
db,
"loans",
button.dataset.id
),

{
status: "Approved",
updatedAt: serverTimestamp()
}

);

}catch(error){

console.error("Approve error:", error);

}

});


});


document
.querySelectorAll(".edit-loan")
.forEach(
button=>{


button.addEventListener(
"click",
async()=>{

const loanData = loans.find(l => l.id === button.dataset.id);

if(loanData){

loanId.value = loanData.id;
loanClient.value = loanData.clientId;
loanAmount.value = loanData.amount;
loanProcessingFee.value = loanData.processingFee || 0;
loanInterest.value = loanData.interest;
loanDuration.value = loanData.duration;
loanDueDate.value = loanData.dueDate;

calculateLoan();

loanModal.classList.remove("hidden");

}

});


});


}


// CLOSE MODAL

document
.querySelectorAll(".close-modal")
.forEach(
button=>{


button.addEventListener(
"click",
()=>{

loanModal.classList.add(
"hidden"
);

loanId.value = "";

loanForm.reset();

}
);


});


// START

loadLoanClients();

loadLoans();


// EXPORT

export {
    loadLoans,
    calculateLoan
};
