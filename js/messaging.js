// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 5.0
//
// GREYMUS CLIENT MESSAGING
//
// ✔ Loan Application Received
// ✔ Loan Approved & Disbursed
// ✔ Loan Rejected
// ✔ Due Today
// ✔ Due Today + Arrears combined into ONE amount
// ✔ Arrears
// ✔ Partial Repayment
// ✔ Full Payment of Today's Due
// ✔ Fully Paid Loan
// ✔ Current Outstanding Loan Balance
// ✔ Repayment message enabled after successful repayment
// ✔ Due message disappears when today's due is fully paid
// ✔ Due Today is the only reminder when client has due + arrears
// ✔ Sent message button hidden until next day
// ✔ Cloudflare Worker SMS API
// ✔ Africa's Talking Sandbox
// ✔ API key remains secured in Cloudflare
// ✔ Message marked sent ONLY after API success
// ✔ Prevents duplicate SMS submissions
// ✔ Every message ends with:
//
//      With regards,
//      GREYMUS.
//
// =========================================================


// =========================================================
// CLOUDFLARE SMS API
// =========================================================
//
// The Africa's Talking API key is NEVER stored here.
// It remains securely stored as AT_API_KEY
// inside the Cloudflare Worker.
//
// Browser flow:
//
// GREYMUS APP
//      ↓
// Cloudflare Worker
//      ↓
// Africa's Talking
//      ↓
// Client
//
// =========================================================

const GREYMUS_SMS_API =
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

    // Kenya: 07XXXXXXXX / 01XXXXXXXX
    if (
        phone.startsWith("07") ||
        phone.startsWith("01")
    ) {

        return (
            "+254" +
            phone.substring(1)
        );

    }

    // Kenya: 2547XXXXXXXX / 2541XXXXXXXX
    if (
        phone.startsWith("254")
    ) {

        return "+" + phone;

    }

    // Already international format
    if (
        phone.startsWith("+")
    ) {

        return phone;

    }

    return phone;

}


// =========================================================
// GET DISBURSEMENT NUMBER
// =========================================================

