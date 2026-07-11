// =====================================
// GREYMUS LOAN FINANCIAL HUB
// repayments.js
// Version 1.1
// =====================================

import { db } from "./firebase.js";

import {
collection,
addDoc,
doc,
updateDoc,
onSnapshot
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================
// ELEMENTS
// =====================================

const repaymentForm =
document.getElementById("repayment-form");

const repaymentLoan =
document.getElementById("repayment-loan");

const repaymentAmount =
document.getElementById("repayment-amount");

const repaymentMethod =
document.getElementById("repayment-method");

const repaymentTransaction =
document.getElementById("repayment-transaction");

const repaymentDate =
document.getElementById("repayment-date");

const repaymentsTable =
document.getElementById("repayments-table-body");


// =====================================
// DATA
// =====================================

let loans=[];


// =====================================
// FORMAT
// =====================================

function money(value){

return new Intl.NumberFormat(
"en-KE",
{
style:"currency",
currency:"KES",
maximumFractionDigits:0
}
).format(value||0);

}


// =====================================
// LOAD APPROVED LOANS
// =====================================

const loansRef =
collection(db,"loans");

onSnapshot(loansRef,(snapshot)=>{

loans=[];

if(repaymentLoan){

repaymentLoan.innerHTML=
`<option value="">Select Loan</option>`;

}

snapshot.forEach(docSnap=>{

const loan={
id:docSnap.id,
...docSnap.data()
};

if(
loan.status==="Approved" ||
loan.status==="Arrears"
){

loans.push(loan);

if(repaymentLoan){

repaymentLoan.innerHTML+=`

<option value="${loan.id}">

${loan.clientName}
-
${money(loan.amount)}

</option>

`;

}

}

});

});


// =====================================
// SAVE REPAYMENT
// =====================================

if(repaymentForm){

repaymentForm.addEventListener(
"submit",
async(e)=>{

e.preventDefault();

const loan=
loans.find(
l=>l.id===repaymentLoan.value
);

if(!loan){

alert("Select Loan");

return;

}

const amount=
Number(repaymentAmount.value);

const balance=
Number(
loan.balance ??
loan.totalRepayment
);

const newBalance=
balance-amount;


// Save repayment

await addDoc(

collection(db,"repayments"),

{

loanId:loan.id,

clientName:loan.clientName,

amount,

paymentMethod:
repaymentMethod.value,

transactionId:
repaymentTransaction.value,

paymentDate:
repaymentDate.value,

createdAt:new Date()

}

);


// Update Loan

const update={

balance:newBalance

};

if(newBalance<=0){

update.status="Completed";

update.balance=0;

}

await updateDoc(

doc(db,"loans",loan.id),

update

);

alert("Repayment Saved");

repaymentForm.reset();

}

);

}


// =====================================
// LOAD REPAYMENTS
// =====================================

const repaymentsRef=
collection(db,"repayments");

onSnapshot(

repaymentsRef,

(snapshot)=>{

if(!repaymentsTable) return;

repaymentsTable.innerHTML="";

snapshot.forEach(docSnap=>{

const data=
docSnap.data();

const row=
document.createElement("tr");

row.innerHTML=`

<td>${data.clientName}</td>

<td>${money(data.amount)}</td>

<td>${data.paymentMethod}</td>

<td>${data.transactionId||"-"}</td>

<td>${data.paymentDate}</td>

`;

repaymentsTable.appendChild(row);

});

}

);


// =====================================
// EXPORT
// =====================================

export{};
