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

    // Running loan statuses.
    // Approved is normalized to Active above, so older records
    // using Approved are also displayed correctly.
    return (
        status === "Pending" ||
        status === "Active" ||
        status === "Arrears"
    );
}


// ==========================================
// FILTER VALUE HELPERS
// ==========================================

function isAllFilterValue(value) {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ");

    return (
        normalized === "" ||
        normalized === "all" ||
        normalized === "all status" ||
        normalized === "all months" ||
        normalized === "all years" ||
        normalized === "all statuses"
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
        error => {
            console.error(
                "Failed to load loans:",
                error
            );

            if (loansTableBody) {
                loansTableBody.innerHTML = `
                    <tr>
                        <td colspan="15" style="text-align:center; padding:20px;">
                            Unable to load loans. Please refresh the page.
                        </td>
                    </tr>
                `;
            }
        }
    );
}


// ==========================================
// NEW LOAN MODAL// ==========================================
// NEW LOAN MODAL
// ==========================================

function openLoanModal() {

    loanForm?.reset();

    if (loanId) {
        loanId.value = "";
    }

    if (loanStartDate) {
        loanStartDate.value =
            today();
    }

    if (loanDueDate) {
        loanDueDate.value = "";
    }

    calculateLoan();

    loanModal?.classList.remove(
        "hidden"
    );
}


function closeLoanModal() {

    loanModal?.classList.add(
        "hidden"
    );

    loanForm?.reset();

    if (loanId) {
        loanId.value = "";
    }

    if (loanStartDate) {
        loanStartDate.value =
            today();
    }

    calculateLoan();
}


// ==========================================
// LOAN FORM SUBMISSION
// ==========================================

loanForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const calculation =
            calculateLoan();

        if (
            !loanClient?.value ||
            !loanAmount?.value ||
            !loanDuration?.value
        ) {

            alert(
                "Please complete the required loan information."
            );

            return;
        }


        const client =
            clients.find(
                item =>
                    item.id ===
                    loanClient.value
            );


        if (!client) {

            alert(
                "Selected client could not be found."
            );

            return;
        }


        const existingLoanId =
            loanId?.value || "";


        const approvalDate =
            loanStartDate?.value ||
            today();


        const repaymentSchedule =
            generateRepaymentSchedule(
                approvalDate,
                calculation.duration,
                calculation.weeklyPayment,
                calculation.totalRepayment
            );


        const existingLoan =
            existingLoanId
                ? loans.find(
                    loan =>
                        loan.id ===
                        existingLoanId
                )
                : null;


        const loanData = {

            clientId:
                client.id,

            clientName:
                client.name || "",

            clientPhone:
                client.phone || "",

            loanNumber:
                existingLoan?.loanNumber ||
                generateLoanNumber(),

            loanType:
                loanType?.value ||
                "Standard",

            amount:
                calculation.amount,

            processingFee:
                calculation.processingFee,

            interest:
                calculation.interest,

            interestAmount:
                calculation.interestAmount,

            duration:
                calculation.duration,

            repayment:
                calculation.weeklyPayment,

            weeklyPayment:
                calculation.weeklyPayment,

            totalRepayment:
                calculation.totalRepayment,

            balance:
                existingLoan
                    ? Number(
                        existingLoan.balance
                    )
                    : calculation.totalRepayment,

            totalIncome:
                calculation.interestAmount,

            openingBalance:
                existingLoan
                    ? Number(
                        existingLoan.openingBalance ??
                        existingLoan.totalRepayment ??
                        calculation.totalRepayment
                    )
                    : calculation.totalRepayment,

            amountPaid:
                existingLoan
                    ? Number(
                        existingLoan.amountPaid ||
                        0
                    )
                    : 0,

            approvalDate,

            startDate:
                approvalDate,

            dueDate:
                loanDueDate?.value ||
                repaymentSchedule.at(-1)?.dueDate ||
                "",

            repaymentSchedule:
                existingLoan?.repaymentSchedule?.length
                    ? existingLoan.repaymentSchedule
                    : repaymentSchedule,

            nextRepaymentDate:
                existingLoan?.nextRepaymentDate ||
                repaymentSchedule[0]?.dueDate ||
                "-",

            remainingInstallments:
                existingLoan?.remainingInstallments ??
                calculation.duration,

            status:
                existingLoan
                    ? normalizeLoanStatus(
                        existingLoan.status
                    )
                    : "Pending",

            completed:
                existingLoan?.completed ||
                false,

            security:
                existingLoan?.security ||
                "",

            guarantorName:
                existingLoan?.guarantorName ||
                "",

            guarantorPhone:
                existingLoan?.guarantorPhone ||
                "",

            createdBy:
                existingLoan?.createdBy ||
                localStorage.getItem(
                    "userName"
                ) ||
                localStorage.getItem(
                    "userEmail"
                ) ||
                "Unknown Officer",

            updatedAt:
                serverTimestamp()
        };


        try {

            if (existingLoanId) {

                await updateDoc(
                    doc(
                        db,
                        "loans",
                        existingLoanId
                    ),
                    loanData
                );


                await logHistory(
                    "Loan Updated",
                    "Loan",
                    {
                        loanId:
                            existingLoanId,

                        loanNumber:
                            loanData.loanNumber,

                        clientName:
                            loanData.clientName
                    }
                );


                alert(
                    "Loan updated successfully."
                );

            } else {

                loanData.createdAt =
                    serverTimestamp();

                loanData.timestamp =
                    new Date().toISOString();


                const newLoan =
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
                            newLoan.id,

                        loanNumber:
                            loanData.loanNumber,

                        clientName:
                            loanData.clientName,

                        amount:
                            loanData.amount
                    }
                );


                alert(
                    "Loan created successfully."
                );
            }


            closeLoanModal();

        } catch (error) {

            console.error(
                "Loan save error:",
                error
            );

            alert(
                "Unable to save the loan. Please try again."
            );

        }

    }
);


// ==========================================
// FILTERS
// ==========================================

function filterLoans() {

    if (
        loanDetailsOpen ||
        previousLoansOpen
    ) {
        return;
    }


    if (!loansTableBody) {
        return;
    }


    const search =
        String(
            loanSearch?.value || ""
        )
            .trim()
            .toLowerCase();


    const statusFilter =
        String(
            loanFilter?.value || ""
        )
            .trim();


    const monthFilter =
        String(
            loanMonthFilter?.value || ""
        )
            .trim();


    const yearFilter =
        String(
            loanYearFilter?.value || ""
        )
            .trim();


    const filtered =
        loans.filter(
            loan => {

                // --------------------------
                // Status
                // --------------------------

                const normalizedStatus =
                    normalizeLoanStatus(
                        loan.status
                    );


                const statusMatch =
                    isAllFilterValue(
                        statusFilter
                    ) ||
                    normalizeLoanStatus(
                        statusFilter
                    ) ===
                    normalizedStatus;


                if (!statusMatch) {
                    return false;
                }


                // --------------------------
                // Search
                // --------------------------

                const searchText = [

                    loan.loanNumber,

                    loan.clientName,

                    loan.clientId,

                    loan.loanType,

                    loan.status

                ]
                    .join(" ")
                    .toLowerCase();


                if (
                    search &&
                    !searchText.includes(
                        search
                    )
                ) {

                    return false;

                }


                // --------------------------
                // Date
                // --------------------------

                const rawDate =
                    loan.approvalDate ||
                    loan.startDate ||
                    loan.createdAt?.toDate?.();


                const date =
                    rawDate
                        ? new Date(rawDate)
                        : null;


                if (
                    monthFilter &&
                    !isAllFilterValue(
                        monthFilter
                    )
                ) {

                    if (!date) {
                        return false;
                    }


                    const month =
                        String(
                            date.getMonth() + 1
                        );


                    if (
                        month !==
                        monthFilter
                    ) {

                        return false;

                    }

                }


                if (
                    yearFilter &&
                    !isAllFilterValue(
                        yearFilter
                    )
                ) {

                    if (!date) {
                        return false;
                    }


                    if (
                        String(
                            date.getFullYear()
                        ) !==
                        yearFilter
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    renderLoansTable(
        filtered
    );

}


// ==========================================
// POPULATE YEAR FILTER
// ==========================================

function populateYearFilter() {

    if (!loanYearFilter) {
        return;
    }


    const currentValue =
        loanYearFilter.value;


    const years =
        new Set();


    loans.forEach(
        loan => {

            const rawDate =
                loan.approvalDate ||
                loan.startDate ||
                loan.createdAt?.toDate?.();


            if (!rawDate) {
                return;
            }


            const date =
                new Date(rawDate);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return;
            }


            years.add(
                String(
                    date.getFullYear()
                )
            );

        }
    );


    const sortedYears =
        Array.from(years)
            .sort(
                (a, b) =>
                    Number(b) -
                    Number(a)
            );


    loanYearFilter.innerHTML =
        `<option value="">All Years</option>`;


    sortedYears.forEach(
        year => {

            loanYearFilter.innerHTML += `
                <option value="${escapeHtml(year)}">
                    ${escapeHtml(year)}
                </option>
            `;

        }
    );


    if (
        sortedYears.includes(
            currentValue
        )
    ) {

        loanYearFilter.value =
            currentValue;

    }

}


// ==========================================
// FILTER LISTENERS
// ==========================================

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
// RENDER LOANS TABLE
// ==========================================

function renderLoansTable(
    list
) {

    if (!loansTableBody) {
        return;
    }


    if (!Array.isArray(list)) {
        list = [];
    }


    if (!list.length) {

        loansTableBody.innerHTML = `
            <tr>
                <td
                    colspan="15"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    No loans found for the selected filters.
                </td>
            </tr>
        `;

        return;

    }


    loansTableBody.innerHTML =
        list
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.approvalDate ||
                            a.startDate ||
                            a.createdAt?.toDate?.() ||
                            0
                        );

                    const dateB =
                        new Date(
                            b.approvalDate ||
                            b.startDate ||
                            b.createdAt?.toDate?.() ||
                            0
                        );

                    return (
                        dateB -
                        dateA
                    );

                }
            )
            .map(
                loan =>
                    renderLoanRow(
                        loan
                    )
            )
            .join("");

}


// ==========================================
// LOAN ROW
// ==========================================

function renderLoanRow(
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


    const amount =
        Number(
            loan.amount || 0
        );


    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );


    const amountPaid =
        Number(
            loan.amountPaid ||
            0
        );


    const balance =
        Number(
            loan.balance ??
            Math.max(
                totalRepayment -
                amountPaid,
                0
            )
        );


    const approvalDate =
        loan.approvalDate
            ? formatDate(
                loan.approvalDate
            )
            : "-";


    const dueDate =
        loan.nextRepaymentDate ||
        "-";


    return `
        <tr
            class="loan-row"
            data-loan-id="${escapeHtml(loan.id)}"
        >

            <td>
                <strong>
                    ${escapeHtml(
                        loan.loanNumber ||
                        loan.id
                    )}
                </strong>
            </td>


            <td>
                ${escapeHtml(
                    loan.clientName ||
                    "Unknown Client"
                )}
            </td>


            <td>
                ${currency(amount)}
            </td>


            <td>
                ${currency(
                    loan.weeklyPayment ||
                    loan.repayment ||
                    0
                )}
            </td>


            <td>
                ${currency(
                    totalRepayment
                )}
            </td>


            <td>
                ${currency(
                    amountPaid
                )}
            </td>


            <td>
                ${currency(
                    balance
                )}
            </td>


            <td>
                ${escapeHtml(
                    approvalDate
                )}
            </td>


            <td>
                ${escapeHtml(
                    dueDate
                )}
            </td>


            <td>
                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHtml(status)}
                </span>
            </td>


            <td>
                ${escapeHtml(
                    loan.loanType ||
                    "-"
                )}
            </td>


            <td>
                ${escapeHtml(
                    loan.duration ||
                    "-"
                )}
            </td>


            <td>
                ${currency(
                    loan.totalIncome ||
                    0
                )}
            </td>


            <td>
                <button
                    type="button"
                    class="btn btn-sm view-loan-btn"
                    data-loan-id="${escapeHtml(loan.id)}"
                >
                    View
                </button>
            </td>

        </tr>
    `;

}


// ==========================================
// LOAN ROW CLICK
// ==========================================

loansTableBody?.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".view-loan-btn"
            );


        if (button) {

            event.stopPropagation();

            openLoanDetailsPage(
                button.dataset.loanId
            );

            return;

        }


        const row =
            event.target.closest(
                ".loan-row"
            );


        if (!row) {
            return;
        }


        openLoanDetailsPage(
            row.dataset.loanId
        );

    }
);


// ==========================================
// LOAN DETAILS PAGE
// ==========================================

function openLoanDetailsPage(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan) {

        alert(
            "Loan could not be found."
        );

        return;
    }


    selectedLoanId =
        id;

    loanDetailsOpen =
        true;

    previousLoansOpen =
        false;

    previousLoanSelectedId =
        null;


    renderLoanDetailsPage(
        loan
    );

}


function renderLoanDetailsPage(
    loan
) {

    if (!loan) {
        return;
    }


    const container =
        document.getElementById(
            "loans"
        );


    if (!container) {
        return;
    }


    const status =
        normalizeLoanStatus(
            loan.status
        );


    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );


    const amountPaid =
        Number(
            loan.amountPaid ||
            0
        );


    const outstanding =
        Number(
            loan.balance ??
            Math.max(
                totalRepayment -
                amountPaid,
                0
            )
        );


    const weekly =
        Number(
            loan.weeklyPayment ||
            loan.repayment ||
            0
        );


    const client =
        clients.find(
            item =>
                item.id ===
                loan.clientId
        );


    const clientPhone =
        client?.phone ||
        loan.clientPhone ||
        "";


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    const paidInstallments =
        schedule.filter(
            item =>
                item.paid
        ).length;


    const progress =
        schedule.length
            ? Math.min(
                100,
                Math.round(
                    (
                        paidInstallments /
                        schedule.length
                    ) *
                    100
                )
            )
            : 0;


    container.innerHTML = `

        <div
            class="loan-details-page"
            data-loan-details-id="${escapeHtml(loan.id)}"
        >

            <div
                class="loan-details-topbar"
            >

                <button
                    type="button"
                    class="btn btn-secondary"
                    id="close-loan-details-page"
                >
                    ← Back to Loans
                </button>


                <div
                    class="loan-details-actions"
                >

                    ${
                        isRunningLoan(loan)
                            ? `
                                <button
                                    type="button"
                                    class="btn btn-primary"
                                    id="direct-repayment-btn"
                                >
                                    Receive Repayment
                                </button>
                              `
                            : ""
                    }


                    ${
                        typeof window.openMessageComposer ===
                        "function"
                            ? `
                                <button
                                    type="button"
                                    class="btn btn-secondary"
                                    id="loan-details-message-btn"
                                >
                                    💬 Message
                                </button>
                              `
                            : ""
                    }

                </div>

            </div>


            <div
                class="loan-details-header-card"
            >

                <div>

                    <span
                        class="loan-details-label"
                    >
                        LOAN
                    </span>

                    <h2>
                        ${escapeHtml(
                            loan.loanNumber ||
                            loan.id
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            loan.clientName ||
                            "Unknown Client"
                        )}
                    </p>

                </div>


                <span
                    class="status-badge ${status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}"
                >
                    ${escapeHtml(status)}
                </span>

            </div>


            <div
                class="loan-details-stat-grid"
            >

                <div
                    class="loan-detail-stat"
                >
                    <span>Loan Amount</span>
                    <strong>
                        ${currency(
                            loan.amount
                        )}
                    </strong>
                </div>


                <div
                    class="loan-detail-stat"
                >
                    <span>Weekly Repayment</span>
                    <strong>
                        ${currency(weekly)}
                    </strong>
                </div>


                <div
                    class="loan-detail-stat"
                >
                    <span>Outstanding</span>
                    <strong>
                        ${currency(outstanding)}
                    </strong>
                </div>


                <div
                    class="loan-detail-stat"
                >
                    <span>Paid</span>
                    <strong>
                        ${currency(amountPaid)}
                    </strong>
                </div>

            </div>


            <div
                class="loan-details-card"
            >

                <div
                    class="loan-details-card-header"
                >

                    <h3>
                        Collection Progress
                    </h3>

                    <strong>
                        ${progress}%
                    </strong>

                </div>


                <div
                    class="loan-progress-track"
                >

                    <div
                        class="loan-progress-fill"
                        style="width:${progress}%"
                    ></div>

                </div>

            </div>


            <div
                class="loan-details-grid"
            >

                <div
                    class="loan-details-card"
                >

                    <h3>
                        Loan Information
                    </h3>


                    <div
                        class="loan-detail-list"
                    >

                        <div>
                            <span>Client</span>
                            <strong>
                                ${escapeHtml(
                                    loan.clientName ||
                                    "-"
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>Phone</span>
                            <strong>
                                ${escapeHtml(
                                    clientPhone ||
                                    "-"
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>Loan Type</span>
                            <strong>
                                ${escapeHtml(
                                    loan.loanType ||
                                    "-"
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>Interest</span>
                            <strong>
                                ${escapeHtml(
                                    loan.interest ??
                                    0
                                )}%
                            </strong>
                        </div>


                        <div>
                            <span>Duration</span>
                            <strong>
                                ${escapeHtml(
                                    loan.duration ||
                                    "-"
                                )} weeks
                            </strong>
                        </div>


                        <div>
                            <span>Approval Date</span>
                            <strong>
                                ${escapeHtml(
                                    loan.approvalDate ||
                                    "-"
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>Next Repayment</span>
                            <strong>
                                ${escapeHtml(
                                    loan.nextRepaymentDate ||
                                    "-"
                                )}
                            </strong>
                        </div>

                    </div>

                </div>


                <div
                    class="loan-details-card"
                >

                    <h3>
                        Security & Guarantor
                    </h3>


                    <div
                        class="loan-detail-list"
                    >

                        <div>
                            <span>Security</span>
                            <strong>
                                ${escapeHtml(
                                    loan.security ||
                                    "-"
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>Guarantor</span>
                            <strong>
                                ${escapeHtml(
                                    loan.guarantorName ||
                                    "-"
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>Guarantor Phone</span>
                            <strong>
                                ${escapeHtml(
                                    loan.guarantorPhone ||
                                    "-"
                                )}
                            </strong>
                        </div>

                    </div>

                </div>

            </div>


            <div
                class="loan-details-card"
            >

                <div
                    class="loan-details-card-header"
                >

                    <h3>
                        Repayment Schedule
                    </h3>


                    <button
                        type="button"
                        class="btn btn-secondary"
                        id="open-full-schedule-btn"
                    >
                        View Full Schedule
                    </button>

                </div>


                <div
                    class="table-responsive"
                >

                    <table
                        class="data-table"
                    >

                        <thead>

                            <tr>
                                <th>Week</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Remaining</th>
                                <th>Status</th>
                            </tr>

                        </thead>


                        <tbody>

                            ${
                                schedule
                                    .slice(0, 5)
                                    .map(
                                        item => `
                                            <tr>

                                                <td>
                                                    ${escapeHtml(
                                                        item.week
                                                    )}
                                                </td>

                                                <td>
                                                    ${escapeHtml(
                                                        item.dueDate ||
                                                        "-"
                                                    )}
                                                </td>

                                                <td>
                                                    ${currency(
                                                        item.amount
                                                    )}
                                                </td>

                                                <td>
                                                    ${currency(
                                                        item.paidAmount ||
                                                        0
                                                    )}
                                                </td>

                                                <td>
                                                    ${currency(
                                                        item.remainingAmount ??
                                                        item.amount ??
                                                        0
                                                    )}
                                                </td>

                                                <td>
                                                    ${escapeHtml(
                                                        item.status ||
                                                        "Pending"
                                                    )}
                                                </td>

                                            </tr>
                                        `
                                    )
                                    .join("")
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    `;


    document
        .getElementById(
            "close-loan-details-page"
        )
        ?.addEventListener(
            "click",
            closeLoanDetailsPage
        );


    document
        .getElementById(
            "direct-repayment-btn"
        )
        ?.addEventListener(
            "click",
            () => {

                openDirectLoanRepayment(
                    loan.id
                );

            }
        );


    document
        .getElementById(
            "loan-details-message-btn"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    typeof window.openMessageComposer ===
                    "function"
                ) {

                    window.openMessageComposer(
                        {
                            type: "default",

                            loan,

                            client:
                                client || {
                                    name:
                                        loan.clientName ||
                                        "Client",

                                    phone:
                                        clientPhone
                                },

                            outstanding
                        }
                    );

                }

            }
        );


    document
        .getElementById(
            "open-full-schedule-btn"
        )
        ?.addEventListener(
            "click",
            () => {

                openScheduleModal(
                    loan
                );

            }
        );

}


