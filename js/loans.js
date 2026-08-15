// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 7.1
//
// CORRECTIONS:
// ✔ Loan Details → Receive Repayment opens directly for that loan
// ✔ No client selector when repaying from Loan Details
// ✔ No loan selector when repaying from Loan Details
// ✔ Repayment is tied directly to the selected loan
// ✔ Repayment deletion is ADMIN ONLY
// ✔ Repayment delete button is visible only for the latest payment
// ✔ Repayment delete button expires after 24 hours
// ✔ Repayment cannot be deleted after 24 hours
// ✔ Direct repayment prevents selecting another loan accidentally
// ✔ FAB repayment still supports Client → Loan selection
// ✔ Duplicate repayment protection retained
// ==========================================

import { db } from "./firebase.js";
import { openMessageComposer } from "./messaging.js";

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
            .toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
    );
}


// ==========================================
// DOM ELEMENTS
// ==========================================

const loanForm = document.getElementById("loan-form");
const loanModal = document.getElementById("loan-modal");
const loansTableBody = document.getElementById("loans-table-body");
const loanSearch = document.getElementById("loan-search");
const loanFilter = document.getElementById("loan-filter");
const loanMonthFilter = document.getElementById("loan-month-filter");
const loanYearFilter = document.getElementById("loan-year-filter");
const loanId = document.getElementById("loan-id");
const loanClient = document.getElementById("loan-client");
const loanAmount = document.getElementById("loan-amount");
const loanProcessingFee = document.getElementById("loan-processing-fee");
const loanPaid = document.getElementById("loan-paid");
const loanBalance = document.getElementById("loan-balance");
const loanType = document.getElementById("loan-type");
const loanInterest = document.getElementById("loan-interest");
const loanDuration = document.getElementById("loan-duration");
const loanDueDate = document.getElementById("loan-due-date");
const loanStartDate = document.getElementById("loan-start-date");

// Repayment Modal Elements
const repaymentModal = document.getElementById("repayment-modal");
const repaymentForm = document.getElementById("repayment-form");
const repaymentLoanId = document.getElementById("repayment-loan-id");
const repaymentClient = document.getElementById("repayment-client");
const repaymentBalance = document.getElementById("repayment-balance");
const repaymentAmount = document.getElementById("repayment-amount");
const repaymentDate = document.getElementById("repayment-date");
const repaymentNotes = document.getElementById("repayment-notes");

// Schedule Modal Elements
const scheduleModal = document.getElementById("schedule-modal");
const scheduleClient = document.getElementById("schedule-client");
const scheduleBalance = document.getElementById("schedule-balance");
const scheduleTableBody = document.getElementById("schedule-table-body");
const closeScheduleModal = document.getElementById("close-schedule-modal");

// Preview Elements
const previewPrincipal = document.getElementById("preview-principal");
const previewInterest = document.getElementById("preview-interest");
const previewDuration = document.getElementById("preview-duration");
const previewWeekly =
    document.getElementById("preview-weekly") ||
    document.getElementById("preview-monthly");


// ==========================================
// DATA STATE
// ==========================================

let loans = [];
let clients = [];

let selectedLoanId = null;
let loanDetailsOpen = false;

let previousLoansOpen = false;
let previousLoanSelectedId = null;

let repaymentSaving = false;

/*
 * TRUE when repayment modal was opened from
 * a specific Loan Details page.
 *
 * In this mode:
 * - client selector is hidden
 * - loan selector is hidden
 * - repaymentLoanId is automatically assigned
 * - user cannot switch to another loan
 */
let directLoanRepaymentMode = false;


// ==========================================
// BASIC HELPERS
// ==========================================

function currency(value) {
    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value) || 0
    );
}


function formatDate(date) {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "";
    }

    return parsedDate.toISOString().split("T")[0];
}


