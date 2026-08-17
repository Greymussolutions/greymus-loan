// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 4.0
//
// GREYMUS CLIENT MESSAGING
//
// ✔ Loan approved message
// ✔ Full repayment message
// ✔ Partial repayment message
// ✔ Arrears message
// ✔ Due today + arrears message
// ✔ Partial repayment + arrears message
// ✔ Amount paid
// ✔ Remaining amount due today
// ✔ Current outstanding loan balance
// ✔ Next repayment date after full payment
// ✔ Weekly repayment
// ✔ Repayment start date
// ✔ Dynamic client name
// ✔ Dynamic amounts
// ✔ Kenyan phone number formatting
// ✔ Africa's Talking through Cloudflare Worker
// ✔ API credentials stay on Cloudflare Worker
// ✔ Editable SMS before sending
// ✔ SMS character counter
// ✔ No client loan-application message
//
// Every message ends with:
//
// With regards,
// GREYMUS.
//
// =========================================================


// =========================================================
// CLOUDFLARE WORKER URL
// =========================================================
//
// IMPORTANT:
// Keep the Africa's Talking username and API key
// inside the Cloudflare Worker.
//
// Do NOT put the Africa's Talking API key here.
//
// =========================================================

const GREYMUS_SMS_WORKER_URL =
    "https://greymus-sms-api.gayisi0901.workers.dev";


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

        date =
            value.toDate();

    }

    // Firebase Timestamp-like object
    else if (
        value &&
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        date =
            new Date(
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
// BUILD LOAN APPROVED MESSAGE
// =========================================================
//
// This is used when YOU create/approve a loan.
//
// The client does NOT apply through the system.
//
// =========================================================

function buildLoanApprovedMessage(data = {}) {

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
// BUILD FULL REPAYMENT MESSAGE
// =========================================================
//
// Used when the client has paid the FULL amount due.
//
// Shows:
//
// ✔ Amount paid
// ✔ Remaining loan balance
// ✔ Next repayment date
// ✔ Next repayment amount
//
// =========================================================

function buildFullRepaymentMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const amountPaid =
        Number(
            data.amountPaid ||
            data.paid ||
            data.paymentAmount ||
            0
        );


    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );


    const nextDate =
        data.nextRepaymentDate ||
        data.nextDueDate ||
        data.nextPaymentDate ||
        "";


    const nextAmount =
        Number(
            data.nextRepaymentAmount ||
            data.nextDueAmount ||
            data.weeklyPayment ||
            data.weeklyRepayment ||
            0
        );


    let message =
        `Hello ${name}, we have received your GREYMUS repayment ` +
        `of ${formatKES(amountPaid)}. ` +
        `Your amount paid today is ${formatKES(amountPaid)}. ` +
        `Your remaining loan balance is ${formatKES(outstanding)}. `;


    if (nextDate) {

        const formattedDate =
            formatMessageDate(
                nextDate
            );


        if (formattedDate) {

            message +=
                `Your next repayment`;

            if (nextAmount > 0) {

                message +=
                    ` of ${formatKES(nextAmount)}`;

            }

            message +=
                ` is due on ${formattedDate}. `;

        }

    }


    message +=
        `Thank you for your payment.`;


    return (
        message +
        messageSignature()
    );

}


// =========================================================
// BUILD PARTIAL REPAYMENT MESSAGE
// =========================================================
//
// Used when today's installment is NOT fully paid.
//
// Shows:
//
// ✔ Amount due today
// ✔ Amount paid
// ✔ Remaining amount due today
// ✔ Overall outstanding loan balance
//
// =========================================================

function buildPartialRepaymentMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const dueToday =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            0
        );


    const amountPaid =
        Number(
            data.amountPaid ||
            data.paid ||
            data.paymentAmount ||
            0
        );


    const remainingToday =
        Math.max(
            0,
            Number(
                data.remainingToday ??
                data.remainingDue ??
                (dueToday - amountPaid)
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
        `Hello ${name}, we have received your GREYMUS repayment ` +
        `of ${formatKES(amountPaid)}. ` +
        `Today's repayment was ${formatKES(dueToday)}. ` +
        `The remaining amount due today is ` +
        `${formatKES(remainingToday)}. ` +
        `Your remaining loan balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please clear the remaining amount as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// BUILD ARREARS MESSAGE
// =========================================================
//
// Used when the client has arrears but no current
// installment is being included in the message.
//
// Shows:
//
// ✔ Arrears
// ✔ Outstanding loan balance
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
        `Hello ${name}, your GREYMUS loan has an overdue ` +
        `amount of ${formatKES(arrears)}. ` +
        `Your current outstanding loan balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please clear your overdue amount of ` +
        `${formatKES(arrears)} as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// BUILD DUE + ARREARS MESSAGE
// =========================================================
//
// Shows:
//
// ✔ Today's due
// ✔ Arrears
// ✔ Total currently payable
// ✔ Outstanding loan balance
//
// =========================================================

function buildDuePlusArrearsMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const dueToday =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
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


    const totalPayable =
        Number(
            data.totalPayable ??
            (dueToday + arrears)
        );


    return (
        `Hello ${name}, your GREYMUS repayment of ` +
        `${formatKES(dueToday)} is due today. ` +
        `You also have ${formatKES(arrears)} in arrears. ` +
        `Your total amount currently due is ` +
        `${formatKES(totalPayable)}. ` +
        `Your current outstanding loan balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your payment as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// BUILD PARTIAL REPAYMENT + ARREARS MESSAGE
// =========================================================
//
// Used when:
//
// Today's repayment = KES 3,000
// Arrears = KES 2,000
// Paid = KES 1,500
//
// Message shows:
//
// Today's due       = 3,000
// Amount paid       = 1,500
// Remaining today   = 1,500
// Arrears           = 2,000
// Total payable     = 3,500
// Outstanding       = loan balance
//
// =========================================================

function buildPartialRepaymentPlusArrearsMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );


    const dueToday =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            0
        );


    const amountPaid =
        Number(
            data.amountPaid ||
            data.paid ||
            data.paymentAmount ||
            0
        );


    const remainingToday =
        Math.max(
            0,
            Number(
                data.remainingToday ??
                data.remainingDue ??
                (dueToday - amountPaid)
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


    const totalPayable =
        Number(
            data.totalPayable ??
            (remainingToday + arrears)
        );


    return (
        `Hello ${name}, we have received your GREYMUS repayment ` +
        `of ${formatKES(amountPaid)}. ` +
        `Today's repayment was ${formatKES(dueToday)}, ` +
        `leaving ${formatKES(remainingToday)} still due today. ` +
        `You also have ${formatKES(arrears)} in arrears. ` +
        `Your total amount currently payable is ` +
        `${formatKES(totalPayable)}. ` +
        `Your remaining loan balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please clear the outstanding amount as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// BUILD REPAYMENT MESSAGE AUTOMATICALLY
// =========================================================
//
// repaymentStatus may be:
//
// "full"
// "partial"
// "arrears"
// "due-arrears"
// "partial-arrears"
//
// =========================================================

function buildRepaymentMessage(
    data = {}
) {

    const status =
        String(
            data.repaymentStatus ||
            data.status ||
            ""
        )
        .toLowerCase()
        .replace(
            /_/g,
            "-"
        );


    const arrears =
        Number(
            data.arrears ||
            data.overdueAmount ||
            data.overdue ||
            0
        );


    const dueToday =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
            0
        );


    const amountPaid =
        Number(
            data.amountPaid ||
            data.paid ||
            data.paymentAmount ||
            0
        );


    const remainingToday =
        Math.max(
            0,
            Number(
                data.remainingToday ??
                data.remainingDue ??
                (dueToday - amountPaid)
            )
        );


    // =====================================================
    // EXPLICIT PARTIAL + ARREARS
    // =====================================================

    if (
        status === "partial-arrears" ||
        status === "partial-with-arrears"
    ) {

        return buildPartialRepaymentPlusArrearsMessage(
            data
        );

    }


    // =====================================================
    // EXPLICIT DUE + ARREARS
    // =====================================================

    if (
        status === "due-arrears" ||
        status === "due-plus-arrears" ||
        status === "due-today-arrears"
    ) {

        return buildDuePlusArrearsMessage(
            data
        );

    }


    // =====================================================
    // EXPLICIT ARREARS
    // =====================================================

    if (
        status === "arrears" ||
        status === "overdue"
    ) {

        return buildArrearsMessage(
            data
        );

    }


    // =====================================================
    // EXPLICIT PARTIAL
    // =====================================================

    if (
        status === "partial"
    ) {

        return buildPartialRepaymentMessage(
            data
        );

    }


    // =====================================================
    // EXPLICIT FULL
    // =====================================================

    if (
        status === "full" ||
        status === "paid"
    ) {

        return buildFullRepaymentMessage(
            data
        );

    }


    // =====================================================
    // AUTOMATIC DETECTION
    // =====================================================

    if (
        amountPaid > 0 &&
        remainingToday > 0 &&
        arrears > 0
    ) {

        return buildPartialRepaymentPlusArrearsMessage(
            data
        );

    }


    if (
        dueToday > 0 &&
        arrears > 0
    ) {

        return buildDuePlusArrearsMessage(
            data
        );

    }


    if (
        amountPaid > 0 &&
        remainingToday > 0
    ) {

        return buildPartialRepaymentMessage(
            data
        );

    }


    return buildFullRepaymentMessage(
        data
    );

}


// =========================================================
// BUILD MESSAGE
// =========================================================

function buildMessage(
    data = {}
) {

    const type =
        String(
            data.type ||
            "repayment"
        )
        .toLowerCase()
        .replace(
            /_/g,
            "-"
        );


    switch (type) {

        case "approved":

        case "loan-approved":

            return buildLoanApprovedMessage(
                data
            );


        case "arrears":

        case "overdue":

            return buildArrearsMessage(
                data
            );


        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

            return buildDuePlusArrearsMessage(
                data
            );


        case "partial":

            return buildPartialRepaymentMessage(
                data
            );


        case "partial-arrears":

        case "partial-with-arrears":

            return buildPartialRepaymentPlusArrearsMessage(
                data
            );


        case "full":

        case "paid":

        case "repayment":

        default:

            return buildRepaymentMessage(
                data
            );

    }

}


// =========================================================
// SEND SMS THROUGH CLOUDFLARE WORKER
// =========================================================
//
// The frontend sends:
//
// {
//     to: "+2547XXXXXXXX",
//     message: "Hello..."
// }
//
// The Worker handles Africa's Talking.
//
// =========================================================

async function sendGreymusSMS(
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


    const response =
        await fetch(
            GREYMUS_SMS_WORKER_URL,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        to:
                            phone,

                        message:
                            message

                    })

            }
        );


    let result = null;


    try {

        result =
            await response.json();

    } catch {

        result = null;

    }


    if (!response.ok) {

        throw new Error(
            result?.message ||
            result?.error ||
            `SMS request failed (${response.status}).`
        );

    }


    if (
        result &&
        result.success === false
    ) {

        throw new Error(
            result.message ||
            result.error ||
            "Africa's Talking could not send the SMS."
        );

    }


    return result;

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

            max-height: 92vh;

            overflow-y: auto;

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

            margin: 0;

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


        .greymus-message-field textarea {

            display:
                block;

            width:
                100%;

            min-height:
                190px;

            resize:
                vertical;

            padding:
                13px;

            border-radius:
                12px;

            border:
                1px solid
                rgba(255,255,255,.13);

            background:
                #0d1726;

            color:
                #fff;

            font:
                inherit;

            font-size:
                15px;

            line-height:
                1.5;

            outline:
                none;

            box-sizing:
                border-box;

        }


        .greymus-message-field textarea:focus {

            border-color:
                #0f9d8f;

        }


        .greymus-message-counter {

            display:
                flex;

            justify-content:
                space-between;

            margin-top:
                6px;

            font-size:
                11px;

            color:
                #8493a6;

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


        .greymus-message-success {

            padding:
                12px;

            border-radius:
                10px;

            background:
                rgba(16,185,129,.12);

            color:
                #9ff5d6;

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

        }

    `;


    document.head.appendChild(
        style
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
// MESSAGE TYPE LABEL
// =========================================================

function getMessageTypeLabel(
    data = {}
) {

    const type =
        String(
            data.type ||
            "repayment"
        )
        .toLowerCase()
        .replace(
            /_/g,
            "-"
        );


    switch (type) {

        case "approved":

        case "loan-approved":

            return "Loan Approved SMS";


        case "arrears":

        case "overdue":

            return "Arrears SMS";


        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

            return "Due Today + Arrears SMS";


        case "partial":

            return "Partial Repayment SMS";


        case "partial-arrears":

        case "partial-with-arrears":

            return "Partial Repayment + Arrears SMS";


        default:

            return "Repayment SMS";

    }

}


// =========================================================
// BUILD SUMMARY
// =========================================================

function buildSummaryHTML(
    data = {}
) {

    const type =
        String(
            data.type ||
            "repayment"
        )
        .toLowerCase()
        .replace(
            /_/g,
            "-"
        );


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
                        Outstanding
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


    if (
        type === "due-arrears" ||
        type === "due-plus-arrears" ||
        type === "due-today-arrears"
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
                        Total Payable
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
                        Outstanding
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


    if (
        type === "partial" ||
        type === "partial-arrears" ||
        type === "partial-with-arrears"
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
                    (due - paid)
                )
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


                ${
                    arrears > 0

                    ? `

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

                    `

                    : ""
                }


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


    // FULL REPAYMENT

    return `

        <div class="greymus-message-summary">

            <div>

                <span>
                    Amount Paid
                </span>

                <strong>
                    ${escapeHtml(
                        formatKES(
                            data.amountPaid ||
                            data.paid
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
                            data.outstanding ||
                            data.balance
                        )
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Next Repayment
                </span>

                <strong>
                    ${escapeHtml(
                        formatKES(
                            data.nextRepaymentAmount ||
                            data.nextDueAmount ||
                            data.weeklyPayment
                        )
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Next Date
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

        </div>

    `;

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

            <div class="greymus-message-header">

                <div>

                    <h2>
                        Send Message
                    </h2>

                    <p>
                        ${escapeHtml(
                            getMessageTypeLabel(data)
                        )}
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


            <div class="greymus-message-body">

                <div class="greymus-message-field">

                    <label>
                        Client
                    </label>

                    <div class="greymus-message-readonly">

                        ${escapeHtml(name)}

                    </div>

                </div>


                <div class="greymus-message-field">

                    <label>
                        Phone Number
                    </label>

                    <div class="greymus-message-readonly">

                        ${escapeHtml(
                            phone ||
                            "No phone number registered"
                        )}

                    </div>

                </div>


                ${buildSummaryHTML(data)}


                <div class="greymus-message-field">

                    <label
                        for="greymus-message-text"
                    >
                        Message
                    </label>


                    <textarea
                        id="greymus-message-text"
                        maxlength="500"
                    >${escapeHtml(message)}</textarea>


                    <div class="greymus-message-counter">

                        <span>
                            Edit before sending
                        </span>

                        <span
                            id="greymus-message-count"
                        >
                            ${message.length}/500
                        </span>

                    </div>

                </div>


                ${
                    !phone

                    ? `

                        <div class="greymus-message-error">

                            This client has no valid
                            phone number.

                        </div>

                    `

                    : ""
                }

            </div>


            <div class="greymus-message-footer">

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


    const textarea =
        document.getElementById(
            "greymus-message-text"
        );


    const counter =
        document.getElementById(
            "greymus-message-count"
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
    // CHARACTER COUNTER
    // =====================================================

    textarea?.addEventListener(
        "input",
        () => {

            if (counter) {

                counter.textContent =
                    `${textarea.value.length}/500`;

            }

        }
    );


    // =====================================================
    // SEND SMS
    // =====================================================

    sendButton?.addEventListener(
        "click",
        async () => {

            const finalMessage =
                textarea
                    ? textarea.value.trim()
                    : "";


            if (!phone) {

                alert(
                    "This client does not have a valid phone number."
                );

                return;

            }


            if (!finalMessage) {

                alert(
                    "Please enter a message before sending."
                );

                textarea?.focus();

                return;

            }


            sendButton.disabled =
                true;


            sendButton.textContent =
                "Sending SMS…";


            try {

                await sendGreymusSMS(
                    phone,
                    finalMessage
                );


                sendButton.textContent =
                    "SMS Sent ✓";


                alert(
                    "SMS sent successfully."
                );


                setTimeout(
                    () => {

                        close();

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "GREYMUS SMS ERROR:",
                    error
                );


                sendButton.disabled =
                    false;


                sendButton.textContent =
                    "💬 Send SMS";


                alert(
                    "SMS could not be sent.\n\n" +
                    (
                        error?.message ||
                        "Unknown error."
                    )
                );

            }

        }
    );


    textarea?.focus();

}


// =========================================================
// GLOBAL DEBUG ACCESS
// =========================================================

window.GREYMUS_MESSAGING = {

    openMessageComposer,

    buildMessage,

    buildLoanApprovedMessage,

    buildRepaymentMessage,

    buildFullRepaymentMessage,

    buildPartialRepaymentMessage,

    buildArrearsMessage,

    buildDuePlusArrearsMessage,

    buildPartialRepaymentPlusArrearsMessage,

    sendGreymusSMS

};


// =========================================================
// END OF messaging.js
// =========================================================