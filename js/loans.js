// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 6.3
//
// ✔ Loan row -> TRUE FULL-SCREEN LOAN DETAILS PAGE
// ✔ Details page is NOT placed below the table
// ✔ Details page is attached directly to document.body
// ✔ NO expanding row
// ✔ Mobile-friendly loan details
// ✔ Back button returns to Loans
// ✔ Android/browser back button supported
// ✔ Receive Repayment opens correctly
// ✔ Edit Loan
// ✔ Approve Loan
// ✔ Admin-only Delete Loan
// ✔ Mobile repayment schedule cards
// ✔ Admin-only repayment deletion
// ✔ Weekly repayments
// ✔ Loan calculator
// ✔ Historical loans
// ✔ Officer tracking
// ✔ Automatic arrears detection
// ✔ Automatic status updates
// ✔ Firestore realtime sync
// ✔ Search & filters
// ✔ History logging
// ✔ FAB opens ADD REPAYMENT
// ✔ Repayment recalls clients from Firestore
// ✔ Client must be selected — NO manual client entry
// ✔ Outstanding loan loads automatically after client selection
// ✔ Repayment modal forced above loan details page
// ✔ Repayment modal close handling
// ✔ Duplicate repayment protection
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

const loanForm =
    document.getElementById("loan-form");

const loanModal =
    document.getElementById("loan-modal");

const loansTableBody =
    document.getElementById("loans-table-body");

const loanSearch =
    document.getElementById("loan-search");

const loanFilter =
    document.getElementById("loan-filter");

const loanMonthFilter =
    document.getElementById("loan-month-filter");

const loanYearFilter =
    document.getElementById("loan-year-filter");

const loanId =
    document.getElementById("loan-id");

const loanClient =
    document.getElementById("loan-client");

const loanAmount =
    document.getElementById("loan-amount");

const loanProcessingFee =
    document.getElementById("loan-processing-fee");

const loanPaid =
    document.getElementById("loan-paid");

const loanBalance =
    document.getElementById("loan-balance");

const loanType =
    document.getElementById("loan-type");

const loanInterest =
    document.getElementById("loan-interest");

const loanDuration =
    document.getElementById("loan-duration");

const loanDueDate =
    document.getElementById("loan-due-date");

const loanStartDate =
    document.getElementById("loan-start-date");


// ==========================================
// REPAYMENT MODAL
// ==========================================

const repaymentModal =
    document.getElementById("repayment-modal");

const repaymentForm =
    document.getElementById("repayment-form");

const repaymentLoanId =
    document.getElementById("repayment-loan-id");

const repaymentClient =
    document.getElementById("repayment-client");

const repaymentBalance =
    document.getElementById("repayment-balance");

const repaymentAmount =
    document.getElementById("repayment-amount");

const repaymentDate =
    document.getElementById("repayment-date");

const repaymentNotes =
    document.getElementById("repayment-notes");


// ==========================================
// OLD SCHEDULE MODAL
// ==========================================

const scheduleModal =
    document.getElementById("schedule-modal");

const scheduleClient =
    document.getElementById("schedule-client");

const scheduleBalance =
    document.getElementById("schedule-balance");

const scheduleTableBody =
    document.getElementById("schedule-table-body");

const closeScheduleModal =
    document.getElementById("close-schedule-modal");


// ==========================================
// PREVIEW
// ==========================================

const previewPrincipal =
    document.getElementById("preview-principal");

const previewInterest =
    document.getElementById("preview-interest");

const previewDuration =
    document.getElementById("preview-duration");

const previewWeekly =
    document.getElementById("preview-weekly") ||
    document.getElementById("preview-monthly");


// ==========================================
// DATA
// ==========================================

let loans = [];

let clients = [];

let selectedLoanId = null;

let loanDetailsOpen = false;

let repaymentSaving = false;


// ==========================================
// HELPERS
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

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        return "";
    }

    return parsedDate
        .toISOString()
        .split("T")[0];
}


function today() {

    return formatDate(
        new Date()
    );
}


