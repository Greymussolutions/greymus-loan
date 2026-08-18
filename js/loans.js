// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 6.0
//
// GREYMUS CLIENT MESSAGING
//
// UI = ENGLISH
// SMS MESSAGE = SWAHILI
//
// IMPORTANT
//
// This file ONLY handles messaging.
// It does NOT load, render, modify, filter,
// or replace the loans table.
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

    if (
        value &&
        typeof value.toDate === "function"
    ) {

        date = value.toDate();

    }

    else if (
        value &&
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        date = new Date(
            value.seconds * 1000
        );

    }

    else if (
        value instanceof Date
    ) {

        date = value;

    }

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
// GET NUMERIC VALUE
// =========================================================

function getNumber(
    ...values
) {

    for (
        const value of values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            Number.isFinite(
                Number(value)
            )
        ) {

            return Number(value);

        }

    }

    return 0;

}


// =========================================================
// CALCULATE REMAINING DUE TODAY
// =========================================================

function getRemainingToday(
    data = {}
) {

    const dueToday =
        getNumber(
            data.dueToday,
            data.due,
            data.installmentDue,
            data.todayDue
        );

    const amountPaid =
        getNumber(
            data.amountPaid,
            data.paid,
            data.paymentAmount
        );

    return Math.max(
        0,
        getNumber(
            data.remainingToday,
            data.remainingDue,
            data.todayRemaining,
            dueToday - amountPaid
        )
    );

}


// =========================================================
// GET ARREARS
// =========================================================

function getArrears(
    data = {}
) {

    return Math.max(
        0,
        getNumber(
            data.arrears,
            data.overdueAmount,
            data.overdue,
            data.arrear
        )
    );

}


// =========================================================
// GET DUE TODAY
// =========================================================

function getDueToday(
    data = {}
) {

    return Math.max(
        0,
        getNumber(
            data.dueToday,
            data.due,
            data.installmentDue,
            data.todayDue
        )
    );

}


// =========================================================
// GET OUTSTANDING BALANCE
// =========================================================

function getOutstanding(
    data = {}
) {

    return Math.max(
        0,
        getNumber(
            data.outstanding,
            data.balance,
            data.remainingBalance,
            data.currentOutstanding,
            data.loanBalance
        )
    );

}


// =========================================================
// DUE TODAY REMINDER
// =========================================================
//
// This is intentionally the LONG reminder.
//
// If client has arrears:
//
// Today's due
// +
// Arrears
// =
// Total amount currently due
//
// =========================================================

function buildDueTodayMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );

    const dueToday =
        getDueToday(
            data
        );

    const arrears =
        getArrears(
            data
        );

    const outstanding =
        getOutstanding(
            data
        );

    const totalPayable =
        getNumber(
            data.totalPayable,
            dueToday + arrears
        );

    // -----------------------------------------------------
    // DUE TODAY + ARREARS
    // -----------------------------------------------------

    if (
        dueToday > 0 &&
        arrears > 0
    ) {

        return (
            `Habari ${name}, ` +
            `kiasi chako cha marejesho cha leo ni ` +
            `${formatKES(dueToday)}. ` +
            `Pia una deni la nyuma la ` +
            `${formatKES(arrears)}. ` +
            `Jumla ya kiasi kinachodaiwa kwa sasa ni ` +
            `${formatKES(totalPayable)}. ` +
            `Salio lako la mkopo ni ` +
            `${formatKES(outstanding)}. ` +
            `Tafadhali fanya malipo yako mapema iwezekanavyo. ` +
            `Asante.` +
            messageSignature()
        );

    }

    // -----------------------------------------------------
    // ARREARS ONLY
    // -----------------------------------------------------

    if (
        arrears > 0 &&
        dueToday <= 0
    ) {

        return (
            `Habari ${name}, ` +
            `una deni la nyuma la ` +
            `${formatKES(arrears)}. ` +
            `Salio lako la mkopo ni ` +
            `${formatKES(outstanding)}. ` +
            `Tafadhali lipa kiasi hiki mapema iwezekanavyo. ` +
            `Asante.` +
            messageSignature()
        );

    }

    // -----------------------------------------------------
    // DUE TODAY ONLY
    // -----------------------------------------------------

    return (
        `Habari ${name}, ` +
        `kiasi chako cha marejesho cha leo ni ` +
        `${formatKES(dueToday)}. ` +
        `Salio lako la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Tafadhali fanya malipo yako mapema iwezekanavyo. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// FULL REPAYMENT MESSAGE
// =========================================================
//
// SHORT MESSAGE.
//
// Tells client:
//
// ✔ Payment received
// ✔ Next repayment date
// ✔ Outstanding balance
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
        getNumber(
            data.amountPaid,
            data.paid,
            data.paymentAmount
        );

    const outstanding =
        getOutstanding(
            data
        );

    const nextDate =
        data.nextRepaymentDate ||
        data.nextDueDate ||
        data.nextPaymentDate ||
        "";

    let message =
        `Habari ${name}, tumepokea malipo yako ya ` +
        `${formatKES(amountPaid)}. ` +
        `Salio lako la mkopo ni ` +
        `${formatKES(outstanding)}. `;

    if (nextDate) {

        const formattedDate =
            formatMessageDate(
                nextDate
            );

        if (formattedDate) {

            message +=
                `Marejesho yako yanayofuata ni ` +
                `tarehe ${formattedDate}. `;

        }

    }

    message +=
        `Asante.`;

    return (
        message +
        messageSignature()
    );

}


// =========================================================
// PARTIAL REPAYMENT MESSAGE
// =========================================================
//
// SHORT MESSAGE.
//
// Tells client:
//
// ✔ Amount paid
// ✔ Remaining amount due today
//
// =========================================================

function buildPartialRepaymentMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );

    const amountPaid =
        getNumber(
            data.amountPaid,
            data.paid,
            data.paymentAmount
        );

    const remainingToday =
        getRemainingToday(
            data
        );

    return (
        `Habari ${name}, tumepokea malipo yako ya ` +
        `${formatKES(amountPaid)}. ` +
        `Kiasi kilichobaki kulipwa leo ni ` +
        `${formatKES(remainingToday)}. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// PARTIAL REPAYMENT + ARREARS
// =========================================================
//
// Used when:
//
// Client pays part of today's due
// AND
// client has arrears.
//
// =========================================================

function buildPartialRepaymentPlusArrearsMessage(
    data = {}
) {

    const name =
        getClientName(
            data.client
        );

    const amountPaid =
        getNumber(
            data.amountPaid,
            data.paid,
            data.paymentAmount
        );

    const remainingToday =
        getRemainingToday(
            data
        );

    const arrears =
        getArrears(
            data
        );

    const outstanding =
        getOutstanding(
            data
        );

    const totalPayable =
        getNumber(
            data.totalPayable,
            remainingToday + arrears
        );

    return (
        `Habari ${name}, tumepokea malipo yako ya ` +
        `${formatKES(amountPaid)}. ` +
        `Kiasi kilichobaki kulipwa leo ni ` +
        `${formatKES(remainingToday)}. ` +
        `Pamoja na deni la nyuma la ` +
        `${formatKES(arrears)}, ` +
        `jumla ya kiasi kinachodaiwa ni ` +
        `${formatKES(totalPayable)}. ` +
        `Salio lako la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Tafadhali endelea na malipo yako. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// ARREARS MESSAGE
// =========================================================

function buildArrearsMessage(
    data = {}
) {

    return buildDueTodayMessage(
        {
            ...data,
            dueToday: 0
        }
    );

}


// =========================================================
// AUTOMATIC REPAYMENT MESSAGE
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

    const amountPaid =
        getNumber(
            data.amountPaid,
            data.paid,
            data.paymentAmount
        );

    const dueToday =
        getDueToday(
            data
        );

    const arrears =
        getArrears(
            data
        );

    const remainingToday =
        getRemainingToday(
            data
        );


    // -----------------------------------------------------
    // PARTIAL + ARREARS
    // -----------------------------------------------------

    if (
        status === "partial-arrears" ||
        status === "partial-with-arrears"
    ) {

        return buildPartialRepaymentPlusArrearsMessage(
            data
        );

    }


    // -----------------------------------------------------
    // PARTIAL
    // -----------------------------------------------------

    if (
        status === "partial"
    ) {

        return buildPartialRepaymentMessage(
            data
        );

    }


    // -----------------------------------------------------
    // FULL
    // -----------------------------------------------------

    if (
        status === "full" ||
        status === "paid"
    ) {

        return buildFullRepaymentMessage(
            data
        );

    }


    // -----------------------------------------------------
    // AUTOMATIC PARTIAL + ARREARS
    // -----------------------------------------------------

    if (
        amountPaid > 0 &&
        remainingToday > 0 &&
        arrears > 0
    ) {

        return buildPartialRepaymentPlusArrearsMessage(
            data
        );

    }


    // -----------------------------------------------------
    // AUTOMATIC PARTIAL
    // -----------------------------------------------------

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

        // -------------------------------------------------
        // DUE TODAY
        // -------------------------------------------------

        case "due":

        case "due-today":

        case "due-today-reminder":

        case "reminder":

            return buildDueTodayMessage(
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
        // DUE + ARREARS
        // -------------------------------------------------

        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

            return buildDueTodayMessage(
                data
            );


        // -------------------------------------------------
        // PARTIAL
        // -------------------------------------------------

        case "partial":

            return buildPartialRepaymentMessage(
                data
            );


        // -------------------------------------------------
        // PARTIAL + ARREARS
        // -------------------------------------------------

        case "partial-arrears":

        case "partial-with-arrears":

            return buildPartialRepaymentPlusArrearsMessage(
                data
            );


        // -------------------------------------------------
        // FULL
        // -------------------------------------------------

        case "full":

        case "paid":

        case "repayment":

            return buildRepaymentMessage(
                data
            );


        default:

            return buildRepaymentMessage(
                data
            );

    }

}


// =========================================================
// NATIVE PHONE SMS
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
// MESSAGE TYPE LABEL
// =========================================================
//
// UI remains ENGLISH.
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

        case "due":

        case "due-today":

        case "due-today-reminder":

        case "reminder":

            return "Due Today Reminder";


        case "arrears":

        case "overdue":

            return "Arrears Reminder";


        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

            return "Due Today + Arrears Reminder";


        case "partial":

            return "Partial Repayment SMS";


        case "partial-arrears":

        case "partial-with-arrears":

            return "Partial Repayment + Arrears SMS";


        case "full":

        case "paid":

        case "repayment":

        default:

            return "Repayment SMS";

    }

}


// =========================================================
// BUILD SUMMARY
// =========================================================
//
// UI = ENGLISH.
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


    // -----------------------------------------------------
    // DUE TODAY / REMINDER
    // -----------------------------------------------------

    if (
        type === "due" ||
        type === "due-today" ||
        type === "due-today-reminder" ||
        type === "reminder" ||
        type === "due-arrears" ||
        type === "due-plus-arrears" ||
        type === "due-today-arrears" ||
        type === "arrears" ||
        type === "overdue"
    ) {

        const due =
            getDueToday(
                data
            );

        const arrears =
            getArrears(
                data
            );

        const total =
            getNumber(
                data.totalPayable,
                due + arrears
            );

        return `

            <div class="greymus-message-summary">

                ${
                    due > 0

                    ? `

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

                    `

                    : ""
                }


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


                ${
                    due > 0 &&
                    arrears > 0

                    ? `

                        <div>

                            <span>
                                Total Payable
                            </span>

                            <strong>
                                ${escapeHtml(
                                    formatKES(total)
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
                                getOutstanding(data)
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // PARTIAL
    // -----------------------------------------------------

    if (
        type === "partial"
    ) {

        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                getNumber(
                                    data.amountPaid,
                                    data.paid,
                                    data.paymentAmount
                                )
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Remaining Due Today
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                getRemainingToday(data)
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
        type === "partial-with-arrears"
    ) {

        return `

            <div class="greymus-message-summary">

                <div>

                    <span>
                        Amount Paid
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                getNumber(
                                    data.amountPaid,
                                    data.paid,
                                    data.paymentAmount
                                )
                            )
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Remaining Due Today
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                getRemainingToday(data)
                            )
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
                                getArrears(data)
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
                                getOutstanding(data)
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

    return `

        <div class="greymus-message-summary">

            <div>

                <span>
                    Amount Paid
                </span>

                <strong>
                    ${escapeHtml(
                        formatKES(
                            getNumber(
                                data.amountPaid,
                                data.paid,
                                data.paymentAmount
                            )
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
                            getOutstanding(data)
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
                            data.nextDueDate ||
                            data.nextPaymentDate
                        )
                    )}
                </strong>

            </div>

        </div>

    `;

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


    // -----------------------------------------------------
    // IMPORTANT
    //
    // If dueToday > 0 AND arrears > 0,
    // buildMessage() automatically creates the
    // combined Due Today + Arrears reminder.
    // -----------------------------------------------------

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

            <div
                class="greymus-message-header"
            >

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
        () => {

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


            openNativeSMS(
                phone,
                finalMessage
            );

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

    buildDueTodayMessage,

    buildLoanApprovedMessage: undefined,

    buildRepaymentMessage,

    buildFullRepaymentMessage,

    buildPartialRepaymentMessage,

    buildArrearsMessage,

    buildDuePlusArrearsMessage:
        buildDueTodayMessage,

    buildPartialRepaymentPlusArrearsMessage,

    openNativeSMS

};


// =========================================================
// END OF messaging.js
// =========================================================