// ==========================================
// CLOSE LOAN DETAILS
// ==========================================

function closeLoanDetailsPage() {

    loanDetailsOpen =
        false;

    selectedLoanId =
        null;

    previousLoansOpen =
        false;

    previousLoanSelectedId =
        null;


    const container =
        document.getElementById(
            "loans"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="loans-list-wrapper">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Loan Number</th>
                            <th>Client</th>
                            <th>Amount</th>
                            <th>Weekly Repayment</th>
                            <th>Total Repayment</th>
                            <th>Paid</th>
                            <th>Outstanding</th>
                            <th>Approval Date</th>
                            <th>Next Due</th>
                            <th>Status</th>
                            <th>Loan Type</th>
                            <th>Duration</th>
                            <th>Income</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody id="loans-table-body"></tbody>
                </table>
            </div>
        </div>
    `;


    // Reconnect the table body reference after
    // restoring the list markup.
    const newTableBody =
        document.getElementById(
            "loans-table-body"
        );


    if (newTableBody) {

        newTableBody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        ".view-loan-btn"
                    );


                if (button) {

                    event.stopPropagation();

                    openLoanDetailsPage(
                        button.dataset.loanId
                    );

                    return;

                }


                const row =
                    event.target.closest(
                        ".loan-row"
                    );


                if (!row) {
                    return;
                }


                openLoanDetailsPage(
                    row.dataset.loanId
                );

            }
        );

    }


    filterLoans();

}


// ==========================================
// SCHEDULE MODAL
// ==========================================

function openScheduleModal(
    loan
) {

    if (!scheduleModal) {
        return;
    }


    if (scheduleClient) {

        scheduleClient.textContent =
            loan.clientName ||
            "-";

    }


    if (scheduleBalance) {

        scheduleBalance.textContent =
            currency(
                loan.balance || 0
            );

    }


    if (scheduleTableBody) {

        const schedule =
            Array.isArray(
                loan.repaymentSchedule
            )
                ? loan.repaymentSchedule
                : [];


        scheduleTableBody.innerHTML =
            schedule
                .map(
                    item => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    item.week
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.dueDate ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${currency(
                                    item.amount
                                )}
                            </td>

                            <td>
                                ${currency(
                                    item.paidAmount ||
                                    0
                                )}
                            </td>

                            <td>
                                ${currency(
                                    item.remainingAmount ??
                                    item.amount ??
                                    0
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.status ||
                                    "Pending"
                                )}
                            </td>

                            <td>
                                ${
                                    item.paidDate
                                        ? escapeHtml(
                                            item.paidDate
                                        )
                                        : "-"
                                }
                            </td>

                        </tr>

                    `
                )
                .join("");

    }


    scheduleModal.classList.remove(
        "hidden"
    );

}


closeScheduleModal?.addEventListener(
    "click",
    () => {

        scheduleModal?.classList.add(
            "hidden"
        );

    }
);


// Close schedule modal when clicking outside.
scheduleModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            scheduleModal
        ) {

            scheduleModal.classList.add(
                "hidden"
            );

        }

    }
);


// ==========================================
// DIRECT REPAYMENT
// ==========================================

function openDirectLoanRepayment(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan) {

        alert(
            "Loan could not be found."
        );

        return;

    }


    directLoanRepaymentMode =
        true;


    selectedLoanId =
        id;


    repaymentSaving =
        false;


    if (!repaymentModal) {
        return;
    }


    // --------------------------------------
    // Hide selectors that could allow
    // the user to change the loan.
    // --------------------------------------

    hideDirectRepaymentSelectors();


    // --------------------------------------
    // Set hidden loan ID
    // --------------------------------------

    if (repaymentLoanId) {

        repaymentLoanId.value =
            loan.id;

    }


    // --------------------------------------
    // Client
    // --------------------------------------

    if (repaymentClient) {

        repaymentClient.value =
            loan.clientName ||
            "";

        repaymentClient.setAttribute(
            "readonly",
            "readonly"
        );

    }


    // --------------------------------------
    // Current balance
    // --------------------------------------

    if (repaymentBalance) {

        repaymentBalance.value =
            currency(
                loan.balance ||
                0
            );

    }


    // --------------------------------------
    // Amount
    // --------------------------------------

    if (repaymentAmount) {

        repaymentAmount.value =
            "";

    }


    // --------------------------------------
    // Date
    // --------------------------------------

    if (repaymentDate) {

        repaymentDate.value =
            today();

    }


    // --------------------------------------
    // Notes
    // --------------------------------------

    if (repaymentNotes) {

        repaymentNotes.value =
            "";

    }


    repaymentModal.classList.remove(
        "hidden"
    );

}


function hideDirectRepaymentSelectors() {

    const selectors = [

        "#repayment-client",

        "#repayment-loan",

        "#repayment-loan-id"

    ];


    selectors.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (!element) {
                return;
            }


            if (
                selector ===
                "#repayment-loan-id"
            ) {

                element.type =
                    "hidden";

                return;

            }


            const parent =
                element.closest(
                    ".form-group, .input-group, .field-group, .form-field"
                );


            if (parent) {

                parent.classList.add(
                    "direct-repayment-hidden"
                );

            } else {

                element.style.display =
                    "none";

            }

        }
    );

}


// ==========================================
// RESTORE REPAYMENT SELECTORS
// ==========================================

function restoreRepaymentSelectors() {

    directLoanRepaymentMode =
        false;


    const hiddenClass =
        "direct-repayment-hidden";


    document
        .querySelectorAll(
            `.${hiddenClass}`
        )
        .forEach(
            element => {

                element.classList.remove(
                    hiddenClass
                );

            }
        );


    const loanIdElement =
        document.getElementById(
            "repayment-loan-id"
        );


    if (loanIdElement) {

        loanIdElement.type =
            "hidden";

    }


    if (repaymentClient) {

        repaymentClient.removeAttribute(
            "readonly"
        );

    }

}


// ==========================================
// REPAYMENT MODAL CLOSE
// ==========================================

function closeRepaymentModal() {

    repaymentModal?.classList.add(
        "hidden"
    );


    repaymentForm?.reset();


    restoreRepaymentSelectors();


    repaymentSaving =
        false;


    selectedLoanId =
        loanDetailsOpen
            ? selectedLoanId
            : null;

}


// ==========================================
// REPAYMENT FORM SUBMISSION
// ==========================================

repaymentForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (repaymentSaving) {
            return;
        }


        repaymentSaving =
            true;


        let id =
            repaymentLoanId?.value ||
            "";


        // Direct repayment must always use
        // the selected loan.
        if (
            directLoanRepaymentMode &&
            selectedLoanId
        ) {

            id =
                selectedLoanId;

        }


        const loan =
            loans.find(
                item =>
                    item.id === id
            );


        if (!loan) {

            alert(
                "Please select a valid loan."
            );

            repaymentSaving =
                false;

            return;

        }


        const amount =
            Number(
                repaymentAmount?.value ||
                0
            );


        if (
            !amount ||
            amount <= 0
        ) {

            alert(
                "Please enter a valid repayment amount."
            );

            repaymentSaving =
                false;

            return;

        }


        const balanceBefore =
            Number(
                loan.balance ||
                0
            );


        if (
            amount >
            balanceBefore
        ) {

            alert(
                "Repayment cannot be greater than the current outstanding balance."
            );

            repaymentSaving =
                false;

            return;

        }


        const paymentDate =
            repaymentDate?.value ||
            today();


        const notes =
            repaymentNotes?.value ||
            "";


        const officer =
            localStorage.getItem(
                "userName"
            ) ||
            localStorage.getItem(
                "userEmail"
            ) ||
            "Unknown Officer";


        try {

            // --------------------------------
            // DUPLICATE PAYMENT PROTECTION
            // --------------------------------

            const alreadyRecorded =
                (loan.repaymentSchedule || [])
                    .some(
                        installment =>
                            (
                                installment.paymentHistory ||
                                []
                            )
                                .some(
                                    payment =>
                                        Number(
                                            payment.amount
                                        ) === amount &&
                                        String(
                                            payment.date
                                        ) ===
                                        paymentDate &&
                                        String(
                                            payment.officer
                                        ) ===
                                        officer
                                )
                    );


            if (alreadyRecorded) {

                alert(
                    "A matching repayment already appears to have been recorded."
                );

                repaymentSaving =
                    false;

                return;

            }


            // --------------------------------
            // UPDATED VALUES
            // --------------------------------

            let remainingPayment =
                amount;


            const schedule =
                Array.isArray(
                    loan.repaymentSchedule
                )
                    ? loan.repaymentSchedule.map(
                        item => ({
                            ...item,

                            paymentHistory:
                                Array.isArray(
                                    item.paymentHistory
                                )
                                    ? [
                                        ...item.paymentHistory
                                    ]
                                    : []
                        })
                    )
                    : [];


            // --------------------------------
            // PAYMENT TIMESTAMP
            // --------------------------------

            const paymentNow =
                new Date();


            const paymentTime =
                paymentNow.toLocaleTimeString(
                    "en-KE",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                    }
                );


            const paymentTimestamp =
                paymentNow.toISOString();


            // --------------------------------
            // APPLY PAYMENT TO SCHEDULE
            // --------------------------------

            for (
                const installment of schedule
            ) {

                if (
                    remainingPayment <=
                    0
                ) {
                    break;
                }


                const installmentRemaining =
                    Math.max(
                        Number(
                            installment.remainingAmount ??
                            installment.amount ??
                            0
                        ),
                        0
                    );


                if (
                    installmentRemaining <=
                    0
                ) {
                    continue;
                }


                const applied =
                    Math.min(
                        remainingPayment,
                        installmentRemaining
                    );


                installment.paidAmount =
                    Number(
                        installment.paidAmount ||
                        0
                    ) +
                    applied;


                installment.remainingAmount =
                    Math.max(
                        installmentRemaining -
                        applied,
                        0
                    );


                if (
                    installment.remainingAmount <=
                    0
                ) {

                    installment.remainingAmount =
                        0;

                    installment.paid =
                        true;

                    installment.status =
                        "Paid";

                    installment.paidDate =
                        paymentDate;

                } else {

                    installment.paid =
                        false;

                    installment.status =
                        "Partial";

                }


                installment.paymentHistory.push({

                    amount:
                        applied,

                    date:
                        paymentDate,

                    time:
                        paymentTime,

                    timestamp:
                        paymentTimestamp,

                    notes:
                        notes,

                    officer:
                        officer

                });


                remainingPayment -=
                    applied;

            }


            // --------------------------------
            // UPDATED BALANCE
            // --------------------------------

            const newBalance =
                Math.max(
                    balanceBefore -
                    amount,
                    0
                );


            const newAmountPaid =
                Number(
                    loan.amountPaid ||
                    0
                ) +
                amount;


            const nextInstallment =
                schedule.find(
                    item =>
                        !item.paid
                );


            const completed =
                newBalance <= 0;


            const newStatus =
                completed
                    ? "Completed"
                    : normalizeLoanStatus(
                        loan.status
                    );


            const updateData = {

                amountPaid:
                    newAmountPaid,

                balance:
                    newBalance,

                repaymentSchedule:
                    schedule,

                nextRepaymentDate:
                    nextInstallment?.dueDate ||
                    "-",

                remainingInstallments:
                    schedule.filter(
                        item =>
                            !item.paid
                    ).length,

                completed:
                    completed,

                status:
                    newStatus,

                updatedAt:
                    serverTimestamp()

            };


            await updateDoc(
                doc(
                    db,
                    "loans",
                    loan.id
                ),
                updateData
            );


            // --------------------------------
            // HISTORY
            // --------------------------------

            await logHistory(
                "Repayment Recorded",
                "Repayment",
                {

                    loanId:
                        loan.id,

                    loanNumber:
                        loan.loanNumber ||
                        "",

                    clientName:
                        loan.clientName ||
                        "",

                    amount:
                        amount,

                    balanceBefore:
                        balanceBefore,

                    balanceAfter:
                        newBalance,

                    paymentDate:
                        paymentDate,

                    paymentTime:
                        paymentTime,

                    officer:
                        officer,

                    notes:
                        notes

                }
            );


            // --------------------------------
            // SUCCESS
            // --------------------------------

            closeRepaymentModal();


            alert(
                `Repayment of ${currency(amount)} recorded successfully.`
            );


            // --------------------------------
            // PAYMENT MESSAGE
            // --------------------------------

            if (
                typeof window.openMessageComposer ===
                "function"
            ) {

                const client =
                    clients.find(
                        item =>
                            item.id ===
                            loan.clientId
                    );


                window.openMessageComposer({

                    type:
                        "payment",

                    loan: {

                        ...loan,

                        ...updateData,

                        balance:
                            newBalance,

                        amountPaid:
                            newAmountPaid

                    },

                    client:
                        client || {

                            name:
                                loan.clientName ||
                                "Client",

                            phone:
                                loan.clientPhone ||
                                ""

                        },

                    payment:
                        amount,

                    outstanding:
                        newBalance

                });

            }


            // --------------------------------
            // REFRESH DETAILS
            // --------------------------------

            if (
                loanDetailsOpen &&
                selectedLoanId ===
                loan.id
            ) {

                selectedLoanId =
                    loan.id;

            }

        } catch (error) {

            console.error(
                "Repayment error:",
                error
            );


            alert(
                "Unable to record repayment. Please try again."
            );

        } finally {

            repaymentSaving =
                false;

        }

    }
);


// ==========================================
// OPEN FAB REPAYMENT
// ==========================================

function openFabRepayment() {

    directLoanRepaymentMode =
        false;


    repaymentSaving =
        false;


    if (!repaymentModal) {
        return;
    }


    restoreRepaymentSelectors();


    repaymentForm?.reset();


    if (repaymentDate) {

        repaymentDate.value =
            today();

    }


    populateFabClientSelector();


    repaymentModal.classList.remove(
        "hidden"
    );

}


// ==========================================
// FAB CLIENT SELECTOR
// ==========================================

function populateFabClientSelector() {

    if (
        directLoanRepaymentMode
    ) {
        return;
    }


    // The current HTML may use the
    // repayment-client field as either
    // an input or select. We support
    // both without breaking the layout.

    if (
        !repaymentClient ||
        repaymentClient.tagName !==
        "SELECT"
    ) {

        return;

    }


    const currentValue =
        repaymentClient.value;


    repaymentClient.innerHTML =
        `<option value="">Select Client</option>`;


    clients
        .slice()
        .sort(
            (a, b) =>
                (a.name || "").localeCompare(
                    b.name || ""
                )
        )
        .forEach(
            client => {

                repaymentClient.innerHTML += `

                    <option
                        value="${escapeHtml(client.id)}"
                    >

                        ${escapeHtml(
                            client.name ||
                            "Unnamed Client"
                        )}

                    </option>

                `;

            }
        );


    if (
        clients.some(
            client =>
                client.id ===
                currentValue
        )
    ) {

        repaymentClient.value =
            currentValue;

    }

}


// ==========================================
// REPAYMENT CLIENT CHANGE
// ==========================================

repaymentClient?.addEventListener(
    "change",
    () => {

        if (
            directLoanRepaymentMode
        ) {
            return;
        }


        if (
            repaymentClient.tagName !==
            "SELECT"
        ) {
            return;
        }


        const clientId =
            repaymentClient.value;


        if (!clientId) {

            if (repaymentLoanId) {
                repaymentLoanId.value =
                    "";
            }

            if (repaymentBalance) {
                repaymentBalance.value =
                    "";
            }

            return;

        }


        const clientLoans =
            loans.filter(
                loan =>
                    loan.clientId ===
                    clientId &&
                    isRunningLoan(
                        loan
                    )
            );


        if (
            clientLoans.length ===
            1
        ) {

            const selected =
                clientLoans[0];


            if (repaymentLoanId) {

                repaymentLoanId.value =
                    selected.id;

            }


            if (repaymentBalance) {

                repaymentBalance.value =
                    currency(
                        selected.balance ||
                        0
                    );

            }

            return;

        }


        if (
            clientLoans.length >
            1
        ) {

            populateRepaymentLoanSelector(
                clientLoans
            );

            return;

        }


        if (repaymentLoanId) {
            repaymentLoanId.value =
                "";
        }


        if (repaymentBalance) {
            repaymentBalance.value =
                "";
        }


        alert(
            "This client has no active loan available for repayment."
        );

    }
);


// ==========================================
// REPAYMENT LOAN SELECTOR
// ==========================================

