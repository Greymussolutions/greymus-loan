// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// history.js
// VERSION 1.0
// PART 1 OF 4
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot,
    query,
    orderBy
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

    return "KES " + Number(amount || 0).toLocaleString();

}

function formatDate(value) {

    if (!value) return "-";

    try {

        if (value.toDate) {

            return value.toDate().toLocaleDateString();

        }

        return new Date(value).toLocaleDateString();

    } catch {

        return "-";

    }

}

function formatTime(value) {

    if (!value) return "-";

    try {

        if (value.toDate) {

            return value.toDate().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

        }

        return new Date(value).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

    } catch {

        return "-";

    }

}

// ==========================================
// LOAD REPAYMENTS
// ==========================================

const repaymentsQuery = query(
    collection(db, "repayments"),
    orderBy("paymentDate", "desc")
);

onSnapshot(repaymentsQuery, (snapshot) => {

    repayments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    renderHistory();

});

// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory(searchText = "") {

    if (!historyBody) return;

    const keyword = searchText.toLowerCase().trim();

    const filtered = repayments.filter(item => {

        const client =
            (item.clientName || "").toLowerCase();

        const loan =
            (item.loanNumber || "").toLowerCase();

        return client.includes(keyword) ||
               loan.includes(keyword);

    });

    if (filtered.length === 0) {

        historyBody.innerHTML = `

            <tr>

                <td colspan="7" style="text-align:center">

                    No repayments recorded.

                </td>

            </tr>

        `;

        return;

    }

    historyBody.innerHTML = "";

    filtered.forEach(item => {

        historyBody.innerHTML += `

            <tr>

                <td>${formatDate(item.paymentDate)}</td>

<td>${item.paymentTime || formatTime(item.paymentTimestamp)}</td>

<td>${item.clientName || "-"}</td>

                <td>${item.loanNumber || "-"}</td>

                <td>${formatMoney(item.amount)}</td>

                <td>${formatMoney(item.balance)}</td>

                <td>${item.officer || "-"}</td>

            </tr>

        `;

    });

}

// ==========================================
// SEARCH
// ==========================================

if (historySearch) {

    historySearch.addEventListener("input", (e) => {

        renderHistory(e.target.value);

    });

}

// ==========================================
// REFRESH HISTORY
// ==========================================

export function refreshHistory() {

    renderHistory(
        historySearch ? historySearch.value : ""
    );

}

// ==========================================
// INITIALIZE HISTORY
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    if (!historyBody) return;

    renderHistory();

});

// ==========================================
// GLOBAL ACCESS
// ==========================================

window.refreshRepaymentHistory = refreshHistory;

// ==========================================
// END OF FILE
// ==========================================