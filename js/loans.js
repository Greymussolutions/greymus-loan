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