function populateRepaymentLoanSelector(
    clientLoans
) {

    const existing =
        document.getElementById(
            "repayment-loan-select"
        );


    if (!existing) {
        return;
    }


    existing.innerHTML =
        `<option value="">Select Loan</option>`;


    clientLoans.forEach(
        loan => {

            existing.innerHTML += `

                <option
                    value="${escapeHtml(loan.id)}"
                >

                    ${escapeHtml(
                        loan.loanNumber ||
                        loan.id
                    )}
                    -
                    ${currency(
                        loan.balance ||
                        0
                    )}

                </option>

            `;

        }
    );


    existing.onchange =
        () => {

            const selectedLoan =
                loans.find(
                    loan =>
                        loan.id ===
                        existing.value
                );


            if (!selectedLoan) {
                return;
            }


            if (repaymentLoanId) {

                repaymentLoanId.value =
                    selectedLoan.id;

            }


            if (repaymentBalance) {

                repaymentBalance.value =
                    currency(
                        selectedLoan.balance ||
                        0
                    );

            }

        };

}


// ==========================================
// REPAYMENT MODAL CLOSE BUTTONS
// ==========================================

document
    .querySelectorAll(
        "[data-close-repayment-modal]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                closeRepaymentModal
            );

        }
    );


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


    if (!loan) {

        alert(
            "Loan could not be found."
        );

        return;

    }


    if (
        normalizeLoanStatus(
            loan.status
        ) ===
        "Active"
    ) {

        alert(
            "This loan is already active."
        );

        return;

    }


    const confirmed =
        confirm(
            `Approve loan ${loan.loanNumber || loan.id} for ${loan.clientName || "this client"}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const approvalDate =
            today();


        let schedule =
            Array.isArray(
                loan.repaymentSchedule
            )
                ? loan.repaymentSchedule
                : [];


        if (!schedule.length) {

            schedule =
                generateRepaymentSchedule(
                    approvalDate,
                    Number(
                        loan.duration ||
                        0
                    ),
                    Number(
                        loan.weeklyPayment ||
                        loan.repayment ||
                        0
                    ),
                    Number(
                        loan.totalRepayment ||
                        0
                    )
                );

        }


        const updateData = {

            status:
                "Active",

            approvalDate:
                approvalDate,

            startDate:
                approvalDate,

            repaymentSchedule:
                schedule,

            nextRepaymentDate:
                schedule[0]?.dueDate ||
                "-",

            remainingInstallments:
                schedule.filter(
                    item =>
                        !item.paid
                ).length,

            completed:
                false,

            updatedAt:
                serverTimestamp()

        };


        await updateDoc(
            doc(
                db,
                "loans",
                id
            ),
            updateData
        );


        await logHistory(
            "Loan Approved",
            "Loan",
            {

                loanId:
                    loan.id,

                loanNumber:
                    loan.loanNumber ||
                    "",

                clientName:
                    loan.clientName ||
                    "",

                amount:
                    loan.amount ||
                    0,

                approvalDate:
                    approvalDate

            }
        );


        alert(
            "Loan approved successfully. Status is now Active."
        );


        // --------------------------------
        // APPROVAL MESSAGE
        // --------------------------------

        if (
            typeof window.openMessageComposer ===
            "function"
        ) {

            const client =
                clients.find(
                    item =>
                        item.id ===
                        loan.clientId
                );


            const outstanding =
                Number(
                    loan.balance ??
                    loan.totalRepayment ??
                    0
                );


            window.openMessageComposer({

                type:
                    "approved",

                loan: {

                    ...loan,

                    ...updateData,

                    status:
                        "Active",

                    approvalDate:
                        approvalDate,

                    balance:
                        outstanding

                },

                client:
                    client || {

                        name:
                            loan.clientName ||
                            "Client",

                        phone:
                            loan.clientPhone ||
                            ""

                    },

                outstanding:
                    outstanding

            });

        }

    } catch (error) {

        console.error(
            "Approve loan error:",
            error
        );


        alert(
            "Unable to approve loan. Please try again."
        );

    }

}


// ==========================================
// APPROVAL BUTTON DELEGATION
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-approve-loan]"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.approveLoan;


        if (id) {

            approveLoan(
                id
            );

        }

    }
);


// ==========================================
// DELETE LOAN
// ADMIN ONLY
// ==========================================

async function deleteLoan(
    id
) {

    if (!isAdmin()) {

        alert(
            "Only the administrator can delete loans."
        );

        return;

    }


    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan) {

        alert(
            "Loan could not be found."
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete loan ${loan.loanNumber || loan.id}? This action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "loans",
                id
            )
        );


        await logHistory(
            "Loan Deleted",
            "Loan",
            {

                loanId:
                    loan.id,

                loanNumber:
                    loan.loanNumber ||
                    "",

                clientName:
                    loan.clientName ||
                    "",

                amount:
                    loan.amount ||
                    0

            }
        );


        if (
            selectedLoanId ===
            id
        ) {

            closeLoanDetailsPage();

        }


        alert(
            "Loan deleted successfully."
        );

    } catch (error) {

        console.error(
            "Delete loan error:",
            error
        );


        alert(
            "Unable to delete loan. Please try again."
        );

    }

}


// ==========================================
// DELETE LOAN BUTTON DELEGATION
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-delete-loan]"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.deleteLoan;


        if (id) {

            deleteLoan(
                id
            );

        }

    }
);


// ==========================================
// PREVIOUS LOANS PAGE
// ==========================================

function openPreviousLoansPage(
    loan
) {

    if (!loan) {
        return;
    }


    previousLoansOpen =
        true;

    previousLoanSelectedId =
        null;


    renderPreviousLoansPage(
        loan
    );

}


function renderPreviousLoansPage(
    currentLoan
) {

    const container =
        document.getElementById(
            "loans"
        );


    if (!container) {
        return;
    }


    const previousLoans =
        getPreviousLoans(
            currentLoan
        );


    container.innerHTML = `

        <div
            class="loan-details-page previous-loans-page"
        >

            <div
                class="loan-details-topbar"
            >

                <button
                    type="button"
                    class="btn btn-secondary"
                    id="close-previous-loans-page"
                >
                    ← Back to Loan
                </button>

            </div>


            <div
                class="loan-details-header-card"
            >

                <div>

                    <span
                        class="loan-details-label"
                    >
                        PREVIOUS LOANS
                    </span>

                    <h2>
                        ${escapeHtml(
                            currentLoan.clientName ||
                            "Client"
                        )}
                    </h2>

                    <p>
                        Current Loan:
                        ${escapeHtml(
                            currentLoan.loanNumber ||
                            currentLoan.id
                        )}
                    </p>

                </div>

            </div>


            <div
                class="loan-details-card"
            >

                <div
                    class="loan-details-card-header"
                >

                    <h3>
                        Previous Loans
                    </h3>

                    <strong>
                        ${previousLoans.length}
                    </strong>

                </div>


                ${
                    previousLoans.length
                        ? `
                            <div class="table-responsive">

                                <table
                                    class="data-table"
                                >

                                    <thead>

                                        <tr>
                                            <th>Loan Number</th>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Outstanding</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>

                                    </thead>


                                    <tbody>

                                        ${previousLoans
                                            .map(
                                                loan => {

                                                    const outstanding =
                                                        Number(
                                                            loan.balance ||
                                                            0
                                                        );

                                                    return `

                                                        <tr>

                                                            <td>
                                                                ${escapeHtml(
                                                                    loan.loanNumber ||
                                                                    loan.id
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${escapeHtml(
                                                                    loan.approvalDate ||
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
                                                                    outstanding
                                                                )}
                                                            </td>

                                                            <td>
                                                                ${escapeHtml(
                                                                    normalizeLoanStatus(
                                                                        loan.status
                                                                    )
                                                                )}
                                                            </td>

                                                            <td>

                                                                <button
                                                                    type="button"
                                                                    class="btn btn-sm previous-loan-view-btn"
                                                                    data-loan-id="${escapeHtml(
                                                                        loan.id
                                                                    )}"
                                                                >
                                                                    View
                                                                </button>

                                                            </td>

                                                        </tr>

                                                    `;

                                                }
                                            )
                                            .join("")}

                                    </tbody>

                                </table>

                            </div>
                          `
                        : `
                            <div
                                style="
                                    text-align:center;
                                    padding:30px;
                                "
                            >
                                No previous loans found.
                            </div>
                          `
                }

            </div>

        </div>

    `;


    document
        .getElementById(
            "close-previous-loans-page"
        )
        ?.addEventListener(
            "click",
            () => {

                previousLoansOpen =
                    false;

                previousLoanSelectedId =
                    null;

                renderLoanDetailsPage(
                    currentLoan
                );

            }
        );


    container
        .querySelectorAll(
            ".previous-loan-view-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const loan =
                            loans.find(
                                item =>
                                    item.id ===
                                    button.dataset.loanId
                            );


                        if (loan) {

                            previousLoanSelectedId =
                                loan.id;

                            previousLoansOpen =
                                false;

                            selectedLoanId =
                                loan.id;

                            renderLoanDetailsPage(
                                loan
                            );

                        }

                    }
                );

            }
        );

}


// ==========================================
// HIDE LOAN LIST CONTROLS
// ==========================================

function hideLoanListControls() {

    [
        "#loan-search",
        "#loan-filter",
        "#loan-month-filter",
        "#loan-year-filter"
    ]
        .forEach(
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

                } else {

                    element.classList.add(
                        "loan-details-control-hidden"
                    );

                }

            }
        );

}


// ==========================================
// RESTORE LOAN LIST CONTROLS
// ==========================================

function restoreLoanListControls() {

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


// ==========================================
// NAVIGATION HOOKS
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-open-previous-loans]"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.openPreviousLoans;


        const loan =
            loans.find(
                item =>
                    item.id === id
            );


        if (loan) {

            openPreviousLoansPage(
                loan
            );

        }

    }
);


// ==========================================
// MODAL OPEN/CLOSE GLOBAL HOOKS
// ==========================================

document.addEventListener(
    "click",
    event => {

        const closeButton =
            event.target.closest(
                "[data-close-loan-modal]"
            );


        if (closeButton) {

            closeLoanModal();

        }

    }
);


document.addEventListener(
    "click",
    event => {

        const closeButton =
            event.target.closest(
                "[data-close-repayment]"
            );


        if (closeButton) {

            closeRepaymentModal();

        }

    }
);


// ==========================================
// ESCAPE KEY
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        if (
            loanModal &&
            !loanModal.classList.contains(
                "hidden"
            )
        ) {

            closeLoanModal();

            return;

        }


        if (
            repaymentModal &&
            !repaymentModal.classList.contains(
                "hidden"
            )
        ) {

            closeRepaymentModal();

            return;

        }


        if (
            scheduleModal &&
            !scheduleModal.classList.contains(
                "hidden"
            )
        ) {

            scheduleModal.classList.add(
                "hidden"
            );

        }

    }
);


// ==========================================
// INITIALIZE
// ==========================================

loadClients();

loadLoans();

calculateLoan();


// ==========================================
// GLOBAL FUNCTIONS
// ==========================================
//
// These are deliberately exposed on window so
// existing HTML onclick handlers and other
// modules can continue to call them.
// ==========================================

window.openLoanModal =
    openLoanModal;

window.closeLoanModal =
    closeLoanModal;

window.openRepaymentModal =
    openFabRepayment;

window.closeRepaymentModal =
    closeRepaymentModal;

window.openDirectLoanRepayment =
    openDirectLoanRepayment;

window.approveLoan =
    approveLoan;

window.deleteLoan =
    deleteLoan;

window.openLoanDetailsPage =
    openLoanDetailsPage;

window.closeLoanDetailsPage =
    closeLoanDetailsPage;

window.openPreviousLoansPage =
    openPreviousLoansPage;

window.openScheduleModal =
    openScheduleModal;

window.filterLoans =
    filterLoans;


// ==========================================
// END OF PART 2
// ==========================================// ==========================================
// LOAN STATUS / MESSAGE HELPERS
// ==========================================

function isRunningLoan(loan) {

    if (!loan) {
        return false;
    }

    const status =
        normalizeLoanStatus(
            loan.status
        );

    return (
        status === "Active" ||
        status === "Approved" ||
        status === "Pending"
    );
}


// ==========================================
// PREVIOUS LOANS
// ==========================================

function getPreviousLoans(
    currentLoan
) {

    if (!currentLoan) {
        return [];
    }

    return loans
        .filter(
            loan =>
                loan.clientId ===
                    currentLoan.clientId &&
                loan.id !==
                    currentLoan.id
        )
        .sort(
            (a, b) => {

                const dateA =
                    new Date(
                        a.approvalDate ||
                        a.startDate ||
                        a.createdAt?.toDate?.() ||
                        0
                    );

                const dateB =
                    new Date(
                        b.approvalDate ||
                        b.startDate ||
                        b.createdAt?.toDate?.() ||
                        0
                    );

                return dateB - dateA;

            }
        );

}


// ==========================================
// LOAN NUMBER GENERATOR
// ==========================================

function generateLoanNumber() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    const random =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return `GM-${year}${month}${day}-${random}`;

}


// ==========================================
// TODAY
// ==========================================

function today() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;

}


// ==========================================
// DATE FORMATTER
// ==========================================

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    let date;

    if (
        value &&
        typeof value.toDate ===
            "function"
    ) {

        date =
            value.toDate();

    } else {

        date =
            new Date(value);

    }

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }

    return date.toLocaleDateString(
        "en-KE",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ==========================================
// CURRENCY FORMATTER
// ==========================================

function currency(
    amount
) {

    const value =
        Number(
            amount || 0
        );

    return `KSh ${value.toLocaleString(
        "en-KE",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    )}`;

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ==========================================
// STATUS NORMALIZATION
// ==========================================

function normalizeLoanStatus(
    status
) {

    if (!status) {
        return "Pending";
    }

    const value =
        String(status)
            .trim()
            .toLowerCase();


    if (
        value === "approved"
    ) {

        return "Active";

    }


    if (
        value === "active"
    ) {

        return "Active";

    }


    if (
        value === "completed" ||
        value === "complete" ||
        value === "paid"
    ) {

        return "Completed";

    }


    if (
        value === "rejected" ||
        value === "declined"
    ) {

        return "Rejected";

    }


    if (
        value === "pending"
    ) {

        return "Pending";

    }


    if (
        value === "arrears" ||
        value === "overdue"
    ) {

        return "Arrears";

    }


    return (
        String(status)
            .charAt(0)
            .toUpperCase() +
        String(status)
            .slice(1)
    );

}


// ==========================================
// ALL-FILTER VALUE
// ==========================================

function isAllFilterValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return true;

    }

    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    return (
        normalized === "" ||
        normalized === "all" ||
        normalized === "all loans" ||
        normalized === "all years" ||
        normalized === "all months"
    );

}


// ==========================================
// ROUND TO NEAREST FIVE
// ==========================================

function roundToNearestFive(
    amount
) {

    const value =
        Number(
            amount || 0
        );

    return Math.round(
        value / 5
    ) * 5;

}


// ==========================================
// LOAN CALCULATION
// ==========================================

function calculateLoan() {

    const amount =
        Number(
            loanAmount?.value ||
            0
        );


    const interest =
        Number(
            loanInterest?.value ||
            0
        );


    const duration =
        Number(
            loanDuration?.value ||
            0
        );


    const processingFee =
        Number(
            loanProcessingFee?.value ||
            0
        );


    const interestAmount =
        amount *
        interest /
        100;


    const totalRepayment =
        amount +
        interestAmount;


    let weeklyPayment =
        duration > 0
            ? totalRepayment /
              duration
            : 0;


    weeklyPayment =
        roundToNearestFive(
            weeklyPayment
        );


    const adjustedTotal =
        weeklyPayment *
        duration;


    const finalTotal =
        adjustedTotal;


    if (loanWeeklyPayment) {

        loanWeeklyPayment.value =
            weeklyPayment
                ? weeklyPayment
                : "";

    }


    if (loanTotalRepayment) {

        loanTotalRepayment.value =
            finalTotal
                ? finalTotal
                : "";

    }


    if (loanInterestAmount) {

        loanInterestAmount.value =
            interestAmount
                ? interestAmount
                : "";

    }


    if (loanTotalIncome) {

        loanTotalIncome.value =
            interestAmount
                ? interestAmount
                : "";

    }


    if (loanDueDate) {

        const start =
            loanStartDate?.value ||
            today();


        if (
            duration > 0
        ) {

            loanDueDate.value =
                calculateDueDate(
                    start,
                    duration
                );

        }

    }


    return {

        amount,

        processingFee,

        interest,

        interestAmount,

        duration,

        weeklyPayment,

        totalRepayment:
            finalTotal

    };

}


// ==========================================
// CALCULATE DUE DATE
// ==========================================

function calculateDueDate(
    startDate,
    duration
) {

    if (
        !startDate ||
        !duration
    ) {

        return "";

    }


    const date =
        new Date(
            `${startDate}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    // Weekly repayment schedule:
    // duration weeks means the final
    // installment is due after duration
    // weekly periods.

    date.setDate(
        date.getDate() +
        (
            Number(duration) *
            7
        )
    );


    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


// ==========================================
// GENERATE REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(
    startDate,
    duration,
    weeklyPayment,
    totalRepayment
) {

    const schedule = [];


    const weeks =
        Number(
            duration || 0
        );


    if (
        weeks <= 0
    ) {

        return schedule;

    }


    const regularPayment =
        Number(
            weeklyPayment || 0
        );


    const total =
        Number(
            totalRepayment || 0
        );


    let accumulated =
        0;


    for (
        let index = 0;
        index < weeks;
        index++
    ) {

        const weekNumber =
            index + 1;


        let amount =
            regularPayment;


        // The final installment is adjusted
        // so that the schedule total exactly
        // matches the loan total repayment.

        if (
            weekNumber ===
            weeks
        ) {

            amount =
                Math.max(
                    total -
                    accumulated,
                    0
                );

        }


        amount =
            Math.round(
                amount * 100
            ) / 100;


        accumulated +=
            amount;


        const dueDate =
            calculateWeeklyDueDate(
                startDate,
                weekNumber
            );


        schedule.push({

            week:
                weekNumber,

            amount:
                amount,

            paidAmount:
                0,

            remainingAmount:
                amount,

            dueDate:
                dueDate,

            paid:
                false,

            status:
                "Pending",

            paidDate:
                null,

            paymentHistory:
                []

        });

    }


    return schedule;

}


// ==========================================
// WEEKLY DUE DATE
// ==========================================