function today() {
    return formatDate(new Date());
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function normalizeLoanStatus(status) {
    const value = String(status || "Pending").trim();

    if (value.toLowerCase() === "approved") return "Active";
    if (value.toLowerCase() === "active") return "Active";
    if (value.toLowerCase() === "pending") return "Pending";
    if (value.toLowerCase() === "arrears") return "Arrears";
    if (value.toLowerCase() === "completed") return "Completed";
    if (value.toLowerCase() === "rejected") return "Rejected";

    return value;
}


function isRunningLoan(loan) {
    if (!loan) return false;

    const status = normalizeLoanStatus(loan.status);

    return (
        status === "Pending" ||
        status === "Active" ||
        status === "Arrears"
    );
}


function getPreviousLoans(currentLoan) {
    if (!currentLoan) return [];

    return loans
        .filter(
            loan =>
                loan.clientId === currentLoan.clientId &&
                loan.id !== currentLoan.id
        )
        .sort(
            (a, b) => {
                const dateA =
                    a.approvalDate ||
                    a.createdAt?.toDate?.() ||
                    "";

                const dateB =
                    b.approvalDate ||
                    b.createdAt?.toDate?.() ||
                    "";

                return new Date(dateB) - new Date(dateA);
            }
        );
}


function generateLoanNumber() {
    const year = new Date().getFullYear();
    const yearCode = String(year).slice(-3);

    const loansThisYear = loans.filter(loan => {
        const approvalYear = new Date(
            loan.approvalDate ||
            loan.createdAt?.toDate?.() ||
            Date.now()
        ).getFullYear();

        return approvalYear === year;
    });

    const sequence =
        String(loansThisYear.length + 1).padStart(2, "0");

    return `GML/${sequence}/${yearCode}`;
}


async function logHistory(action, category, details = {}) {
    try {
        await addDoc(
            collection(db, "history"),
            {
                action,
                category,
                details,
                officer:
                    localStorage.getItem("userName") ||
                    localStorage.getItem("userEmail") ||
                    "Unknown Officer",
                officerEmail:
                    localStorage.getItem("userEmail") || "",
                createdAt: serverTimestamp(),
                timestamp: new Date().toISOString()
            }
        );
    } catch (error) {
        console.error("History Log Error:", error);
    }
}


function roundToNearestFive(amount) {
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
// LOAN CALCULATOR
// ==========================================

function calculateLoan() {
    const amount =
        Number(loanAmount?.value || 0);

    const interest =
        Number(loanInterest?.value || 0);

    const duration =
        Number(loanDuration?.value || 0);

    const processingFee =
        Number(loanProcessingFee?.value || 0);

    const interestAmount =
        (amount * interest) / 100;

    const totalRepayment =
        amount + interestAmount;

    const weeklyPayment =
        duration > 0
            ? roundToNearestFive(
                totalRepayment / duration
            )
            : 0;

    if (previewPrincipal) {
        previewPrincipal.textContent =
            currency(amount);
    }

    if (previewInterest) {
        previewInterest.textContent =
            currency(interestAmount);
    }

    if (previewDuration) {
        previewDuration.textContent =
            `${duration} Weeks`;
    }

    if (previewWeekly) {
        previewWeekly.textContent =
            currency(weeklyPayment);
    }

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


function generateRepaymentSchedule(
    approvalDate,
    durationWeeks,
    weeklyPayment,
    totalRepayment
) {
    const schedule = [];

    const startDate =
        new Date(approvalDate);

    for (
        let week = 1;
        week <= durationWeeks;
        week++
    ) {
        const dueDate =
            new Date(startDate);

        dueDate.setDate(
            dueDate.getDate() +
            week * 7
        );

        let installmentAmount;

        if (week === durationWeeks) {
            installmentAmount =
                Number(totalRepayment) -
                Number(weeklyPayment) *
                (durationWeeks - 1);
        } else {
            installmentAmount =
                Number(weeklyPayment);
        }

        schedule.push({
            week,
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


[
    loanAmount,
    loanInterest,
    loanDuration,
    loanProcessingFee
].forEach(input => {
    input?.addEventListener(
        "input",
        calculateLoan
    );
});


// ==========================================
// CLIENTS
// ==========================================

function loadClients() {
    onSnapshot(
        collection(db, "clients"),
        snapshot => {
            clients = [];

            snapshot.forEach(docSnap => {
                clients.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            populateClientDropdown();

            if (
                repaymentModal &&
                !repaymentModal.classList.contains("hidden")
            ) {
                populateFabClientSelector();
            }

            if (
                loanDetailsOpen &&
                selectedLoanId &&
                !previousLoansOpen
            ) {
                const currentLoan =
                    loans.find(
                        l => l.id === selectedLoanId
                    );

                if (currentLoan) {
                    renderLoanDetailsPage(
                        currentLoan
                    );
                }
            }
        },
        error =>
            console.error(
                "Failed to load clients:",
                error
            )
    );
}


function populateClientDropdown() {
    if (!loanClient) return;

    loanClient.innerHTML =
        `<option value="">Select Client</option>`;

    clients
        .sort(
            (a, b) =>
                (a.name || "").localeCompare(
                    b.name || ""
                )
        )
        .forEach(client => {
            loanClient.innerHTML += `
                <option value="${escapeHtml(client.id)}">
                    ${escapeHtml(client.name)}
                </option>
            `;
        });
}


// ==========================================
// LOAD LOANS
// ==========================================

function loadLoans() {
    onSnapshot(
        collection(db, "loans"),
        snapshot => {
            loans = [];

            snapshot.forEach(docSnap => {
                const data = docSnap.data();

                if (!data) return;

                const loan = {
                    id: docSnap.id,
                    ...data
                };

                loan.processingFee ??= 0;
                loan.amountPaid ??= 0;

                loan.balance ??=
                    Number(
                        loan.totalRepayment || 0
                    );

                loan.weeklyPayment ??=
                    Number(
                        loan.repayment || 0
                    );

                loan.repaymentSchedule ??= [];

                loan.remainingInstallments ??=
                    loan.duration || 0;

                loan.completed ??= false;

                loan.status =
                    normalizeLoanStatus(
                        loan.status
                    );

                const next =
                    loan.repaymentSchedule.find(
                        item => !item.paid
                    );

                loan.nextRepaymentDate =
                    next
                        ? next.dueDate
                        : "-";

                loans.push(loan);
            });

            populateYearFilter();

            if (
                loanDetailsOpen &&
                selectedLoanId
            ) {
                const selectedLoan =
                    loans.find(
                        l =>
                            l.id ===
                            selectedLoanId
                    );

                if (selectedLoan) {
                    if (previousLoansOpen) {
                        renderPreviousLoansPage(
                            selectedLoan
                        );
                    } else {
                        renderLoanDetailsPage(
                            selectedLoan
                        );
                    }
                } else {
                    closeLoanDetailsPage();
                }
            } else {
                filterLoans();
            }

            if (
                repaymentModal &&
                !repaymentModal.classList.contains(
                    "hidden"
                )
            ) {
                if (!directLoanRepaymentMode) {
                    populateFabClientSelector();
                }
            }
        },
        error =>
            console.error(
                "Failed to load loans:",
                error
            )
    );
}


// ==========================================
// NEW LOAN MODAL
// ==========================================

function openLoanModal() {
    if (!loanModal) return;

    loanForm?.reset();

    if (loanPaid) {
        loanPaid.value = 0;
    }

    if (loanBalance) {
        loanBalance.value = 0;
    }

    if (loanType) {
        loanType.value = "new";
    }

    if (loanId) {
        loanId.value = "";
    }

    if (loanDueDate) {
        loanDueDate.value = today();
    }

    if (loanStartDate) {
        loanStartDate.value = today();
    }

    calculateLoan();

    loanModal.classList.remove(
        "hidden"
    );
}


document
    .getElementById("new-loan-btn")
    ?.addEventListener(
        "click",
        openLoanModal
    );


// ==========================================
// SAVE / UPDATE LOAN
// ==========================================

if (loanForm) {
    loanForm.addEventListener(
        "submit",
        async e => {
            let step = "START";

            try {
                e.preventDefault();

                const calc =
                    calculateLoan();

                step =
                    "calculateLoan";

                const isHistorical =
                    loanType?.value ===
                    "historical";

                const amountPaid =
                    isHistorical
                        ? Number(
                            loanPaid?.value ||
                            0
                        )
                        : 0;

                const outstandingBalance =
                    isHistorical
                        ? Number(
                            loanBalance?.value ||
                            calc.totalRepayment
                        )
                        : calc.totalRepayment;

                const client =
                    clients.find(
                        c =>
                            c.id ===
                            loanClient.value
                    );

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

                let repaymentSchedule =
                    generateRepaymentSchedule(
                        approvalDate,
                        calc.duration,
                        calc.weeklyPayment,
                        calc.totalRepayment
                    );

                if (isHistorical) {
                    repaymentSchedule =
                        applyHistoricalPayments(
                            repaymentSchedule,
                            amountPaid
                        );
                }

                const loanData = {
                    clientId: client.id,
                    clientName: client.name,

                    loanNumber:
                        loanId?.value
                            ? (
                                loans.find(
                                    l =>
                                        l.id ===
                                        loanId.value
                                )?.loanNumber ||
                                generateLoanNumber()
                            )
                            : generateLoanNumber(),

                    loanType:
                        loanType?.value ||
                        "new",

                    amount:
                        calc.amount,

                    processingFee:
                        calc.processingFee,

                    interest:
                        calc.interest,

                    duration:
                        calc.duration,

                    repayment:
                        calc.weeklyPayment,

                    weeklyPayment:
                        calc.weeklyPayment,

                    totalRepayment:
                        calc.totalRepayment,

                    balance:
                        outstandingBalance,

                    totalIncome:
                        calc.processingFee,

                    openingBalance:
                        calc.totalRepayment,

                    amountPaid,

                    approvalDate:
                        formatDate(
                            approvalDate
                        ),

                    dueDate:
                        loanDueDate?.value ||
                        "",

                    repaymentSchedule,

                    nextRepaymentDate:
                        repaymentSchedule[0]
                            ?.dueDate ||
                        null,

                    remainingInstallments:
                        calc.duration,

                    status:
                        isHistorical
                            ? (
                                outstandingBalance <=
                                0
                                    ? "Completed"
                                    : "Active"
                            )
                            : "Pending",

                    completed:
                        outstandingBalance <= 0,

                    createdBy:
                        localStorage.getItem(
                            "userName"
                        ) ||
                        localStorage.getItem(
                            "userEmail"
                        ) ||
                        "Unknown Officer",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()
                };

                const blockedLoan =
                    loans.find(
                        loan =>
                            loan.clientId ===
                                client.id &&
                            loan.id !==
                                loanId?.value &&
                            (
                                Number(
                                    loan.balance ||
                                    0
                                ) > 0 ||
                                normalizeLoanStatus(
                                    loan.status
                                ) ===
                                    "Arrears"
                            )
                    );

                if (blockedLoan) {
                    const continuePayment =
                        confirm(
                            `Cannot save loan.\n\n` +
                            `Client has an outstanding balance of ${currency(
                                blockedLoan.balance
                            )}.\n\n` +
                            `Loan No: ${blockedLoan.loanNumber}\n\n` +
                            `Press OK to continue to repayment.\nPress Cancel to close.`
                        );

                    if (
                        continuePayment &&
                        repaymentModal
                    ) {
                        openRepaymentForLoan(
                            blockedLoan.id
                        );
                    }

                    return;
                }

                if (loanId?.value) {
                    await updateDoc(
                        doc(
                            db,
                            "loans",
                            loanId.value
                        ),
                        {
                            ...loanData,
                            updatedAt:
                                serverTimestamp()
                        }
                    );

                    await logHistory(
                        "Loan Updated",
                        "Loan",
                        {
                            loanId:
                                loanData.loanNumber,
                            client:
                                loanData.clientName,
                            amount:
                                loanData.amount,
                            balance:
                                loanData.balance
                        }
                    );

                    alert(
                        "Loan updated successfully."
                    );
                } else {
                    await addDoc(
                        collection(
                            db,
                            "loans"
                        ),
                        loanData
                    );

                    await logHistory(
                        "Loan Created",
                        "Loan",
                        {
                            loanId:
                                loanData.loanNumber,
                            client:
                                loanData.clientName,
                            amount:
                                loanData.amount,
                            balance:
                                loanData.balance
                        }
                    );

                    alert(
                        "Loan created successfully."
                    );
                }

                loanForm.reset();

                if (loanId) {
                    loanId.value = "";
                }

                calculateLoan();

                loanModal.classList.add(
                    "hidden"
                );

            } catch (error) {
                console.error(error);

                alert(
                    "ERROR DETECTED\n\n" +
                    "Last Step:\n" +
                    step +
                    "\n\nName:\n" +
                    error.name +
                    "\n\nMessage:\n" +
                    error.message
                );
            }
        }
    );
}


// ==========================================
// LOAN TABLE
// ==========================================

function renderLoans(list) {
    if (
        !loansTableBody ||
        loanDetailsOpen
    ) {
        return;
    }

    loansTableBody.innerHTML = "";

    list =
        list.filter(
            loan =>
                isRunningLoan(loan)
        );

    list.sort(
        (a, b) => {
            const dateA =
                a.approvalDate || "";

            const dateB =
                b.approvalDate || "";

            if (dateA !== dateB) {
                return (
                    new Date(dateB) -
                    new Date(dateA)
                );
            }

            return (
                (a.clientName || "")
                    .localeCompare(
                        b.clientName || ""
                    )
            );
        }
    );

    if (list.length === 0) {
        loansTableBody.innerHTML = `
            <tr>
                <td colspan="15"
                    style="text-align:center;">
                    No active loans found.
                </td>
            </tr>
        `;

        return;
    }

    list.forEach(
        (loan, index) => {
            if (
                !loan ||
                !loan.id
            ) {
                return;
            }

            const row =
                document.createElement(
                    "tr"
                );

            row.className =
                "loan-clickable-row";

            row.dataset.loanId =
                loan.id;

            row.innerHTML = `
                <td>${index + 1}</td>

                <td>
                    ${escapeHtml(
                        loan.approvalDate ||
                        loan.disbursementDate ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        loan.clientName ||
                        "-"
                    )}
                </td>

                <td>
                    ${currency(
                        loan.amount ||
                        0
                    )}
                </td>

                <td>
                    ${currency(
                        loan.processingFee ||
                        0
                    )}
                </td>

                <td>
                    ${loan.interest || 0}%
                </td>

                <td>
                    ${loan.duration || 0}
                    Weeks
                </td>

                <td>
                    ${currency(
                        loan.weeklyPayment ||
                        0
                    )}
                </td>

                <td>
                    ${currency(
                        loan.balance ||
                        0
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        loan.nextRepaymentDate ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        loan.dueDate ||
                        "-"
                    )}
                </td>

                <td>
                    <span class="status ${normalizeLoanStatus(
                        loan.status
                    ).toLowerCase()}">
                        ${escapeHtml(
                            normalizeLoanStatus(
                                loan.status
                            )
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        loan.createdBy ||
                        "-"
                    )}
                </td>
            `;

            row.addEventListener(
                "click",
                () =>
                    openLoanDetailsPage(
                        loan.id
                    )
            );

            loansTableBody.appendChild(
                row
            );
        }
    );
}


// ==========================================
// FULL-SCREEN LOAN DETAILS PAGE
// ==========================================

function getLoanDetailsPage() {
    let page =
        document.getElementById(
            "loan-details-page"
        );

    if (page) {
        return page;
    }

    page =
        document.createElement(
            "section"
        );

    page.id =
        "loan-details-page";

    page.className =
        "loan-details-page hidden";

    page.style.position =
        "fixed";

    page.style.top =
        "0";

    page.style.left =
        "0";

    page.style.right =
        "0";

    page.style.bottom =
        "0";

    page.style.width =
        "100vw";

    page.style.height =
        "100vh";

    page.style.overflowY =
        "auto";

    page.style.overflowX =
        "hidden";

    page.style.zIndex =
        "99999";

    page.style.background =
        "var(--bg, #0b1424)";

    document.body.appendChild(
        page
    );

    return page;
}


function openLoanDetailsPage(id) {
    const loan =
        loans.find(
            item =>
                item.id === id
        );

    if (!loan) {
        alert(
            "Loan not found."
        );

        return;
    }

    selectedLoanId =
        id;

    previousLoansOpen =
        false;

    previousLoanSelectedId =
        null;

    loanDetailsOpen =
        true;

    const page =
        getLoanDetailsPage();

    if (!page) {
        return;
    }

    const loansTable =
        document.getElementById(
            "loans-table"
        );

    if (loansTable) {
        loansTable.classList.add(
            "loan-list-hidden"
        );
    }

    hideLoanListControls();

    document.body.dataset.loanDetailsScroll =
        document.body.style.overflow ||
        "";

    document.body.style.overflow =
        "hidden";

    renderLoanDetailsPage(
        loan
    );

    page.classList.remove(
        "hidden"
    );

    page.scrollTop =
        0;

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });

    if (
        !history.state ||
        history.state.loanDetails !==
            id
    ) {
        history.pushState(
            {
                loanDetails: id
            },
            "",
            `#loan-${encodeURIComponent(
                id
            )}`
        );
    }
}


function hideLoanListControls() {
    [
        "#loan-search",
        "#loan-filter",
        "#loan-month-filter",
        "#loan-year-filter"
    ].forEach(
        selector => {
            const element =
                document.querySelector(
                    selector
                );

            if (!element) {
                return;
            }

            const parent =
                element.closest(
                    ".filter-group, .search-box, .loan-filter, .filter-item"
                );

            if (parent) {
                parent.classList.add(
                    "loan-details-control-hidden"
                );
            }
        }
    );
}


function showLoanListControls() {
    document
        .querySelectorAll(
            ".loan-details-control-hidden"
        )
        .forEach(
            element => {
                element.classList.remove(
                    "loan-details-control-hidden"
                );
            }
        );
}


function closeLoanDetailsPage(
    skipHistory = false
) {
    selectedLoanId =
        null;

    previousLoansOpen =
        false;

    previousLoanSelectedId =
        null;

    loanDetailsOpen =
        false;

    const page =
        document.getElementById(
            "loan-details-page"
        );

    if (page) {
        page.classList.add(
            "hidden"
        );

        page.innerHTML =
            "";
    }

    const loansTable =
        document.getElementById(
            "loans-table"
        );

    if (loansTable) {
        loansTable.classList.remove(
            "loan-list-hidden"
        );
    }

    showLoanListControls();

    document.body.style.overflow =
        document.body.dataset.loanDetailsScroll ||
        "";

    delete document.body.dataset.loanDetailsScroll;

    filterLoans();

    if (
        !skipHistory &&
        location.hash.startsWith(
            "#loan-"
        )
    ) {
        history.back();
    }

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}


window.addEventListener(
    "popstate",
    () => {
        if (previousLoansOpen) {
            previousLoansOpen =
                false;

            previousLoanSelectedId =
                null;

            const currentLoan =
                loans.find(
                    l =>
                        l.id ===
                        selectedLoanId
                );

            if (currentLoan) {
                renderLoanDetailsPage(
                    currentLoan
                );
            }

            return;
        }

        if (loanDetailsOpen) {
            closeLoanDetailsPage(
                true
            );
        }
    }
);


window.addEventListener(
    "hashchange",
    () => {
        if (
            !location.hash.startsWith(
                "#loan-"
            ) &&
            loanDetailsOpen
        ) {
            closeLoanDetailsPage(
                true
            );
        }
    }
);


// ==========================================
// LOAN DETAILS RENDER
// ==========================================

function renderLoanDetailsPage(
    loan
) {
    const page =
        getLoanDetailsPage();

    if (!page) {
        return;
    }

    previousLoansOpen =
        false;

    const schedule =
        loan.repaymentSchedule ||
        [];

    const paidAmount =
        Number(
            loan.amountPaid ||
            0
        );

    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );

    const balance =
        Number(
            loan.balance ||
            0
        );

    const income =
        Number(
            loan.totalIncome ||
            0
        );

    const status =
        normalizeLoanStatus(
            loan.status
        );

    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    const previousLoans =
        getPreviousLoans(
            loan
        );

    page.innerHTML = `
        <div class="loan-details-mobile-page">

            <div class="loan-details-mobile-header">

                <button
                    type="button"
                    class="loan-details-back"
                    data-loan-action="back"
                >
                    ←
                </button>

                <div class="loan-details-header-text">

                    <div class="loan-details-page-title">
                        Loan Details
                    </div>

                    <div class="loan-details-page-number">
                        ${escapeHtml(
                            loan.loanNumber ||
                            "-"
                        )}
                    </div>

                </div>

            </div>


            <div class="loan-details-client-card">

                <div class="loan-details-client-label">
                    CLIENT
                </div>

                <div class="loan-details-client-name">
                    ${escapeHtml(
                        loan.clientName ||
                        "-"
                    )}
                </div>

                <span
                    class="loan-details-status ${statusClass}"
                >
                    ${escapeHtml(status)}
                </span>

            </div>


            <div class="loan-details-balance-card">

                <div class="loan-details-balance-label">
                    OUTSTANDING BALANCE
                </div>

                <div class="loan-details-balance-value">
                    ${currency(balance)}
                </div>

                <div class="loan-details-balance-sub">
                    ${currency(paidAmount)}
                    paid of
                    ${currency(totalRepayment)}
                </div>

            </div>


            <div class="loan-details-section-heading">
                Loan Summary
            </div>


            <div class="loan-details-summary-grid">

                <div class="loan-summary-card">
                    <span>Loan Amount</span>
                    <strong>
                        ${currency(
                            loan.amount
                        )}
                    </strong>
                </div>

                <div class="loan-summary-card">
                    <span>Total Repayment</span>
                    <strong>
                        ${currency(
                            totalRepayment
                        )}
                    </strong>
                </div>

                <div class="loan-summary-card">
                    <span>Amount Paid</span>
                    <strong>
                        ${currency(
                            paidAmount
                        )}
                    </strong>
                </div>

                <div class="loan-summary-card">
                    <span>Weekly Payment</span>
                    <strong>
                        ${currency(
                            loan.weeklyPayment
                        )}
                    </strong>
                </div>

            </div>


            <div class="loan-details-section-heading">
                Loan Information
            </div>


            <div class="loan-details-info-card">

                <div class="loan-info-row">
                    <span>Processing Fee</span>
                    <strong>
                        ${currency(
                            loan.processingFee
                        )}
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Interest</span>
                    <strong>
                        ${loan.interest || 0}%
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Duration</span>
                    <strong>
                        ${loan.duration || 0}
                        Weeks
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Start Date</span>
                    <strong>
                        ${escapeHtml(
                            loan.approvalDate ||
                            "-"
                        )}
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Next Repayment</span>
                    <strong>
                        ${escapeHtml(
                            loan.nextRepaymentDate ||
                            "-"
                        )}
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Due Date</span>
                    <strong>
                        ${escapeHtml(
                            loan.dueDate ||
                            "-"
                        )}
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Officer</span>
                    <strong>
                        ${escapeHtml(
                            loan.createdBy ||
                            "-"
                        )}
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Income Earned</span>
                    <strong>
                        ${currency(income)}
                    </strong>
                </div>

                <div class="loan-info-row">
                    <span>Loan Type</span>
                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "new"
                        )}
                    </strong>
                </div>

            </div>


            <div class="loan-details-section-heading">
                Client Loan History
            </div>


            <button
                type="button"
                class="loan-previous-loans-card"
                data-loan-action="previous-loans"
            >

                <div class="loan-previous-loans-icon">
                    📚
                </div>

                <div class="loan-previous-loans-content">

                    <div class="loan-previous-loans-title">
                        Previous Loans
                    </div>

                    <div class="loan-previous-loans-subtitle">
                        ${
                            previousLoans.length
                                ? `${previousLoans.length} previous loan(s)`
                                : "No previous loans"
                        }
                    </div>

                </div>

                <div class="loan-previous-loans-arrow">
                    ›
                </div>

            </button>


            <div class="loan-details-section-heading">
                Actions
            </div>


            <div class="loan-details-action-list">

                <button
                    type="button"
                    class="loan-page-action"
                    data-loan-action="message"
                    data-id="${escapeHtml(
                        loan.id
                    )}"
                >

                    <span class="loan-action-icon">
                        💬
                    </span>

                    <span>
                        Message Client
                    </span>

                    <span class="loan-action-arrow">
                        ›
                    </span>

                </button>

                ${
                    status !== "Completed"
                        ? `
                            <button
                                type="button"
                                class="loan-page-action primary"
                                data-loan-action="repay"
                                data-id="${escapeHtml(
                                    loan.id
                                )}"
                            >

                                <span class="loan-action-icon">
                                    💵
                                </span>

                                <span>
                                    Receive Repayment
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>
                        `
                        : ""
                }


                ${
                    status === "Pending"
                        ? `
                            <button
                                type="button"
                                class="loan-page-action"
                                data-loan-action="edit"
                                data-id="${escapeHtml(
                                    loan.id
                                )}"
                            >

                                <span class="loan-action-icon">
                                    ✏️
                                </span>

                                <span>
                                    Edit Loan
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>


                            <button
                                type="button"
                                class="loan-page-action"
                                data-loan-action="approve"
                                data-id="${escapeHtml(
                                    loan.id
                                )}"
                            >

                                <span class="loan-action-icon">
                                    ✔️
                                </span>

                                <span>
                                    Approve Loan
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>
                        `
                        : ""
                }


                ${
                    status === "Pending" &&
                    isAdmin()
                        ? `
                            <button
                                type="button"
                                class="loan-page-action danger"
                                data-loan-action="delete"
                                data-id="${escapeHtml(
                                    loan.id
                                )}"
                            >

                                <span class="loan-action-icon">
                                    🗑️
                                </span>

                                <span>
                                    Delete Loan
                                </span>

                                <span class="loan-action-arrow">
                                    ›
                                </span>

                            </button>
                        `
                        : ""
                }

            </div>


            <div class="loan-details-section-heading">
                Repayment Schedule
            </div>


            <div class="loan-mobile-schedule">

                ${
                    schedule.length === 0
                        ? `
                            <div class="loan-no-schedule-card">
                                No repayment schedule available.
                            </div>
                        `
                        : schedule
                            .map(
                                item =>
                                    renderMobileScheduleCard(
                                        loan,
                                        item
                                    )
                            )
                            .join("")
                }

            </div>


            <div class="loan-details-bottom-space"></div>

        </div>
    `;

    attachLoanDetailsPageActions();

    page.scrollTop =
        0;
}


