// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 6.0
//
// GREYMUS CLIENT MESSAGING
//
// NATIVE PHONE SMS VERSION
//
// ✔ Loan Approved
// ✔ Due Today
// ✔ Due Today + Arrears
// ✔ Partial Repayment
// ✔ Partial Repayment + Arrears
// ✔ Full Repayment
// ✔ Arrears
//
// ✔ Phone number displayed
// ✔ Message is READ-ONLY
// ✔ Native phone SMS
// ✔ No Africa's Talking
// ✔ No Cloudflare Worker
// ✔ No SMS API
// ✔ No API key
//
// Every message ends with:
//
// With regards,
// GREYMUS.
//
// =========================================================


// =========================================================
// FORMAT KES
// =========================================================

function formatKES(value) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    ).format(
        Number(value || 0)
    );

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatMessageDate(value) {

    if (!value) {
        return "";
    }


    let date;


    // Firebase Timestamp
    if (
        value &&
        typeof value.toDate === "function"
    ) {

        date = value.toDate();

    }


    // Firebase Timestamp-like object
    else if (
        value &&
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        date = new Date(
            value.seconds * 1000
        );

    }


    // JavaScript Date
    else if (
        value instanceof Date
    ) {

        date = value;

    }


    // String / number
    else {

        date = new Date(value);

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return new Intl.DateTimeFormat(
        "en-KE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);

}


// =========================================================
// GET CLIENT NAME
// =========================================================

function getClientName(client = {}) {

    return (
        client.name ||
        client.clientName ||
        client.fullName ||
        "Client"
    );

}


// =========================================================
// GET CLIENT PHONE
// =========================================================

function getClientPhone(client = {}) {

    let phone =
        client.phone ||
        client.phoneNumber ||
        client.mobile ||
        client.mobileNumber ||
        "";


    phone =
        String(phone)
            .trim()
            .replace(
                /[\s\-().]/g,
                ""
            );


    if (!phone) {

        return "";

    }


    // Kenya:
    // 07XXXXXXXX
    // 01XXXXXXXX

    if (
        phone.startsWith("07") ||
        phone.startsWith("01")
    ) {

        return (
            "+254" +
            phone.substring(1)
        );

    }


    // Kenya:
    // 2547XXXXXXXX
    // 2541XXXXXXXX

    if (
        phone.startsWith("254")
    ) {

        return "+" + phone;

    }


    return phone;

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

    return String(value ?? "")
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


// =========================================================
// MESSAGE SIGNATURE
// =========================================================

function messageSignature() {

    return `

With regards,
GREYMUS.`;

}


// =========================================================
// LOAN APPROVED
// =========================================================
//
// GREYMUS DOES NOT HAVE A CLIENT APPLICATION SYSTEM.
//
// This is the message sent after YOU create/approve
// the client's loan.
//
// =========================================================

function buildLoanApprovedMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const amount =
        Number(
            data.amount ||
            data.loanAmount ||
            0
        );


    const outstanding =
        Number(
            data.outstanding ||
            data.totalRepayment ||
            data.totalLoanRepayment ||
            0
        );


    const weeklyPayment =
        Number(
            data.weeklyPayment ||
            data.weeklyRepayment ||
            data.repayment ||
            0
        );


    const startDate =
        data.startDate ||
        data.repaymentStartDate ||
        data.firstRepaymentDate ||
        "";


    let message =
        `Hello ${name}, your GREYMUS loan has been approved. `;


    if (amount > 0) {

        message +=
            `Your approved loan amount is ` +
            `${formatKES(amount)}. `;

    }


    if (outstanding > 0) {

        message +=
            `Your outstanding loan amount is ` +
            `${formatKES(outstanding)}. `;

    }


    if (weeklyPayment > 0) {

        message +=
            `Your weekly repayment is ` +
            `${formatKES(weeklyPayment)}. `;

    }


    if (startDate) {

        const formattedDate =
            formatMessageDate(
                startDate
            );


        if (formattedDate) {

            message +=
                `Your repayment start date is ` +
                `${formattedDate}. `;

        }

    }


    message +=
        `Please make your repayments on time. ` +
        `Thank you.`;


    return (
        message +
        messageSignature()
    );

}


// =========================================================
// DUE TODAY
// =========================================================
//
// This is ONLY for a client whose repayment is due today.
//
// It is NOT a repayment confirmation.
//
// =========================================================

function buildDueTodayMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const due =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            data.weeklyRepayment ||
            data.weeklyPayment ||
            0
        );


    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );


    return (
        `Hello ${name}, your GREYMUS repayment of ` +
        `${formatKES(due)} is due today. ` +
        `Your outstanding balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your payment on time. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// DUE TODAY + ARREARS
// =========================================================
//
// Example:
//
// Today's repayment = KES 3,000
// Arrears            = KES 2,000
// Total               = KES 5,000
//
// =========================================================

function buildDuePlusArrearsMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const due =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            data.weeklyRepayment ||
            data.weeklyPayment ||
            0
        );


    const arrears =
        Number(
            data.arrears ||
            data.overdueAmount ||
            data.overdue ||
            0
        );


    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );


    const totalDue =
        Number(
            data.totalPayable ??
            (due + arrears)
        );


    return (
        `Hello ${name}, your GREYMUS repayment of ` +
        `${formatKES(due)} is due today. ` +
        `You still have ${formatKES(arrears)} in arrears. ` +
        `Your total amount due is ` +
        `${formatKES(totalDue)}. ` +
        `Your outstanding balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your payment as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// PARTIAL REPAYMENT
// =========================================================
//
// Example:
//
// Due today = 3,000
// Paid      = 1,000
// Remaining = 2,000
//
// =========================================================

function buildPartialRepaymentMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const due =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            data.weeklyRepayment ||
            0
        );


    const amountPaid =
        Number(
            data.amountPaid ||
            data.paid ||
            data.paymentAmount ||
            0
        );


    const remaining =
        Math.max(
            0,
            Number(
                data.remainingToday ??
                data.remainingDue ??
                (due - amountPaid)
            )
        );


    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );


    return (
        `Hello ${name}, we have received your GREYMUS ` +
        `repayment of ${formatKES(amountPaid)}. ` +
        `Today's repayment was ${formatKES(due)}. ` +
        `The remaining amount due today is ` +
        `${formatKES(remaining)}. ` +
        `Your outstanding balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please clear the remaining amount as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// PARTIAL REPAYMENT + ARREARS
// =========================================================
//
// Example:
//
// Today's due = 3,000
// Paid        = 1,000
// Remaining   = 2,000
// Arrears     = 1,500
// Total due   = 3,500
//
// =========================================================

function buildPartialPlusArrearsMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const due =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            data.weeklyRepayment ||
            0
        );


    const amountPaid =
        Number(
            data.amountPaid ||
            data.paid ||
            data.paymentAmount ||
            0
        );


    const remaining =
        Math.max(
            0,
            Number(
                data.remainingToday ??
                data.remainingDue ??
                (due - amountPaid)
            )
        );


    const arrears =
        Number(
            data.arrears ||
            data.overdueAmount ||
            data.overdue ||
            0
        );


    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );


    const totalDue =
        Number(
            data.totalPayable ??
            (remaining + arrears)
        );


    return (
        `Hello ${name}, we have received your GREYMUS ` +
        `repayment of ${formatKES(amountPaid)}. ` +
        `Today's repayment was ${formatKES(due)}. ` +
        `The remaining amount due today is ` +
        `${formatKES(remaining)}. ` +
        `You still have ${formatKES(arrears)} in arrears. ` +
        `Your total amount due is ` +
        `${formatKES(totalDue)}. ` +
        `Your outstanding balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your payments as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// FULL REPAYMENT
// =========================================================
//
// Exact agreed wording:
//
// "We have received your full repayment of 3000 due
// today. Your next repayment date is xx. Your
// outstanding balance is xx. Thank you for your
// repayment."
//
// =========================================================

function buildFullRepaymentMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const due =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            data.weeklyRepayment ||
            data.weeklyPayment ||
            data.paymentAmount ||
            data.amountPaid ||
            data.paid ||
            0
        );


    const nextDate =
        data.nextRepaymentDate ||
        data.nextDueDate ||
        data.nextPaymentDate ||
        "";


    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );


    let message =
        `Hello ${name}, we have received your full repayment of ` +
        `${formatKES(due)} due today. `;


    if (nextDate) {

        const formattedDate =
            formatMessageDate(
                nextDate
            );


        message +=
            `Your next repayment date is ` +
            `${formattedDate}. `;

    }


    message +=
        `Your outstanding balance is ` +
        `${formatKES(outstanding)}. ` +
        `Thank you for your repayment.`;


    return (
        message +
        messageSignature()
    );

}


// =========================================================
// ARREARS
// =========================================================
//
// Agreed wording:
//
// "Your loan has KES 2,000 in arrears.
// Your outstanding balance is KES 20,000.
// Please make your payments as soon as possible
// to increase your loan limits."
//
// =========================================================

function buildArrearsMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const arrears =
        Number(
            data.arrears ||
            data.overdueAmount ||
            data.overdue ||
            0
        );


    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );


    return (
        `Hello ${name}, your loan has ` +
        `${formatKES(arrears)} in arrears. ` +
        `Your outstanding balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your payments as soon as possible ` +
        `to increase your loan limits. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// DETERMINE MESSAGE TYPE
// =========================================================

function normalizeMessageType(
    type
) {

    return String(
        type || ""
    )
        .toLowerCase()
        .trim()
        .replace(
            /_/g,
            "-"
        )
        .replace(
            /\s+/g,
            "-"
        );

}


// =========================================================
// BUILD MESSAGE
// =========================================================

function buildMessage(
    data = {}
) {

    const type =
        normalizeMessageType(
            data.type
        );


    switch (type) {


        // -------------------------------------------------
        // LOAN APPROVED
        // -------------------------------------------------

        case "approved":

        case "loan-approved":

            return buildLoanApprovedMessage(
                data
            );


        // -------------------------------------------------
        // DUE TODAY
        // -------------------------------------------------

        case "due":

        case "due-today":

        case "today":

        case "today-due":

            return buildDueTodayMessage(
                data
            );


        // -------------------------------------------------
        // DUE TODAY + ARREARS
        // -------------------------------------------------

        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

        case "due-today-plus-arrears":

            return buildDuePlusArrearsMessage(
                data
            );


        // -------------------------------------------------
        // PARTIAL REPAYMENT
        // -------------------------------------------------

        case "partial":

        case "partial-repayment":

            return buildPartialRepaymentMessage(
                data
            );


        // -------------------------------------------------
        // PARTIAL + ARREARS
        // -------------------------------------------------

        case "partial-arrears":

        case "partial-with-arrears":

        case "partial-repayment-arrears":

        case "partial-repayment-with-arrears":

            return buildPartialPlusArrearsMessage(
                data
            );


        // -------------------------------------------------
        // FULL REPAYMENT
        // -------------------------------------------------

        case "full":

        case "full-repayment":

        case "paid":

        case "repayment-complete":

            return buildFullRepaymentMessage(
                data
            );


        // -------------------------------------------------
        // ARREARS
        // -------------------------------------------------

        case "arrears":

        case "overdue":

            return buildArrearsMessage(
                data
            );


        // -------------------------------------------------
        // DEFAULT
        // -------------------------------------------------

        default:

            return buildDueTodayMessage(
                data
            );

    }

}


// =========================================================
// MESSAGE TYPE LABEL
// =========================================================

function getMessageTypeLabel(
    type
) {

    switch (
        normalizeMessageType(type)
    ) {

        case "approved":

        case "loan-approved":

            return "Loan Approved SMS";


        case "due":

        case "due-today":

        case "today":

        case "today-due":

            return "Due Today SMS";


        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

        case "due-today-plus-arrears":

            return "Due Today + Arrears SMS";


        case "partial":

        case "partial-repayment":

            return "Partial Repayment SMS";


        case "partial-arrears":

        case "partial-with-arrears":

        case "partial-repayment-arrears":

        case "partial-repayment-with-arrears":

            return "Partial Repayment + Arrears SMS";


        case "full":

        case "full-repayment":

        case "paid":

        case "repayment-complete":

            return "Full Repayment SMS";


        case "arrears":

        case "overdue":

            return "Arrears SMS";


        default:

            return "GREYMUS SMS";

    }

}


// =========================================================
// BUILD SUMMARY
// =========================================================

function buildSummaryHTML(
    data = {}
) {

    const type =
        normalizeMessageType(
            data.type
        );


    // -----------------------------------------------------
    // LOAN APPROVED
    // -----------------------------------------------------

    if (
        type === "approved" ||
        type === "loan-approved"
    ) {

        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Approved Amount
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.amount ||
                                data.loanAmount
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding ||
                                data.totalRepayment
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Weekly Repayment
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.weeklyPayment ||
                                data.weeklyRepayment ||
                                data.repayment
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Start Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatMessageDate(
                                data.startDate ||
                                data.repaymentStartDate ||
                                data.firstRepaymentDate
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // DUE TODAY
    // -----------------------------------------------------

    if (
        type === "due" ||
        type === "due-today" ||
        type === "today" ||
        type === "today-due"
    ) {

        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Today's Due
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.dueToday ||
                                data.due
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // DUE TODAY + ARREARS
    // -----------------------------------------------------

    if (
        type === "due-arrears" ||
        type === "due-plus-arrears" ||
        type === "due-today-arrears" ||
        type === "due-today-plus-arrears"
    ) {

        const due =
            Number(
                data.dueToday ||
                data.due ||
                0
            );


        const arrears =
            Number(
                data.arrears ||
                0
            );


        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Today's Due
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(due)
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Arrears
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(arrears)
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Total Amount Due
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.totalPayable ??
                                (due + arrears)
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // PARTIAL REPAYMENT
    // -----------------------------------------------------

    if (
        type === "partial" ||
        type === "partial-repayment"
    ) {

        const due =
            Number(
                data.dueToday ||
                data.due ||
                0
            );


        const paid =
            Number(
                data.amountPaid ||
                data.paid ||
                0
            );


        const remaining =
            Math.max(
                0,
                Number(
                    data.remainingToday ??
                    data.remainingDue ??
                    (due - paid)
                )
            );


        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(paid)
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Remaining Today
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(remaining)
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // PARTIAL + ARREARS
    // -----------------------------------------------------

    if (
        type === "partial-arrears" ||
        type === "partial-with-arrears" ||
        type === "partial-repayment-arrears" ||
        type === "partial-repayment-with-arrears"
    ) {

        const due =
            Number(
                data.dueToday ||
                data.due ||
                0
            );


        const paid =
            Number(
                data.amountPaid ||
                data.paid ||
                0
            );


        const remaining =
            Math.max(
                0,
                Number(
                    data.remainingToday ??
                    data.remainingDue ??
                    (due - paid)
                )
            );


        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(paid)
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Remaining Today
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(remaining)
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Arrears
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.arrears
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // FULL REPAYMENT
    // -----------------------------------------------------

    if (
        type === "full" ||
        type === "full-repayment" ||
        type === "paid" ||
        type === "repayment-complete"
    ) {

        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Full Repayment
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.dueToday ||
                                data.due ||
                                data.amountPaid ||
                                data.paid
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Next Repayment Date
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatMessageDate(
                                data.nextRepaymentDate ||
                                data.nextDueDate
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // ARREARS
    // -----------------------------------------------------

    if (
        type === "arrears" ||
        type === "overdue"
    ) {

        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Arrears
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.arrears ||
                                data.overdueAmount
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    return "";

}


// =========================================================
// INJECT STYLES
// =========================================================

function injectStyles() {

    if (
        document.getElementById(
            "greymus-messaging-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "greymus-messaging-styles";


    style.textContent = `

        .greymus-message-overlay {

            position: fixed;
            inset: 0;
            z-index: 999999;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 18px;

            background:
                rgba(0,0,0,.72);

        }


        .greymus-message-modal {

            width:
                min(100%, 520px);

            max-height:
                92vh;

            overflow-y:
                auto;

            background:
                #162235;

            color:
                #eef4fb;

            border:
                1px solid
                rgba(255,255,255,.12);

            border-radius:
                20px;

            box-shadow:
                0 25px 70px
                rgba(0,0,0,.45);

        }


        .greymus-message-header {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                flex-start;

            gap:
                15px;

            padding:
                20px;

            border-bottom:
                1px solid
                rgba(255,255,255,.10);

        }


        .greymus-message-header h2 {

            margin:
                0;

            font-size:
                22px;

        }


        .greymus-message-header p {

            margin:
                5px 0 0;

            color:
                #9eacbf;

            font-size:
                13px;

        }


        .greymus-message-close {

            width:
                40px;

            height:
                40px;

            border:
                0;

            border-radius:
                50%;

            background:
                rgba(255,255,255,.08);

            color:
                #fff;

            font-size:
                28px;

            cursor:
                pointer;

        }


        .greymus-message-body {

            padding:
                20px;

        }


        .greymus-message-field {

            margin-bottom:
                17px;

        }


        .greymus-message-field label {

            display:
                block;

            margin-bottom:
                7px;

            font-size:
                13px;

            font-weight:
                700;

            color:
                #b8c5d5;

        }


        .greymus-message-readonly {

            width:
                100%;

            padding:
                13px 14px;

            border-radius:
                11px;

            background:
                rgba(255,255,255,.07);

            border:
                1px solid
                rgba(255,255,255,.09);

            color:
                #fff;

            font-size:
                15px;

            box-sizing:
                border-box;

        }


        .greymus-message-text {

            width:
                100%;

            min-height:
                190px;

            padding:
                15px;

            border-radius:
                12px;

            background:
                #0d1726;

            border:
                1px solid
                rgba(255,255,255,.13);

            color:
                #fff;

            font:
                inherit;

            font-size:
                15px;

            line-height:
                1.55;

            white-space:
                pre-wrap;

            box-sizing:
                border-box;

            user-select:
                text;

        }


        .greymus-message-summary {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                10px;

            margin:
                4px 0 18px;

        }


        .greymus-message-summary > div {

            padding:
                13px;

            border-radius:
                12px;

            background:
                rgba(16,185,129,.10);

            border:
                1px solid
                rgba(16,185,129,.18);

        }


        .greymus-message-summary span {

            display:
                block;

            font-size:
                12px;

            color:
                #aebdca;

            margin-bottom:
                4px;

        }


        .greymus-message-summary strong {

            color:
                #fff;

            font-size:
                16px;

        }


        .greymus-message-footer {

            display:
                flex;

            gap:
                10px;

            padding:
                16px 20px 20px;

            border-top:
                1px solid
                rgba(255,255,255,.10);

        }


        .greymus-message-footer button {

            flex:
                1;

            min-height:
                48px;

            border:
                0;

            border-radius:
                12px;

            font:
                inherit;

            font-weight:
                700;

            cursor:
                pointer;

        }


        .greymus-message-cancel {

            background:
                rgba(255,255,255,.09);

            color:
                #fff;

        }


        .greymus-message-send {

            background:
                #0f9d8f;

            color:
                #fff;

        }


        .greymus-message-send:disabled {

            opacity:
                .5;

            cursor:
                not-allowed;

        }


        .greymus-message-error {

            padding:
                12px;

            border-radius:
                10px;

            background:
                rgba(239,68,68,.12);

            color:
                #ffb4b4;

            font-size:
                13px;

        }


        @media(max-width:480px){

            .greymus-message-overlay {

                align-items:
                    flex-end;

                padding:
                    0;

            }


            .greymus-message-modal {

                width:
                    100%;

                max-height:
                    94vh;

                border-radius:
                    20px 20px 0 0;

            }


            .greymus-message-summary {

                grid-template-columns:
                    1fr;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


// =========================================================
// OPEN NATIVE SMS
// =========================================================
//
// IMPORTANT:
//
// This opens the phone's SMS application.
//
// The browser cannot send the SMS silently.
//
// The user presses SEND inside the phone's SMS app.
//
// =========================================================

function openNativeSMS(
    phone,
    message
) {

    if (!phone) {

        throw new Error(
            "Client phone number is missing."
        );

    }


    if (!message) {

        throw new Error(
            "Message is empty."
        );

    }


    const encodedMessage =
        encodeURIComponent(
            message
        );


    const smsUrl =
        `sms:${phone}?body=${encodedMessage}`;


    window.location.href =
        smsUrl;

}


// =========================================================
// MAIN MESSAGE COMPOSER
// =========================================================

export function openMessageComposer(
    data = {}
) {

    closeComposer();

    injectStyles();


    const client =
        data.client ||
        {};


    const name =
        getClientName(
            client
        );


    const phone =
        getClientPhone(
            client
        );


    const message =
        buildMessage(
            data
        );


    const typeLabel =
        getMessageTypeLabel(
            data.type
        );


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "greymus-message-composer";


    overlay.className =
        "greymus-message-overlay";


    overlay.innerHTML = `

        <div
            class="greymus-message-modal"
            role="dialog"
            aria-modal="true"
        >

            <div
                class="greymus-message-header"
            >

                <div>

                    <h2>
                        Send Message
                    </h2>

                    <p>
                        ${escapeHtml(typeLabel)}
                    </p>

                </div>


                <button
                    type="button"
                    class="greymus-message-close"
                    id="greymus-message-close"
                >
                    ×
                </button>

            </div>


            <div
                class="greymus-message-body"
            >

                <div
                    class="greymus-message-field"
                >

                    <label>
                        Client
                    </label>


                    <div
                        class="greymus-message-readonly"
                    >

                        ${escapeHtml(name)}

                    </div>

                </div>


                <div
                    class="greymus-message-field"
                >

                    <label>
                        Phone Number
                    </label>


                    <div
                        class="greymus-message-readonly"
                    >

                        ${escapeHtml(
                            phone ||
                            "No phone number registered"
                        )}

                    </div>

                </div>


                ${buildSummaryHTML(data)}


                <div
                    class="greymus-message-field"
                >

                    <label>
                        Message
                    </label>


                    <div
                        class="greymus-message-text"
                        id="greymus-message-text"
                        role="textbox"
                        aria-readonly="true"
                    >

                        ${escapeHtml(message)}

                    </div>

                </div>


                ${
                    !phone

                    ? `

                        <div
                            class="greymus-message-error"
                        >

                            This client has no valid
                            phone number.

                        </div>

                    `

                    : ""
                }

            </div>


            <div
                class="greymus-message-footer"
            >

                <button
                    type="button"
                    class="greymus-message-cancel"
                    id="greymus-message-cancel"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    class="greymus-message-send"
                    id="greymus-message-send"
                    ${phone ? "" : "disabled"}
                >
                    💬 Send SMS
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    // =====================================================
    // ELEMENTS
    // =====================================================

    const closeButton =
        document.getElementById(
            "greymus-message-close"
        );


    const cancelButton =
        document.getElementById(
            "greymus-message-cancel"
        );


    const sendButton =
        document.getElementById(
            "greymus-message-send"
        );


    // =====================================================
    // CLOSE
    // =====================================================

    const close =
        () => {

            closeComposer();

        };


    closeButton?.addEventListener(
        "click",
        close
    );


    cancelButton?.addEventListener(
        "click",
        close
    );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {

                close();

            }

        }
    );


    // =====================================================
    // ESCAPE
    // =====================================================

    const escapeHandler =
        event => {

            if (
                event.key === "Escape"
            ) {

                close();

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

            }

        };


    document.addEventListener(
        "keydown",
        escapeHandler
    );


    // =====================================================
    // SEND
    // =====================================================

    sendButton?.addEventListener(
        "click",
        () => {

            if (!phone) {

                alert(
                    "This client does not have a valid phone number."
                );

                return;

            }


            if (!message) {

                alert(
                    "The message could not be generated."
                );

                return;

            }


            sendButton.disabled =
                true;


            sendButton.textContent =
                "Opening SMS…";


            try {

                openNativeSMS(
                    phone,
                    message
                );

            }

            catch (error) {

                console.error(
                    "GREYMUS SMS error:",
                    error
                );


                sendButton.disabled =
                    false;


                sendButton.textContent =
                    "💬 Send SMS";


                alert(
                    "Unable to open the phone SMS application."
                );

            }

        }
    );

}


// =========================================================
// CLOSE COMPOSER
// =========================================================

function closeComposer() {

    const overlay =
        document.getElementById(
            "greymus-message-composer"
        );


    if (overlay) {

        overlay.remove();

    }

}


// =========================================================
// GLOBAL DEBUG ACCESS
// =========================================================

window.GREYMUS_MESSAGING = {

    openMessageComposer,

    buildMessage,

    buildLoanApprovedMessage,

    buildDueTodayMessage,

    buildDuePlusArrearsMessage,

    buildPartialRepaymentMessage,

    buildPartialPlusArrearsMessage,

    buildFullRepaymentMessage,

    buildArrearsMessage,

    openNativeSMS

};


// =========================================================
// END OF messaging.js
// =========================================================

// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// MESSAGING OVERRIDE
// VERSION 7.0
//
// PURPOSE
//
// ✔ Exact Loan Approval Notice
// ✔ Exact Loan Disbursement Notice
// ✔ Automatic Due Today + Arrears
// ✔ Keeps existing repayment messages
// ✔ Native phone SMS
// ✔ Does NOT use Africa's Talking
// ✔ Does NOT automatically send SMS
// ✔ Messaging errors cannot break loans.js
//
// IMPORTANT
//
// Paste this at the VERY BOTTOM of messaging.js
// =========================================================


(function () {

    "use strict";


    console.log(
        "GREYMUS Messaging Override 7.0 loading..."
    );


    // =====================================================
    // SAFE NUMBER
    // =====================================================

    function number(value) {

        const n =
            Number(value);

        return Number.isFinite(n)
            ? n
            : 0;

    }


    // =====================================================
    // CLIENT NAME
    // =====================================================

    function clientName(client = {}) {

        return (
            client.name ||
            client.clientName ||
            client.fullName ||
            "Client"
        );

    }


    // =====================================================
    // CLIENT PHONE
    // =====================================================

    function clientPhone(client = {}) {

        let phone =
            client.phone ||
            client.phoneNumber ||
            client.mobile ||
            client.mobileNumber ||
            "";


        phone =
            String(phone)
                .trim()
                .replace(
                    /[\s\-().]/g,
                    ""
                );


        if (
            phone.startsWith("07") ||
            phone.startsWith("01")
        ) {

            return (
                "+254" +
                phone.substring(1)
            );

        }


        if (
            phone.startsWith("254")
        ) {

            return "+" + phone;

        }


        return phone;

    }


    // =====================================================
    // KES
    // =====================================================

    function kes(value) {

        return new Intl.NumberFormat(
            "en-KE",
            {
                style: "currency",
                currency: "KES",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }
        ).format(
            number(value)
        );

    }


    // =====================================================
    // DATE
    // =====================================================

    function date(value) {

        if (!value) {
            return "";
        }


        let d;


        try {

            if (
                value &&
                typeof value.toDate ===
                "function"
            ) {

                d =
                    value.toDate();

            }

            else if (
                value &&
                typeof value === "object" &&
                typeof value.seconds === "number"
            ) {

                d =
                    new Date(
                        value.seconds * 1000
                    );

            }

            else if (
                value instanceof Date
            ) {

                d = value;

            }

            else {

                d =
                    new Date(value);

            }


            if (
                Number.isNaN(
                    d.getTime()
                )
            ) {

                return String(value);

            }


            return new Intl.DateTimeFormat(
                "en-KE",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            ).format(d);

        }

        catch (error) {

            return String(value);

        }

    }


    // =====================================================
    // SIGNATURE
    // =====================================================

    function signature() {

        return `

With regards,
GREYMUS.`;

    }


    // =====================================================
    // LOAN APPROVAL MESSAGE
    // =====================================================

    function loanApproved(data = {}) {

        const client =
            data.client ||
            {};


        const name =
            clientName(client);


        const amount =
            number(
                data.amount ||
                data.loanAmount
            );


        const interest =
            number(
                data.interest
            );


        const duration =
            number(
                data.duration ||
                data.durationWeeks
            );


        const totalRepayment =
            number(
                data.totalRepayment ||
                data.totalLoanRepayment
            );


        const weeklyPayment =
            number(
                data.weeklyPayment ||
                data.weeklyRepayment
            );


        const startDate =
            data.loanStartDate ||
            data.startDate ||
            data.approvalDate ||
            "";


        const firstRepaymentDate =
            data.firstRepaymentDate ||
            data.nextRepaymentDate ||
            "";


        return (

            `LOAN APPROVAL NOTICE\n\n` +

            `Dear ${name},\n\n` +

            `We are pleased to inform you that your loan application has been APPROVED.\n\n` +

            `Loan Amount: ${kes(amount)}\n` +

            `Interest: ${interest}% (${duration} weeks)\n` +

            `Total Repayment: ${kes(totalRepayment)}\n` +

            `Weekly Payment: ${kes(weeklyPayment)}\n` +

            `Loan Start Date: ${date(startDate)}\n` +

            `First Repayment Date: ${date(firstRepaymentDate)}\n\n` +

            `Please ensure that your weekly repayments are made on time according to the agreed repayment schedule.\n\n` +

            `Congratulations, and thank you for choosing Greymus Ventures Loan Solutions.` +

            signature()

        );

    }


    // =====================================================
    // LOAN DISBURSEMENT MESSAGE
    // =====================================================

    function loanDisbursed(data = {}) {

        const client =
            data.client ||
            {};


        const name =
            clientName(client);


        const amount =
            number(
                data.disbursedAmount ||
                data.amount ||
                data.loanAmount
            );


        const interest =
            number(
                data.interest
            );


        const duration =
            number(
                data.duration ||
                data.durationWeeks
            );


        const totalRepayment =
            number(
                data.totalRepayment ||
                data.totalLoanRepayment
            );


        const weeklyPayment =
            number(
                data.weeklyPayment ||
                data.weeklyRepayment
            );


        const startDate =
            data.loanStartDate ||
            data.startDate ||
            data.disbursementDate ||
            "";


        const firstRepaymentDate =
            data.firstRepaymentDate ||
            data.nextRepaymentDate ||
            "";


        return (

            `LOAN DISBURSEMENT NOTICE\n\n` +

            `Dear ${name},\n\n` +

            `We are pleased to confirm that your loan has been successfully disbursed.\n\n` +

            `Disbursed Amount: ${kes(amount)}\n` +

            `Interest: ${interest}% (${duration} weeks)\n` +

            `Total Repayment: ${kes(totalRepayment)}\n` +

            `Weekly Payment: ${kes(weeklyPayment)}\n` +

            `Loan Start Date: ${date(startDate)}\n` +

            `First Repayment Date: ${date(firstRepaymentDate)}\n\n` +

            `Your repayment schedule is now active. Please ensure that all weekly repayments are made on time according to the agreed terms.\n\n` +

            `Thank you for choosing Greymus Ventures Loan Solutions.\n\n` +

            `Loan Status: DISBURSED` +

            signature()

        );

    }


    // =====================================================
    // DUE TODAY + ARREARS
    // =====================================================

    function dueTodayPlusArrears(data = {}) {

        const client =
            data.client ||
            {};


        const name =
            clientName(client);


        const due =
            number(
                data.dueToday ||
                data.due ||
                data.installmentDue ||
                data.weeklyPayment ||
                data.weeklyRepayment
            );


        const arrears =
            number(
                data.arrears ||
                data.overdueAmount ||
                data.overdue
            );


        const outstanding =
            number(
                data.outstanding ||
                data.balance ||
                data.remainingBalance
            );


        // IMPORTANT:
        //
        // If totalPayable was not supplied,
        // calculate it from:
        //
        // Today's Due + Arrears

        const totalDue =
            number(
                data.totalPayable
            ) ||
            (
                due +
                arrears
            );


        return (

            `Hello ${name}, your GREYMUS repayment of ` +

            `${kes(due)} is due today. ` +

            `You still have ${kes(arrears)} in arrears. ` +

            `Your total amount due is ${kes(totalDue)}. ` +

            `Your outstanding balance is ${kes(outstanding)}. ` +

            `Please make your payments as soon as possible ` +

            `to increase your loan limits. ` +

            `Thank you.` +

            signature()

        );

    }


    // =====================================================
    // AUTOMATIC REMINDER SELECTION
    // =====================================================
    //
    // THIS IS THE IMPORTANT PART.
    //
    // If:
    //
    // dueToday > 0
    // AND
    // arrears > 0
    //
    // the system MUST use:
    //
    // Due Today + Arrears
    //
    // It must NOT send ordinary Due Today.
    //
    // =====================================================

    function buildReminder(data = {}) {

        const due =
            number(
                data.dueToday ||
                data.due ||
                data.installmentDue ||
                data.weeklyPayment ||
                data.weeklyRepayment
            );


        const arrears =
            number(
                data.arrears ||
                data.overdueAmount ||
                data.overdue
            );


        if (
            due > 0 &&
            arrears > 0
        ) {

            return {
                type:
                    "due-today-plus-arrears",

                message:
                    dueTodayPlusArrears(data)
            };

        }


        // Ordinary due-today reminder

        if (
            due > 0
        ) {

            const name =
                clientName(
                    data.client || {}
                );


            const outstanding =
                number(
                    data.outstanding ||
                    data.balance ||
                    data.remainingBalance
                );


            return {

                type:
                    "due-today",

                message:

                    `Hello ${name}, your GREYMUS repayment of ` +

                    `${kes(due)} is due today. ` +

                    `Your outstanding balance is ` +

                    `${kes(outstanding)}. ` +

                    `Please make your payment on time. ` +

                    `Thank you.` +

                    signature()

            };

        }


        // If there is no payment due today,
        // but there are arrears, use arrears reminder.

        if (
            arrears > 0
        ) {

            const name =
                clientName(
                    data.client || {}
                );


            const outstanding =
                number(
                    data.outstanding ||
                    data.balance ||
                    data.remainingBalance
                );


            return {

                type:
                    "arrears",

                message:

                    `Hello ${name}, your loan has ` +

                    `${kes(arrears)} in arrears. ` +

                    `Your outstanding balance is ` +

                    `${kes(outstanding)}. ` +

                    `Please make your payments as soon as possible ` +

                    `to increase your loan limits. ` +

                    `Thank you.` +

                    signature()

            };

        }


        return null;

    }


    // =====================================================
    // NATIVE SMS
    // =====================================================

    function sendSMS(
        client,
        message
    ) {

        const phone =
            clientPhone(client);


        if (!phone) {

            alert(
                "This client does not have a valid phone number."
            );

            return false;

        }


        if (!message) {

            alert(
                "Message could not be generated."
            );

            return false;

        }


        const url =
            `sms:${phone}?body=${encodeURIComponent(message)}`;


        window.location.href =
            url;


        return true;

    }


    // =====================================================
    // PUBLIC OVERRIDE
    // =====================================================

    window.GREYMUS_MESSAGE_OVERRIDE = {

        loanApproved,

        loanDisbursed,

        dueTodayPlusArrears,

        buildReminder,

        sendSMS

    };


    // =====================================================
    // GLOBAL TEST FUNCTIONS
    // =====================================================

    window.buildGreymusLoanApprovedMessage =
        loanApproved;


    window.buildGreymusLoanDisbursedMessage =
        loanDisbursed;


    window.buildGreymusReminder =
        buildReminder;


    // =====================================================
    // READY
    // =====================================================

    window.GREYMUS_MESSAGING_OVERRIDE_READY =
        true;


    console.log(
        "GREYMUS Messaging Override 7.0 READY"
    );

})();