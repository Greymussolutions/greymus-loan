// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 1.1
// FIXED REPAYMENT HISTORY LOADING
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const historyBody =
    document.getElementById("history-table-body");

const historySearch =
    document.getElementById("history-search");


// ==========================================
// DATA
// ==========================================

let repayments = [];


// ==========================================
// FORMATTERS
// ==========================================

function formatMoney(amount) {

    return "KES " +
        Number(amount || 0).toLocaleString();

}


function formatDate(value) {

    if (!value) return "-";

    try {

        if (value?.toDate) {

            return value.toDate().toLocaleDateString();

        }

        const date = new Date(value);

        if (isNaN(date.getTime())) {

            return String(value);

        }

        return date.toLocaleDateString();

    } catch {

        return "-";

    }

}


function formatTime(value) {

    if (!value) return "-";

    try {

        if (value?.toDate) {

            return value.toDate().toLocaleTimeString([], {

                hour: "2-digit",

                minute: "2-digit",

                second: "2-digit"

            });

        }

        const date = new Date(value);

        if (isNaN(date.getTime())) {

            return String(value);

        }

        return date.toLocaleTimeString([], {

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit"

        });

    } catch {

        return "-";

    }

}


// ==========================================
// LOAD REPAYMENTS
// ==========================================

onSnapshot(

    collection(db, "repayments"),

    (snapshot) => {

        repayments = snapshot.docs.map(docSnap => ({

            id: docSnap.id,

            ...docSnap.data()

        }));

        console.log(
            "Repayments loaded:",
            repayments
        );

        renderHistory(
            historySearch
                ? historySearch.value
                : ""
        );

    },

    (error) => {

        console.error(
            "Failed to load repayment history:",
            error
        );

        if (historyBody) {

            historyBody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        style="text-align:center;"
                    >

                        Unable to load repayment history.

                    </td>

                </tr>

            `;

        }

    }

);


// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory(searchText = "") {

    if (!historyBody) return;

    const keyword =
        searchText
            .toLowerCase()
            .trim();


    // ======================================
    // FILTER
    // ======================================

    const filtered =
        repayments.filter(item => {

            const client =
                String(item.clientName || "")
                    .toLowerCase();

            const loan =
                String(item.loanNumber || "")
                    .toLowerCase();

            return (
                client.includes(keyword) ||
                loan.includes(keyword)
            );

        });


    // ======================================
    // SORT
    // LATEST REPAYMENT FIRST
    // ======================================

    filtered.sort((a, b) => {

        const dateA =
            new Date(
                a.paymentTimestamp ||
                a.paymentDate ||
                0
            ).getTime();

        const dateB =
            new Date(
                b.paymentTimestamp ||
                b.paymentDate ||
                0
            ).getTime();

        return dateB - dateA;

    });


    // ======================================
    // EMPTY
    // ======================================

    if (filtered.length === 0) {

        historyBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;"
                >

                    No repayments recorded.

                </td>

            </tr>

        `;

        return;

    }


    // ======================================
    // DISPLAY
    // ======================================

    historyBody.innerHTML = "";


    filtered.forEach(item => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${formatDate(item.paymentDate)}
            </td>

            <td>
                ${
                    item.paymentTime ||
                    formatTime(item.paymentTimestamp)
                }
            </td>

            <td>
                ${item.clientName || "-"}
            </td>

            <td>
                ${item.loanNumber || "-"}
            </td>

            <td>
                ${formatMoney(item.amount)}
            </td>

            <td>
                ${formatMoney(item.balance)}
            </td>

            <td>
                ${item.officer || "-"}
            </td>

        `;


        historyBody.appendChild(row);

    });

}


// ==========================================
// SEARCH
// ==========================================

if (historySearch) {

    historySearch.addEventListener(
        "input",
        (e) => {

            renderHistory(
                e.target.value
            );

        }
    );

}


// ==========================================
// REFRESH HISTORY
// ==========================================

export function refreshHistory() {

    renderHistory(

        historySearch
            ? historySearch.value
            : ""

    );

}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (!historyBody) return;

        renderHistory();

    }
);


// ==========================================
// GLOBAL ACCESS
// ==========================================

window.refreshRepaymentHistory =
    refreshHistory;


// ==========================================
// END OF FILE
// ==========================================