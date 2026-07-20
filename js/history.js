// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 1.0
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const historyBtn =
    document.getElementById("transaction-history-btn");

const historyModal =
    document.getElementById("transaction-history-modal");

const closeHistory =
    document.getElementById("close-transaction-history");

const historyBody =
    document.getElementById("transaction-history-body");

const historySearch =
    document.getElementById("transaction-search");

const historyFilter =
    document.getElementById("transaction-filter");

let loans = [];

function currency(value){

    return new Intl.NumberFormat("en-KE",{

        style:"currency",

        currency:"KES",

        maximumFractionDigits:0

    }).format(Number(value)||0);

}

historyBtn?.addEventListener("click",()=>{

    historyModal.classList.remove("hidden");

});

closeHistory?.addEventListener("click",()=>{

    historyModal.classList.add("hidden");

});

window.addEventListener("click",(e)=>{

    if(e.target===historyModal){

        historyModal.classList.add("hidden");

    }

});

onSnapshot(

    collection(db,"loans"),

    snapshot=>{

        loans=[];

        snapshot.forEach(doc=>{

            loans.push({

                id:doc.id,

                ...doc.data()

            });

        });

        renderHistory();

    }

);