// ==========================================
// PREVIOUS LOANS
// ==========================================

function renderPreviousLoansPage(
    currentLoan
) {
    const page =
        getLoanDetailsPage();

    if (!page) {
        return;
    }

    const previousLoans =
        getPreviousLoans(
            currentLoan
        );

    previousLoansOpen =
        true;

    page.innerHTML = `
        <div class="loan-details-mobile-page">

            <div class="loan-details-mobile-header">

                <button
                    type="button"
                    class="loan-details-back"
                    data-loan-action="previous-loans-back"
                >
                    ←
                </button>

                <div class="loan-details-header-text">

                    <div class="loan-details-page-title">
                        Previous Loans
                    </div>

                    <div class="loan-details-page-number">
                        ${escapeHtml(
                            currentLoan.clientName ||
                            "-"
                        )}
                    </div>

                </div>

            </div>


            <div class="loan-previous-history-header">

                <div class="loan-details-client-label">
                    CLIENT LOAN HISTORY
                </div>

                <div class="loan-details-client-name">
                    ${escapeHtml(
                        currentLoan.clientName ||
                        "-"
                    )}
                </div>

                <div class="loan-previous-history-count">
                    ${previousLoans.length}
                    previous loan(s)
                </div>

            </div>


            ${
                previousLoans.length === 0
                    ? `
                        <div class="loan-no-previous-loans-card">

                            <div class="loan-no-previous-icon">
                                📚
                            </div>

                            <strong>
                                No Previous Loans
                            </strong>

                            <span>
                                This client has no other loan records.
                            </span>

                        </div>
                    `
                    : `
                        <div class="loan-previous-loans-list">

                            ${previousLoans
                                .map(
                                    loan =>
                                        renderPreviousLoanCard(
                                            loan
                                        )
                                )
                                .join("")}

                        </div>
                    `
            }


            <div class="loan-details-bottom-space"></div>

        </div>
    `;

    attachPreviousLoansActions();

    page.scrollTop =
        0;
}


