// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js (Integrated with messaging.js + SMS)
// VERSION 8.2
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

// Import messaging functions
import { buildMessage, getClientPhone } from "./messaging.js";

// ==========================================
// ADMIN SETTINGS
// ==========================================

const ADMIN_EMAIL = "gayisi0901@gmail.com";
function isAdmin() {
    return (localStorage.getItem("userEmail") || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// ==========================================
// SMS Trigger Helper
// ==========================================

function sendSMS(client, smsMessage) {
    const phone = getClientPhone(client);
    if (!phone) {
        console.warn("No phone number for client:", client);
        return;
    }
    // Open native SMS app with prefilled message
    window.location.href = `sms:${phone}?body=${encodeURIComponent(smsMessage)}`;
}

// ==========================================
// DOM ELEMENTS
// ==========================================
// (Keep all your existing DOM element definitions here — loanForm, loanModal, repaymentForm, tables, filters, etc.)

// ==========================================
// DATA STATE, HELPERS, CALCULATORS
// ==========================================
// (Keep all your existing helpers: currency(), formatDate(), today(), escapeHtml(), normalizeLoanStatus(), etc.)

// ==========================================
// SAVE / UPDATE LOAN
// ==========================================

if (loanForm) {
    loanForm.addEventListener("submit", async e => {
        let step = "START";
        try {
            e.preventDefault();

            const calc = calculateLoan();
            step = "calculateLoan";

            const isHistorical = loanType?.value === "historical";
            const amountPaid = isHistorical ? Number(loanPaid?.value || 0) : 0;
            const outstandingBalance = isHistorical
                ? Number(loanBalance?.value || calc.totalRepayment)
                : calc.totalRepayment;

            const client = clients.find(c => c.id === loanClient.value);
            if (!client) throw new Error("No client selected.");

            const approvalDate = isHistorical ? new Date(loanStartDate?.value) : new Date();

            let repaymentSchedule = generateRepaymentSchedule(
                approvalDate,
                calc.duration,
                calc.weeklyPayment,
                calc.totalRepayment
            );

            if (isHistorical) {
                repaymentSchedule = applyHistoricalPayments(repaymentSchedule, amountPaid);
            }

            const loanData = {
                clientId: client.id,
                clientName: client.name,
                loanNumber: loanId?.value
                    ? (loans.find(l => l.id === loanId.value)?.loanNumber || generateLoanNumber())
                    : generateLoanNumber(),
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
                amountPaid,
                approvalDate: formatDate(approvalDate),
                dueDate: loanDueDate?.value || "",
                repaymentSchedule,
                nextRepaymentDate: repaymentSchedule[0]?.dueDate || null,
                remainingInstallments: calc.duration,
                status: isHistorical
                    ? (outstandingBalance <= 0 ? "Completed" : "Active")
                    : "Pending",
                completed: outstandingBalance <= 0,
                createdBy: localStorage.getItem("userName") ||
                           localStorage.getItem("userEmail") ||
                           "Unknown Officer",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            if (loanId?.value) {
                await updateDoc(doc(db, "loans", loanId.value), {
                    ...loanData,
                    updatedAt: serverTimestamp()
                });

                await logHistory("Loan Updated", "Loan", {
                    loanId: loanData.loanNumber,
                    client: loanData.clientName,
                    amount: loanData.amount,
                    balance: loanData.balance
                });

                // Messaging: Loan Updated
                const smsMessage = buildMessage({
                    type: loanData.status === "Arrears" ? "arrears" : "due-today",
                    client,
                    dueToday: loanData.weeklyPayment,
                    outstanding: loanData.balance
                });
                sendSMS(client, smsMessage);

                alert("Loan updated successfully.");
            } else {
                await addDoc(collection(db, "loans"), loanData);

                await logHistory("Loan Created", "Loan", {
                    loanId: loanData.loanNumber,
                    client: loanData.clientName,
                    amount: loanData.amount,
                    balance: loanData.balance
                });

                // Messaging: Loan Created
                const smsMessage = buildMessage({
                    type: "loan-approved",
                    client,
                    amount: calc.amount,
                    outstanding: outstandingBalance,
                    weeklyPayment: calc.weeklyPayment,
                    startDate: approvalDate
                });
                sendSMS(client, smsMessage);

                alert("Loan created successfully.");
            }

            loanForm.reset();
            if (loanId) loanId.value = "";
            calculateLoan();
            loanModal.classList.add("hidden");

        } catch (error) {
            console.error(error);
            alert("ERROR DETECTED\n\nLast Step:\n" + step + "\n\nName:\n" + error.name + "\n\nMessage:\n" + error.message);
        }
    });
}

// ==========================================
// REPAYMENT HANDLER
// ==========================================

if (repaymentForm) {
    repaymentForm.addEventListener("submit", async e => {
        e.preventDefault();
        const repaymentAmountValue = Number(repaymentAmount?.value || 0);
        const loan = loans.find(l => l.id === repaymentLoanId.value);
        const client = clients.find(c => c.id === loan.clientId);

        // Decide message type
        let messageType = "partial-repayment";
        if (repaymentAmountValue >= loan.weeklyPayment) {
            messageType = "full-repayment";
        }
        if (loan.status === "Arrears") {
            messageType = "arrears";
        }

        const smsMessage = buildMessage({
            type: messageType,
            client,
            dueToday: loan.weeklyPayment,
            amountPaid: repaymentAmountValue,
            outstanding: loan.balance
        });

        sendSMS(client, smsMessage);
        alert("Repayment recorded and SMS generated.");
    });
}

// ==========================================
// REST OF YOUR CODE
// ==========================================
// Keep all your existing functions: loadClients(), loadLoans(), renderLoans(), renderLoanDetailsPage(), filters, modals, etc.
// Nothing else changes — only the SMS integration points above were added.