function calculateWeeklyDueDate(
    startDate,
    week
) {

    if (
        !startDate
    ) {

        return "";

    }


    const date =
        new Date(
            `${startDate}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    date.setDate(
        date.getDate() +
        (
            Number(week) *
            7
        )
    );


    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


// ==========================================
// APPLY HISTORICAL PAYMENTS
// ==========================================

function applyHistoricalPayments(
    schedule,
    amountPaid
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return [];

    }


    let remaining =
        Number(
            amountPaid || 0
        );


    return schedule.map(
        installment => {

            const item = {
                ...installment,

                paymentHistory:
                    Array.isArray(
                        installment.paymentHistory
                    )
                        ? [
                            ...installment.paymentHistory
                        ]
                        : []

            };


            const originalAmount =
                Number(
                    item.amount || 0
                );


            if (
                remaining <= 0
            ) {

                item.paidAmount =
                    Number(
                        item.paidAmount ||
                        0
                    );

                item.remainingAmount =
                    Math.max(
                        originalAmount -
                        item.paidAmount,
                        0
                    );

                item.paid =
                    item.remainingAmount <=
                    0;

                item.status =
                    item.paid
                        ? "Paid"
                        : (
                            item.paidAmount >
                            0
                                ? "Partial"
                                : "Pending"
                        );

                return item;

            }


            const applied =
                Math.min(
                    remaining,
                    originalAmount
                );


            item.paidAmount =
                applied;


            item.remainingAmount =
                Math.max(
                    originalAmount -
                    applied,
                    0
                );


            item.paid =
                item.remainingAmount <=
                0;


            item.status =
                item.paid
                    ? "Paid"
                    : "Partial";


            remaining -=
                applied;


            return item;

        }
    );

}


// ==========================================
// LOAD CLIENTS
// ==========================================

async function loadClients() {

    try {

        onSnapshot(
            collection(
                db,
                "clients"
            ),
            snapshot => {

                clients =
                    snapshot.docs.map(
                        item => ({

                            id:
                                item.id,

                            ...item.data()

                        })
                    );


                populateClientDropdown();

                populateFabClientSelector();

            },
            error => {

                console.error(
                    "Clients listener error:",
                    error
                );

            }
        );

    } catch (error) {

        console.error(
            "Unable to load clients:",
            error
        );

    }

}


// ==========================================
// CLIENT DROPDOWN
// ==========================================

function populateClientDropdown() {

    if (
        !loanClient
    ) {

        return;

    }


    const currentValue =
        loanClient.value;


    loanClient.innerHTML =
        `<option value="">Select Client</option>`;


    clients
        .slice()
        .sort(
            (a, b) =>
                String(
                    a.name || ""
                ).localeCompare(
                    String(
                        b.name || ""
                    )
                )
        )
        .forEach(
            client => {

                loanClient.innerHTML += `

                    <option
                        value="${escapeHtml(
                            client.id
                        )}"
                    >

                        ${escapeHtml(
                            client.name ||
                            "Unnamed Client"
                        )}

                    </option>

                `;

            }
        );


    if (
        clients.some(
            client =>
                client.id ===
                currentValue
        )
    ) {

        loanClient.value =
            currentValue;

    }

}


// ==========================================
// LOAD LOANS
// ==========================================

async function loadLoans() {

    try {

        onSnapshot(
            collection(
                db,
                "loans"
            ),
            snapshot => {

                loans =
                    snapshot.docs.map(
                        item => ({

                            id:
                                item.id,

                            ...item.data()

                        })
                    );


                loans =
                    loans.map(
                        normalizeLoanData
                    );


                populateYearFilter();


                if (
                    !loanDetailsOpen &&
                    !previousLoansOpen
                ) {

                    renderLoansTable(
                        loans
                    );

                }


                // Make sure the selected loan
                // page stays current after a
                // Firestore update.

                if (
                    loanDetailsOpen &&
                    selectedLoanId
                ) {

                    const selected =
                        loans.find(
                            loan =>
                                loan.id ===
                                selectedLoanId
                        );


                    if (selected) {

                        renderLoanDetailsPage(
                            selected
                        );

                    }

                }

            },
            error => {

                console.error(
                    "Loans listener error:",
                    error
                );


                if (
                    loansTableBody
                ) {

                    loansTableBody.innerHTML = `

                        <tr>

                            <td
                                colspan="15"
                                style="
                                    text-align:center;
                                    padding:30px;
                                "
                            >

                                Unable to load loans.

                            </td>

                        </tr>

                    `;

                }

            }
        );

    } catch (error) {

        console.error(
            "Unable to load loans:",
            error
        );

    }

}


// ==========================================
// NORMALIZE LOAN DATA
// ==========================================

function normalizeLoanData(
    loan
) {

    const normalized = {
        ...loan
    };


    normalized.status =
        normalizeLoanStatus(
            loan.status
        );


    normalized.amount =
        Number(
            loan.amount || 0
        );


    normalized.processingFee =
        Number(
            loan.processingFee || 0
        );


    normalized.interest =
        Number(
            loan.interest || 0
        );


    normalized.interestAmount =
        Number(
            loan.interestAmount ??
            (
                normalized.amount *
                normalized.interest /
                100
            )
        );


    normalized.duration =
        Number(
            loan.duration || 0
        );


    normalized.weeklyPayment =
        Number(
            loan.weeklyPayment ??
            loan.repayment ??
            0
        );


    normalized.repayment =
        normalized.weeklyPayment;


    normalized.totalRepayment =
        Number(
            loan.totalRepayment ??
            (
                normalized.amount +
                normalized.interestAmount
            )
        );


    normalized.amountPaid =
        Number(
            loan.amountPaid || 0
        );


    normalized.balance =
        Number(
            loan.balance ??
            Math.max(
                normalized.totalRepayment -
                normalized.amountPaid,
                0
            )
        );


    normalized.totalIncome =
        Number(
            loan.totalIncome ??
            normalized.interestAmount
        );


    normalized.openingBalance =
        Number(
            loan.openingBalance ??
            normalized.totalRepayment
        );


    normalized.repaymentSchedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    normalized.remainingInstallments =
        Number(
            loan.remainingInstallments ??
            normalized.repaymentSchedule.filter(
                item =>
                    !item.paid
            ).length
        );


    normalized.completed =
        Boolean(
            loan.completed ||
            normalized.status ===
            "Completed" ||
            normalized.balance <= 0
        );


    return normalized;

}


// ==========================================
// LOG HISTORY
// ==========================================

async function logHistory(
    action,
    type,
    data
) {

    try {

        const userName =
            localStorage.getItem(
                "userName"
            ) ||
            localStorage.getItem(
                "userEmail"
            ) ||
            "Unknown Officer";


        await addDoc(
            collection(
                db,
                "history"
            ),
            {

                action:
                    action,

                type:
                    type,

                data:
                    data,

                officer:
                    userName,

                timestamp:
                    serverTimestamp(),

                deviceTimestamp:
                    new Date()
                        .toISOString()

            }
        );

    } catch (error) {

        console.error(
            "History logging failed:",
            error
        );

        // History failure should not
        // prevent the main loan operation
        // from succeeding.

    }

}


// ==========================================
// ADMIN CHECK
// ==========================================

function isAdmin() {

    const role =
        String(
            localStorage.getItem(
                "userRole"
            ) || ""
        )
            .trim()
            .toLowerCase();


    const email =
        String(
            localStorage.getItem(
                "userEmail"
            ) || ""
        )
            .trim()
            .toLowerCase();


    return (
        role === "admin" ||
        role === "administrator" ||
        email ===
            "admin@greymus.com"
    );

}


// ==========================================
// LOAN INTEREST CHANGE
// ==========================================

loanInterest?.addEventListener(
    "input",
    calculateLoan
);


loanAmount?.addEventListener(
    "input",
    calculateLoan
);


loanDuration?.addEventListener(
    "input",
    calculateLoan
);


loanProcessingFee?.addEventListener(
    "input",
    calculateLoan
);


loanStartDate?.addEventListener(
    "change",
    calculateLoan
);


// ==========================================
// LOAN TYPE CHANGE
// ==========================================

loanType?.addEventListener(
    "change",
    () => {

        calculateLoan();

    }
);


// ==========================================
// CLIENT CHANGE
// ==========================================

loanClient?.addEventListener(
    "change",
    () => {

        const client =
            clients.find(
                item =>
                    item.id ===
                    loanClient.value
            );


        if (!client) {
            return;
        }


        // If the client has a phone number,
        // keep it available on the loan record.

        const phoneField =
            document.getElementById(
                "loan-client-phone"
            );


        if (
            phoneField
        ) {

            phoneField.value =
                client.phone ||
                "";

        }

    }
);


// ==========================================
// NEW LOAN BUTTON
// ==========================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "#add-loan-btn, #new-loan-btn, [data-new-loan]"
            );


        if (!button) {
            return;
        }


        openLoanModal();

    }
);


// ==========================================
// CLOSE LOAN MODAL WHEN CLICKING BACKDROP
// ==========================================

loanModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            loanModal
        ) {

            closeLoanModal();

        }

    }
);


// ==========================================
// END OF PART 3
// ==========================================// ==========================================
// OPEN LOAN MODAL
// ==========================================

function openLoanModal(
    loan = null
) {

    if (!loanModal) {
        console.error(
            "Loan modal not found."
        );
        return;
    }


    editingLoanId =
        loan?.id || null;


    if (loanModalTitle) {

        loanModalTitle.textContent =
            loan
                ? "Edit Loan"
                : "Create New Loan";

    }


    if (loanForm) {

        loanForm.reset();

    }


    if (loan) {

        populateLoanForm(
            loan
        );

    } else {

        resetLoanForm();

    }


    calculateLoan();


    loanModal.classList.add(
        "active"
    );


    loanModal.style.display =
        "flex";

}


// ==========================================
// CLOSE LOAN MODAL
// ==========================================

function closeLoanModal() {

    if (!loanModal) {
        return;
    }


    loanModal.classList.remove(
        "active"
    );


    loanModal.style.display =
        "none";


    editingLoanId =
        null;


    if (loanForm) {

        loanForm.reset();

    }

}


// ==========================================
// RESET LOAN FORM
// ==========================================

function resetLoanForm() {

    if (!loanForm) {
        return;
    }


    loanForm.reset();


    editingLoanId =
        null;


    const startDate =
        document.getElementById(
            "loan-start-date"
        );


    if (
        startDate &&
        !startDate.value
    ) {

        startDate.value =
            today();

    }


    if (loanStatus) {

        loanStatus.value =
            "Pending";

    }


    const defaultInterest =
        localStorage.getItem(
            "defaultInterest"
        );


    const defaultDuration =
        localStorage.getItem(
            "defaultDuration"
        );


    const defaultFee =
        localStorage.getItem(
            "defaultFee"
        );


    if (
        loanInterest &&
        defaultInterest
    ) {

        loanInterest.value =
            defaultInterest;

    }


    if (
        loanDuration &&
        defaultDuration
    ) {

        loanDuration.value =
            defaultDuration;

    }


    if (
        loanProcessingFee &&
        defaultFee
    ) {

        loanProcessingFee.value =
            defaultFee;

    }


    calculateLoan();

}


// ==========================================
// POPULATE LOAN FORM
// ==========================================

function populateLoanForm(
    loan
) {

    if (!loan) {
        return;
    }


    setElementValue(
        "loan-client",
        loan.clientId
    );


    setElementValue(
        "loan-number",
        loan.loanNumber
    );


    setElementValue(
        "loan-type",
        loan.loanType
    );


    setElementValue(
        "loan-amount",
        loan.amount
    );


    setElementValue(
        "loan-processing-fee",
        loan.processingFee
    );


    setElementValue(
        "loan-interest",
        loan.interest
    );


    setElementValue(
        "loan-duration",
        loan.duration
    );


    setElementValue(
        "loan-weekly-payment",
        loan.weeklyPayment
    );


    setElementValue(
        "loan-total-repayment",
        loan.totalRepayment
    );


    setElementValue(
        "loan-total-income",
        loan.totalIncome
    );


    setElementValue(
        "loan-start-date",
        normalizeDateInput(
            loan.startDate ||
            loan.approvalDate ||
            loan.createdAt
        )
    );


    setElementValue(
        "loan-due-date",
        normalizeDateInput(
            loan.dueDate
        )
    );


    setElementValue(
        "loan-status",
        loan.status
    );


    setElementValue(
        "loan-security",
        loan.security
    );


    setElementValue(
        "loan-guarantor",
        loan.guarantorName ||
        loan.guarantor
    );


    setElementValue(
        "loan-guarantor-phone",
        loan.guarantorPhone
    );


    setElementValue(
        "loan-notes",
        loan.notes
    );


    const client =
        clients.find(
            item =>
                item.id ===
                loan.clientId
        );


    const phoneField =
        document.getElementById(
            "loan-client-phone"
        );


    if (
        phoneField &&
        client
    ) {

        phoneField.value =
            client.phone ||
            loan.clientPhone ||
            "";

    }

}


// ==========================================
// SET ELEMENT VALUE
// ==========================================

function setElementValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.value =
        value === null ||
        value === undefined
            ? ""
            : value;

}


// ==========================================
// NORMALIZE DATE INPUT
// ==========================================

function normalizeDateInput(
    value
) {

    if (!value) {
        return "";
    }


    let date;


    if (
        value &&
        typeof value.toDate ===
            "function"
    ) {

        date =
            value.toDate();

    } else {

        date =
            new Date(value);

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


// ==========================================
// SUBMIT LOAN FORM
// ==========================================

loanForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            loanSubmitting
        ) {

            return;

        }


        loanSubmitting =
            true;


        try {

            await saveLoan();

        } catch (error) {

            console.error(
                "Loan save error:",
                error
            );

            showLoanError(
                error.message ||
                "Unable to save loan."
            );

        } finally {

            loanSubmitting =
                false;

        }

    }
);


// ==========================================
// SAVE LOAN
// ==========================================

async function saveLoan() {

    const clientId =
        document.getElementById(
            "loan-client"
        )?.value;


    if (!clientId) {

        showLoanError(
            "Please select a client."
        );

        return;

    }


    const client =
        clients.find(
            item =>
                item.id ===
                clientId
        );


    if (!client) {

        showLoanError(
            "Selected client could not be found."
        );

        return;

    }


    const amount =
        Number(
            document.getElementById(
                "loan-amount"
            )?.value || 0
        );


    const interest =
        Number(
            document.getElementById(
                "loan-interest"
            )?.value || 0
        );


    const duration =
        Number(
            document.getElementById(
                "loan-duration"
            )?.value || 0
        );


    const processingFee =
        Number(
            document.getElementById(
                "loan-processing-fee"
            )?.value || 0
        );


    if (
        amount <= 0
    ) {

        showLoanError(
            "Please enter a valid loan amount."
        );

        return;

    }


    if (
        duration <= 0
    ) {

        showLoanError(
            "Please enter a valid loan duration."
        );

        return;

    }


    const loanType =
        document.getElementById(
            "loan-type"
        )?.value ||
        "Standard";


    const startDate =
        document.getElementById(
            "loan-start-date"
        )?.value ||
        today();


    const status =
        document.getElementById(
            "loan-status"
        )?.value ||
        "Pending";


    const security =
        document.getElementById(
            "loan-security"
        )?.value ||
        "";


    const guarantorName =
        document.getElementById(
            "loan-guarantor"
        )?.value ||
        "";


    const guarantorPhone =
        document.getElementById(
            "loan-guarantor-phone"
        )?.value ||
        "";


    const notes =
        document.getElementById(
            "loan-notes"
        )?.value ||
        "";


    const calculation =
        calculateLoan();


    const weeklyPayment =
        Number(
            calculation.weeklyPayment ||
            0
        );


    const totalRepayment =
        Number(
            calculation.totalRepayment ||
            0
        );


    const interestAmount =
        Number(
            calculation.interestAmount ||
            0
        );


    const loanNumberField =
        document.getElementById(
            "loan-number"
        );


    let loanNumber =
        loanNumberField?.value
            ?.trim() ||
        "";


    if (!loanNumber) {

        loanNumber =
            generateLoanNumber();

    }


    const dueDate =
        calculateDueDate(
            startDate,
            duration
        );


    const existingLoan =
        editingLoanId
            ? loans.find(
                loan =>
                    loan.id ===
                    editingLoanId
            )
            : null;


    const existingAmountPaid =
        Number(
            existingLoan?.amountPaid ||
            0
        );


    const repaymentSchedule =
        existingLoan &&
        Array.isArray(
            existingLoan.repaymentSchedule
        ) &&
        existingLoan.repaymentSchedule.length
            ? existingLoan.repaymentSchedule
            : generateRepaymentSchedule(
                startDate,
                duration,
                weeklyPayment,
                totalRepayment
            );


    const calculatedBalance =
        Math.max(
            totalRepayment -
            existingAmountPaid,
            0
        );


    const loanData = {

        clientId:
            client.id,

        clientName:
            client.name ||
            "",

        clientPhone:
            client.phone ||
            "",

        loanNumber:
            loanNumber,

        loanType:
            loanType,

        amount:
            amount,

        processingFee:
            processingFee,

        interest:
            interest,

        interestAmount:
            interestAmount,

        duration:
            duration,

        repayment:
            weeklyPayment,

        weeklyPayment:
            weeklyPayment,

        totalRepayment:
            totalRepayment,

        balance:
            calculatedBalance,

        totalIncome:
            interestAmount,

        openingBalance:
            totalRepayment,

        amountPaid:
            existingAmountPaid,

        startDate:
            startDate,

        approvalDate:
            existingLoan?.approvalDate ||
            null,

        dueDate:
            dueDate,

        repaymentSchedule:
            repaymentSchedule,

        nextRepaymentDate:
            findNextRepaymentDate(
                repaymentSchedule
            ),

        remainingInstallments:
            repaymentSchedule.filter(
                item =>
                    !item.paid
            ).length,

        status:
            normalizeLoanStatus(
                status
            ),

        completed:
            calculatedBalance <= 0,

        security:
            security,

        guarantorName:
            guarantorName,

        guarantorPhone:
            guarantorPhone,

        notes:
            notes,

        updatedAt:
            serverTimestamp()

    };


    if (!existingLoan) {

        loanData.createdAt =
            serverTimestamp();


        loanData.createdBy =
            localStorage.getItem(
                "userName"
            ) ||
            localStorage.getItem(
                "userEmail"
            ) ||
            "Unknown Officer";

    }


    let loanId;


    if (editingLoanId) {

        await updateDoc(
            doc(
                db,
                "loans",
                editingLoanId
            ),
            loanData
        );


        loanId =
            editingLoanId;


        await logHistory(
            "Updated loan",
            "loan",
            {
                loanId:
                    loanId,

                loanNumber:
                    loanNumber,

                clientName:
                    client.name,

                amount:
                    amount
            }
        );


    } else {

        const reference =
            await addDoc(
                collection(
                    db,
                    "loans"
                ),
                loanData
            );


        loanId =
            reference.id;


        await logHistory(
            "Created loan",
            "loan",
            {
                loanId:
                    loanId,

                loanNumber:
                    loanNumber,

                clientName:
                    client.name,

                amount:
                    amount
            }
        );

    }


    closeLoanModal();


    showLoanSuccess(
        editingLoanId
            ? "Loan updated successfully."
            : "Loan created successfully."
    );


    // Refresh local display immediately.
    const savedLoan =
        {
            id:
                loanId,

            ...loanData
        };


    if (
        editingLoanId
    ) {

        loans =
            loans.map(
                loan =>
                    loan.id ===
                    loanId
                        ? normalizeLoanData(
                            savedLoan
                        )
                        : loan
            );

    } else {

        loans.push(
            normalizeLoanData(
                savedLoan
            )
        );

    }


    renderLoansTable(
        loans
    );

}


// ==========================================
// NEXT REPAYMENT DATE
// ==========================================

function findNextRepaymentDate(
    schedule
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return null;

    }


    const next =
        schedule.find(
            item =>
                !item.paid &&
                item.dueDate
        );


    return next?.dueDate ||
        null;

}


// ==========================================
// SUCCESS MESSAGE
// ==========================================

function showLoanSuccess(
    message
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "success"
        );

        return;

    }


    if (
        typeof showToast ===
        "function"
    ) {

        showToast(
            message,
            "success"
        );

        return;

    }


    console.log(
        message
    );

}


// ==========================================
// ERROR MESSAGE
// ==========================================

function showLoanError(
    message
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "error"
        );

        return;

    }


    if (
        typeof showToast ===
        "function"
    ) {

        showToast(
            message,
            "error"
        );

        return;

    }


    alert(
        message
    );

}


// ==========================================
// OPEN LOAN DETAILS
// ==========================================

function openLoanDetails(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        console.error(
            "Loan not found:",
            loanId
        );

        return;

    }


    selectedLoanId =
        loanId;


    loanDetailsOpen =
        true;


    renderLoanDetailsPage(
        loan
    );


    const detailsPage =
        document.getElementById(
            "loan-details-page"
        );


    if (
        detailsPage
    ) {

        detailsPage.style.display =
            "block";


        detailsPage.classList.add(
            "active"
        );

    }


    const loansPanel =
        document.getElementById(
            "loans-panel"
        );


    if (
        loansPanel
    ) {

        loansPanel.style.display =
            "none";

    }

}


// ==========================================
// CLOSE LOAN DETAILS
// ==========================================

function closeLoanDetails() {

    loanDetailsOpen =
        false;


    selectedLoanId =
        null;


    const detailsPage =
        document.getElementById(
            "loan-details-page"
        );


    if (
        detailsPage
    ) {

        detailsPage.classList.remove(
            "active"
        );


        detailsPage.style.display =
            "none";

    }


    const loansPanel =
        document.getElementById(
            "loans-panel"
        );


    if (
        loansPanel
    ) {

        loansPanel.style.display =
            "";

    }


    renderLoansTable(
        loans
    );

}


// ==========================================
// LOAN ROW CLICK HANDLER
// ==========================================

document.addEventListener(
    "click",
    event => {

        const row =
            event.target.closest(
                "[data-loan-id]"
            );


        if (!row) {
            return;
        }


        // Do not open the loan details page
        // when the user clicks an action
        // button inside the row.

        if (
            event.target.closest(
                "button, a, input, select, textarea"
            )
        ) {

            return;

        }


        const loanId =
            row.dataset.loanId;


        if (loanId) {

            openLoanDetails(
                loanId
            );

        }

    }
);


// ==========================================
// EDIT LOAN
// ==========================================

function editLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    openLoanModal(
        loan
    );

}


// ==========================================
// DELETE LOAN
// ==========================================

async function deleteLoan(
    loanId
) {

    if (
        !isAdmin()
    ) {

        showLoanError(
            "Only an administrator can delete loans."
        );

        return;

    }


    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete loan ${loan.loanNumber || ""} for ${loan.clientName || "this client"}? This action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "loans",
                loanId
            )
        );


        await logHistory(
            "Deleted loan",
            "loan",
            {
                loanId:
                    loanId,

                loanNumber:
                    loan.loanNumber,

                clientName:
                    loan.clientName,

                amount:
                    loan.amount
            }
        );


        loans =
            loans.filter(
                item =>
                    item.id !==
                    loanId
            );


        renderLoansTable(
            loans
        );


        showLoanSuccess(
            "Loan deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete loan error:",
            error
        );


        showLoanError(
            "Unable to delete loan."
        );

    }

}


// ==========================================
// END OF PART 4
// ==========================================// ==========================================
// RENDER LOANS TABLE
// ==========================================

function renderLoansTable(
    loanList = loans
) {

    if (!loansTableBody) {
        return;
    }


    const filteredLoans =
        getFilteredLoans(
            loanList
        );


    if (
        !filteredLoans.length
    ) {

        loansTableBody.innerHTML = `

            <tr>

                <td
                    colspan="15"
                    style="
                        text-align:center;
                        padding:35px;
                        color:var(--text-muted,#777);
                    "
                >

                    No loans found.

                </td>

            </tr>

        `;

        updateLoanCounts(
            filteredLoans
        );

        return;

    }


    loansTableBody.innerHTML =
        filteredLoans
            .map(
                loan =>
                    createLoanRow(
                        loan
                    )
            )
            .join("");


    updateLoanCounts(
        filteredLoans
    );

}


// ==========================================
// CREATE LOAN TABLE ROW
// ==========================================

function createLoanRow(
    loan
) {

    const status =
        normalizeLoanStatus(
            loan.status
        );


    const statusClass =
        getStatusClass(
            status
        );


    const balance =
        Number(
            loan.balance || 0
        );


    const amountPaid =
        Number(
            loan.amountPaid || 0
        );


    const totalRepayment =
        Number(
            loan.totalRepayment || 0
        );


    const collectionRate =
        totalRepayment > 0
            ? Math.min(
                (
                    amountPaid /
                    totalRepayment
                ) * 100,
                100
            )
            : 0;


    const nextDue =
        getNextDueDate(
            loan
        );


    return `

        <tr
            class="loan-row"
            data-loan-id="${escapeHtml(
                loan.id
            )}"
            style="cursor:pointer;"
        >

            <td>

                <strong>
                    ${escapeHtml(
                        loan.loanNumber ||
                        "-"
                    )}
                </strong>

            </td>


            <td>

                <div
                    class="loan-client-cell"
                >

                    <strong>
                        ${escapeHtml(
                            loan.clientName ||
                            "Unknown Client"
                        )}
                    </strong>

                </div>

            </td>


            <td>
                ${currency(
                    loan.amount
                )}
            </td>


            <td>
                ${currency(
                    loan.weeklyPayment
                )}
            </td>


            <td>
                ${currency(
                    loan.totalRepayment
                )}
            </td>


            <td>

                <strong>
                    ${currency(
                        balance
                    )}
                </strong>

            </td>


            <td>

                <span
                    class="loan-status ${statusClass}"
                >

                    ${escapeHtml(
                        status
                    )}

                </span>

            </td>


            <td>

                ${formatDate(
                    nextDue
                )}

            </td>


            <td>

                <div
                    class="loan-progress"
                    style="
                        min-width:90px;
                    "
                >

                    <div
                        class="loan-progress-track"
                        style="
                            width:100%;
                            height:5px;
                            background:rgba(128,128,128,.2);
                            border-radius:10px;
                            overflow:hidden;
                        "
                    >

                        <div
                            class="loan-progress-fill"
                            style="
                                width:${collectionRate}%;
                                height:100%;
                                border-radius:10px;
                            "
                        ></div>

                    </div>

                    <small>
                        ${collectionRate.toFixed(0)}%
                    </small>

                </div>

            </td>


            <td>

                ${createLoanActionButtons(
                    loan
                )}

            </td>

        </tr>

    `;

}


// ==========================================
// LOAN ACTION BUTTONS
// ==========================================

function createLoanActionButtons(
    loan
) {

    const status =
        normalizeLoanStatus(
            loan.status
        );


    let buttons = `

        <button
            type="button"
            class="loan-action-btn"
            onclick="event.stopPropagation(); openLoanDetails('${escapeHtml(
                loan.id
            )}')"
            title="View loan"
        >

            View

        </button>

    `;


    if (
        status === "Pending"
    ) {

        buttons += `

            <button
                type="button"
                class="loan-action-btn approve"
                onclick="event.stopPropagation(); approveLoan('${escapeHtml(
                    loan.id
                )}')"
            >

                Approve

            </button>

        `;

    }


    if (
        status === "Active" ||
        status === "Arrears"
    ) {

        buttons += `

            <button
                type="button"
                class="loan-action-btn repayment"
                onclick="event.stopPropagation(); openRepaymentModal('${escapeHtml(
                    loan.id
                )}')"
            >

                Repayment

            </button>

        `;

    }


    if (
        status === "Active" ||
        status === "Arrears"
    ) {

        buttons += `

            <button
                type="button"
                class="loan-action-btn message"
                onclick="event.stopPropagation(); openLoanMessage('${escapeHtml(
                    loan.id
                )}', 'general')"
                title="Message client"
            >

                Message

            </button>

        `;

    }


    if (
        isAdmin()
    ) {

        buttons += `

            <button
                type="button"
                class="loan-action-btn delete"
                onclick="event.stopPropagation(); deleteLoan('${escapeHtml(
                    loan.id
                )}')"
            >

                Delete

            </button>

        `;

    }


    return `

        <div
            class="loan-actions"
            style="
                display:flex;
                gap:6px;
                flex-wrap:wrap;
            "
        >

            ${buttons}

        </div>

    `;

}


// ==========================================
// STATUS CLASS
// ==========================================

function getStatusClass(
    status
) {

    const value =
        String(
            status || ""
        )
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    return `status-${value}`;

}


// ==========================================
// GET NEXT DUE DATE
// ==========================================

function getNextDueDate(
    loan
) {

    if (
        loan.nextRepaymentDate
    ) {

        return loan.nextRepaymentDate;

    }


    if (
        Array.isArray(
            loan.repaymentSchedule
        )
    ) {

        const next =
            loan.repaymentSchedule.find(
                item =>
                    !item.paid &&
                    item.dueDate
            );


        if (next) {

            return next.dueDate;

        }

    }


    return loan.dueDate ||
        null;

}


// ==========================================
// FILTER LOANS
// ==========================================

function getFilteredLoans(
    loanList
) {

    let result =
        Array.isArray(
            loanList
        )
            ? [...loanList]
            : [];


    const search =
        document.getElementById(
            "loan-search"
        )?.value
            ?.trim()
            .toLowerCase() ||
        "";


    const status =
        document.getElementById(
            "loan-status-filter"
        )?.value ||
        "";


    const year =
        document.getElementById(
            "loan-year-filter"
        )?.value ||
        "";


    const month =
        document.getElementById(
            "loan-month-filter"
        )?.value ||
        "";


    if (search) {

        result =
            result.filter(
                loan => {

                    const text =
                        [

                            loan.loanNumber,

                            loan.clientName,

                            loan.clientPhone,

                            loan.loanType,

                            loan.status,

                            loan.guarantorName

                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );

    }


    if (
        !isAllFilterValue(
            status
        )
    ) {

        result =
            result.filter(
                loan =>
                    normalizeLoanStatus(
                        loan.status
                    )
                        .toLowerCase() ===
                    String(
                        status
                    )
                        .toLowerCase()
            );

    }


    if (
        !isAllFilterValue(
            year
        )
    ) {

        result =
            result.filter(
                loan => {

                    const date =
                        getLoanDate(
                            loan
                        );


                    if (!date) {
                        return false;
                    }


                    return (
                        date.getFullYear()
                            .toString() ===
                        String(year)
                    );

                }
            );

    }


    if (
        !isAllFilterValue(
            month
        )
    ) {

        result =
            result.filter(
                loan => {

                    const date =
                        getLoanDate(
                            loan
                        );


                    if (!date) {
                        return false;
                    }


                    return (
                        date.getMonth() + 1
                    )
                        .toString() ===
                    String(month);

                }
            );

    }


    result.sort(
        (a, b) => {

            const dateA =
                getLoanDate(
                    a
                )?.getTime() ||
                0;


            const dateB =
                getLoanDate(
                    b
                )?.getTime() ||
                0;


            return dateB -
                dateA;

        }
    );


    return result;

}


// ==========================================
// GET LOAN DATE
// ==========================================

function getLoanDate(
    loan
) {

    const value =
        loan.createdAt ||
        loan.approvalDate ||
        loan.startDate;


    if (!value) {
        return null;
    }


    if (
        value &&
        typeof value.toDate ===
            "function"
    ) {

        return value.toDate();

    }


    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;

}


// ==========================================
// UPDATE LOAN COUNTS
// ==========================================

function updateLoanCounts(
    list
) {

    const total =
        list.length;


    const active =
        list.filter(
            loan =>
                normalizeLoanStatus(
                    loan.status
                ) === "Active"
        ).length;


    const pending =
        list.filter(
            loan =>
                normalizeLoanStatus(
                    loan.status
                ) === "Pending"
        ).length;


    const completed =
        list.filter(
            loan =>
                normalizeLoanStatus(
                    loan.status
                ) === "Completed"
        ).length;


    const arrears =
        list.filter(
            loan =>
                isLoanInArrears(
                    loan
                )
        ).length;


    setText(
        "loans-count",
        total
    );


    setText(
        "active-loans-count",
        active
    );


    setText(
        "pending-loans-count",
        pending
    );


    setText(
        "completed-loans-count",
        completed
    );


    setText(
        "arrears-loans-count",
        arrears
    );

}


// ==========================================
// SET TEXT
// ==========================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value ?? "";

    }

}


// ==========================================
// POPULATE YEAR FILTER
// ==========================================

function populateYearFilter() {

    const select =
        document.getElementById(
            "loan-year-filter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const years =
        new Set();


    loans.forEach(
        loan => {

            const date =
                getLoanDate(
                    loan
                );


            if (date) {

                years.add(
                    date.getFullYear()
                );

            }

        }
    );


    const sortedYears =
        [...years].sort(
            (a, b) =>
                b - a
        );


    select.innerHTML =
        `<option value="">All Years</option>`;


    sortedYears.forEach(
        year => {

            select.innerHTML += `

                <option
                    value="${year}"
                >
                    ${year}
                </option>

            `;

        }
    );


    if (
        sortedYears.includes(
            Number(current)
        )
    ) {

        select.value =
            current;

    }

}


// ==========================================
// SEARCH / FILTER EVENTS
// ==========================================

document.addEventListener(
    "input",
    event => {

        if (
            event.target.id ===
            "loan-search"
        ) {

            renderLoansTable(
                loans
            );

        }

    }
);


document.addEventListener(
    "change",
    event => {

        if (
            event.target.id ===
                "loan-status-filter" ||
            event.target.id ===
                "loan-year-filter" ||
            event.target.id ===
                "loan-month-filter"
        ) {

            renderLoansTable(
                loans
            );

        }

    }
);


// ==========================================
// APPROVE LOAN
// ==========================================

async function approveLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    if (
        normalizeLoanStatus(
            loan.status
        ) !== "Pending"
    ) {

        showLoanError(
            "This loan is no longer pending."
        );

        return;

    }


    const confirmed =
        confirm(
            `Approve loan ${loan.loanNumber || ""} for ${loan.clientName || "this client"}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const approvalDate =
            today();


        const schedule =
            Array.isArray(
                loan.repaymentSchedule
            ) &&
            loan.repaymentSchedule.length
                ? loan.repaymentSchedule
                : generateRepaymentSchedule(
                    loan.startDate ||
                    approvalDate,
                    loan.duration,
                    loan.weeklyPayment,
                    loan.totalRepayment
                );


        const updatedData = {

            status:
                "Active",

            approvalDate:
                approvalDate,

            startDate:
                loan.startDate ||
                approvalDate,

            repaymentSchedule:
                schedule,

            dueDate:
                loan.dueDate ||
                calculateDueDate(
                    loan.startDate ||
                    approvalDate,
                    loan.duration
                ),

            nextRepaymentDate:
                findNextRepaymentDate(
                    schedule
                ),

            remainingInstallments:
                schedule.filter(
                    item =>
                        !item.paid
                ).length,

            updatedAt:
                serverTimestamp()

        };


        await updateDoc(
            doc(
                db,
                "loans",
                loanId
            ),
            updatedData
        );


        await logHistory(
            "Approved loan",
            "loan",
            {

                loanId:
                    loanId,

                loanNumber:
                    loan.loanNumber,

                clientName:
                    loan.clientName,

                amount:
                    loan.amount

            }
        );


        // Refresh local object so the
        // approval confirmation UI can
        // immediately show the message
        // option.

        const updatedLoan =
            normalizeLoanData({

                ...loan,

                ...updatedData,

                status:
                    "Active"

            });


        loans =
            loans.map(
                item =>
                    item.id ===
                    loanId
                        ? updatedLoan
                        : item
            );


        renderLoansTable(
            loans
        );


        showLoanSuccess(
            "Loan approved successfully."
        );


        // Open the approval message
        // action after confirmation.

        setTimeout(
            () => {

                showApprovalMessageAction(
                    updatedLoan
                );

            },
            150
        );


    } catch (error) {

        console.error(
            "Approval error:",
            error
        );


        showLoanError(
            "Unable to approve loan."
        );

    }

}