function renderPreviousLoanCard(
    loan
) {
    const status =
        normalizeLoanStatus(
            loan.status
        );

    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    const completed =
        status === "Completed";

    return `
        <button
            type="button"
            class="loan-previous-loan-item"
            data-loan-action="open-previous-loan"
            data-id="${escapeHtml(
                loan.id
            )}"
        >

            <div class="loan-previous-loan-top">

                <div class="loan-previous-loan-number">
                    ${escapeHtml(
                        loan.loanNumber ||
                        "Loan"
                    )}
                </div>

                <span
                    class="loan-details-status ${statusClass}"
                >
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <div class="loan-previous-loan-main">

                <div class="loan-previous-loan-amount">
                    ${currency(
                        loan.amount ||
                        0
                    )}
                </div>

                <div class="loan-previous-loan-date">
                    ${escapeHtml(
                        loan.approvalDate ||
                        "-"
                    )}
                </div>

            </div>


            <div class="loan-previous-loan-details">

                <div>
                    <span>Paid</span>
                    <strong>
                        ${currency(
                            loan.amountPaid ||
                            0
                        )}
                    </strong>
                </div>

                <div>
                    <span>Balance</span>
                    <strong>
                        ${currency(
                            loan.balance ||
                            0
                        )}
                    </strong>
                </div>

                <div>
                    <span>Type</span>
                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "new"
                        )}
                    </strong>
                </div>

            </div>


            <div class="loan-previous-loan-footer">

                ${
                    completed
                        ? "Completed loan record"
                        : "View loan details"
                }

                <span>›</span>

            </div>

        </button>
    `;
}


function attachPreviousLoansActions() {
    const page =
        document.getElementById(
            "loan-details-page"
        );

    if (!page) {
        return;
    }

    page
        .querySelector(
            '[data-loan-action="previous-loans-back"]'
        )
        ?.addEventListener(
            "click",
            () => {
                previousLoansOpen =
                    false;

                previousLoanSelectedId =
                    null;

                const currentLoan =
                    loans.find(
                        l =>
                            l.id ===
                            selectedLoanId
                    );

                if (currentLoan) {
                    renderLoanDetailsPage(
                        currentLoan
                    );
                }
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="open-previous-loan"]'
        )
        .forEach(
            button => {
                button.addEventListener(
                    "click",
                    () => {
                        const id =
                            button.dataset.id;

                        const previousLoan =
                            loans.find(
                                l =>
                                    l.id ===
                                    id
                            );

                        if (!previousLoan) {
                            return;
                        }

                        previousLoanSelectedId =
                            id;

                        renderHistoricalLoanDetails(
                            previousLoan
                        );
                    }
                );
            }
        );
}


// ==========================================
// HISTORICAL LOAN DETAILS
// ==========================================

function renderHistoricalLoanDetails(
    loan
) {
    const page =
        getLoanDetailsPage();

    if (!page) {
        return;
    }

    const schedule =
        loan.repaymentSchedule ||
        [];

    const status =
        normalizeLoanStatus(
            loan.status
        );

    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    const paidAmount =
        Number(
            loan.amountPaid ||
            0
        );

    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );

    const balance =
        Number(
            loan.balance ||
            0
        );

    page.innerHTML = `
        <div class="loan-details-mobile-page">

            <div class="loan-details-mobile-header">

                <button
                    type="button"
                    class="loan-details-back"
                    data-loan-action="historical-loan-back"
                >
                    ←
                </button>

                <div class="loan-details-header-text">

                    <div class="loan-details-page-title">
                        Loan History
                    </div>

                    <div class="loan-details-page-number">
                        ${escapeHtml(
                            loan.loanNumber ||
                            "-"
                        )}
                    </div>

                </div>

            </div>


            <div class="loan-details-client-card">

                <div class="loan-details-client-label">
                    CLIENT
                </div>

                <div class="loan-details-client-name">
                    ${escapeHtml(
                        loan.clientName ||
                        "-"
                    )}
                </div>

                <span
                    class="loan-details-status ${statusClass}"
                >
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <div class="loan-details-balance-card">

                <div class="loan-details-balance-label">
                    LOAN BALANCE
                </div>

                <div class="loan-details-balance-value">
                    ${currency(
                        balance
                    )}
                </div>

                <div class="loan-details-balance-sub">
                    ${currency(
                        paidAmount
                    )}
                    paid of
                    ${currency(
                        totalRepayment
                    )}
                </div>

            </div>


            <div class="loan-details-section-heading">
                Repayment History
            </div>


            <div class="loan-mobile-schedule">

                ${
                    schedule.length === 0
                        ? `
                            <div class="loan-no-schedule-card">
                                No repayment history available.
                            </div>
                        `
                        : schedule
                            .map(
                                item =>
                                    renderMobileScheduleCard(
                                        loan,
                                        item
                                    )
                            )
                            .join("")
                }

            </div>


            <div class="loan-details-bottom-space"></div>

        </div>
    `;

    page
        .querySelector(
            '[data-loan-action="historical-loan-back"]'
        )
        ?.addEventListener(
            "click",
            () => {
                const currentLoan =
                    loans.find(
                        item =>
                            item.id ===
                            selectedLoanId
                    );

                if (currentLoan) {
                    renderPreviousLoansPage(
                        currentLoan
                    );
                }
            }
        );

    page.scrollTop =
        0;
}


// ==========================================
// REPAYMENT DELETE SAFETY
// ==========================================

const REPAYMENT_DELETE_WINDOW_MS =
    24 * 60 * 60 * 1000;


/*
 * Converts different timestamp formats
 * used by old and new repayment records
 * into milliseconds.
 */
function getPaymentTimestamp(payment) {
    if (!payment) return null;

    const candidates = [
        payment.timestamp,
        payment.paymentTimestamp,
        payment.createdAt
    ];

    for (const value of candidates) {
        if (!value) continue;

        if (
            typeof value === "object" &&
            typeof value.toDate === "function"
        ) {
            const date =
                value.toDate();

            const time =
                date.getTime();

            if (!Number.isNaN(time)) {
                return time;
            }
        }

        if (
            typeof value === "number"
        ) {
            if (!Number.isNaN(value)) {
                return value;
            }
        }

        if (
            typeof value === "string"
        ) {
            const parsed =
                new Date(value)
                    .getTime();

            if (
                !Number.isNaN(parsed)
            ) {
                return parsed;
            }
        }
    }

    return null;
}


function isPaymentWithinDeleteWindow(
    payment
) {
    const paymentTime =
        getPaymentTimestamp(
            payment
        );

    if (!paymentTime) {
        return false;
    }

    const age =
        Date.now() -
        paymentTime;

    return (
        age >= 0 &&
        age <=
            REPAYMENT_DELETE_WINDOW_MS
    );
}


/*
 * Only the newest payment on the
 * entire loan can be deleted.
 *
 * This prevents an older repayment from
 * becoming deletable simply because it
 * belongs to a different installment.
 */
function isLatestPayment(
    loan,
    targetPayment
) {
    if (!loan || !targetPayment) {
        return false;
    }

    let latestPayment = null;
    let latestTimestamp = -Infinity;

    for (
        const installment
        of loan.repaymentSchedule || []
    ) {
        for (
            const payment
            of installment.paymentHistory || []
        ) {
            const timestamp =
                getPaymentTimestamp(
                    payment
                );

            if (
                timestamp &&
                timestamp >
                    latestTimestamp
            ) {
                latestTimestamp =
                    timestamp;

                latestPayment =
                    payment;
            }
        }
    }

    if (!latestPayment) {
        return false;
    }

    /*
     * Prefer payment ID when available.
     */
    if (
        targetPayment.paymentId &&
        latestPayment.paymentId
    ) {
        return (
            targetPayment.paymentId ===
            latestPayment.paymentId
        );
    }

    /*
     * Fallback comparison for old records.
     */
    return (
        latestPayment ===
        targetPayment ||
        (
            Number(
                latestPayment.amount
            ) ===
                Number(
                    targetPayment.amount
                ) &&
            getPaymentTimestamp(
                latestPayment
            ) ===
                getPaymentTimestamp(
                    targetPayment
                )
        )
    );
}


function canDeletePayment(
    loan,
    payment
) {
    if (!isAdmin()) {
        return false;
    }

    if (!payment) {
        return false;
    }

    if (
        !isLatestPayment(
            loan,
            payment
        )
    ) {
        return false;
    }

    if (
        !isPaymentWithinDeleteWindow(
            payment
        )
    ) {
        return false;
    }

    return true;
}


// ==========================================
// MOBILE REPAYMENT SCHEDULE CARD
// ==========================================