function escapeHtml(value) {

    return String(
        value ?? ""
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


// ==========================================
// GENERATE LOAN NUMBER
// ==========================================

function generateLoanNumber() {

    const year =
        new Date().getFullYear();

    const yearCode =
        String(year).slice(-3);

    const loansThisYear =
        loans.filter(
            loan => {

                const approvalYear =
                    new Date(
                        loan.approvalDate ||
                        loan.createdAt?.toDate?.() ||
                        Date.now()
                    ).getFullYear();

                return (
                    approvalYear ===
                    year
                );
            }
        );

    const sequence =
        String(
            loansThisYear.length + 1
        ).padStart(
            2,
            "0"
        );

    return `GML/${sequence}/${yearCode}`;
}


// ==========================================
// HISTORY LOGGER
// ==========================================

async function logHistory(
    action,
    category,
    details = {}
) {

    try {

        await addDoc(
            collection(
                db,
                "history"
            ),
            {

                action,

                category,

                details,

                officer:
                    localStorage.getItem(
                        "userName"
                    ) ||
                    localStorage.getItem(
                        "userEmail"
                    ) ||
                    "Unknown Officer",

                officerEmail:
                    localStorage.getItem(
                        "userEmail"
                    ) || "",

                createdAt:
                    serverTimestamp(),

                timestamp:
                    new Date().toISOString()
            }
        );

    } catch (error) {

        console.error(
            "History Log Error:",
            error
        );
    }
}


// ==========================================
// ROUND REPAYMENT
// ==========================================

function roundToNearestFive(
    amount
) {

    return Math.ceil(
        Number(amount) / 5
    ) * 5;
}


// ==========================================
// APPLY HISTORICAL PAYMENTS
// ==========================================

function applyHistoricalPayments(
    schedule,
    amountPaid
) {

    let remaining =
        Number(
            amountPaid || 0
        );

    for (
        const installment of schedule
    ) {

        if (
            remaining <= 0
        ) {

            break;
        }


        if (
            remaining >=
            installment.amount
        ) {

            installment.paidAmount =
                installment.amount;

            installment.remainingAmount =
                0;

            installment.paid =
                true;

            installment.status =
                "Paid";

            remaining -=
                installment.amount;

        } else {

            installment.paidAmount =
                remaining;

            installment.remainingAmount =
                installment.amount -
                remaining;

            installment.status =
                "Partial";

            remaining = 0;
        }
    }

    return schedule;
}


// ==========================================
// CALCULATE LOAN
// ==========================================

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

    const processingFee =
        Number(
            loanProcessingFee?.value || 0
        );

    const interestAmount =
        amount *
        interest /
        100;

    const totalRepayment =
        amount +
        interestAmount;

    const weeklyPayment =
        duration > 0
            ? roundToNearestFive(
                totalRepayment /
                duration
            )
            : 0;

    if (previewPrincipal) {

        previewPrincipal.textContent =
            currency(amount);
    }


    if (previewInterest) {

        previewInterest.textContent =
            currency(
                interestAmount
            );
    }


    if (previewDuration) {

        previewDuration.textContent =
            `${duration} Weeks`;
    }


    if (previewWeekly) {

        previewWeekly.textContent =
            currency(
                weeklyPayment
            );
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


// ==========================================
// GENERATE REPAYMENT SCHEDULE
// ==========================================

function generateRepaymentSchedule(
    approvalDate,
    durationWeeks,
    weeklyPayment,
    totalRepayment
) {

    const schedule = [];

    const startDate =
        new Date(
            approvalDate
        );


    for (
        let week = 1;
        week <= durationWeeks;
        week++
    ) {

        const dueDate =
            new Date(
                startDate
            );

        dueDate.setDate(
            dueDate.getDate() +
            week * 7
        );


        let installmentAmount;


        if (
            week === durationWeeks
        ) {

            installmentAmount =
                Number(
                    totalRepayment
                ) -
                (
                    Number(
                        weeklyPayment
                    ) *
                    (
                        durationWeeks -
                        1
                    )
                );

        } else {

            installmentAmount =
                Number(
                    weeklyPayment
                );
        }


        schedule.push({

            week,

            amount:
                installmentAmount,

            paidAmount:
                0,

            remainingAmount:
                installmentAmount,

            dueDate:
                formatDate(
                    dueDate
                ),

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
// LIVE CALCULATOR
// ==========================================

[
    loanAmount,
    loanInterest,
    loanDuration,
    loanProcessingFee

].forEach(
    input => {

        input?.addEventListener(
            "input",
            calculateLoan
        );
    }
);


// ==========================================
// LOAD CLIENTS
// ==========================================

function loadClients() {

    onSnapshot(

        collection(
            db,
            "clients"
        ),

        snapshot => {

            clients = [];

            snapshot.forEach(
                docSnap => {

                    clients.push({

                        id:
                            docSnap.id,

                        ...docSnap.data()
                    });
                }
            );


            populateClientDropdown();


            if (
                repaymentModal &&
                !repaymentModal.classList.contains(
                    "hidden"
                )
            ) {

                populateFabClientSelector();
            }
        },

        error => {

            console.error(
                "Failed to load clients:",
                error
            );
        }
    );
}


// ==========================================
// CLIENT DROPDOWN FOR LOAN CREATION
// ==========================================

function populateClientDropdown() {

    if (!loanClient)
        return;


    loanClient.innerHTML = `

        <option value="">
            Select Client
        </option>

    `;


    clients
        .sort(
            (a, b) =>
                (
                    a.name || ""
                ).localeCompare(
                    b.name || ""
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
                            client.name
                        )}
                    </option>

                `;
            }
        );
}


// ==========================================
// LOAD LOANS
// ==========================================

function loadLoans() {

    onSnapshot(

        collection(
            db,
            "loans"
        ),

        snapshot => {

            loans = [];


            snapshot.forEach(
                docSnap => {

                    const data =
                        docSnap.data();


                    if (!data)
                        return;


                    const loan = {

                        id:
                            docSnap.id,

                        ...data
                    };


                    loan.processingFee ??=
                        0;

                    loan.amountPaid ??=
                        0;


                    loan.balance ??=
                        Number(
                            loan.totalRepayment ||
                            0
                        );


                    loan.weeklyPayment ??=
                        Number(
                            loan.repayment ||
                            0
                        );


                    loan.repaymentSchedule ??=
                        [];


                    loan.remainingInstallments ??=
                        loan.duration ||
                        0;


                    loan.completed ??=
                        false;


                    const next =
                        loan.repaymentSchedule.find(
                            item =>
                                !item.paid
                        );


                    loan.nextRepaymentDate =
                        next
                            ? next.dueDate
                            : "-";


                    loans.push(
                        loan
                    );
                }
            );


            populateYearFilter();


            if (
                loanDetailsOpen &&
                selectedLoanId
            ) {

                const selectedLoan =
                    loans.find(
                        loan =>
                            loan.id ===
                            selectedLoanId
                    );


                if (selectedLoan) {

                    renderLoanDetailsPage(
                        selectedLoan
                    );

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

                populateFabClientSelector();
            }
        },

        error => {

            console.error(
                "Failed to load loans:",
                error
            );
        }
    );
}


// ==========================================
// OPEN NEW LOAN
// ==========================================

function openLoanModal() {

    if (!loanModal)
        return;


    loanForm?.reset();


    if (loanPaid)
        loanPaid.value = 0;


    if (loanBalance)
        loanBalance.value = 0;


    if (loanType)
        loanType.value = "new";


    if (loanId)
        loanId.value = "";


    if (loanDueDate)
        loanDueDate.value =
            today();


    if (loanStartDate)
        loanStartDate.value =
            today();


    calculateLoan();


    loanModal.classList.remove(
        "hidden"
    );
}


// ==========================================
// NEW LOAN BUTTON
// ==========================================

document
    .getElementById(
        "new-loan-btn"
    )
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

            let step =
                "START";


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


                if (!client)
                    throw new Error(
                        "No client selected."
                    );


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

                    clientId:
                        client.id,

                    clientName:
                        client.name,

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
                                    : "Approved"
                            )
                            : "Pending",

                    completed:
                        outstandingBalance <=
                        0,

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


                // ==========================================
                // BLOCK NEW LOAN IF BALANCE EXISTS
                // ==========================================

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

                                loan.status ===
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

                            `Press OK to continue to repayment.\n` +

                            `Press Cancel to close.`
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


                // ==========================================
                // UPDATE EXISTING
                // ==========================================

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

                    // ==========================================
                    // CREATE NEW
                    // ==========================================

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


                if (loanId)
                    loanId.value = "";


                calculateLoan();


                loanModal.classList.add(
                    "hidden"
                );


            } catch (error) {

                console.error(
                    error
                );


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
// RENDER LOANS TABLE
// ==========================================

function renderLoans(
    list
) {

    if (!loansTableBody)
        return;


    if (loanDetailsOpen)
        return;


    loansTableBody.innerHTML =
        "";


    list.sort(
        (a, b) => {

            const dateA =
                a.approvalDate ||
                "";

            const dateB =
                b.approvalDate ||
                "";


            if (
                dateA !==
                dateB
            ) {

                return (
                    new Date(dateB) -
                    new Date(dateA)
                );
            }


            return (
                a.clientName ||
                ""
            ).localeCompare(
                b.clientName ||
                ""
            );
        }
    );


    if (
        list.length === 0
    ) {

        loansTableBody.innerHTML = `

            <tr>

                <td
                    colspan="15"
                    style="text-align:center;"
                >
                    No loans found.
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
            )
                return;


            const row =
                document.createElement(
                    "tr"
                );


            row.className =
                "loan-clickable-row";


            row.dataset.loanId =
                loan.id;


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

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

                    <span class="status ${
                        (
                            loan.status ||
                            "Pending"
                        ).toLowerCase()
                    }">

                        ${escapeHtml(
                            loan.status ||
                            "Pending"
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
                () => {

                    openLoanDetailsPage(
                        loan.id
                    );
                }
            );


            loansTableBody.appendChild(
                row
            );
        }
    );
}


// ==========================================
// GET / CREATE TRUE FULL-SCREEN DETAILS PAGE
// ==========================================

function getLoanDetailsPage() {

    let page =
        document.getElementById(
            "loan-details-page"
        );


    if (page)
        return page;


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

    page.style.maxWidth =
        "100vw";

    page.style.maxHeight =
        "100vh";

    page.style.overflowY =
        "auto";

    page.style.overflowX =
        "hidden";

    page.style.zIndex =
        "99999";

    page.style.background =
        "var(--bg, #0b1424)";

    page.style.webkitOverflowScrolling =
        "touch";


    document.body.appendChild(
        page
    );


    return page;
}


// ==========================================
// OPEN LOAN DETAILS PAGE
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
            "Loan not found."
        );

        return;
    }


    selectedLoanId =
        id;


    loanDetailsOpen =
        true;


    const page =
        getLoanDetailsPage();


    if (!page)
        return;


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
                loanDetails:
                    id
            },

            "",

            `#loan-${encodeURIComponent(
                id
            )}`
        );
    }
}