// ==========================================
// SHOW APPROVAL MESSAGE ACTION
// ==========================================

function showApprovalMessageAction(
    loan
) {

    if (!loan) {
        return;
    }


    if (
        typeof window.showMessageButtonAfterAction ===
        "function"
    ) {

        window.showMessageButtonAfterAction(
            loan,
            "approval"
        );

        return;

    }


    // If messages.js provides the message
    // modal directly, use it.

    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        const shouldMessage =
            confirm(
                `Loan approved successfully.\n\nSend approval message to ${loan.clientName || "the client"}?`
            );


        if (
            shouldMessage
        ) {

            window.openLoanMessage(
                loan.id,
                "approval"
            );

        }

    }

}


// ==========================================
// DETERMINE WHETHER LOAN IS IN ARREARS
// ==========================================

function isLoanInArrears(
    loan
) {

    if (!loan) {
        return false;
    }


    const status =
        normalizeLoanStatus(
            loan.status
        );


    if (
        status === "Arrears"
    ) {

        return true;

    }


    if (
        status !== "Active"
    ) {

        return false;

    }


    const todayDate =
        new Date(
            `${today()}T23:59:59`
        );


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    return schedule.some(
        item => {

            if (
                item.paid
            ) {

                return false;

            }


            if (
                !item.dueDate
            ) {

                return false;

            }


            const due =
                new Date(
                    `${item.dueDate}T23:59:59`
                );


            return (
                due <
                todayDate
            );

        }
    );

}