function renderMobileScheduleCard(
    loan,
    item
) {
    const amount =
        Number(
            item.amount || 0
        );

    const paid =
        Number(
            item.paidAmount || 0
        );

    const remaining =
        Math.max(
            amount - paid,
            0
        );

    let statusText =
        "Pending";

    let statusClass =
        "pending";

    let statusIcon =
        "⏳";

    if (item.paid) {
        statusText =
            "Paid";

        statusClass =
            "paid";

        statusIcon =
            "✅";
    } else if (paid > 0) {
        statusText =
            "Partial";

        statusClass =
            "partial";

        statusIcon =
            "🟡";
    }


    /*
     * IMPORTANT:
     *
     * The delete button is now shown
     * ONLY when:
     *
     * 1. User is Admin
     * 2. Payment exists
     * 3. Payment is the latest payment
     * 4. Payment is not older than 24 hours
     */
    let deleteButton = "";

    const history =
        item.paymentHistory ||
        [];

    if (history.length) {
        const latestPayment =
            history[
                history.length - 1
            ];

        if (
            canDeletePayment(
                loan,
                latestPayment
            )
        ) {
            deleteButton = `
                <button
                    type="button"
                    class="loan-schedule-delete"
                    data-loan-action="delete-payment"
                    data-loan="${escapeHtml(
                        loan.id
                    )}"
                    data-week="${escapeHtml(
                        item.week
                    )}"
                    data-payment-id="${escapeHtml(
                        latestPayment.paymentId ||
                        ""
                    )}"
                >
                    🗑️ Delete latest payment
                </button>
            `;
        }
    }


    return `
        <div class="loan-schedule-card">

            <div class="loan-schedule-card-header">

                <div>

                    <div class="loan-schedule-week">
                        Week ${escapeHtml(
                            item.week
                        )}
                    </div>

                    <div class="loan-schedule-due">
                        Due ${escapeHtml(
                            item.dueDate ||
                            "-"
                        )}
                    </div>

                </div>

                <div class="loan-schedule-status ${statusClass}">
                    ${statusIcon}
                    ${statusText}
                </div>

            </div>


            <div class="loan-schedule-values">

                <div>
                    <span>Amount</span>
                    <strong>
                        ${currency(
                            amount
                        )}
                    </strong>
                </div>

                <div>
                    <span>Paid</span>
                    <strong>
                        ${currency(
                            paid
                        )}
                    </strong>
                </div>

                <div>
                    <span>Balance</span>
                    <strong>
                        ${currency(
                            remaining
                        )}
                    </strong>
                </div>

            </div>


            <div class="loan-schedule-paid-date">

                <span>
                    Paid Date
                </span>

                <strong>
                    ${escapeHtml(
                        item.paidDate ||
                        "-"
                    )}
                </strong>

            </div>


            ${
                deleteButton
                    ? `
                        <div class="loan-schedule-actions">
                            ${deleteButton}
                        </div>
                    `
                    : ""
            }

        </div>
    `;
}


// ==========================================
// LOAN DETAILS ACTIONS
// ==========================================