function getDisbursementNumber(
    data = {}
) {

    const client =
        data.client || {};

    const number =
        data.disbursedTo ||
        data.disbursementNumber ||
        data.disbursedNumber ||
        data.sentTo ||
        data.phoneNumber ||
        data.phone ||
        client.phone ||
        client.phoneNumber ||
        client.mobile ||
        client.mobileNumber ||
        "";

    return String(number || "").trim();

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =========================================================
// TODAY
// =========================================================

function getTodayString() {

    const today =
        new Date();

    return (
        today.getFullYear() +
        "-" +
        String(
            today.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            today.getDate()
        ).padStart(2, "0")
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

    if (
        value &&
        typeof value.toDate === "function"
    ) {

        date = value.toDate();

    } else {

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
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(date);

}


// =========================================================
// CLIENT MESSAGE KEY
// =========================================================

function getClientMessageKey(
    client = {},
    data = {}
) {

    return String(
        client.id ||
        client.clientId ||
        data.clientId ||
        client.phone ||
        client.phoneNumber ||
        client.name ||
        client.clientName ||
        "unknown-client"
    );

}


// =========================================================
// MESSAGE STORAGE
// =========================================================

const MESSAGE_STORAGE_KEY =
    "GREYMUS_MESSAGE_STATUS_V4";


function getMessageStatus() {

    try {

        const stored =
            localStorage.getItem(
                MESSAGE_STORAGE_KEY
            );

        return stored
            ? JSON.parse(stored)
            : {};

    } catch (error) {

        return {};

    }

}


function saveMessageStatus(status) {

    try {

        localStorage.setItem(
            MESSAGE_STORAGE_KEY,
            JSON.stringify(status)
        );

    } catch (error) {

        console.warn(
            "GREYMUS messaging status could not be saved.",
            error
        );

    }

}


// =========================================================
// MESSAGE STATUS KEY
// =========================================================

function getMessageStatusKey(
    client,
    data,
    type
) {

    return (
        getClientMessageKey(
            client,
            data
        ) +
        "__" +
        type
    );

}


// =========================================================
// CHECK MESSAGE SENT TODAY
// =========================================================

function wasMessageSentToday(
    client,
    data,
    type
) {

    const status =
        getMessageStatus();

    const key =
        getMessageStatusKey(
            client,
            data,
            type
        );

    return (
        status[key] ===
        getTodayString()
    );

}


// =========================================================
// MARK MESSAGE SENT
// =========================================================

function markMessageSent(
    client,
    data,
    type
) {

    const status =
        getMessageStatus();

    const key =
        getMessageStatusKey(
            client,
            data,
            type
        );

    status[key] =
        getTodayString();

    saveMessageStatus(
        status
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
// LOAN APPLICATION RECEIVED
// =========================================================

function buildApplicationMessage(data) {

    const name =
        getClientName(
            data.client
        );

    const amount =
        Math.max(
            0,
            Number(
                data.amountApplied ??
                data.amount ??
                0
            )
        );

    const weeks =
        Number(
            data.duration ??
            data.weeks ??
            data.repaymentPeriod ??
            0
        );

    const weeklyPayment =
        Math.max(
            0,
            Number(
                data.weeklyPayment ??
                data.weeklyRepayment ??
                data.repayment ??
                0
            )
        );

    const periodText =
        weeks > 0
            ? `${weeks} weeks`
            : "the selected period";

    const weeklyText =
        weeklyPayment > 0
            ? ` Weekly repayment: ${formatKES(weeklyPayment)}.`
            : "";

    return (
        `Hello ${name}, your GREYMUS loan application ` +
        `of ${formatKES(amount)} has been received. ` +
        `Repayment period: ${periodText}.` +
        weeklyText +
        ` Your application is being processed. ` +
        `Kindly wait for approval.` +
        messageSignature()
    );

}


// =========================================================
// LOAN APPROVED & DISBURSED
// =========================================================

function buildApprovedMessage(data) {

    const name =
        getClientName(
            data.client
        );

    const amount =
        Math.max(
            0,
            Number(
                data.approvedAmount ??
                data.amount ??
                0
            )
        );

    const disbursedTo =
        getDisbursementNumber(
            data
        );

    const outstanding =
        Math.max(
            0,
            Number(
                data.outstanding ??
                data.balance ??
                amount
            )
        );

    const firstRepaymentDate =
        formatMessageDate(
            data.firstRepaymentDate ||
            data.firstDueDate ||
            data.nextRepaymentDate ||
            data.dueDate
        );

    const numberText =
        disbursedTo
            ? `disbursed to your number ${disbursedTo}`
            : `disbursed to your registered number`;

    const dateText =
        firstRepaymentDate
            ? ` Your first repayment is due on ${firstRepaymentDate}.`
            : "";

    return (
        `Hello ${name}, your GREYMUS loan of ` +
        `${formatKES(amount)} has been approved and ` +
        `${numberText}. ` +
        `Your current outstanding loan balance is ` +
        `${formatKES(outstanding)}.` +
        dateText +
        ` Kindly make your payment on time. ` +
        `Contact our loan officer for any assistance.` +
        messageSignature()
    );

}


// =========================================================
// LOAN REJECTED
// =========================================================

function buildRejectedMessage(data) {

    const name =
        getClientName(
            data.client
        );

    return (
        `Hello ${name}, your GREYMUS loan application ` +
        `has not been approved at this time. ` +
        `You may contact our loan officer for any assistance.` +
        messageSignature()
    );

}


// =========================================================
// DUE TODAY
// =========================================================
//
// If arrears exist, they are added to the remaining
// amount due today and shown as ONE amount.
//
// =========================================================

function buildDueMessage(data) {

    const name =
        getClientName(
            data.client
        );

    const due =
        Math.max(
            0,
            Number(
                data.due || 0
            )
        );

    const paid =
        Math.max(
            0,
            Number(
                data.paid || 0
            )
        );

    const arrears =
        Math.max(
            0,
            Number(
                data.arrears || 0
            )
        );

    const outstanding =
        Math.max(
            0,
            Number(
                data.outstanding || 0
            )
        );

    const remainingDue =
        Math.max(
            0,
            due - paid
        );

    const totalDue =
        remainingDue +
        arrears;

    if (
        totalDue <= 0
    ) {

        return (
            `Hello ${name}, your repayment for today ` +
            `has been fully paid. Your current outstanding ` +
            `loan balance is ${formatKES(outstanding)}.` +
            messageSignature()
        );

    }

    return (
        `Hello ${name}, your GREYMUS payment due today ` +
        `is ${formatKES(totalDue)}. ` +
        `Your current outstanding loan balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your payment today. ` +
        `Thank you.` +
        messageSignature()
    );

}


// =========================================================
// ARREARS
// =========================================================

function buildArrearsMessage(data) {

    const name =
        getClientName(
            data.client
        );

    const arrears =
        Math.max(
            0,
            Number(
                data.arrears || 0
            )
        );

    const outstanding =
        Math.max(
            0,
            Number(
                data.outstanding || 0
            )
        );

    return (
        `Hello ${name}, your loan is in arrears by ` +
        `${formatKES(arrears)}. ` +
        `Clear the arrears to maintain a good ` +
        `repayment record and qualify for a higher limit. ` +
        `Your current outstanding loan balance is ` +
        `${formatKES(outstanding)}.` +
        messageSignature()
    );

}


// =========================================================
// REPAYMENT
// =========================================================

function buildRepaymentMessage(data) {

    const name =
        getClientName(
            data.client
        );

    const repaymentAmount =
        Math.max(
            0,
            Number(
                data.repaymentAmount ??
                data.amount ??
                data.paidAmount ??
                0
            )
        );

    const outstanding =
        Math.max(
            0,
            Number(
                data.outstanding || 0
            )
        );

    const due =
        Math.max(
            0,
            Number(
                data.due || 0
            )
        );

    const paid =
        Math.max(
            0,
            Number(
                data.paid || 0
            )
        );

    const remainingDue =
        Math.max(
            0,
            Number(
                data.remainingDue !== undefined
                    ? data.remainingDue
                    : due - paid
            )
        );

    const arrears =
        Math.max(
            0,
            Number(
                data.arrears || 0
            )
        );


    // =====================================================
    // LOAN FULLY PAID
    // =====================================================

    if (
        outstanding <= 0
    ) {

        return (
            `Hello ${name}, we received your repayment of ` +
            `${formatKES(repaymentAmount)}. Your loan has ` +
            `been fully paid. Apply for another loan when ready. ` +
            `Contact our loan officer for any assistance.` +
            messageSignature()
        );

    }


    // =====================================================
    // TODAY'S DUE FULLY PAID
    // =====================================================

    if (
        due > 0 &&
        remainingDue <= 0
    ) {

        return (
            `Hello ${name}, we received your repayment of ` +
            `${formatKES(repaymentAmount)}. Your payment due ` +
            `today has been fully paid. Your current ` +
            `outstanding loan balance is ` +
            `${formatKES(outstanding)}.` +
            messageSignature()
        );

    }


    // =====================================================
    // PARTIAL PAYMENT
    // =====================================================

    if (
        remainingDue > 0
    ) {

        const amountStillDue =
            remainingDue +
            arrears;

        return (
            `Hello ${name}, we received your repayment of ` +
            `${formatKES(repaymentAmount)}. The amount still ` +
            `due is ${formatKES(amountStillDue)}. Your current ` +
            `outstanding loan balance is ` +
            `${formatKES(outstanding)}.` +
            messageSignature()
        );

    }


    // =====================================================
    // GENERAL REPAYMENT
    // =====================================================

    return (
        `Hello ${name}, we received your repayment of ` +
        `${formatKES(repaymentAmount)}. Your current ` +
        `outstanding loan balance is ` +
        `${formatKES(outstanding)}.` +
        messageSignature()
    );

}


// =========================================================
// BUILD MESSAGE
// =========================================================

function buildMessage(
    type,
    data
) {

    switch (type) {

        case "application":
            return buildApplicationMessage(data);

        case "approved":
        case "approved-disbursed":
        case "disbursed":
            return buildApprovedMessage(data);

        case "rejected":
            return buildRejectedMessage(data);

        case "arrears":
            return buildArrearsMessage(data);

        case "repayment":
            return buildRepaymentMessage(data);

        case "due":
        default:
            return buildDueMessage(data);

    }

}


// =========================================================
// MESSAGING STATE
// =========================================================

export function getMessagingState(
    data = {}
) {

    const client =
        data.client || {};

    const due =
        Math.max(
            0,
            Number(
                data.due || 0
            )
        );

    const paid =
        Math.max(
            0,
            Number(
                data.paid || 0
            )
        );

    const arrears =
        Math.max(
            0,
            Number(
                data.arrears || 0
            )
        );

    const outstanding =
        Math.max(
            0,
            Number(
                data.outstanding || 0
            )
        );

    const remainingDue =
        Math.max(
            0,
            due - paid
        );

    const dueFullyPaid =
        due > 0 &&
        remainingDue <= 0;

    const loanFullyPaid =
        outstanding <= 0;

    const hasArrears =
        arrears > 0;


    // =====================================================
    // DUE
    // =====================================================

    let dueAvailable =
        !dueFullyPaid &&
        !loanFullyPaid &&
        !wasMessageSentToday(
            client,
            data,
            "due"
        );


    // =====================================================
    // ARREARS
    // =====================================================

    let arrearsAvailable =
        hasArrears &&
        !loanFullyPaid &&
        !wasMessageSentToday(
            client,
            data,
            "arrears"
        );


    // =====================================================
    // REPAYMENT
    // =====================================================

    const repaymentAvailable =
        Boolean(
            data.repaymentMade
        ) &&
        !wasMessageSentToday(
            client,
            data,
            "repayment"
        );


    // =====================================================
    // APPLICATION
    // =====================================================

    const applicationAvailable =
        Boolean(
            data.applicationReceived ||
            data.loanApplication ||
            data.application
        ) &&
        !wasMessageSentToday(
            client,
            data,
            "application"
        );


    // =====================================================
    // APPROVED & DISBURSED
    // =====================================================

    const approvedAvailable =
        Boolean(
            data.loanApproved ||
            data.approved ||
            data.approvedAndDisbursed ||
            data.disbursed
        ) &&
        !wasMessageSentToday(
            client,
            data,
            "approved"
        );


    // =====================================================
    // REJECTED
    // =====================================================

    const rejectedAvailable =
        Boolean(
            data.loanRejected ||
            data.rejected
        ) &&
        !wasMessageSentToday(
            client,
            data,
            "rejected"
        );


    // =====================================================
    // DUE + ARREARS
    //
    // Only Due Today is allowed.
    // =====================================================

    if (
        due > 0 &&
        !dueFullyPaid &&
        hasArrears
    ) {

        arrearsAvailable =
            false;

    }


    return {

        application:
            applicationAvailable,

        approved:
            approvedAvailable,

        rejected:
            rejectedAvailable,

        due:
            dueAvailable,

        arrears:
            arrearsAvailable,

        repayment:
            repaymentAvailable,

        dueAndArrears:
            due > 0 &&
            !dueFullyPaid &&
            hasArrears,

        dueFullyPaid,

        loanFullyPaid

    };

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
                180px;

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
// SEND SMS THROUGH CLOUDFLARE
// =========================================================
//
// The Cloudflare Worker receives:
//
// {
//     to: "+2547XXXXXXXX",
//     message: "GREYMUS message"
// }
//
// The Worker then securely adds the Africa's Talking
// API key and sends the SMS.
//
// IMPORTANT:
// The Africa's Talking API key is NEVER exposed here.
//
// =========================================================

async function sendSMSViaCloudflare(
    phone,
    message
) {

    const response =
        await fetch(
            GREYMUS_SMS_API,
            {

                method:
                    "POST",

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

    const responseText =
        await response.text();


    if (responseText) {

        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            result = {

                success:
                    false,

                error:
                    responseText

            };

        }

    }


    if (
        !response.ok ||
        !result ||
        result.success !== true
    ) {

        let errorMessage =
            "The SMS could not be sent.";

        if (
            result &&
            result.error
        ) {

            errorMessage =
                result.error;

        } else if (
            result &&
            result.africaTalking &&
            result.africaTalking.SMSMessageData &&
            result.africaTalking.SMSMessageData.Message
        ) {

            errorMessage =
                result.africaTalking.SMSMessageData.Message;

        } else if (
            result &&
            result.africaTalking &&
            result.africaTalking.errorMessage
        ) {

            errorMessage =
                result.africaTalking.errorMessage;

        } else if (
            response.status
        ) {

            errorMessage +=
                ` Server status: ${response.status}.`;

        }

        throw new Error(
            errorMessage
        );

    }


    return result;

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
        data.client || {};


    const name =
        getClientName(
            client
        );


    const phone =
        getClientPhone(
            client
        );


    const type =
        data.type ||
        "due";


    const message =
        buildMessage(
            type,
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


    // =====================================================
    // SUMMARY
    // =====================================================

    let summary = "";


    if (
        type === "application"
    ) {

        summary = `

            <div
                class="greymus-message-summary"
            >

                <div>

                    <span>
                        Amount Applied
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.amountApplied ??
                                data.amount
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
                                data.weeklyPayment ??
                                data.weeklyRepayment ??
                                data.repayment
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    } else if (
        type === "approved" ||
        type === "approved-disbursed" ||
        type === "disbursed"
    ) {

        summary = `

            <div
                class="greymus-message-summary"
            >

                <div>

                    <span>
                        Approved Amount
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.approvedAmount ??
                                data.amount
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
                                data.outstanding ??
                                data.balance ??
                                data.approvedAmount ??
                                data.amount
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    } else if (
        type === "arrears"
    ) {

        summary = `

            <div
                class="greymus-message-summary"
            >

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

    } else if (
        type === "repayment"
    ) {

        summary = `

            <div
                class="greymus-message-summary"
            >

                <div>

                    <span>
                        Repayment
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.repaymentAmount ||
                                data.amount ||
                                data.paidAmount
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

    } else {

        const due =
            Math.max(
                0,
                Number(
                    data.due || 0
                )
            );

        const paid =
            Math.max(
                0,
                Number(
                    data.paid || 0
                )
            );

        const arrears =
            Math.max(
                0,
                Number(
                    data.arrears || 0
                )
            );

        const remainingDue =
            Math.max(
                0,
                due - paid
            );

        const totalDue =
            remainingDue +
            arrears;

        summary = `

            <div
                class="greymus-message-summary"
            >

                <div>

                    <span>
                        Amount Due Today
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                totalDue
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


    // =====================================================
    // MODAL
    // =====================================================

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
                        GREYMUS client SMS
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


                ${summary}


                <div
                    class="greymus-message-field"
                >

                    <label
                        for="greymus-message-text"
                    >
                        Message
                    </label>


                    <textarea
                        id="greymus-message-text"
                        maxlength="500"
                    >${escapeHtml(message)}</textarea>


                    <div
                        class="greymus-message-counter"
                    >

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
    // COUNTER
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
    // SEND
    // =====================================================

    sendButton?.addEventListener(
        "click",
        async () => {

            const finalMessage =
                textarea
                    ? textarea.value.trim()
                    : "";


            // -------------------------------------------------
            // PHONE VALIDATION
            // -------------------------------------------------

            if (!phone) {

                alert(
                    "This client does not have a valid phone number."
                );

                return;

            }


            // -------------------------------------------------
            // MESSAGE VALIDATION
            // -------------------------------------------------

            if (!finalMessage) {

                alert(
                    "Please enter a message before sending."
                );

                textarea?.focus();

                return;

            }


            // -------------------------------------------------
            // PREVENT DUPLICATE SUBMISSION
            // -------------------------------------------------

            if (
                sendButton.disabled
            ) {

                return;

            }


            // -------------------------------------------------
            // LOCK SEND BUTTON
            // -------------------------------------------------

            sendButton.disabled =
                true;

            sendButton.textContent =
                "Sending…";


            try {

                // -------------------------------------------------
                // SEND THROUGH CLOUDFLARE
                // -------------------------------------------------

                const result =
                    await sendSMSViaCloudflare(
                        phone,
                        finalMessage
                    );


                // -------------------------------------------------
                // ONLY MARK SENT AFTER SUCCESS
                // -------------------------------------------------

                markMessageSent(
                    client,
                    data,
                    type
                );


                // -------------------------------------------------
                // NOTIFY APPLICATION
                // -------------------------------------------------

                window.dispatchEvent(
                    new CustomEvent(
                        "greymus:messaging-state-changed",
                        {
                            detail: {
                                ...data,
                                messageType:
                                    type,
                                smsResult:
                                    result,
                                smsSent:
                                    true
                            }
                        }
                    )
                );


                // -------------------------------------------------
                // CLOSE COMPOSER
                // -------------------------------------------------

                closeComposer();


                // -------------------------------------------------
                // SUCCESS MESSAGE
                // -------------------------------------------------

                alert(
                    "SMS sent successfully."
                );


            } catch (error) {

                console.error(
                    "GREYMUS SMS sending failed:",
                    error
                );


                // -------------------------------------------------
                // IMPORTANT:
                // DO NOT mark the message as sent.
                // The button remains available for retry.
                // -------------------------------------------------

                sendButton.disabled =
                    false;

                sendButton.textContent =
                    "💬 Send SMS";


                alert(
                    "SMS could not be sent.\n\n" +
                    (
                        error.message ||
                        "Please try again."
                    )
                );

            }

        }
    );


    textarea?.focus();

}


// =========================================================
// ENABLE REPAYMENT MESSAGE
// =========================================================
//
// Call AFTER a repayment has been successfully saved
// and confirmed.
//
// =========================================================

export function enableRepaymentMessage(
    data = {}
) {

    const client =
        data.client || {};

    const status =
        getMessageStatus();

    const key =
        getMessageStatusKey(
            client,
            data,
            "repayment"
        );

    delete status[key];

    saveMessageStatus(
        status
    );


    window.dispatchEvent(
        new CustomEvent(
            "greymus:repayment-message-enabled",
            {
                detail: data
            }
        )
    );


    window.dispatchEvent(
        new CustomEvent(
            "greymus:messaging-state-changed",
            {
                detail: data
            }
        )
    );


    return true;

}


// =========================================================
// UPDATE MESSAGING AFTER REPAYMENT
// =========================================================
//
// ✔ Enables repayment confirmation
// ✔ Due button disappears when today's due is fully paid
// ✔ Refreshes messaging state
//
// =========================================================

export function updateMessagingAfterRepayment(
    data = {}
) {

    const due =
        Math.max(
            0,
            Number(
                data.due || 0
            )
        );

    const remainingDue =
        Math.max(
            0,
            Number(
                data.remainingDue !== undefined
                    ? data.remainingDue
                    : due -
                      Number(
                          data.paid || 0
                      )
            )
        );


    // Mark that a repayment was successfully made.
    data.repaymentMade =
        true;


    // Enable repayment confirmation.
    enableRepaymentMessage(
        data
    );


    // If today's due has been fully paid,
    // tell the UI to remove the Due button.
    if (
        due > 0 &&
        remainingDue <= 0
    ) {

        window.dispatchEvent(
            new CustomEvent(
                "greymus:due-fully-paid",
                {
                    detail: data
                }
            )
        );

    }


    window.dispatchEvent(
        new CustomEvent(
            "greymus:messaging-state-changed",
            {
                detail: data
            }
        )
    );


    return getMessagingState(
        data
    );

}


// =========================================================
// CLEAR TODAY'S MESSAGE STATUS
// =========================================================
//
// Useful for testing or admin recovery.
//
// =========================================================

export function clearTodayMessageStatus(
    client,
    data = {},
    type
) {

    const status =
        getMessageStatus();

    const key =
        getMessageStatusKey(
            client,
            data,
            type
        );

    delete status[key];

    saveMessageStatus(
        status
    );


    window.dispatchEvent(
        new CustomEvent(
            "greymus:messaging-state-changed",
            {
                detail: data
            }
        )
    );

}


// =========================================================
// GLOBAL DEBUG ACCESS
// =========================================================

window.GREYMUS_MESSAGING = {

    openMessageComposer,

    getMessagingState,

    enableRepaymentMessage,

    updateMessagingAfterRepayment,

    clearTodayMessageStatus

};


// =========================================================
// END OF messaging.js
// VERSION 5.0
// =========================================================