// ==========================================
// DETERMINE WHETHER REPAYMENT IS DUE TODAY
// ==========================================

function isRepaymentDueToday(
    loan
) {

    if (!loan) {
        return false;
    }


    const todayValue =
        today();


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    return schedule.some(
        item => {

            return (
                !item.paid &&
                item.dueDate ===
                    todayValue
            );

        }
    );

}


// ==========================================
// GET TODAY'S INSTALLMENT
// ==========================================

function getTodayInstallment(
    loan
) {

    if (!loan) {
        return null;
    }


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    return (
        schedule.find(
            item =>
                !item.paid &&
                item.dueDate ===
                    today()
        ) ||
        null
    );

}


// ==========================================
// GET OVERDUE INSTALLMENTS
// ==========================================

function getOverdueInstallments(
    loan
) {

    if (!loan) {
        return [];
    }


    const todayValue =
        today();


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];


    return schedule.filter(
        item => {

            if (
                item.paid ||
                !item.dueDate
            ) {

                return false;

            }


            return (
                item.dueDate <
                todayValue
            );

        }
    );

}


// ==========================================
// CALCULATE ARREARS AMOUNT
// ==========================================

function calculateArrearsAmount(
    loan
) {

    const overdue =
        getOverdueInstallments(
            loan
        );


    return overdue.reduce(
        (
            total,
            installment
        ) => {

            const amount =
                Number(
                    installment.remainingAmount ??
                    installment.amount ??
                    0
                );


            return total +
                amount;

        },
        0
    );

}


// ==========================================
// CALCULATE CURRENT DUE AMOUNT
// ==========================================

function calculateDueTodayAmount(
    loan
) {

    const installment =
        getTodayInstallment(
            loan
        );


    if (!installment) {

        return 0;

    }


    return Number(
        installment.remainingAmount ??
        installment.amount ??
        0
    );

}


// ==========================================
// GLOBAL EXPORTS
// ==========================================

window.openLoanModal =
    openLoanModal;


window.closeLoanModal =
    closeLoanModal;


window.openLoanDetails =
    openLoanDetails;


window.closeLoanDetails =
    closeLoanDetails;


window.editLoan =
    editLoan;


window.deleteLoan =
    deleteLoan;


window.approveLoan =
    approveLoan;


window.calculateLoan =
    calculateLoan;


window.isLoanInArrears =
    isLoanInArrears;


window.isRepaymentDueToday =
    isRepaymentDueToday;


window.getTodayInstallment =
    getTodayInstallment;


window.getOverdueInstallments =
    getOverdueInstallments;


window.calculateArrearsAmount =
    calculateArrearsAmount;


window.calculateDueTodayAmount =
    calculateDueTodayAmount;


// ==========================================
// INITIALIZE LOANS MODULE
// ==========================================

function initializeLoans() {

    populateClientDropdown();

    loadClients();

    loadLoans();

}


// ==========================================
// START
// ==========================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeLoans
    );

} else {

    initializeLoans();

}


// ==========================================
// END OF PART 5
// ==========================================// ==========================================
// REPAYMENT MODAL
// ==========================================

function openRepaymentModal(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    selectedLoanForRepayment =
        loan;


    const modal =
        document.getElementById(
            "repayment-modal"
        );


    if (!modal) {

        console.error(
            "Repayment modal not found."
        );

        return;

    }


    setElementValue(
        "repayment-loan-id",
        loan.id
    );


    setElementValue(
        "repayment-client",
        loan.clientName
    );


    setElementValue(
        "repayment-balance",
        loan.balance
    );


    setElementValue(
        "repayment-weekly",
        loan.weeklyPayment
    );


    const amountField =
        document.getElementById(
            "repayment-amount"
        );


    if (
        amountField
    ) {

        const todayInstallment =
            getTodayInstallment(
                loan
            );


        amountField.value =
            todayInstallment
                ? Number(
                    todayInstallment.remainingAmount ??
                    todayInstallment.amount ??
                    loan.weeklyPayment
                )
                : "";

    }


    const dateField =
        document.getElementById(
            "repayment-date"
        );


    if (
        dateField
    ) {

        dateField.value =
            today();

    }


    const notesField =
        document.getElementById(
            "repayment-notes"
        );


    if (
        notesField
    ) {

        notesField.value =
            "";

    }


    modal.classList.add(
        "active"
    );


    modal.style.display =
        "flex";

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


    modal.classList.remove(
        "active"
    );


    modal.style.display =
        "none";


    selectedLoanForRepayment =
        null;

}


// ==========================================
// REPAYMENT MODAL BACKDROP
// ==========================================

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "repayment-modal"
            );


        if (
            modal &&
            event.target ===
                modal
        ) {

            closeRepaymentModal();

        }

    }
);


// ==========================================
// REPAYMENT FORM SUBMIT
// ==========================================

const repaymentForm =
    document.getElementById(
        "repayment-form"
    );


repaymentForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            repaymentSubmitting
        ) {

            return;

        }


        repaymentSubmitting =
            true;


        try {

            await recordRepayment();

        } catch (error) {

            console.error(
                "Repayment error:",
                error
            );


            showLoanError(
                error.message ||
                "Unable to record repayment."
            );

        } finally {

            repaymentSubmitting =
                false;

        }

    }
);


// ==========================================
// RECORD REPAYMENT
// ==========================================

async function recordRepayment() {

    const loanId =
        document.getElementById(
            "repayment-loan-id"
        )?.value ||
        selectedLoanForRepayment?.id;


    if (!loanId) {

        showLoanError(
            "Loan could not be identified."
        );

        return;

    }


    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    const amount =
        Number(
            document.getElementById(
                "repayment-amount"
            )?.value || 0
        );


    const paymentDate =
        document.getElementById(
            "repayment-date"
        )?.value ||
        today();


    const notes =
        document.getElementById(
            "repayment-notes"
        )?.value ||
        "";


    if (
        amount <= 0
    ) {

        showLoanError(
            "Please enter a valid repayment amount."
        );

        return;

    }


    if (
        amount >
        Number(
            loan.balance || 0
        )
    ) {

        showLoanError(
            "Repayment cannot be greater than the outstanding balance."
        );

        return;

    }


    const now =
        new Date();


    const officer =
        localStorage.getItem(
            "userName"
        ) ||
        localStorage.getItem(
            "userEmail"
        ) ||
        "Unknown Officer";


    const paymentRecord = {

        amount:
            amount,

        date:
            paymentDate,

        time:
            now.toLocaleTimeString(
                "en-KE",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                }
            ),

        timestamp:
            now.toISOString(),

        notes:
            notes,

        officer:
            officer

    };


    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule.map(
                item => ({

                    ...item,

                    paymentHistory:
                        Array.isArray(
                            item.paymentHistory
                        )
                            ? [
                                ...item.paymentHistory
                            ]
                            : []

                })
            )
            : [];


    let remainingPayment =
        amount;


    // ==========================================
    // APPLY PAYMENT TO SCHEDULE
    // ==========================================

    for (
        let index = 0;
        index < schedule.length;
        index++
    ) {

        if (
            remainingPayment <=
            0
        ) {

            break;

        }


        const installment =
            schedule[index];


        const installmentAmount =
            Number(
                installment.amount || 0
            );


        const paidAmount =
            Number(
                installment.paidAmount || 0
            );


        const remainingInstallment =
            Math.max(
                installmentAmount -
                paidAmount,
                0
            );


        if (
            remainingInstallment <=
            0
        ) {

            installment.paid =
                true;

            installment.status =
                "Paid";

            installment.remainingAmount =
                0;

            continue;

        }


        const applied =
            Math.min(
                remainingPayment,
                remainingInstallment
            );


        installment.paidAmount =
            paidAmount +
            applied;


        installment.remainingAmount =
            Math.max(
                installmentAmount -
                installment.paidAmount,
                0
            );


        installment.paid =
            installment.remainingAmount <=
            0;


        installment.status =
            installment.paid
                ? "Paid"
                : "Partial";


        if (
            installment.paid
        ) {

            installment.paidDate =
                paymentDate;

        }


        installment.paymentHistory.push({

            ...paymentRecord,

            amount:
                applied,

            installmentWeek:
                installment.week

        });


        remainingPayment -=
            applied;

    }


    // ==========================================
    // IF PAYMENT EXCEEDS CURRENT SCHEDULE,
    // STORE IT ON THE LAST INSTALLMENT
    // ==========================================

    if (
        remainingPayment > 0 &&
        schedule.length > 0
    ) {

        const last =
            schedule[
                schedule.length - 1
            ];


        last.paymentHistory =
            Array.isArray(
                last.paymentHistory
            )
                ? last.paymentHistory
                : [];


        last.paymentHistory.push({

            ...paymentRecord,

            amount:
                remainingPayment,

            installmentWeek:
                last.week

        });


        remainingPayment =
            0;

    }


    const oldAmountPaid =
        Number(
            loan.amountPaid || 0
        );


    const newAmountPaid =
        oldAmountPaid +
        amount;


    const totalRepayment =
        Number(
            loan.totalRepayment || 0
        );


    const newBalance =
        Math.max(
            totalRepayment -
            newAmountPaid,
            0
        );


    const completed =
        newBalance <=
        0;


    let newStatus =
        loan.status;


    if (
        completed
    ) {

        newStatus =
            "Completed";

    } else {

        newStatus =
            isScheduleCurrentlyInArrears(
                schedule
            )
                ? "Arrears"
                : "Active";

    }


    const nextRepaymentDate =
        findNextRepaymentDate(
            schedule
        );


    const remainingInstallments =
        schedule.filter(
            item =>
                !item.paid
        ).length;


    const updatedLoanData = {

        amountPaid:
            newAmountPaid,

        balance:
            newBalance,

        repaymentSchedule:
            schedule,

        nextRepaymentDate:
            nextRepaymentDate,

        remainingInstallments:
            remainingInstallments,

        status:
            newStatus,

        completed:
            completed,

        lastPaymentAmount:
            amount,

        lastPaymentDate:
            paymentDate,

        lastPaymentTime:
            paymentRecord.time,

        lastPaymentOfficer:
            officer,

        updatedAt:
            serverTimestamp()

    };


    await updateDoc(
        doc(
            db,
            "loans",
            loanId
        ),
        updatedLoanData
    );


    await logHistory(
        "Recorded repayment",
        "repayment",
        {

            loanId:
                loanId,

            loanNumber:
                loan.loanNumber,

            clientName:
                loan.clientName,

            amount:
                amount,

            paymentDate:
                paymentDate,

            officer:
                officer

        }
    );


    const updatedLoan =
        normalizeLoanData({

            ...loan,

            ...updatedLoanData,

            repaymentSchedule:
                schedule,

            amountPaid:
                newAmountPaid,

            balance:
                newBalance,

            status:
                newStatus

        });


    loans =
        loans.map(
            item =>
                item.id ===
                loanId
                    ? updatedLoan
                    : item
        );


    closeRepaymentModal();


    renderLoansTable(
        loans
    );


    showLoanSuccess(
        `Payment of ${currency(amount)} recorded successfully.`
    );


    // ==========================================
    // SHOW CONFIRMATION MESSAGE ACTION
    // ==========================================

    setTimeout(
        () => {

            showRepaymentMessageAction(
                updatedLoan,
                amount,
                paymentDate
            );

        },
        150
    );

}


// ==========================================
// CHECK SCHEDULE ARREARS
// ==========================================

function isScheduleCurrentlyInArrears(
    schedule
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return false;

    }


    const todayValue =
        today();


    return schedule.some(
        installment => {

            if (
                installment.paid
            ) {

                return false;

            }


            if (
                !installment.dueDate
            ) {

                return false;

            }


            return (
                installment.dueDate <
                todayValue
            );

        }
    );

}


// ==========================================
// SHOW REPAYMENT MESSAGE ACTION
// ==========================================

function showRepaymentMessageAction(
    loan,
    amount,
    paymentDate
) {

    if (!loan) {
        return;
    }


    if (
        typeof window.showMessageButtonAfterAction ===
        "function"
    ) {

        window.showMessageButtonAfterAction(
            loan,
            "repayment",
            {
                amount:
                    amount,

                paymentDate:
                    paymentDate
            }
        );

        return;

    }


    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        const confirmed =
            confirm(
                `Payment recorded successfully.\n\nSend payment confirmation to ${loan.clientName || "the client"}?`
            );


        if (
            confirmed
        ) {

            window.openLoanMessage(
                loan.id,
                "repayment",
                {
                    amount:
                        amount,

                    paymentDate:
                        paymentDate
                }
            );

        }

    }

}


// ==========================================
// MANUAL MESSAGE FROM LOAN
// ==========================================

function messageLoan(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        window.openLoanMessage(
            loan.id,
            "general"
        );

        return;

    }


    showLoanError(
        "Messaging module is not available."
    );

}


// ==========================================
// MESSAGE DUE TODAY
// ==========================================

function messageDueToday(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        window.openLoanMessage(
            loan.id,
            "due"
        );

        return;

    }


    showLoanError(
        "Messaging module is not available."
    );

}


// ==========================================
// MESSAGE ARREARS
// ==========================================

function messageArrears(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        window.openLoanMessage(
            loan.id,
            "arrears"
        );

        return;

    }


    showLoanError(
        "Messaging module is not available."
    );

}


// ==========================================
// MESSAGE APPROVAL
// ==========================================

function messageApproval(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        window.openLoanMessage(
            loan.id,
            "approval"
        );

        return;

    }


    showLoanError(
        "Messaging module is not available."
    );

}


// ==========================================
// MESSAGE REPAYMENT
// ==========================================

function messageRepayment(
    loanId,
    amount,
    paymentDate
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        window.openLoanMessage(
            loan.id,
            "repayment",
            {

                amount:
                    amount ||
                    loan.lastPaymentAmount ||
                    0,

                paymentDate:
                    paymentDate ||
                    loan.lastPaymentDate ||
                    today()

            }
        );

        return;

    }


    showLoanError(
        "Messaging module is not available."
    );

}


// ==========================================
// GLOBAL MESSAGE FUNCTIONS
// ==========================================

window.messageLoan =
    messageLoan;


window.messageDueToday =
    messageDueToday;


window.messageArrears =
    messageArrears;


window.messageApproval =
    messageApproval;


window.messageRepayment =
    messageRepayment;


// ==========================================
// END OF PART 6
// ==========================================// ==========================================
// LOAN DETAILS PAGE
// ==========================================