function attachLoanDetailsPageActions() {
    const page =
        document.getElementById(
            "loan-details-page"
        );

    if (!page) {
        return;
    }


    page
        .querySelector(
            '[data-loan-action="back"]'
        )
        ?.addEventListener(
            "click",
            () =>
                closeLoanDetailsPage()
        );


    page
        .querySelector(
            '[data-loan-action="previous-loans"]'
        )
        ?.addEventListener(
            "click",
            () => {
                const loan =
                    loans.find(
                        item =>
                            item.id ===
                            selectedLoanId
                    );

                if (loan) {
                    renderPreviousLoansPage(
                        loan
                    );
                }
            }
        );


    /*
     * DIRECT REPAYMENT
     *
     * This is the important correction.
     *
     * The selected loan ID is passed directly.
     * No client selection is shown.
     * No loan selection is shown.
     */
    page
        .querySelectorAll(
            '[data-loan-action="message"]'
        )
        .forEach(
            btn => {
                btn.addEventListener(
                    "click",
                    () => {
                        const loan =
                            loans.find(
                                item =>
                                    item.id ===
                                    btn.dataset.id
                            );

                        if (!loan) {
                            alert(
                                "The selected loan could not be found."
                            );
                            return;
                        }

                        const client =
                            clients.find(
                                item =>
                                    item.id ===
                                    loan.clientId
                            );

                        openMessageComposer({
                            type: "default",
                            loan,
                            client,
                            outstanding: Number(
                                loan.balance || 0
                            )
                        });
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="repay"]'
        )
        .forEach(
            btn => {
                btn.addEventListener(
                    "click",
                    () => {
                        const id =
                            btn.dataset.id;

                        openRepaymentForLoan(
                            id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="edit"]'
        )
        .forEach(
            btn => {
                btn.addEventListener(
                    "click",
                    () =>
                        editLoan(
                            btn.dataset.id
                        )
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="approve"]'
        )
        .forEach(
            btn => {
                btn.addEventListener(
                    "click",
                    () =>
                        approveLoan(
                            btn.dataset.id
                        )
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="delete"]'
        )
        .forEach(
            btn => {
                btn.addEventListener(
                    "click",
                    () =>
                        deleteLoan(
                            btn.dataset.id
                        )
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="delete-payment"]'
        )
        .forEach(
            btn => {
                btn.addEventListener(
                    "click",
                    e => {
                        e.stopPropagation();

                        deletePayment(
                            btn.dataset.loan,
                            Number(
                                btn.dataset.week
                            ),
                            btn.dataset.paymentId
                        );
                    }
                );
            }
        );
}


// ==========================================
// FILTERS
// ==========================================

function populateYearFilter() {
    if (!loanYearFilter) {
        return;
    }

    const years = [
        ...new Set(
            loans.map(
                loan => {
                    const date =
                        loan.approvalDate
                            ? new Date(
                                loan.approvalDate
                            )
                            : loan.createdAt
                                ?.toDate
                                ? loan.createdAt.toDate()
                                : new Date();

                    return date.getFullYear();
                }
            )
        )
    ].sort(
        (a, b) =>
            b - a
    );

    loanYearFilter.innerHTML =
        `<option value="ALL">All</option>`;

    years.forEach(
        year => {
            loanYearFilter.innerHTML += `
                <option value="${year}">
                    ${year}
                </option>
            `;
        }
    );
}


function getFilteredLoans() {
    let filtered =
        [...loans];

    filtered =
        filtered.filter(
            loan =>
                isRunningLoan(
                    loan
                )
        );

    const keyword =
        loanSearch?.value
            ?.trim()
            .toLowerCase() ||
        "";

    const status =
        loanFilter?.value ||
        "ALL";

    const month =
        loanMonthFilter?.value ||
        "ALL";

    const year =
        loanYearFilter?.value ||
        "ALL";


    if (keyword) {
        filtered =
            filtered.filter(
                loan =>
                    (
                        loan.clientName ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        ) ||

                    String(
                        loan.id
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        ) ||

                    String(
                        loan.loanNumber ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        )
            );
    }


    if (status !== "ALL") {
        filtered =
            filtered.filter(
                loan =>
                    normalizeLoanStatus(
                        loan.status
                    ) ===
                    normalizeLoanStatus(
                        status
                    )
            );
    }


    if (
        month !== "ALL" ||
        year !== "ALL"
    ) {
        filtered =
            filtered.filter(
                loan => {
                    const date =
                        loan.approvalDate
                            ? new Date(
                                loan.approvalDate
                            )
                            : loan.createdAt
                                ?.toDate
                                ? loan.createdAt.toDate()
                                : new Date();

                    const monthMatch =
                        month === "ALL" ||
                        date.getMonth() ===
                            Number(
                                month
                            );

                    const yearMatch =
                        year === "ALL" ||
                        date.getFullYear() ===
                            Number(
                                year
                            );

                    return (
                        monthMatch &&
                        yearMatch
                    );
                }
            );
    }

    return filtered;
}


function filterLoans() {
    if (loanDetailsOpen) {
        return;
    }

    renderLoans(
        getFilteredLoans()
    );
}


loanSearch?.addEventListener(
    "input",
    filterLoans
);

loanFilter?.addEventListener(
    "change",
    filterLoans
);

loanMonthFilter?.addEventListener(
    "change",
    filterLoans
);

loanYearFilter?.addEventListener(
    "change",
    filterLoans
);


// ==========================================
// OVERDUE LOANS
// ==========================================

async function checkOverdueLoans() {
    const todayDate =
        today();

    for (
        const loan
        of loans
    ) {
        const currentStatus =
            normalizeLoanStatus(
                loan.status
            );

        if (
            currentStatus ===
                "Pending" ||
            currentStatus ===
                "Completed" ||
            currentStatus ===
                "Rejected"
        ) {
            continue;
        }

        const schedule =
            loan.repaymentSchedule ||
            [];

        let arrears =
            false;

        let nextRepayment =
            null;

        for (
            const item
            of schedule
        ) {
            if (item.paid) {
                continue;
            }

            nextRepayment =
                item.dueDate;

            if (
                item.dueDate <
                todayDate
            ) {
                arrears =
                    true;
            }

            break;
        }

        let status;

        if (!nextRepayment) {
            status =
                "Completed";
        } else if (arrears) {
            status =
                "Arrears";
        } else {
            status =
                "Active";
        }

        if (
            currentStatus ===
                status &&
            loan.nextRepaymentDate ===
                nextRepayment
        ) {
            continue;
        }

        try {
            await updateDoc(
                doc(
                    db,
                    "loans",
                    loan.id
                ),
                {
                    status,
                    completed:
                        !nextRepayment,
                    nextRepaymentDate:
                        nextRepayment ||
                        "-",
                    remainingInstallments:
                        schedule.filter(
                            item =>
                                !item.paid
                        ).length,
                    updatedAt:
                        serverTimestamp()
                }
            );
        } catch (error) {
            console.error(
                error
            );
        }
    }
}


// ==========================================
// APPROVE LOAN
// ==========================================

async function approveLoan(
    id
) {
    const loan =
        loans.find(
            item =>
                item.id === id
        );

    if (
        !loan ||
        normalizeLoanStatus(
            loan.status
        ) !== "Pending"
    ) {
        alert(
            "Loan is already active or has been processed."
        );

        return;
    }

    if (
        !confirm(
            `Approve loan ${
                loan.loanNumber || ""
            } for ${
                loan.clientName
            }?`
        )
    ) {
        return;
    }

    try {
        const approvalDate =
            new Date();

        const schedule =
            generateRepaymentSchedule(
                approvalDate,
                loan.duration,
                loan.weeklyPayment,
                loan.totalRepayment
            );

        await updateDoc(
            doc(
                db,
                "loans",
                loan.id
            ),
            {
                approvalDate:
                    formatDate(
                        approvalDate
                    ),

                repaymentSchedule:
                    schedule,

                nextRepaymentDate:
                    schedule.length
                        ? schedule[0]
                            .dueDate
                        : "-",

                remainingInstallments:
                    schedule.length,

                status:
                    "Active",

                completed:
                    false,

                updatedAt:
                    serverTimestamp()
            }
        );

        await logHistory(
            "Loan Approved",
            "Loan",
            {
                loanId:
                    loan.loanNumber,
                client:
                    loan.clientName,
                amount:
                    loan.amount,
                newStatus:
                    "Active"
            }
        );

        alert(
            "Loan approved successfully. Status is now Active."
        );

        // Offer the officer a manual GREYMUS approval message.
        const approvedLoan = {
            ...loan,
            approvalDate: formatDate(approvalDate),
            repaymentSchedule: schedule,
            nextRepaymentDate: schedule.length
                ? schedule[0].dueDate
                : "-",
            remainingInstallments: schedule.length,
            status: "Active"
        };

        const approvedClient =
            clients.find(item => item.id === loan.clientId);

        openMessageComposer({
            type: "approved",
            loan: approvedLoan,
            client: approvedClient,
            outstanding: Number(approvedLoan.balance ?? loan.balance ?? loan.totalRepayment ?? 0)
        });

    } catch (error) {
        console.error(
            error
        );

        alert(
            "Failed to approve loan."
        );
    }
}


// ==========================================
// DELETE LOAN
// ==========================================

async function deleteLoan(
    id
) {
    if (!isAdmin()) {
        alert(
            "Only the Administrator can delete loans."
        );

        return;
    }

    const loan =
        loans.find(
            item =>
                item.id === id
        );

    if (
        !loan ||
        normalizeLoanStatus(
            loan.status
        ) !== "Pending"
    ) {
        alert(
            "Only pending loans can be deleted."
        );

        return;
    }

    if (
        !confirm(
            `Delete loan for ${loan.clientName}?`
        )
    ) {
        return;
    }

    try {
        await deleteDoc(
            doc(
                db,
                "loans",
                loan.id
            )
        );

        await logHistory(
            "Loan Deleted",
            "Loan",
            {
                loanId:
                    loan.loanNumber,
                client:
                    loan.clientName,
                amount:
                    loan.amount
            }
        );

        closeLoanDetailsPage();

        alert(
            "Loan deleted successfully."
        );

    } catch (error) {
        console.error(
            error
        );

        alert(
            "Failed to delete loan."
        );
    }
}


// ==========================================
// DELETE PAYMENT
// ==========================================

async function deletePayment(
    loanIdValue,
    week,
    paymentId = ""
) {
    /*
     * ADMIN ONLY
     */
    if (!isAdmin()) {
        alert(
            "Only the Administrator can delete repayments."
        );

        return;
    }


    const loan =
        loans.find(
            item =>
                item.id ===
                loanIdValue
        );

    if (!loan) {
        alert(
            "Loan not found."
        );

        return;
    }


    const schedule =
        loan.repaymentSchedule ||
        [];

    const installment =
        schedule.find(
            item =>
                Number(item.week) ===
                Number(week)
        );

    if (
        !installment ||
        !installment.paymentHistory?.length
    ) {
        alert(
            "Repayment not found."
        );

        return;
    }


    /*
     * Find the payment.
     *
     * New records have paymentId.
     * Old records fall back to the
     * latest payment in the installment.
     */
    let paymentIndex =
        installment.paymentHistory.length -
        1;

    if (paymentId) {
        const foundIndex =
            installment.paymentHistory.findIndex(
                payment =>
                    payment.paymentId ===
                    paymentId
            );

        if (foundIndex !== -1) {
            paymentIndex =
                foundIndex;
        }
    }


    const payment =
        installment.paymentHistory[
            paymentIndex
        ];


    if (!payment) {
        alert(
            "Repayment not found."
        );

        return;
    }


    /*
     * SECURITY CHECK 1:
     * The payment must be the latest
     * payment on the entire loan.
     */
    if (
        !isLatestPayment(
            loan,
            payment
        )
    ) {
        alert(
            "Only the most recent repayment can be deleted."
        );

        return;
    }


    /*
     * SECURITY CHECK 2:
     * The payment must be less than
     * or equal to 24 hours old.
     */
    if (
        !isPaymentWithinDeleteWindow(
            payment
        )
    ) {
        alert(
            "This repayment can no longer be deleted because more than 24 hours have passed."
        );

        return;
    }


    const paymentAge =
        Date.now() -
        getPaymentTimestamp(
            payment
        );

    const remainingHours =
        Math.max(
            0,
            Math.ceil(
                (
                    REPAYMENT_DELETE_WINDOW_MS -
                    paymentAge
                ) /
                    (60 * 60 * 1000)
            )
        );


    if (
        !confirm(
            `Delete repayment of ${currency(
                payment.amount
            )}?\n\n` +
            `This is the latest repayment.\n` +
            `${remainingHours} hour(s) remaining before deletion expires.`
        )
    ) {
        return;
    }


    /*
     * Make a deep-ish copy of the
     * schedule before modifying it.
     */
    const originalSchedule =
        JSON.parse(
            JSON.stringify(
                schedule
            )
        );


    /*
     * Remove ONLY the selected/latest
     * payment from the payment history.
     */
    installment.paymentHistory.splice(
        paymentIndex,
        1
    );


    /*
     * Recalculate this installment.
     */
    installment.paidAmount =
        Math.max(
            Number(
                installment.paidAmount ||
                0
            ) -
                Number(
                    payment.amount ||
                    0
                ),
            0
        );


    installment.remainingAmount =
        Math.max(
            Number(
                installment.amount ||
                0
            ) -
                installment.paidAmount,
            0
        );


    installment.paid =
        installment.paidAmount >=
        Number(
            installment.amount ||
            0
        );


    installment.status =
        installment.paid
            ? "Paid"
            : installment.paidAmount >
              0
                ? "Partial"
                : "Pending";


    /*
     * Rebuild paid date from the
     * remaining payment history.
     */
    const remainingHistory =
        installment.paymentHistory ||
        [];

    const latestRemainingPayment =
        remainingHistory.length
            ? remainingHistory[
                remainingHistory.length -
                1
            ]
            : null;

    installment.paidDate =
        latestRemainingPayment?.date ||
        null;


    /*
     * Recalculate the entire loan.
     */
    const balance =
        Math.min(
            Number(
                loan.totalRepayment ||
                0
            ),
            Number(
                loan.balance ||
                0
            ) +
                Number(
                    payment.amount ||
                    0
                )
        );


    const amountPaid =
        Math.max(
            Number(
                loan.amountPaid ||
                0
            ) -
                Number(
                    payment.amount ||
                    0
                ),
            0
        );


    const next =
        schedule.find(
            item =>
                !item.paid
        );


    let status =
        "Active";


    if (
        next &&
        next.dueDate <
            today()
    ) {
        status =
            "Arrears";
    }


    if (
        !next &&
        balance <= 0
    ) {
        status =
            "Completed";
    }


    /*
     * Income must also be reversed.
     *
     * The original repayment income
     * calculation used the interest
     * proportion of the repayment.
     */
    const totalInterest =
        Number(
            loan.totalRepayment ||
            0
        ) -
        Number(
            loan.amount ||
            0
        );


    const interestRatio =
        Number(
            loan.totalRepayment ||
            0
        ) > 0
            ? totalInterest /
              Number(
                  loan.totalRepayment
              )
            : 0;


    const paymentIncome =
        Number(
            payment.amount ||
            0
        ) *
        interestRatio;


    const totalIncome =
        Math.max(
            Number(
                loan.totalIncome ||
                0
            ) -
                paymentIncome,
            0
        );


    try {
        /*
         * Update the loan first.
         */
        await updateDoc(
            doc(
                db,
                "loans",
                loan.id
            ),
            {
                balance,
                amountPaid,
                totalIncome,
                repaymentSchedule:
                    schedule,

                nextRepaymentDate:
                    next
                        ? next.dueDate
                        : "-",

                remainingInstallments:
                    schedule.filter(
                        item =>
                            !item.paid
                    ).length,

                status,

                completed:
                    balance <= 0,

                updatedAt:
                    serverTimestamp()
            }
        );


        /*
         * If the repayment document has
         * an ID stored, delete that record
         * too.
         */
        if (
            payment.repaymentDocId
        ) {
            try {
                await deleteDoc(
                    doc(
                        db,
                        "repayments",
                        payment.repaymentDocId
                    )
                );
            } catch (
                repaymentDeleteError
            ) {
                console.error(
                    "Repayment document delete error:",
                    repaymentDeleteError
                );
            }
        }


        await logHistory(
            "Repayment Deleted",
            "Repayment",
            {
                loanId:
                    loan.loanNumber,
                client:
                    loan.clientName,
                amount:
                    payment.amount,
                balance,
                deletedWithin24Hours:
                    true,
                deletedBy:
                    localStorage.getItem(
                        "userName"
                    ) ||
                    localStorage.getItem(
                        "userEmail"
                    ) ||
                    "Unknown Officer"
            }
        );


        alert(
            "Repayment deleted successfully."
        );


        /*
         * Re-render the currently open
         * loan details page.
         */
        if (
            selectedLoanId ===
            loan.id
        ) {
            const updatedLoan =
                loans.find(
                    item =>
                        item.id ===
                        loan.id
                );

            if (updatedLoan) {
                if (
                    previousLoansOpen
                ) {
                    renderPreviousLoansPage(
                        updatedLoan
                    );
                } else {
                    renderLoanDetailsPage(
                        updatedLoan
                    );
                }
            }
        }

    } catch (error) {

        /*
         * Restore local schedule if
         * Firestore update failed.
         */
        installment.paymentHistory =
            originalSchedule.find(
                item =>
                    Number(item.week) ===
                    Number(week)
            )?.paymentHistory ||
            [];

        const originalInstallment =
            originalSchedule.find(
                item =>
                    Number(item.week) ===
                    Number(week)
            );

        if (
            originalInstallment
        ) {
            installment.paidAmount =
                originalInstallment.paidAmount;

            installment.remainingAmount =
                originalInstallment.remainingAmount;

            installment.paid =
                originalInstallment.paid;

            installment.status =
                originalInstallment.status;

            installment.paidDate =
                originalInstallment.paidDate;
        }

        console.error(
            error
        );

        alert(
            "Failed to delete repayment."
        );
    }
}


// ==========================================
// CLOSE REPAYMENT MODAL
// ==========================================

function closeRepaymentModal() {
    const modal =
        document.getElementById(
            "repayment-modal"
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.style.zIndex =
        "";

    /*
     * Return to normal FAB mode.
     */
    directLoanRepaymentMode =
        false;

    clearRepaymentFields();

    if (repaymentAmount) {
        repaymentAmount.value =
            "";
    }

    if (repaymentNotes) {
        repaymentNotes.value =
            "";
    }

    if (repaymentDate) {
        repaymentDate.value =
            today();
    }

    showFabRepaymentSelectors();
}


// ==========================================
// REPAYMENT MODAL CLOSE EVENTS
// ==========================================

document.addEventListener(
    "click",
    event => {
        const closeButton =
            event.target.closest(
                "#close-repayment-modal, .close-repayment-modal, [data-close=\"repayment-modal\"], [data-modal-close=\"repayment-modal\"]"
            );

        if (!closeButton) {
            return;
        }

        event.preventDefault();

        closeRepaymentModal();
    }
);


document
    .getElementById(
        "repayment-modal"
    )
    ?.addEventListener(
        "click",
        event => {
            if (
                event.target.id ===
                "repayment-modal"
            ) {
                closeRepaymentModal();
            }
        }
    );


document.addEventListener(
    "keydown",
    event => {
        if (
            event.key !==
            "Escape"
        ) {
            return;
        }

        const modal =
            document.getElementById(
                "repayment-modal"
            );

        if (
            modal &&
            !modal.classList.contains(
                "hidden"
            )
        ) {
            closeRepaymentModal();
        }
    }
);


// ==========================================
// REPAYMENT SUBMISSION
// ==========================================

repaymentForm?.addEventListener(
    "submit",
    async e => {
        e.preventDefault();

        if (repaymentSaving) {
            return;
        }


        /*
         * DIRECT LOAN MODE
         *
         * The loan ID comes from the
         * selected Loan Details page.
         *
         * No client selection required.
         */
        const selectedRepaymentLoanId =
            directLoanRepaymentMode
                ? selectedLoanId ||
                  repaymentLoanId?.value
                : repaymentLoanId?.value;


        const loan =
            loans.find(
                item =>
                    item.id ===
                    selectedRepaymentLoanId
            );


        if (!loan) {
            alert(
                directLoanRepaymentMode
                    ? "The selected loan could not be found."
                    : "Please select a client with an outstanding loan."
            );

            return;
        }


        const payment =
            Number(
                repaymentAmount?.value ||
                0
            );


        if (
            payment <= 0
        ) {
            alert(
                "Enter a valid repayment amount."
            );

            return;
        }


        if (
            payment >
            Number(
                loan.balance ||
                0
            )
        ) {
            alert(
                "Payment cannot exceed the outstanding balance."
            );

            return;
        }


        if (
            !confirm(
                `Confirm repayment of ${currency(
                    payment
                )} for ${loan.clientName}?`
            )
        ) {
            return;
        }


        repaymentSaving =
            true;


        const saveButton =
            repaymentForm.querySelector(
                'button[type="submit"]'
            );


        const originalText =
            saveButton?.innerHTML ||
            "Save Repayment";


        if (saveButton) {
            saveButton.disabled =
                true;

            saveButton.innerHTML =
                "⏳ Recording Repayment...";
        }


        let balance =
            Number(
                loan.balance ||
                0
            ) -
            payment;


        if (
            balance < 0
        ) {
            balance =
                0;
        }


        const amountPaid =
            Number(
                loan.amountPaid ||
                0
            ) +
            payment;


        const totalInterest =
            Number(
                loan.totalRepayment ||
                0
            ) -
            Number(
                loan.amount ||
                0
            );


        const interestRatio =
            Number(
                loan.totalRepayment ||
                0
            ) > 0
                ? totalInterest /
                  Number(
                      loan.totalRepayment
                  )
                : 0;


        const incomeEarned =
            payment *
            interestRatio;


        const totalIncome =
            Number(
                loan.totalIncome ||
                0
            ) +
            incomeEarned;


        const schedule =
            (
                loan.repaymentSchedule ||
                []
            ).map(
                item => ({
                    ...item,
                    paymentHistory:
                        [
                            ...(item.paymentHistory ||
                                [])
                        ]
                })
            );


        let remaining =
            payment;


        /*
         * One timestamp is used for all
         * repayment records created by
         * this submission.
         */
        const paymentTimestamp =
            new Date();


        const paymentISO =
            paymentTimestamp.toISOString();


        const paymentTime =
            paymentTimestamp.toLocaleTimeString(
                [],
                {
                    hour:
                        "2-digit",
                    minute:
                        "2-digit",
                    second:
                        "2-digit",
                    hour12:
                        false
                }
            );


        /*
         * Create a temporary ID so the
         * repayment can be linked to its
         * paymentHistory record.
         */
        const paymentId =
            `PAY-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}`;


        /*
         * Distribute the repayment across
         * the repayment schedule.
         */
        for (
            const item
            of schedule
        ) {
            if (
                remaining <=
                0
            ) {
                break;
            }


            if (item.paid) {
                continue;
            }


            const unpaid =
                Math.max(
                    Number(
                        item.amount ||
                        0
                    ) -
                        Number(
                            item.paidAmount ||
                            0
                        ),
                    0
                );


            if (
                unpaid <=
                0
            ) {
                continue;
            }


            item.paymentHistory ??=
                [];


            if (
                remaining >=
                unpaid
            ) {
                item.paidAmount =
                    Number(
                        item.paidAmount ||
                        0
                    ) +
                    unpaid;


                item.remainingAmount =
                    0;


                item.paid =
                    true;


                item.status =
                    "Paid";


                item.paidDate =
                    repaymentDate.value;


                item.paymentHistory.push(
                    {
                        paymentId,
                        amount:
                            unpaid,
                        date:
                            repaymentDate.value,
                        time:
                            paymentTime,
                        timestamp:
                            paymentISO,
                        paymentTimestamp:
                            paymentISO,
                        notes:
                            repaymentNotes?.value ||
                            "",
                        officer:
                            localStorage.getItem(
                                "userName"
                            ) ||
                            localStorage.getItem(
                                "userEmail"
                            ) ||
                            "Unknown Officer"
                    }
                );


                remaining -=
                    unpaid;

            } else {

                item.paidAmount =
                    Number(
                        item.paidAmount ||
                        0
                    ) +
                    remaining;


                item.remainingAmount =
                    Math.max(
                        Number(
                            item.amount ||
                            0
                        ) -
                            Number(
                                item.paidAmount ||
                                0
                            ),
                        0
                    );


                item.status =
                    "Partial";


                item.paymentHistory.push(
                    {
                        paymentId,
                        amount:
                            remaining,
                        date:
                            repaymentDate.value,
                        time:
                            paymentTime,
                        timestamp:
                            paymentISO,
                        paymentTimestamp:
                            paymentISO,
                        notes:
                            repaymentNotes?.value ||
                            "",
                        officer:
                            localStorage.getItem(
                                "userName"
                            ) ||
                            localStorage.getItem(
                                "userEmail"
                            ) ||
                            "Unknown Officer"
                    }
                );


                remaining =
                    0;
            }
        }


        const next =
            schedule.find(
                item =>
                    !item.paid
            );


        let status =
            "Active";


        if (
            next &&
            next.dueDate <
                today()
        ) {
            status =
                "Arrears";
        }


        if (
            balance <=
            0
        ) {
            balance =
                0;

            status =
                "Completed";
        }


        try {

            /*
             * First create the repayment
             * document.
             *
             * We store its Firestore ID
             * in paymentHistory so that
             * deleting the repayment later
             * can also remove the matching
             * repayment document.
             */
            const repaymentDoc =
                await addDoc(
                    collection(
                        db,
                        "repayments"
                    ),
                    {
                        loanId:
                            loan.id,

                        loanNumber:
                            loan.loanNumber ||
                            "-",

                        clientId:
                            loan.clientId,

                        clientName:
                            loan.clientName,

                        amount:
                            payment,

                        balance,

                        paymentDate:
                            repaymentDate.value,

                        paymentTime,

                        paymentTimestamp:
                            paymentISO,

                        officer:
                            localStorage.getItem(
                                "userName"
                            ) ||
                            localStorage.getItem(
                                "userEmail"
                            ) ||
                            "Unknown Officer",

                        notes:
                            repaymentNotes?.value ||
                            "",

                        createdAt:
                            serverTimestamp()
                    }
                );


            /*
             * Attach Firestore repayment
             * document ID to every schedule
             * history entry created by this
             * repayment.
             */
            for (
                const item
                of schedule
            ) {
                for (
                    const historyEntry
                    of item.paymentHistory ||
                    []
                ) {
                    if (
                        historyEntry.paymentId ===
                        paymentId
                    ) {
                        historyEntry.repaymentDocId =
                            repaymentDoc.id;
                    }
                }
            }


            /*
             * Update the loan after the
             * repayment document exists.
             */
            await updateDoc(
                doc(
                    db,
                    "loans",
                    loan.id
                ),
                {
                    balance,

                    amountPaid,

                    totalIncome,

                    repaymentSchedule:
                        schedule,

                    nextRepaymentDate:
                        next
                            ? next.dueDate
                            : "-",

                    remainingInstallments:
                        schedule.filter(
                            item =>
                                !item.paid
                        ).length,

                    status,

                    completed:
                        balance <=
                        0,

                    updatedAt:
                        serverTimestamp()
                }
            );


            await logHistory(
                "Repayment Recorded",
                "Repayment",
                {
                    loanId:
                        loan.loanNumber,

                    client:
                        loan.clientName,

                    amount:
                        payment,

                    balance,

                    repaymentId:
                        repaymentDoc.id
                }
            );


            closeRepaymentModal();


            repaymentForm.reset();


            if (
                repaymentLoanId
            ) {
                repaymentLoanId.value =
                    "";
            }


            alert(
                "✅ Repayment recorded successfully."
            );

            // Offer a manual GREYMUS payment confirmation.
            const updatedLoan = {
                ...loan,
                balance,
                amountPaid,
                totalIncome,
                repaymentSchedule: schedule,
                nextRepaymentDate: next
                    ? next.dueDate
                    : "-",
                remainingInstallments: schedule.filter(
                    item => !item.paid
                ).length,
                status,
                completed: balance <= 0
            };

            const paymentClient =
                clients.find(item => item.id === loan.clientId);

            openMessageComposer({
                type: "payment",
                loan: updatedLoan,
                client: paymentClient,
                payment,
                outstanding: balance
            });


        } catch (error) {

            console.error(
                error
            );

            alert(
                "Failed to record repayment."
            );

        } finally {

            repaymentSaving =
                false;

            if (saveButton) {
                saveButton.disabled =
                    false;

                saveButton.innerHTML =
                    originalText;
            }
        }
    }
);


// ==========================================
// FAB ADD REPAYMENT
// ==========================================

function setupFabAddRepayment() {
    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "#fab-add-repayment, #fab-repayment, #fab-new-loan, [data-action=\"add-repayment\"]"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            event.stopPropagation();

            openFabRepaymentSelector();
        },
        true
    );
}


// ==========================================
// FAB REPAYMENT SELECTORS
// ==========================================

function createFabRepaymentSelectors(
    form
) {
    if (!form) {
        return null;
    }

    let container =
        document.getElementById(
            "fab-repayment-selectors"
        );

    if (container) {
        return container;
    }


    container =
        document.createElement(
            "div"
        );

    container.id =
        "fab-repayment-selectors";

    container.className =
        "fab-repayment-selectors";


    container.innerHTML = `
        <div class="fab-repayment-selector-group">

            <label
                for="fab-repayment-client-select"
            >
                Client
            </label>

            <select
                id="fab-repayment-client-select"
                required
            >
                <option value="">
                    Select Client
                </option>
            </select>

        </div>


        <div
            class="fab-repayment-selector-group"
            id="fab-repayment-loan-group"
            style="display:none;"
        >

            <label
                for="fab-repayment-loan-select"
            >
                Loan
            </label>

            <select
                id="fab-repayment-loan-select"
            >

                <option value="">
                    Select Loan
                </option>

            </select>

        </div>
    `;


    form.insertBefore(
        container,
        form.firstElementChild
    );


    document
        .getElementById(
            "fab-repayment-client-select"
        )
        ?.addEventListener(
            "change",
            e => {
                loadLoansForSelectedClient(
                    e.target.value
                );
            }
        );


    document
        .getElementById(
            "fab-repayment-loan-select"
        )
        ?.addEventListener(
            "change",
            e => {
                fillRepaymentFromSelectedLoan(
                    e.target.value
                );
            }
        );


    return container;
}


// ==========================================
// SHOW / HIDE FAB SELECTORS
// ==========================================

function hideFabRepaymentSelectors() {
    const container =
        document.getElementById(
            "fab-repayment-selectors"
        );

    if (container) {
        container.style.display =
            "none";
    }


    const clientSelect =
        document.getElementById(
            "fab-repayment-client-select"
        );

    const loanSelect =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (clientSelect) {
        clientSelect.disabled =
            true;
    }

    if (loanSelect) {
        loanSelect.disabled =
            true;
    }
}


function showFabRepaymentSelectors() {
    const container =
        document.getElementById(
            "fab-repayment-selectors"
        );

    if (container) {
        container.style.display =
            "";
    }


    const clientSelect =
        document.getElementById(
            "fab-repayment-client-select"
        );

    const loanSelect =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    if (clientSelect) {
        clientSelect.disabled =
            false;
    }

    if (loanSelect) {
        loanSelect.disabled =
            false;
    }
}


// ==========================================
// POPULATE FAB CLIENT SELECTOR
// ==========================================

function populateFabClientSelector() {
    if (!repaymentForm) {
        return;
    }

    createFabRepaymentSelectors(
        repaymentForm
    );


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );

    if (!clientSelector) {
        return;
    }


    const currentValue =
        clientSelector.value;


    clientSelector.innerHTML =
        `
            <option value="">
                Select Client
            </option>
        `;


    const sortedClients =
        [...clients].sort(
            (a, b) =>
                (a.name || "")
                    .localeCompare(
                        b.name || ""
                    )
        );


    sortedClients.forEach(
        client => {

            const clientLoans =
                loans.filter(
                    loan =>
                        loan.clientId ===
                            client.id &&
                        Number(
                            loan.balance ||
                            0
                        ) > 0 &&
                        normalizeLoanStatus(
                            loan.status
                        ) !==
                            "Completed"
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                client.id;


            if (
                clientLoans.length
            ) {

                option.textContent =
                    client.name ||
                    "Unnamed Client";

            } else {

                option.textContent =
                    `${
                        client.name ||
                        "Unnamed Client"
                    } — No outstanding loan`;

                option.disabled =
                    true;
            }


            clientSelector.appendChild(
                option
            );
        }
    );


    if (currentValue) {
        clientSelector.value =
            currentValue;
    }
}


// ==========================================
// OPEN FAB REPAYMENT
// ==========================================

function openFabRepaymentSelector() {
    const modal =
        document.getElementById(
            "repayment-modal"
        );

    const form =
        document.getElementById(
            "repayment-form"
        );


    if (
        !modal ||
        !form
    ) {
        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    /*
     * FAB mode.
     *
     * User must choose client and,
     * when necessary, loan.
     */
    directLoanRepaymentMode =
        false;


    modal.style.position =
        "fixed";

    modal.style.zIndex =
        "100001";


    createFabRepaymentSelectors(
        form
    );

    showFabRepaymentSelectors();

    populateFabClientSelector();


    modal.classList.remove(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


// ==========================================
// LOAD LOANS FOR SELECTED CLIENT
// ==========================================

function loadLoansForSelectedClient(
    clientId
) {
    const client =
        clients.find(
            item =>
                item.id ===
                clientId
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );


    if (!client) {

        if (loanSelector) {
            loanSelector.innerHTML =
                `
                    <option value="">
                        Select Loan
                    </option>
                `;
        }


        if (loanGroup) {
            loanGroup.style.display =
                "none";
        }


        clearRepaymentFields();

        return;
    }


    const clientLoans =
        loans.filter(
            loan =>
                loan.clientId ===
                    clientId &&
                Number(
                    loan.balance ||
                    0
                ) > 0 &&
                normalizeLoanStatus(
                    loan.status
                ) !==
                    "Completed"
        );


    if (
        !clientLoans.length
    ) {

        clearRepaymentFields();


        if (loanGroup) {
            loanGroup.style.display =
                "none";
        }


        alert(
            `${
                client.name ||
                "This client"
            } has no outstanding loan.`
        );

        return;
    }


    /*
     * If there is only one outstanding
     * loan, select it automatically.
     */
    if (
        clientLoans.length ===
        1
    ) {

        if (loanGroup) {
            loanGroup.style.display =
                "none";
        }


        fillRepaymentFromSelectedLoan(
            clientLoans[0].id
        );

        return;
    }


    /*
     * Multiple loans:
     * FAB mode requires loan selection.
     */
    if (loanGroup) {
        loanGroup.style.display =
            "block";
    }


    if (loanSelector) {

        loanSelector.innerHTML =
            `
                <option value="">
                    Select Loan
                </option>
            `;


        clientLoans.forEach(
            loan => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    loan.id;


                option.textContent =
                    `${
                        loan.loanNumber ||
                        "Loan"
                    } — Balance ${
                        currency(
                            loan.balance
                        )
                    }`;


                loanSelector.appendChild(
                    option
                );
            }
        );
    }


    clearRepaymentFields();
}


// ==========================================
// FILL REPAYMENT FROM SELECTED LOAN
// ==========================================

function fillRepaymentFromSelectedLoan(
    id
) {
    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan) {
        clearRepaymentFields();

        return;
    }


    if (repaymentLoanId) {
        repaymentLoanId.value =
            loan.id;
    }


    if (repaymentClient) {
        /*
         * If the repayment client input
         * exists, show the already-known
         * client name instead of requiring
         * another selection.
         */
        if (
            repaymentClient.tagName ===
            "SELECT"
        ) {
            repaymentClient.value =
                loan.clientId;
        } else {
            repaymentClient.value =
                loan.clientName ||
                "";
        }
    }


    if (repaymentBalance) {
        repaymentBalance.value =
            currency(
                loan.balance
            );
    }


    if (repaymentAmount) {
        repaymentAmount.value =
            "";
    }


    if (repaymentNotes) {
        repaymentNotes.value =
            "";
    }


    if (repaymentDate) {
        repaymentDate.value =
            today();
    }
}


// ==========================================
// CLEAR REPAYMENT FIELDS
// ==========================================

function clearRepaymentFields() {
    if (repaymentLoanId) {
        repaymentLoanId.value =
            "";
    }


    if (repaymentBalance) {
        repaymentBalance.value =
            "";
    }
}


// ==========================================
// DIRECT REPAYMENT FROM LOAN DETAILS
// ==========================================

function openRepaymentForLoan(
    id
) {
    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan) {
        alert(
            "Loan not found."
        );

        return;
    }


    /*
     * IMPORTANT:
     *
     * This is NOT the FAB flow.
     *
     * The user already opened this
     * specific loan.
     *
     * Therefore:
     * - no client selector
     * - no loan selector
     * - no client selection required
     * - loan ID is locked to this loan
     */
    directLoanRepaymentMode =
        true;


    const modal =
        document.getElementById(
            "repayment-modal"
        );


    const form =
        document.getElementById(
            "repayment-form"
        );


    if (
        !modal ||
        !form
    ) {
        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    modal.style.position =
        "fixed";

    modal.style.zIndex =
        "100001";


    /*
     * Create the FAB selector
     * container only if it does not
     * already exist.
     *
     * Then immediately hide it.
     */
    createFabRepaymentSelectors(
        form
    );


    hideFabRepaymentSelectors();


    /*
     * Set the exact loan directly.
     */
    selectedLoanId =
        id;


    fillRepaymentFromSelectedLoan(
        id
    );


    /*
     * Make absolutely sure the
     * hidden loan ID is correct.
     */
    if (repaymentLoanId) {
        repaymentLoanId.value =
            loan.id;
    }


    /*
     * The client is already known
     * from the selected loan.
     */
    if (repaymentClient) {

        if (
            repaymentClient.tagName ===
            "SELECT"
        ) {
            repaymentClient.value =
                loan.clientId;
        } else {
            repaymentClient.value =
                loan.clientName ||
                "";
        }
    }


    if (repaymentBalance) {
        repaymentBalance.value =
            currency(
                loan.balance
            );
    }


    if (repaymentAmount) {
        repaymentAmount.value =
            "";
    }


    if (repaymentDate) {
        repaymentDate.value =
            today();
    }


    if (repaymentNotes) {
        repaymentNotes.value =
            "";
    }


    modal.classList.remove(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


// ==========================================
// AUTOMATIC REFRESH
// ==========================================

setInterval(
    () => {
        if (loans.length) {
            checkOverdueLoans();
        }
    },
    60000
);


setInterval(
    () => {
        if (!loanDetailsOpen) {
            filterLoans();
        }
    },
    30000
);


/*
 * Refresh the loan details page
 * periodically so the 24-hour delete
 * button disappears automatically.
 */
setInterval(
    () => {
     
Preview truncated for large file