// ==========================================
// HIDE LOAN LIST CONTROLS
// ==========================================

function hideLoanListControls() {

    const possibleSelectors = [

        "#loan-search",

        "#loan-filter",

        "#loan-month-filter",

        "#loan-year-filter"

    ];


    possibleSelectors.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (!element)
                return;


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


// ==========================================
// SHOW LOAN LIST CONTROLS
// ==========================================

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


// ==========================================
// CLOSE DETAILS PAGE
// ==========================================

function closeLoanDetailsPage(
    skipHistory = false
) {

    selectedLoanId =
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


    if (!skipHistory) {

        if (
            location.hash.startsWith(
                "#loan-"
            )
        ) {

            history.back();
        }
    }


    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}


// ==========================================
// ANDROID / BROWSER BACK BUTTON
// ==========================================

window.addEventListener(
    "popstate",
    () => {

        if (loanDetailsOpen) {

            closeLoanDetailsPage(
                true
            );
        }
    }
);


// ==========================================
// HANDLE DIRECT LOAN HASH
// ==========================================

window.addEventListener(
    "hashchange",
    () => {

        if (
            !location.hash.startsWith(
                "#loan-"
            )
        ) {

            if (loanDetailsOpen) {

                closeLoanDetailsPage(
                    true
                );
            }
        }
    }
);


// ==========================================
// RENDER FULL LOAN DETAILS PAGE
// ==========================================

function renderLoanDetailsPage(
    loan
) {

    const page =
        getLoanDetailsPage();


    if (!page)
        return;


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
        loan.status ||
        "Pending";


    const statusClass =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    page.innerHTML = `

        <div class="loan-details-mobile-page">

            <div class="loan-details-mobile-header">

                <button
                    type="button"
                    class="loan-details-back"
                    data-loan-action="back"
                    aria-label="Back to loans"
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
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <div class="loan-details-balance-card">

                <div class="loan-details-balance-label">
                    OUTSTANDING BALANCE
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
                Loan Summary
            </div>


            <div class="loan-details-summary-grid">

                <div class="loan-summary-card">

                    <span>
                        Loan Amount
                    </span>

                    <strong>
                        ${currency(
                            loan.amount
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Total Repayment
                    </span>

                    <strong>
                        ${currency(
                            totalRepayment
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${currency(
                            paidAmount
                        )}
                    </strong>

                </div>


                <div class="loan-summary-card">

                    <span>
                        Weekly Payment
                    </span>

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

                    <span>
                        Processing Fee
                    </span>

                    <strong>
                        ${currency(
                            loan.processingFee
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Interest
                    </span>

                    <strong>
                        ${loan.interest || 0}%
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Duration
                    </span>

                    <strong>
                        ${loan.duration || 0}
                        Weeks
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Start Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.approvalDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Next Repayment
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.nextRepaymentDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Due Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.dueDate ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Officer
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.createdBy ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Income Earned
                    </span>

                    <strong>
                        ${currency(
                            income
                        )}
                    </strong>

                </div>


                <div class="loan-info-row">

                    <span>
                        Loan Type
                    </span>

                    <strong>
                        ${escapeHtml(
                            loan.loanType ||
                            "new"
                        )}
                    </strong>

                </div>

            </div>


            <div class="loan-details-section-heading">
                Actions
            </div>


            <div class="loan-details-action-list">

                ${
                    loan.status !==
                    "Completed"

                        ? `

                            <button
                                type="button"
                                class="loan-page-action primary"
                                data-loan-action="repay"
                                data-id="${loan.id}"
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
                    loan.status ===
                    "Pending"

                        ? `

                            <button
                                type="button"
                                class="loan-page-action"
                                data-loan-action="edit"
                                data-id="${loan.id}"
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
                                data-id="${loan.id}"
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
                    loan.status ===
                    "Pending" &&
                    isAdmin()

                        ? `

                            <button
                                type="button"
                                class="loan-page-action danger"
                                data-loan-action="delete"
                                data-id="${loan.id}"
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
// MOBILE SCHEDULE CARD
// ==========================================

function renderMobileScheduleCard(
    loan,
    item
) {

    const amount =
        Number(
            item.amount ||
            0
        );


    const paid =
        Number(
            item.paidAmount ||
            0
        );


    const remaining =
        Math.max(
            amount -
            paid,
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

    } else if (
        paid > 0
    ) {

        statusText =
            "Partial";

        statusClass =
            "partial";

        statusIcon =
            "🟡";
    }


    const deleteButton =
        isAdmin() &&
        item.paymentHistory?.length

            ? `

                <button
                    type="button"
                    class="loan-schedule-delete"
                    data-loan-action="delete-payment"
                    data-loan="${loan.id}"
                    data-week="${item.week}"
                >
                    🗑️ Delete latest payment
                </button>

            `

            : "";


    return `

        <div class="loan-schedule-card">

            <div class="loan-schedule-card-header">

                <div>

                    <div class="loan-schedule-week">
                        Week ${item.week}
                    </div>

                    <div class="loan-schedule-due">
                        Due ${escapeHtml(
                            item.dueDate ||
                            "-"
                        )}
                    </div>

                </div>


                <div class="
                    loan-schedule-status
                    ${statusClass}
                ">

                    ${statusIcon}
                    ${statusText}

                </div>

            </div>


            <div class="loan-schedule-values">

                <div>

                    <span>
                        Amount
                    </span>

                    <strong>
                        ${currency(
                            amount
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Paid
                    </span>

                    <strong>
                        ${currency(
                            paid
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Balance
                    </span>

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
// DETAILS PAGE ACTIONS
// ==========================================

function attachLoanDetailsPageActions() {

    const page =
        document.getElementById(
            "loan-details-page"
        );


    if (!page)
        return;


    page
        .querySelector(
            '[data-loan-action="back"]'
        )
        ?.addEventListener(
            "click",
            () => {

                closeLoanDetailsPage();
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="repay"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openRepaymentForLoan(
                            button.dataset.id
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
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        editLoan(
                            button.dataset.id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="approve"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        approveLoan(
                            button.dataset.id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="delete"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteLoan(
                            button.dataset.id
                        );
                    }
                );
            }
        );


    page
        .querySelectorAll(
            '[data-loan-action="delete-payment"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        deletePayment(

                            button.dataset.loan,

                            Number(
                                button.dataset.week
                            )
                        );
                    }
                );
            }
        );
}


// ==========================================
// OPEN REPAYMENT FOR SPECIFIC LOAN
// VERSION 6.3
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


    if (!repaymentModal ||
        !repaymentForm
    ) {

        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    if (
        Number(
            loan.balance ||
            0
        ) <= 0 ||
        loan.status ===
        "Completed"
    ) {

        alert(
            "This loan has no outstanding balance."
        );

        return;
    }


    // ==========================================
    // CREATE REPAYMENT SELECTORS
    // ==========================================

    createFabRepaymentSelectors(
        repaymentForm
    );


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );


    // ==========================================
    // SELECT CLIENT
    // ==========================================

    if (clientSelector) {

        clientSelector.value =
            loan.clientId || "";
    }


    // ==========================================
    // SELECT SPECIFIC LOAN
    // ==========================================

    if (loanSelector) {

        loanSelector.innerHTML = `

            <option value="">
                Select Loan
            </option>

        `;


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


        loanSelector.value =
            loan.id;
    }


    if (loanGroup) {

        loanGroup.style.display =
            "none";
    }


    // ==========================================
    // LOAD SELECTED LOAN
    // ==========================================

    fillRepaymentFromSelectedLoan(
        loan.id
    );


    // ==========================================
    // FORCE CORRECT LOAN ID
    // ==========================================

    if (repaymentLoanId) {

        repaymentLoanId.value =
            loan.id;
    }


    // ==========================================
    // RESET PAYMENT INPUT
    // ==========================================

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


    // ==========================================
    // HIDE OLD MANUAL CLIENT FIELD
    // ==========================================

    if (repaymentClient) {

        repaymentClient.value =
            loan.clientName || "";

        repaymentClient.readOnly =
            true;

        repaymentClient.style.display =
            "none";
    }


    // ==========================================
    // FORCE REPAYMENT MODAL ABOVE
    // LOAN DETAILS PAGE
    // ==========================================

    repaymentModal.style.position =
        "fixed";


    repaymentModal.style.zIndex =
        "100001";


    // ==========================================
    // OPEN MODAL
    // ==========================================

    repaymentModal.classList.remove(
        "hidden"
    );


    repaymentModal.setAttribute(
        "aria-hidden",
        "false"
    );


    // ==========================================
    // FOCUS PAYMENT AMOUNT
    // ==========================================

    setTimeout(
        () => {

            repaymentAmount?.focus();

        },
        150
    );
}


// ==========================================
// EDIT LOAN
// ==========================================

function editLoan(
    id
) {

    const loan =
        loans.find(
            item =>
                item.id === id
        );


    if (!loan)
        return;


    if (
        loan.status !==
        "Pending"
    ) {

        alert(
            "Only pending loans can be edited."
        );

        return;
    }


    if (loanId)
        loanId.value =
            loan.id;


    if (loanClient)
        loanClient.value =
            loan.clientId;


    if (loanAmount)
        loanAmount.value =
            loan.amount;


    if (loanProcessingFee)
        loanProcessingFee.value =
            loan.processingFee ||
            0;


    if (loanInterest)
        loanInterest.value =
            loan.interest;


    if (loanDuration)
        loanDuration.value =
            loan.duration;


    if (loanDueDate)
        loanDueDate.value =
            loan.dueDate ||
            today();


    if (loanType)
        loanType.value =
            loan.loanType ||
            "new";


    if (loanStartDate)
        loanStartDate.value =
            loan.approvalDate ||
            today();


    if (loanPaid)
        loanPaid.value =
            loan.amountPaid ||
            0;


    if (loanBalance)
        loanBalance.value =
            loan.balance ||
            0;


    calculateLoan();


    loanModal?.classList.remove(
        "hidden"
    );
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


    if (!loan)
        return;


    if (
        loan.status !==
        "Pending"
    ) {

        alert(
            "Loan is already approved."
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
                    "Approved",

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
                    loan.amount
            }
        );


        alert(
            "Loan approved successfully."
        );


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


    if (!loan)
        return;


    if (
        loan.status !==
        "Pending"
    ) {

        alert(
            "Only pending loans can be deleted."
        );

        return;
    }


    if (
        !confirm(
            `Delete loan for ${
                loan.clientName
            }?`
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
// SEARCH / FILTER
// ==========================================

function populateYearFilter() {

    if (!loanYearFilter)
        return;


    const years =
        [
            ...new Set(

                loans.map(
                    loan => {

                        const date =
                            loan.approvalDate

                                ? new Date(
                                    loan.approvalDate
                                )

                                : loan.createdAt?.toDate

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


    loanYearFilter.innerHTML = `

        <option value="ALL">
            All
        </option>

    `;


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


// ==========================================
// FILTER LOANS
// ==========================================

function getFilteredLoans() {

    let filtered =
        [...loans];


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
                        )

                    ||

                    String(
                        loan.id
                    )
                        .toLowerCase()
                        .includes(
                            keyword
                        )

                    ||

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


    if (
        status !==
        "ALL"
    ) {

        filtered =
            filtered.filter(
                loan =>
                    loan.status ===
                    status
            );
    }


    if (
        month !==
        "ALL" ||
        year !==
        "ALL"
    ) {

        filtered =
            filtered.filter(
                loan => {

                    const date =
                        loan.approvalDate

                            ? new Date(
                                loan.approvalDate
                            )

                            : loan.createdAt?.toDate

                                ? loan.createdAt.toDate()

                                : new Date();


                    const monthMatch =
                        month ===
                        "ALL" ||
                        date.getMonth() ===
                        Number(
                            month
                        );


                    const yearMatch =
                        year ===
                        "ALL" ||
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

    if (loanDetailsOpen)
        return;


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
// CHECK OVERDUE LOANS
// ==========================================

async function checkOverdueLoans() {

    const todayDate =
        today();


    for (
        const loan of loans
    ) {

        if (
            loan.status ===
            "Pending" ||
            loan.status ===
            "Completed"
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
            const item of schedule
        ) {

            if (item.paid)
                continue;


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


        if (
            !nextRepayment
        ) {

            status =
                "Completed";

        } else if (
            arrears
        ) {

            status =
                "Arrears";

        } else {

            status =
                "Approved";
        }


        if (
            loan.status ===
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
// DELETE PAYMENT
// ==========================================

async function deletePayment(
    loanIdValue,
    week
) {

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
                Number(
                    item.week
                ) ===
                Number(
                    week
                )
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


    const payment =
        installment
            .paymentHistory
            .at(-1);


    if (!payment) {

        alert(
            "Repayment not found."
        );

        return;
    }


    if (
        !confirm(
            `Delete repayment of ${
                currency(
                    payment.amount
                )
            }?`
        )
    ) {

        return;
    }


    const originalHistory =
        [
            ...installment.paymentHistory
        ];


    installment.paymentHistory.pop();


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
        installment.amount;


    installment.status =
        installment.paid
            ? "Paid"
            : installment.paidAmount > 0
                ? "Partial"
                : "Pending";


    if (
        !installment.paid
    ) {

        installment.paidDate =
            null;
    }


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
        "Approved";


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


    try {

        await updateDoc(

            doc(
                db,
                "loans",
                loan.id
            ),

            {

                balance,

                amountPaid,

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

                balance
            }
        );


        alert(
            "Repayment deleted successfully."
        );


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

                renderLoanDetailsPage(
                    updatedLoan
                );
            }
        }


    } catch (error) {

        installment.paymentHistory =
            originalHistory;


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
// VERSION 6.3
// ==========================================

function closeRepaymentModal() {

    const modal =
        document.getElementById(
            "repayment-modal"
        );


    if (!modal)
        return;


    modal.classList.add(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    // Remove temporary high z-index.
    modal.style.zIndex =
        "";


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
}


// ==========================================
// REPAYMENT MODAL CLOSE BUTTONS
// ==========================================

document.addEventListener(
    "click",
    event => {

        const closeButton =
            event.target.closest(

                "#close-repayment-modal, " +

                ".close-repayment-modal, " +

                '[data-close="repayment-modal"], ' +

                '[data-modal-close="repayment-modal"]'
            );


        if (!closeButton)
            return;


        event.preventDefault();


        closeRepaymentModal();
    }
);


// ==========================================
// CLICK OUTSIDE REPAYMENT MODAL
// ==========================================

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


// ==========================================
// ESCAPE KEY
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        )
            return;


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
// RECEIVE REPAYMENT
// ==========================================

repaymentForm?.addEventListener(
    "submit",
    async e => {

        e.preventDefault();


        if (repaymentSaving)
            return;


        const loan =
            loans.find(
                item =>
                    item.id ===
                    repaymentLoanId.value
            );


        if (!loan) {

            alert(
                "Please select a client with an outstanding loan."
            );

            return;
        }


        const payment =
            Number(
                repaymentAmount.value
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
                `Confirm repayment of ${
                    currency(
                        payment
                    )
                }?`
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
            );


        let amountPaid =
            Number(
                loan.amountPaid ||
                0
            );


        balance -=
            payment;


        if (
            balance < 0
        ) {

            balance =
                0;
        }


        amountPaid +=
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


        for (
            const item of schedule
        ) {

            if (
                remaining <=
                0
            )
                break;


            if (item.paid)
                continue;


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
            )
                continue;


            const paymentTimestamp =
                new Date();


            item.paymentHistory ??=
                [];


            const paymentTime =
                paymentTimestamp
                    .toLocaleTimeString(
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


                item.paymentHistory.push({

                    amount:
                        unpaid,

                    date:
                        repaymentDate.value,

                    time:
                        paymentTime,

                    timestamp:
                        paymentTimestamp
                            .toISOString(),

                    notes:
                        repaymentNotes.value ||
                        "",

                    officer:
                        localStorage.getItem(
                            "userName"
                        ) ||
                        localStorage.getItem(
                            "userEmail"
                        ) ||
                        "Unknown Officer"
                });


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


                item.paymentHistory.push({

                    amount:
                        remaining,

                    date:
                        repaymentDate.value,

                    time:
                        paymentTime,

                    timestamp:
                        paymentTimestamp
                            .toISOString(),

                    notes:
                        repaymentNotes.value ||
                        "",

                    officer:
                        localStorage.getItem(
                            "userName"
                        ) ||
                        localStorage.getItem(
                            "userEmail"
                        ) ||
                        "Unknown Officer"
                });


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
            "Approved";


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

                    paymentTime:
                        new Date()
                            .toLocaleTimeString(
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
                            ),

                    paymentTimestamp:
                        new Date()
                            .toISOString(),

                    officer:
                        localStorage.getItem(
                            "userName"
                        ) ||
                        localStorage.getItem(
                            "userEmail"
                        ) ||
                        "Unknown Officer",

                    notes:
                        repaymentNotes.value ||
                        "",

                    createdAt:
                        serverTimestamp()
                }
            );


            // ==========================================
            // CLOSE REPAYMENT MODAL
            // ==========================================

            closeRepaymentModal();


            // ==========================================
            // RESET REPAYMENT FORM
            // ==========================================

            repaymentForm.reset();


            if (repaymentLoanId)
                repaymentLoanId.value =
                    "";


            const clientSelector =
                document.getElementById(
                    "fab-repayment-client-select"
                );


            const loanSelector =
                document.getElementById(
                    "fab-repayment-loan-select"
                );


            const loanGroup =
                document.getElementById(
                    "fab-repayment-loan-group"
                );


            if (clientSelector)
                clientSelector.value =
                    "";


            if (loanSelector) {

                loanSelector.innerHTML = `

                    <option value="">
                        Select Loan
                    </option>

                `;

                loanSelector.value =
                    "";
            }


            if (loanGroup) {

                loanGroup.style.display =
                    "none";
            }


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

                    balance
                }
            );


            alert(
                "✅ Repayment recorded successfully."
            );


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
// OLD SCHEDULE MODAL
// ==========================================

function renderRepaymentSchedule(
    loan
) {

    if (
        !scheduleModal ||
        !scheduleTableBody
    ) {

        return;
    }


    scheduleClient.textContent =
        loan.clientName ||
        "-";


    scheduleBalance.textContent =
        currency(
            loan.balance ||
            0
        );


    scheduleTableBody.innerHTML =
        "";


    const schedule =
        loan.repaymentSchedule ||
        [];


    if (
        !schedule.length
    ) {

        scheduleTableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="text-align:center;"
                >

                    No repayment schedule available.

                </td>

            </tr>

        `;

    } else {

        schedule.forEach(
            item => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${item.week}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.dueDate
                        )}
                    </td>

                    <td>

                        ${currency(
                            item.paidAmount
                        )}

                        /

                        ${currency(
                            item.amount
                        )}

                    </td>

                    <td>

                        ${
                            item.paid

                                ? "✅ Paid"

                                : item.paidAmount > 0

                                    ? "🟡 Partial"

                                    : "⏳ Pending"
                        }

                    </td>

                    <td>
                        ${
                            item.paidDate ||
                            "-"
                        }
                    </td>

                `;


                scheduleTableBody.appendChild(
                    row
                );
            }
        );
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


scheduleModal?.addEventListener(
    "click",
    e => {

        if (
            e.target ===
            scheduleModal
        ) {

            scheduleModal.classList.add(
                "hidden"
            );
        }
    }
);


// ==========================================
// REFRESH
// ==========================================

function refreshLoanTable() {

    filterLoans();
}


// ==========================================
// GET LOAN
// ==========================================

function getLoanById(
    id
) {

    return loans.find(
        loan =>
            loan.id ===
            id
    );
}


// ==========================================
// GET NEXT REPAYMENT
// ==========================================

function getNextRepayment(
    schedule = []
) {

    return (
        schedule.find(
            item =>
                !item.paid
        ) ||
        null
    );
}


// ==========================================
// FAB ADD REPAYMENT
// VERSION 6.3
// ==========================================
//
// The floating + button opens
// the repayment form.
//
// It NEVER opens the new-loan form.
//
// Client selection comes from the
// Firestore clients collection.
//
// The user cannot manually type
// a client name.
// ==========================================

function setupFabAddRepayment() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(

                    "#fab-add-repayment, " +

                    "#fab-repayment, " +

                    "#fab-new-loan, " +

                    '[data-action="add-repayment"]'
                );


            if (!button)
                return;


            event.preventDefault();


            event.stopPropagation();


            openFabRepaymentSelector();

        },
        true
    );
}


// ==========================================
// CREATE REPAYMENT SELECTORS
// ==========================================

function createFabRepaymentSelectors(
    form
) {

    if (!form)
        return null;


    let container =
        document.getElementById(
            "fab-repayment-selectors"
        );


    if (container)
        return container;


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


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    clientSelector?.addEventListener(
        "change",
        () => {

            loadLoansForSelectedClient(
                clientSelector.value
            );
        }
    );


    loanSelector?.addEventListener(
        "change",
        () => {

            fillRepaymentFromSelectedLoan(
                loanSelector.value
            );
        }
    );


    return container;
}


// ==========================================
// POPULATE FAB CLIENT SELECTOR
// ==========================================

function populateFabClientSelector() {

    if (!repaymentForm)
        return;


    createFabRepaymentSelectors(
        repaymentForm
    );


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    if (!clientSelector)
        return;


    const currentValue =
        clientSelector.value;


    clientSelector.innerHTML = `

        <option value="">
            Select Client
        </option>

    `;


    const sortedClients =
        [...clients].sort(
            (a, b) =>
                (
                    a.name || ""
                ).localeCompare(
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

                        loan.status !==
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


    if (
        currentValue &&
        sortedClients.some(
            client =>
                client.id ===
                currentValue
        )
    ) {

        const selectedClientLoans =
            loans.filter(

                loan =>

                    loan.clientId ===
                    currentValue &&

                    Number(
                        loan.balance ||
                        0
                    ) > 0 &&

                    loan.status !==
                    "Completed"
            );


        if (
            selectedClientLoans.length
        ) {

            clientSelector.value =
                currentValue;
        }
    }
}


// ==========================================
// OPEN FAB REPAYMENT
// VERSION 6.3
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


    if (!modal || !form) {

        alert(
            "Repayment form is unavailable."
        );

        return;
    }


    // ==========================================
    // FORCE MODAL ABOVE EVERYTHING
    // ==========================================

    modal.style.position =
        "fixed";


    modal.style.zIndex =
        "100001";


    // ==========================================
    // CREATE SELECTORS
    // ==========================================

    createFabRepaymentSelectors(
        form
    );


    populateFabClientSelector();


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
        );


    const loanSelector =
        document.getElementById(
            "fab-repayment-loan-select"
        );


    const loanGroup =
        document.getElementById(
            "fab-repayment-loan-group"
        );


    // ==========================================
    // RESET CLIENT
    // ==========================================

    if (clientSelector)
        clientSelector.value =
            "";


    // ==========================================
    // RESET LOAN
    // ==========================================

    if (loanSelector) {

        loanSelector.innerHTML = `

            <option value="">
                Select Loan
            </option>

        `;

        loanSelector.value =
            "";
    }


    if (loanGroup) {

        loanGroup.style.display =
            "none";
    }


    // ==========================================
    // CLEAR REPAYMENT FIELDS
    // ==========================================

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


    // ==========================================
    // HIDE OLD MANUAL CLIENT FIELD
    // ==========================================

    if (repaymentClient) {

        repaymentClient.value =
            "";

        repaymentClient.readOnly =
            true;

        repaymentClient.style.display =
            "none";
    }


    // ==========================================
    // OPEN MODAL
    // ==========================================

    modal.classList.remove(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    // ==========================================
    // FOCUS CLIENT SELECTOR
    // ==========================================

    setTimeout(
        () => {

            clientSelector?.focus();

        },
        100
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


    const clientSelector =
        document.getElementById(
            "fab-repayment-client-select"
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

            loanSelector.innerHTML = `

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
        loans
            .filter(

                loan =>

                    loan.clientId ===
                    clientId &&

                    Number(
                        loan.balance ||
                        0
                    ) > 0 &&

                    loan.status !==
                    "Completed"
            )
            .sort(
                (a, b) =>
                    (
                        a.approvalDate ||
                        ""
                    ).localeCompare(
                        b.approvalDate ||
                        ""
                    )
            );


    if (
        !clientLoans.length
    ) {

        clearRepaymentFields();


        if (loanGroup) {

            loanGroup.style.display =
                "none";
        }


        if (clientSelector)
            clientSelector.value =
                "";


        alert(

            `${
                client.name ||
                "This client"
            } has no outstanding loan.`
        );


        return;
    }


    // ==========================================
    // ONE OUTSTANDING LOAN
    // ==========================================

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


    // ==========================================
    // MULTIPLE OUTSTANDING LOANS
    // ==========================================

    if (loanGroup) {

        loanGroup.style.display =
            "block";
    }


    if (loanSelector) {

        loanSelector.innerHTML = `

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


        loanSelector.value =
            "";
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


    const repaymentLoanIdField =
        document.getElementById(
            "repayment-loan-id"
        );


    const repaymentClientField =
        document.getElementById(
            "repayment-client"
        );


    const repaymentBalanceField =
        document.getElementById(
            "repayment-balance"
        );


    const repaymentWeeklyField =
        document.getElementById(
            "repayment-weekly"
        );


    const repaymentAmountField =
        document.getElementById(
            "repayment-amount"
        );


    const repaymentNotesField =
        document.getElementById(
            "repayment-notes"
        );


    const repaymentDateField =
        document.getElementById(
            "repayment-date"
        );


    if (!loan) {

        clearRepaymentFields();

        return;
    }


    // ==========================================
    // HIDDEN LOAN ID
    // ==========================================

    if (repaymentLoanIdField)
        repaymentLoanIdField.value =
            loan.id;


    // ==========================================
    // CLIENT
    // ==========================================

    if (repaymentClientField) {

        repaymentClientField.value =
            loan.clientName ||
            "";

        repaymentClientField.readOnly =
            true;

        repaymentClientField.style.display =
            "none";
    }


    // ==========================================
    // BALANCE
    // ==========================================

    if (repaymentBalanceField)
        repaymentBalanceField.value =
            currency(
                loan.balance
            );


    // ==========================================
    // WEEKLY REPAYMENT
    // ==========================================

    if (repaymentWeeklyField)
        repaymentWeeklyField.value =
            currency(
                loan.weeklyPayment
            );


    // ==========================================
    // RESET PAYMENT INPUT
    // ==========================================

    if (repaymentAmountField)
        repaymentAmountField.value =
            "";


    if (repaymentNotesField)
        repaymentNotesField.value =
            "";


    if (repaymentDateField)
        repaymentDateField.value =
            today();
}


// ==========================================
// CLEAR REPAYMENT FIELDS
// ==========================================

function clearRepaymentFields() {

    const repaymentLoanIdField =
        document.getElementById(
            "repayment-loan-id"
        );


    const repaymentClientField =
        document.getElementById(
            "repayment-client"
        );


    const repaymentBalanceField =
        document.getElementById(
            "repayment-balance"
        );


    const repaymentWeeklyField =
        document.getElementById(
            "repayment-weekly"
        );


    if (
        repaymentLoanIdField
    )
        repaymentLoanIdField.value =
            "";


    if (
        repaymentClientField
    )
        repaymentClientField.value =
            "";


    if (
        repaymentBalanceField
    )
        repaymentBalanceField.value =
            "";


    if (
        repaymentWeeklyField
    )
        repaymentWeeklyField.value =
            "";
}


// ==========================================
// AUTO CHECK
// ==========================================

setInterval(
    () => {

        if (
            loans.length
        )
            checkOverdueLoans();

    },
    60000
);


// ==========================================
// AUTO REFRESH
// ==========================================

setInterval(
    () => {

        if (
            !loanDetailsOpen
        )
            filterLoans();

    },
    30000
);


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        calculateLoan();

        loadClients();

        loadLoans();

        checkOverdueLoans();

        setupFabAddRepayment();
    }
);


// ==========================================
// EXPORTS
// ==========================================

export {

    loadLoans,

    renderLoans,

    calculateLoan,

    currency,

    generateRepaymentSchedule,

    refreshLoanTable,

    getLoanById,

    getNextRepayment

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// loans.js
// VERSION 6.3
// ==========================================