function renderLoanDetailsPage(loan) {

    const container =
        document.getElementById(
            "loan-details-page"
        );

    if (!container || !loan) {
        return;
    }

    const status =
        normalizeLoanStatus(
            loan.status
        );

    const amount =
        Number(
            loan.amount || 0
        );

    const totalRepayment =
        Number(
            loan.totalRepayment || 0
        );

    const amountPaid =
        Number(
            loan.amountPaid || 0
        );

    const balance =
        Number(
            loan.balance || 0
        );

    const income =
        Number(
            loan.totalIncome ||
            loan.interestAmount ||
            0
        );

    const progress =
        totalRepayment > 0
            ? Math.min(
                (
                    amountPaid /
                    totalRepayment
                ) * 100,
                100
            )
            : 0;

    const dueDate =
        getNextDueDate(
            loan
        );

    const arrearsAmount =
        calculateArrearsAmount(
            loan
        );

    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
            : [];

    const paidInstallments =
        schedule.filter(
            item =>
                item.paid
        ).length;

    const remainingInstallments =
        schedule.filter(
            item =>
                !item.paid
        ).length;

    container.innerHTML = `

        <div
            class="loan-details-container"
        >

            <!-- ==================================
                 HEADER
            ================================== -->

            <div
                class="loan-details-header"
            >

                <button
                    type="button"
                    class="loan-details-back"
                    onclick="closeLoanDetails()"
                >

                    ←

                    <span>
                        Back to Loans
                    </span>

                </button>


                <div
                    class="loan-details-header-actions"
                >

                    <button
                        type="button"
                        onclick="editLoan('${escapeHtml(
                            loan.id
                        )}')"
                    >

                        Edit

                    </button>


                    ${
                        status === "Active" ||
                        status === "Arrears"
                            ? `

                                <button
                                    type="button"
                                    onclick="openRepaymentModal('${escapeHtml(
                                        loan.id
                                    )}')"
                                >

                                    Record Repayment

                                </button>

                            `
                            : ""
                    }

                </div>

            </div>


            <!-- ==================================
                 LOAN HERO
            ================================== -->

            <div
                class="loan-details-hero"
            >

                <div
                    class="loan-details-client"
                >

                    <div
                        class="loan-client-avatar"
                    >

                        ${getInitials(
                            loan.clientName
                        )}

                    </div>


                    <div>

                        <div
                            class="loan-details-client-name"
                        >

                            ${escapeHtml(
                                loan.clientName ||
                                "Unknown Client"
                            )}

                        </div>


                        <div
                            class="loan-details-loan-number"
                        >

                            ${escapeHtml(
                                loan.loanNumber ||
                                "-"
                            )}

                        </div>

                    </div>

                </div>


                <div
                    class="loan-details-status ${getStatusClass(
                        status
                    )}"
                >

                    ${escapeHtml(
                        status
                    )}

                </div>

            </div>


            <!-- ==================================
                 FINANCIAL SUMMARY
            ================================== -->

            <div
                class="loan-financial-grid"
            >

                <div
                    class="loan-financial-card"
                >

                    <span>
                        Loan Amount
                    </span>

                    <strong>
                        ${currency(
                            amount
                        )}
                    </strong>

                </div>


                <div
                    class="loan-financial-card"
                >

                    <span>
                        Total Repayment
                    </span>

                    <strong>
                        ${currency(
                            totalRepayment
                        )}
                    </strong>

                </div>


                <div
                    class="loan-financial-card"
                >

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${currency(
                            amountPaid
                        )}
                    </strong>

                </div>


                <div
                    class="loan-financial-card outstanding"
                >

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${currency(
                            balance
                        )}
                    </strong>

                </div>

            </div>


            <!-- ==================================
                 COLLECTION PROGRESS
            ================================== -->

            <div
                class="loan-progress-card"
            >

                <div
                    class="loan-progress-heading"
                >

                    <div>

                        <strong>
                            Repayment Progress
                        </strong>

                        <small>
                            ${paidInstallments}
                            of
                            ${schedule.length}
                            installments paid
                        </small>

                    </div>


                    <strong>
                        ${progress.toFixed(0)}%
                    </strong>

                </div>


                <div
                    class="loan-progress-track"
                >

                    <div
                        class="loan-progress-fill"
                        style="
                            width:${progress}%;
                        "
                    ></div>

                </div>

            </div>


            <!-- ==================================
                 LOAN INFORMATION
            ================================== -->

            <div
                class="loan-details-section"
            >

                <div
                    class="loan-section-title"
                >

                    Loan Information

                </div>


                <div
                    class="loan-info-grid"
                >

                    <div>

                        <span>
                            Loan Type
                        </span>

                        <strong>
                            ${escapeHtml(
                                loan.loanType ||
                                "-"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Weekly Repayment
                        </span>

                        <strong>
                            ${currency(
                                loan.weeklyPayment
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Duration
                        </span>

                        <strong>
                            ${Number(
                                loan.duration ||
                                0
                            )}
                            weeks
                        </strong>

                    </div>


                    <div>

                        <span>
                            Interest
                        </span>

                        <strong>
                            ${currency(
                                income
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Processing Fee
                        </span>

                        <strong>
                            ${currency(
                                loan.processingFee
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Start Date
                        </span>

                        <strong>
                            ${formatDate(
                                loan.startDate
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Next Repayment
                        </span>

                        <strong>
                            ${formatDate(
                                dueDate
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Remaining Installments
                        </span>

                        <strong>
                            ${remainingInstallments}
                        </strong>

                    </div>

                </div>

            </div>


            <!-- ==================================
                 ARREARS
            ================================== -->

            ${
                arrearsAmount > 0
                    ? `

                        <div
                            class="loan-arrears-card"
                        >

                            <div>

                                <strong>
                                    Arrears
                                </strong>

                                <span>
                                    Outstanding overdue repayments
                                </span>

                            </div>


                            <strong>
                                ${currency(
                                    arrearsAmount
                                )}
                            </strong>


                            <button
                                type="button"
                                onclick="messageArrears('${escapeHtml(
                                    loan.id
                                )}')"
                            >

                                Message Client

                            </button>

                        </div>

                    `
                    : ""
            }


            <!-- ==================================
                 SECURITY & GUARANTOR
            ================================== -->

            <div
                class="loan-details-section"
            >

                <div
                    class="loan-section-title"
                >

                    Security & Guarantor

                </div>


                <div
                    class="loan-info-grid"
                >

                    <div>

                        <span>
                            Loan Security
                        </span>

                        <strong>
                            ${escapeHtml(
                                loan.security ||
                                "Not provided"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Guarantor
                        </span>

                        <strong>
                            ${escapeHtml(
                                loan.guarantorName ||
                                "Not provided"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Guarantor Phone
                        </span>

                        <strong>
                            ${escapeHtml(
                                loan.guarantorPhone ||
                                "Not provided"
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            <!-- ==================================
                 REPAYMENT SCHEDULE
            ================================== -->

            <div
                class="loan-details-section"
            >

                <div
                    class="loan-section-heading"
                >

                    <div
                        class="loan-section-title"
                    >

                        Repayment Schedule

                    </div>


                    <span>
                        ${schedule.length}
                        installments
                    </span>

                </div>


                ${
                    schedule.length
                        ? createRepaymentScheduleTable(
                            schedule
                        )
                        : `

                            <div
                                class="empty-state"
                            >

                                No repayment schedule
                                available.

                            </div>

                        `
                }

            </div>


            <!-- ==================================
                 ACTIONS
            ================================== -->

            <div
                class="loan-details-actions"
            >

                ${
                    status === "Pending"
                        ? `

                            <button
                                type="button"
                                class="primary"
                                onclick="approveLoan('${escapeHtml(
                                    loan.id
                                )}')"
                            >

                                Approve Loan

                            </button>

                        `
                        : ""
                }


                ${
                    status === "Active" ||
                    status === "Arrears"
                        ? `

                            <button
                                type="button"
                                class="primary"
                                onclick="openRepaymentModal('${escapeHtml(
                                    loan.id
                                )}')"
                            >

                                Record Repayment

                            </button>


                            <button
                                type="button"
                                onclick="messageLoan('${escapeHtml(
                                    loan.id
                                )}')"
                            >

                                Message Client

                            </button>

                        `
                        : ""
                }


                ${
                    isAdmin()
                        ? `

                            <button
                                type="button"
                                class="danger"
                                onclick="deleteLoan('${escapeHtml(
                                    loan.id
                                )}')"
                            >

                                Delete Loan

                            </button>

                        `
                        : ""
                }

            </div>

        </div>

    `;

}


// ==========================================
// CREATE REPAYMENT SCHEDULE TABLE
// ==========================================

function createRepaymentScheduleTable(
    schedule
) {

    return `

        <div
            class="repayment-schedule-wrapper"
        >

            <table
                class="repayment-schedule-table"
            >

                <thead>

                    <tr>

                        <th>
                            Week
                        </th>

                        <th>
                            Due Date
                        </th>

                        <th>
                            Amount
                        </th>

                        <th>
                            Paid
                        </th>

                        <th>
                            Remaining
                        </th>

                        <th>
                            Status
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${schedule
                        .map(
                            installment => {

                                const amount =
                                    Number(
                                        installment.amount ||
                                        0
                                    );


                                const paid =
                                    Number(
                                        installment.paidAmount ||
                                        0
                                    );


                                const remaining =
                                    Number(
                                        installment.remainingAmount ??
                                        Math.max(
                                            amount -
                                            paid,
                                            0
                                        )
                                    );


                                const status =
                                    installment.paid
                                        ? "Paid"
                                        : installment.status ||
                                          (
                                              paid > 0
                                                  ? "Partial"
                                                  : "Pending"
                                          );


                                return `

                                    <tr>

                                        <td>

                                            <strong>
                                                Week
                                                ${escapeHtml(
                                                    installment.week
                                                )}
                                            </strong>

                                        </td>


                                        <td>

                                            ${formatDate(
                                                installment.dueDate
                                            )}

                                        </td>


                                        <td>

                                            ${currency(
                                                amount
                                            )}

                                        </td>


                                        <td>

                                            ${currency(
                                                paid
                                            )}

                                        </td>


                                        <td>

                                            ${currency(
                                                remaining
                                            )}

                                        </td>


                                        <td>

                                            <span
                                                class="schedule-status ${getStatusClass(
                                                    status
                                                )}"
                                            >

                                                ${escapeHtml(
                                                    status
                                                )}

                                            </span>

                                        </td>

                                    </tr>

                                `;

                            }
                        )
                        .join("")}

                </tbody>

            </table>

        </div>

    `;

}


// ==========================================
// GET INITIALS
// ==========================================

function getInitials(
    name
) {

    if (!name) {
        return "?";
    }


    const parts =
        String(
            name
        )
            .trim()
            .split(
                /\s+/
            )
            .filter(Boolean);


    if (!parts.length) {
        return "?";
    }


    if (
        parts.length ===
        1
    ) {

        return parts[0]
            .substring(
                0,
                2
            )
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[
            parts.length - 1
        ][0]
    ).toUpperCase();

}


// ==========================================
// LOAN DETAILS MESSAGE BUTTON
// ==========================================

function openLoanMessageFromDetails(
    loanId,
    type = "general"
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    if (
        typeof window.openLoanMessage ===
        "function"
    ) {

        window.openLoanMessage(
            loan.id,
            type
        );

        return;

    }


    showLoanError(
        "Messaging module is not available."
    );

}


// ==========================================
// GLOBAL EXPORTS
// ==========================================

window.renderLoanDetailsPage =
    renderLoanDetailsPage;


window.createRepaymentScheduleTable =
    createRepaymentScheduleTable;


window.openLoanMessageFromDetails =
    openLoanMessageFromDetails;


// ==========================================
// END OF PART 7
// ==========================================// ==========================================
// LOAN UTILITIES
// ==========================================

// ------------------------------------------
// NORMALIZE LOAN STATUS
// ------------------------------------------

function normalizeLoanStatus(status) {

    if (!status) {
        return "Pending";
    }

    const value =
        String(status)
            .trim()
            .toLowerCase();

    if (
        value === "approved" ||
        value === "active"
    ) {
        return value === "approved"
            ? "Active"
            : "Active";
    }

    if (
        value === "pending"
    ) {
        return "Pending";
    }

    if (
        value === "completed" ||
        value === "complete" ||
        value === "paid"
    ) {
        return "Completed";
    }

    if (
        value === "arrears" ||
        value === "overdue"
    ) {
        return "Arrears";
    }

    if (
        value === "rejected" ||
        value === "declined"
    ) {
        return "Rejected";
    }

    return String(status)
        .trim()
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


// ------------------------------------------
// NORMALIZE LOAN DATA
// ------------------------------------------

function normalizeLoanData(
    loan
) {

    if (!loan) {
        return null;
    }

    const amount =
        Number(
            loan.amount || 0
        );

    const weeklyPayment =
        Number(
            loan.weeklyPayment ||
            loan.repayment ||
            0
        );

    const totalRepayment =
        Number(
            loan.totalRepayment ||
            0
        );

    const amountPaid =
        Number(
            loan.amountPaid ||
            0
        );

    let balance =
        loan.balance !== undefined &&
        loan.balance !== null
            ? Number(
                loan.balance
            )
            : Math.max(
                totalRepayment -
                amountPaid,
                0
            );

    if (
        Number.isNaN(
            balance
        )
    ) {
        balance = 0;
    }

    const schedule =
        Array.isArray(
            loan.repaymentSchedule
        )
            ? loan.repaymentSchedule
                .map(
                    item =>
                        normalizeScheduleItem(
                            item
                        )
                )
            : [];

    const status =
        normalizeLoanStatus(
            loan.status
        );

    return {

        ...loan,

        amount:
            amount,

        weeklyPayment:
            weeklyPayment,

        repayment:
            weeklyPayment,

        totalRepayment:
            totalRepayment,

        amountPaid:
            amountPaid,

        balance:
            balance,

        status:
            status,

        completed:
            balance <= 0 ||
            status === "Completed",

        repaymentSchedule:
            schedule,

        remainingInstallments:
            schedule.length
                ? schedule.filter(
                    item =>
                        !item.paid
                ).length
                : Number(
                    loan.remainingInstallments ||
                    0
                ),

        nextRepaymentDate:
            loan.nextRepaymentDate ||
            findNextRepaymentDate(
                schedule
            )

    };

}


// ------------------------------------------
// NORMALIZE SCHEDULE ITEM
// ------------------------------------------

function normalizeScheduleItem(
    item
) {

    if (!item) {
        return {};
    }

    const amount =
        Number(
            item.amount || 0
        );

    const paidAmount =
        Number(
            item.paidAmount || 0
        );

    const remainingAmount =
        item.remainingAmount !==
            undefined &&
        item.remainingAmount !==
            null
            ? Number(
                item.remainingAmount
            )
            : Math.max(
                amount -
                paidAmount,
                0
            );

    return {

        ...item,

        amount:
            amount,

        paidAmount:
            paidAmount,

        remainingAmount:
            Math.max(
                remainingAmount,
                0
            ),

        paid:
            Boolean(
                item.paid
            ) ||
            remainingAmount <= 0,

        status:
            item.status ||
            (
                remainingAmount <= 0
                    ? "Paid"
                    : paidAmount > 0
                        ? "Partial"
                        : "Pending"
            ),

        paymentHistory:
            Array.isArray(
                item.paymentHistory
            )
                ? item.paymentHistory
                : []

    };

}


// ------------------------------------------
// ROUND TO NEAREST FIVE
// ------------------------------------------

function roundToNearestFive(
    value
) {

    const number =
        Number(
            value || 0
        );

    return Math.round(
        number / 5
    ) * 5;

}


// ------------------------------------------
// CALCULATE LOAN
// ------------------------------------------

function calculateLoan() {

    const amount =
        Number(
            document.getElementById(
                "loan-amount"
            )?.value || 0
        );

    const interest =
        Number(
            document.getElementById(
                "loan-interest"
            )?.value || 0
        );

    const duration =
        Number(
            document.getElementById(
                "loan-duration"
            )?.value || 0
        );

    const processingFee =
        Number(
            document.getElementById(
                "loan-processing-fee"
            )?.value || 0
        );

    const interestAmount =
        amount *
        (
            interest /
            100
        );

    const totalRepayment =
        amount +
        interestAmount;

    const rawWeekly =
        duration > 0
            ? totalRepayment /
              duration
            : 0;

    const weeklyPayment =
        roundToNearestFive(
            rawWeekly
        );

    const roundedTotal =
        weeklyPayment *
        duration;

    const finalTotal =
        roundedTotal;

    const totalIncome =
        finalTotal -
        amount;

    setElementValue(
        "loan-weekly-payment",
        weeklyPayment
    );

    setElementValue(
        "loan-total-repayment",
        finalTotal
    );

    setElementValue(
        "loan-total-income",
        totalIncome
    );

    const output = {

        amount:
            amount,

        processingFee:
            processingFee,

        interest:
            interest,

        interestAmount:
            interestAmount,

        duration:
            duration,

        weeklyPayment:
            weeklyPayment,

        totalRepayment:
            finalTotal,

        totalIncome:
            totalIncome

    };

    return output;

}


// ------------------------------------------
// GENERATE REPAYMENT SCHEDULE
// ------------------------------------------

function generateRepaymentSchedule(
    startDate,
    duration,
    weeklyPayment,
    totalRepayment
) {

    const schedule = [];

    const weeks =
        Number(
            duration || 0
        );

    const payment =
        Number(
            weeklyPayment || 0
        );

    const total =
        Number(
            totalRepayment || 0
        );

    if (
        weeks <= 0
    ) {

        return schedule;

    }

    let accumulated =
        0;

    for (
        let index = 1;
        index <= weeks;
        index++
    ) {

        let installmentAmount =
            payment;

        if (
            index === weeks
        ) {

            installmentAmount =
                Math.max(
                    total -
                    accumulated,
                    0
                );

        }

        accumulated +=
            installmentAmount;

        const dueDate =
            addDays(
                startDate,
                index * 7
            );

        schedule.push({

            week:
                index,

            amount:
                installmentAmount,

            paidAmount:
                0,

            remainingAmount:
                installmentAmount,

            dueDate:
                dueDate,

            paid:
                false,

            status:
                "Pending",

            paidDate:
                null,

            paymentHistory:
                []

        });

    }

    return schedule;

}


// ------------------------------------------
// APPLY HISTORICAL PAYMENTS
// ------------------------------------------

function applyHistoricalPayments(
    schedule,
    amountPaid
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return [];

    }

    let remaining =
        Number(
            amountPaid || 0
        );

    return schedule.map(
        item => {

            const normalized =
                normalizeScheduleItem(
                    item
                );

            if (
                remaining <= 0
            ) {

                return normalized;

            }

            const amount =
                Number(
                    normalized.amount ||
                    0
                );

            const applied =
                Math.min(
                    remaining,
                    amount
                );

            normalized.paidAmount =
                applied;

            normalized.remainingAmount =
                Math.max(
                    amount -
                    applied,
                    0
                );

            normalized.paid =
                normalized.remainingAmount <=
                0;

            normalized.status =
                normalized.paid
                    ? "Paid"
                    : applied > 0
                        ? "Partial"
                        : "Pending";

            remaining -=
                applied;

            return normalized;

        }
    );

}


// ------------------------------------------
// CALCULATE DUE DATE
// ------------------------------------------

function calculateDueDate(
    startDate,
    duration
) {

    const weeks =
        Number(
            duration || 0
        );

    return addDays(
        startDate,
        weeks * 7
    );

}


// ------------------------------------------
// ADD DAYS
// ------------------------------------------

function addDays(
    dateValue,
    days
) {

    let date;

    if (
        dateValue &&
        typeof dateValue.toDate ===
            "function"
    ) {

        date =
            dateValue.toDate();

    } else {

        date =
            new Date(
                dateValue
            );

    }

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        date =
            new Date();

    }

    date.setDate(
        date.getDate() +
        Number(
            days || 0
        )
    );

    return formatDateForStorage(
        date
    );

}


// ------------------------------------------
// FORMAT DATE FOR STORAGE
// ------------------------------------------

function formatDateForStorage(
    date
) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        )
            .padStart(
                2,
                "0"
            );

    const day =
        String(
            date.getDate()
        )
            .padStart(
                2,
                "0"
            );

    return `${year}-${month}-${day}`;

}


// ------------------------------------------
// TODAY
// ------------------------------------------

function today() {

    const date =
        new Date();

    return formatDateForStorage(
        date
    );

}


// ------------------------------------------
// FORMAT DATE
// ------------------------------------------

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    let date;

    if (
        value &&
        typeof value.toDate ===
            "function"
    ) {

        date =
            value.toDate();

    } else {

        date =
            new Date(
                value
            );

    }

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";

    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


// ------------------------------------------
// CURRENCY
// ------------------------------------------

function currency(
    value
) {

    const number =
        Number(
            value || 0
        );

    return (
        "KSh " +
        number.toLocaleString(
            "en-KE",
            {
                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    2
            }
        )
    );

}


// ------------------------------------------
// ESCAPE HTML
// ------------------------------------------

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ------------------------------------------
// CHECK ALL FILTER VALUE
// ------------------------------------------

function isAllFilterValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return true;

    }

    const normalized =
        String(
            value
        )
            .trim()
            .toLowerCase();

    return (
        normalized === "all" ||
        normalized === "all loans" ||
        normalized === "all years" ||
        normalized === "all months"
    );

}


// ------------------------------------------
// GENERATE LOAN NUMBER
// ------------------------------------------

function generateLoanNumber() {

    const prefix =
        "GRM";

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        )
            .padStart(
                2,
                "0"
            );

    const day =
        String(
            now.getDate()
        )
            .padStart(
                2,
                "0"
            );

    const random =
        Math.floor(
            1000 +
            Math.random() *
            9000
        );

    return `${prefix}-${year}${month}${day}-${random}`;

}


// ------------------------------------------
// ADMIN CHECK
// ------------------------------------------

function isAdmin() {

    const role =
        localStorage.getItem(
            "userRole"
        );

    const email =
        localStorage.getItem(
            "userEmail"
        );

    return (
        String(
            role || ""
        )
            .toLowerCase() ===
            "admin" ||
        String(
            email || ""
        )
            .toLowerCase() ===
            "admin"
    );

}


// ------------------------------------------
// LOG HISTORY
// ------------------------------------------

async function logHistory(
    action,
    type,
    data = {}
) {

    try {

        const officer =
            localStorage.getItem(
                "userName"
            ) ||
            localStorage.getItem(
                "userEmail"
            ) ||
            "Unknown Officer";

        await addDoc(
            collection(
                db,
                "activityLogs"
            ),
            {

                action:
                    action,

                type:
                    type,

                data:
                    data,

                officer:
                    officer,

                timestamp:
                    serverTimestamp()

            }
        );

    } catch (error) {

        console.warn(
            "Activity log could not be saved:",
            error
        );

    }

}


// ------------------------------------------
// POPULATE CLIENT DROPDOWN
// ------------------------------------------

function populateClientDropdown() {

    const select =
        document.getElementById(
            "loan-client"
        );

    if (!select) {
        return;
    }

    const currentValue =
        select.value;

    select.innerHTML = `

        <option value="">
            Select Client
        </option>

    `;

    clients
        .slice()
        .sort(
            (a, b) =>
                String(
                    a.name || ""
                ).localeCompare(
                    String(
                        b.name || ""
                    )
                )
        )
        .forEach(
            client => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    client.id;

                option.textContent =
                    client.name ||
                    client.phone ||
                    "Unnamed Client";

                select.appendChild(
                    option
                );

            }
        );

    if (
        currentValue
    ) {

        select.value =
            currentValue;

    }

}


// ------------------------------------------
// LOAD CLIENTS
// ------------------------------------------

function loadClients() {

    try {

        onSnapshot(
            collection(
                db,
                "clients"
            ),
            snapshot => {

                clients =
                    snapshot.docs.map(
                        document => ({

                            id:
                                document.id,

                            ...document.data()

                        })
                    );

                populateClientDropdown();

            },
            error => {

                console.error(
                    "Clients listener error:",
                    error
                );

            }
        );

    } catch (error) {

        console.error(
            "Unable to load clients:",
            error
        );

    }

}


// ------------------------------------------
// LOAD LOANS
// ------------------------------------------

function loadLoans() {

    try {

        onSnapshot(
            collection(
                db,
                "loans"
            ),
            snapshot => {

                loans =
                    snapshot.docs
                        .map(
                            document =>

                                normalizeLoanData({

                                    id:
                                        document.id,

                                    ...document.data()

                                })
                        )
                        .filter(Boolean);


                populateYearFilter();

                renderLoansTable(
                    loans
                );


                // Keep the currently opened
                // loan details page updated.

                if (
                    loanDetailsOpen &&
                    selectedLoanId
                ) {

                    const currentLoan =
                        loans.find(
                            loan =>
                                loan.id ===
                                selectedLoanId
                        );

                    if (
                        currentLoan
                    ) {

                        renderLoanDetailsPage(
                            currentLoan
                        );

                    }

                }

            },
            error => {

                console.error(
                    "Loans listener error:",
                    error
                );

                if (
                    loansTableBody
                ) {

                    loansTableBody.innerHTML = `

                        <tr>

                            <td
                                colspan="15"
                                style="
                                    text-align:center;
                                    padding:35px;
                                "
                            >

                                Unable to load loans.

                            </td>

                        </tr>

                    `;

                }

            }
        );

    } catch (error) {

        console.error(
            "Unable to initialize loans:",
            error
        );

    }

}


// ------------------------------------------
// END OF PART 8
// ------------------------------------------// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 5.0
//
// FINAL PART
// ==========================================


// ==========================================
// SAFE ELEMENT VALUE
// ==========================================

function setElementValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }

    element.value =
        value ?? "";

}


// ==========================================
// SHOW LOAN SUCCESS
// ==========================================

function showLoanSuccess(
    message
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "success"
        );

        return;

    }

    if (
        typeof window.showNotification ===
        "function"
    ) {

        window.showNotification(
            message,
            "success"
        );

        return;

    }

    console.log(
        "GREYMUS:",
        message
    );

}


// ==========================================
// SHOW LOAN ERROR
// ==========================================

function showLoanError(
    message
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "error"
        );

        return;

    }

    if (
        typeof window.showNotification ===
        "function"
    ) {

        window.showNotification(
            message,
            "error"
        );

        return;

    }

    alert(
        message
    );

}


// ==========================================
// FIND NEXT REPAYMENT DATE
// ==========================================

function findNextRepaymentDate(
    schedule
) {

    if (
        !Array.isArray(
            schedule
        )
    ) {

        return null;

    }


    const pending =
        schedule
            .filter(
                item =>
                    item &&
                    !item.paid &&
                    item.dueDate
            )
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.dueDate
                        ).getTime();

                    const dateB =
                        new Date(
                            b.dueDate
                        ).getTime();

                    return dateA -
                        dateB;

                }
            );


    return pending.length
        ? pending[0].dueDate
        : null;

}


// ==========================================
// OPEN LOAN DETAILS
// ==========================================

function openLoanDetails(
    loanId
) {

    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    selectedLoanId =
        loanId;


    loanDetailsOpen =
        true;


    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (!page) {

        console.error(
            "Loan details page not found."
        );

        return;

    }


    renderLoanDetailsPage(
        loan
    );


    page.classList.add(
        "active"
    );


    page.style.display =
        "block";


    document.body.classList.add(
        "loan-details-open"
    );


    window.scrollTo(
        {
            top:
                0,

            behavior:
                "smooth"
        }
    );

}


// ==========================================
// CLOSE LOAN DETAILS
// ==========================================

function closeLoanDetails() {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (page) {

        page.classList.remove(
            "active"
        );


        page.style.display =
            "none";

    }


    loanDetailsOpen =
        false;


    selectedLoanId =
        null;


    document.body.classList.remove(
        "loan-details-open"
    );

}


// ==========================================
// OPEN LOAN MODAL
// ==========================================

function openLoanModal(
    loanId = null
) {

    const modal =
        document.getElementById(
            "loan-modal"
        );


    if (!modal) {

        console.error(
            "Loan modal not found."
        );

        return;

    }


    const form =
        document.getElementById(
            "loan-form"
        );


    if (form) {

        form.reset();

    }


    setElementValue(
        "loan-id",
        loanId || ""
    );


    const title =
        document.getElementById(
            "loan-modal-title"
        );


    if (
        title
    ) {

        title.textContent =
            loanId
                ? "Edit Loan"
                : "Create New Loan";

    }


    if (
        loanId
    ) {

        const loan =
            loans.find(
                item =>
                    item.id ===
                    loanId
            );


        if (!loan) {

            showLoanError(
                "Loan could not be found."
            );

            return;

        }


        fillLoanForm(
            loan
        );

    }


    modal.classList.add(
        "active"
    );


    modal.style.display =
        "flex";

}


// ==========================================
// CLOSE LOAN MODAL
// ==========================================

function closeLoanModal() {

    const modal =
        document.getElementById(
            "loan-modal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    modal.style.display =
        "none";

}


// ==========================================
// FILL LOAN FORM
// ==========================================

function fillLoanForm(
    loan
) {

    setElementValue(
        "loan-id",
        loan.id
    );


    setElementValue(
        "loan-client",
        loan.clientId
    );


    setElementValue(
        "loan-number",
        loan.loanNumber
    );


    setElementValue(
        "loan-type",
        loan.loanType
    );


    setElementValue(
        "loan-amount",
        loan.amount
    );


    setElementValue(
        "loan-processing-fee",
        loan.processingFee
    );


    setElementValue(
        "loan-interest",
        loan.interest
    );


    setElementValue(
        "loan-duration",
        loan.duration
    );


    setElementValue(
        "loan-weekly-payment",
        loan.weeklyPayment
    );


    setElementValue(
        "loan-total-repayment",
        loan.totalRepayment
    );


    setElementValue(
        "loan-total-income",
        loan.totalIncome
    );


    setElementValue(
        "loan-security",
        loan.security
    );


    setElementValue(
        "loan-guarantor-name",
        loan.guarantorName
    );


    setElementValue(
        "loan-guarantor-phone",
        loan.guarantorPhone
    );


    setElementValue(
        "loan-start-date",
        loan.startDate
    );

}


// ==========================================
// EDIT LOAN
// ==========================================

function editLoan(
    loanId
) {

    openLoanModal(
        loanId
    );

}


// ==========================================
// DELETE LOAN
// ==========================================

async function deleteLoan(
    loanId
) {

    if (
        !isAdmin()
    ) {

        showLoanError(
            "Only an administrator can delete loans."
        );

        return;

    }


    const loan =
        loans.find(
            item =>
                item.id ===
                loanId
        );


    if (!loan) {

        showLoanError(
            "Loan could not be found."
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete loan ${loan.loanNumber || ""} for ${loan.clientName || "this client"}?\n\nThis action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "loans",
                loanId
            )
        );


        await logHistory(
            "Deleted loan",
            "loan",
            {

                loanId:
                    loanId,

                loanNumber:
                    loan.loanNumber,

                clientName:
                    loan.clientName

            }
        );


        if (
            selectedLoanId ===
            loanId
        ) {

            closeLoanDetails();

        }


        showLoanSuccess(
            "Loan deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete loan error:",
            error
        );


        showLoanError(
            "Unable to delete loan."
        );

    }

}


// ==========================================
// LOAN FORM SUBMIT
// ==========================================

const loanForm =
    document.getElementById(
        "loan-form"
    );


loanForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (
            loanSubmitting
        ) {

            return;

        }


        loanSubmitting =
            true;


        try {

            await saveLoan();

        } catch (error) {

            console.error(
                "Save loan error:",
                error
            );


            showLoanError(
                error.message ||
                "Unable to save loan."
            );

        } finally {

            loanSubmitting =
                false;

        }

    }
);


// ==========================================
// SAVE LOAN
// ==========================================

async function saveLoan() {

    const loanId =
        document.getElementById(
            "loan-id"
        )?.value ||
        "";


    const clientId =
        document.getElementById(
            "loan-client"
        )?.value ||
        "";


    if (!clientId) {

        showLoanError(
            "Please select a client."
        );

        return;

    }


    const client =
        clients.find(
            item =>
                item.id ===
                clientId
        );


    if (!client) {

        showLoanError(
            "Selected client could not be found."
        );

        return;

    }


    const amount =
        Number(
            document.getElementById(
                "loan-amount"
            )?.value || 0
        );


    const processingFee =
        Number(
            document.getElementById(
                "loan-processing-fee"
            )?.value || 0
        );


    const interest =
        Number(
            document.getElementById(
                "loan-interest"
            )?.value || 0
        );


    const duration =
        Number(
            document.getElementById(
                "loan-duration"
            )?.value || 0
        );


    if (
        amount <= 0
    ) {

        showLoanError(
            "Please enter a valid loan amount."
        );

        return;

    }


    if (
        duration <= 0
    ) {

        showLoanError(
            "Please enter a valid loan duration."
        );

        return;

    }


    const calculation =
        calculateLoan();


    const loanNumber =
        document.getElementById(
            "loan-number"
        )?.value ||
        generateLoanNumber();


    const loanType =
        document.getElementById(
            "loan-type"
        )?.value ||
        "Loan";


    const security =
        document.getElementById(
            "loan-security"
        )?.value ||
        "";


    const guarantorName =
        document.getElementById(
            "loan-guarantor-name"
        )?.value ||
        "";


    const guarantorPhone =
        document.getElementById(
            "loan-guarantor-phone"
        )?.value ||
        "";


    const startDate =
        document.getElementById(
            "loan-start-date"
        )?.value ||
        today();


    const existingLoan =
        loanId
            ? loans.find(
                item =>
                    item.id ===
                    loanId
            )
            : null;


    const schedule =
        existingLoan?.repaymentSchedule ||
        generateRepaymentSchedule(
            startDate,
            duration,
            calculation.weeklyPayment,
            calculation.totalRepayment
        );


    const loanData = {

        clientId:
            clientId,

        clientName:
            client.name ||
            client.fullName ||
            "",

        clientPhone:
            client.phone ||
            client.phoneNumber ||
            "",

        loanNumber:
            loanNumber,

        loanType:
            loanType,

        amount:
            amount,

        processingFee:
            processingFee,

        interest:
            interest,

        interestAmount:
            calculation.interestAmount,

        duration:
            duration,

        repayment:
            calculation.weeklyPayment,

        weeklyPayment:
            calculation.weeklyPayment,

        totalRepayment:
            calculation.totalRepayment,

        totalIncome:
            calculation.totalIncome,

        balance:
            existingLoan
                ? Number(
                    existingLoan.balance ??
                    calculation.totalRepayment
                )
                : calculation.totalRepayment,

        amountPaid:
            existingLoan
                ? Number(
                    existingLoan.amountPaid ||
                    0
                )
                : 0,

        openingBalance:
            existingLoan
                ? Number(
                    existingLoan.openingBalance ??
                    calculation.totalRepayment
                )
                : calculation.totalRepayment,

        security:
            security,

        guarantorName:
            guarantorName,

        guarantorPhone:
            guarantorPhone,

        startDate:
            startDate,

        dueDate:
            existingLoan?.dueDate ||
            calculateDueDate(
                startDate,
                duration
            ),

        repaymentSchedule:
            schedule,

        nextRepaymentDate:
            findNextRepaymentDate(
                schedule
            ),

        remainingInstallments:
            schedule.filter(
                item =>
                    !item.paid
            ).length,

        status:
            existingLoan
                ? existingLoan.status
                : "Pending",

        completed:
            existingLoan
                ? Boolean(
                    existingLoan.completed
                )
                : false,

        createdBy:
            existingLoan?.createdBy ||
            localStorage.getItem(
                "userName"
            ) ||
            localStorage.getItem(
                "userEmail"
            ) ||
            "Unknown Officer",

        updatedAt:
            serverTimestamp()

    };


    if (
        !existingLoan
    ) {

        loanData.createdAt =
            serverTimestamp();

    }


    if (
        loanId
    ) {

        await updateDoc(
            doc(
                db,
                "loans",
                loanId
            ),
            loanData
        );


        await logHistory(
            "Updated loan",
            "loan",
            {

                loanId:
                    loanId,

                loanNumber:
                    loanNumber,

                clientName:
                    client.name,

                amount:
                    amount

            }
        );


        closeLoanModal();


        showLoanSuccess(
            "Loan updated successfully."
        );


    } else {

        const reference =
            await addDoc(
                collection(
                    db,
                    "loans"
                ),
                {

                    ...loanData,

                    createdAt:
                        serverTimestamp()

                }
            );


        await logHistory(
            "Created loan",
            "loan",
            {

                loanId:
                    reference.id,

                loanNumber:
                    loanNumber,

                clientName:
                    client.name,

                amount:
                    amount

            }
        );


        closeLoanModal();


        showLoanSuccess(
            "Loan created successfully."
        );

    }

}


// ==========================================
// LOAN MODAL BACKDROP
// ==========================================

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "loan-modal"
            );


        if (
            modal &&
            event.target ===
                modal
        ) {

            closeLoanModal();

        }

    }
);


// ==========================================
// ESC KEY
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        closeLoanModal();

        closeRepaymentModal();

    }
);


// ==========================================
// MOBILE LOAN ROW CLICK
// ==========================================

document.addEventListener(
    "click",
    event => {

        const row =
            event.target.closest(
                ".loan-row"
            );


        if (!row) {
            return;
        }


        if (
            event.target.closest(
                "button"
            ) ||
            event.target.closest(
                "a"
            ) ||
            event.target.closest(
                "input"
            )
        ) {

            return;

        }


        const loanId =
            row.dataset.loanId;


        if (
            loanId
        ) {

            openLoanDetails(
                loanId
            );

        }

    }
);


// ==========================================
// LOAN CALCULATION EVENTS
// ==========================================

[
    "loan-amount",
    "loan-interest",
    "loan-duration",
    "loan-processing-fee"
].forEach(
    id => {

        document.addEventListener(
            "input",
            event => {

                if (
                    event.target.id ===
                    id
                ) {

                    calculateLoan();

                }

            }
        );

    }
);


// ==========================================
// CLIENT SELECTION
// ==========================================

document.addEventListener(
    "change",
    event => {

        if (
            event.target.id !==
            "loan-client"
        ) {

            return;

        }


        const client =
            clients.find(
                item =>
                    item.id ===
                    event.target.value
            );


        if (!client) {
            return;
        }


        const phone =
            document.getElementById(
                "loan-client-phone"
            );


        if (
            phone
        ) {

            phone.value =
                client.phone ||
                client.phoneNumber ||
                "";

        }

    }
);


// ==========================================
// MESSAGE INTEGRATION
// ==========================================
//
// messages.js is responsible for:
//
// ✔ Approval messages
// ✔ Repayment confirmation
// ✔ Due-today reminders
// ✔ Arrears reminders
// ✔ General loan messages
//
// loans.js only calls the messaging
// functions. It does not send SMS itself.
//
// This keeps manual messaging independent
// from any API provider.
// ==========================================


// ==========================================
// GLOBAL DATA ACCESS
// ==========================================

window.getLoans =
    function() {

        return loans;

    };


window.getLoanById =
    function(
        loanId
    ) {

        return loans.find(
            loan =>
                loan.id ===
                loanId
        ) || null;

    };


window.getClients =
    function() {

        return clients;

    };


// ==========================================
// GLOBAL CALCULATION FUNCTIONS
// ==========================================

window.currency =
    currency;


window.formatDate =
    formatDate;


window.today =
    today;


window.escapeHtml =
    escapeHtml;


window.roundToNearestFive =
    roundToNearestFive;


window.generateRepaymentSchedule =
    generateRepaymentSchedule;


window.applyHistoricalPayments =
    applyHistoricalPayments;


window.calculateDueDate =
    calculateDueDate;


window.findNextRepaymentDate =
    findNextRepaymentDate;


// ==========================================
// GLOBAL LOAN FUNCTIONS
// ==========================================

window.openLoanModal =
    openLoanModal;


window.closeLoanModal =
    closeLoanModal;


window.openLoanDetails =
    openLoanDetails;


window.closeLoanDetails =
    closeLoanDetails;


window.editLoan =
    editLoan;


window.deleteLoan =
    deleteLoan;


window.saveLoan =
    saveLoan;


window.openRepaymentModal =
    openRepaymentModal;


window.closeRepaymentModal =
    closeRepaymentModal;


window.recordRepayment =
    recordRepayment;


window.approveLoan =
    approveLoan;


window.messageLoan =
    messageLoan;


window.messageDueToday =
    messageDueToday;


window.messageArrears =
    messageArrears;


window.messageApproval =
    messageApproval;


window.messageRepayment =
    messageRepayment;


// ==========================================
// FINAL MODULE CHECK
// ==========================================

console.log(
    "GREYMUS loans.js loaded successfully."
);

console.log(
    "Loans:",
    loans.length
);

console.log(
    "Messaging integration:",
    typeof window.openLoanMessage ===
        "function"
        ? "Available"
        : "Waiting for messages.js"
);


// ==========================================
// END OF loans.js
// ==========================================