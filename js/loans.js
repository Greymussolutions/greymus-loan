// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 6.1
//
// GREYMUS CLIENT MESSAGING
//
// INTERFACE:
// ✔ English
//
// CLIENT SMS:
// ✔ Swahili
//
// MESSAGE RULES
//
// 1. DUE TODAY
//    - Today's due
//    - Outstanding loan balance
//
// 2. DUE TODAY + ARREARS
//    - Today's due
//    - Arrears
//    - Total currently due
//    - Outstanding loan balance
//
// 3. ARREARS ONLY
//    - Arrears
//    - Outstanding loan balance
//
// 4. FULL REPAYMENT
//    - Amount received
//    - Next repayment date
//    - Outstanding loan balance
//
// 5. PARTIAL REPAYMENT
//    - Amount received
//    - Remaining amount due today
//
// 6. LOAN APPROVED
//    - Approved amount
//    - Weekly repayment
//    - First repayment date
//    - Outstanding loan balance
//
// IMPORTANT
//
// If a client is due today AND has arrears,
// the arrears are included in the SAME Due Today reminder.
//
// The message type is determined from the actual
// financial values, not only from data.type.
//
// Every SMS ends with:
//
// Kwa heshima,
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

Kwa heshima,
GREYMUS.`;

}


// =========================================================
// LOAN APPROVED MESSAGE
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
        `Habari ${name}, mkopo wako wa GREYMUS umeidhinishwa. `;

    if (amount > 0) {

        message +=
            `Kiasi cha mkopo kilichoidhinishwa ni ` +
            `${formatKES(amount)}. `;

    }

    if (weeklyPayment > 0) {

        message +=
            `Malipo yako ya kila wiki ni ` +
            `${formatKES(weeklyPayment)}. `;

    }

    if (startDate) {

        const formattedDate =
            formatMessageDate(
                startDate
            );

        if (formattedDate) {

            message +=
                `Malipo yako ya kwanza ni tarehe ` +
                `${formattedDate}. `;

        }

    }

    if (outstanding > 0) {

        message +=
            `Salio lako la mkopo ni ` +
            `${formatKES(outstanding)}. `;

    }

    return (
        message +
        messageSignature()
    );

}


// =========================================================
// FULL REPAYMENT MESSAGE
//
// SHORT:
//
// ✔ Amount received
// ✔ Next repayment date
// ✔ Outstanding balance
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

    let message =
        `Habari ${name}, tumepokea malipo yako ya ` +
        `${formatKES(amountPaid)}. ` +
        `Malipo yako ya leo yamekamilika. `;

    if (nextDate) {

        const formattedDate =
            formatMessageDate(
                nextDate
            );

        if (formattedDate) {

            message +=
                `Malipo yako yanayofuata ni tarehe ` +
                `${formattedDate}. `;

        }

    }

    message +=
        `Salio lako la mkopo ni ` +
        `${formatKES(outstanding)}.`;

    return (
        message +
        messageSignature()
    );

}


// =========================================================
// PARTIAL REPAYMENT MESSAGE
//
// SHORT:
//
// ✔ Amount received
// ✔ Remaining amount due today
// =========================================================

function buildPartialRepaymentMessage(
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

    const dueToday =
        Number(
            data.dueToday ||
            data.due ||
            data.installmentDue ||
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

    return (
        `Habari ${name}, tumepokea malipo yako ya ` +
        `${formatKES(amountPaid)}. ` +
        `Kiasi kilichobaki cha malipo ya leo ni ` +
        `${formatKES(remainingToday)}.` +
        messageSignature()
    );

}


// =========================================================
// DUE TODAY MESSAGE
//
// REMINDER:
//
// ✔ Today's due
// ✔ Outstanding loan balance
// =========================================================

function buildDueTodayMessage(
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

    const outstanding =
        Number(
            data.outstanding ||
            data.balance ||
            data.remainingBalance ||
            0
        );

    return (
        `Habari ${name}, malipo yako ya GREYMUS ya ` +
        `${formatKES(dueToday)} yanapaswa kulipwa leo. ` +
        `Salio lako la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Tafadhali fanya malipo yako kwa wakati.` +
        messageSignature()
    );

}


// =========================================================
// ARREARS ONLY MESSAGE
//
// USED ONLY WHEN:
// Today's due = 0
// AND arrears > 0
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
        `Habari ${name}, una deni la nyuma la GREYMUS la ` +
        `${formatKES(arrears)}. ` +
        `Salio lako la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Tafadhali lipa deni hili haraka iwezekanavyo.` +
        messageSignature()
    );

}


// =========================================================
// DUE TODAY + ARREARS MESSAGE
//
// ONE COMBINED REMINDER:
//
// ✔ Today's due
// ✔ Arrears
// ✔ Total currently due
// ✔ Outstanding loan balance
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
        `Habari ${name}, malipo yako ya GREYMUS ya ` +
        `${formatKES(dueToday)} yanapaswa kulipwa leo. ` +
        `Una pia deni la nyuma la ` +
        `${formatKES(arrears)}. ` +
        `Jumla ya kiasi kinachodaiwa kwa sasa ni ` +
        `${formatKES(totalPayable)}. ` +
        `Salio lako la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Tafadhali fanya malipo yako haraka iwezekanavyo.` +
        messageSignature()
    );

}


// =========================================================
// PARTIAL + ARREARS
//
// REPAYMENT MESSAGE REMAINS SHORT.
//
// The arrears are handled by the reminder.
// =========================================================

function buildPartialRepaymentPlusArrearsMessage(
    data = {}
) {

    return buildPartialRepaymentMessage(
        data
    );

}


// =========================================================
// AUTOMATIC REPAYMENT MESSAGE
//
// PRIORITY:
//
// 1. Due Today + Arrears
// 2. Due Today
// 3. Partial Repayment
// 4. Full Repayment
// 5. Arrears Only
// =========================================================

function buildRepaymentMessage(
    data = {}
) {

    const dueToday =
        Number(
            data.dueToday ??
            data.due ??
            data.installmentDue ??
            0
        );

    const arrears =
        Number(
            data.arrears ??
            data.overdueAmount ??
            data.overdue ??
            0
        );

    const amountPaid =
        Number(
            data.amountPaid ??
            data.paid ??
            data.paymentAmount ??
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


    // -----------------------------------------------------
    // DUE TODAY + ARREARS
    // -----------------------------------------------------

    if (
        dueToday > 0 &&
        arrears > 0 &&
        amountPaid <= 0
    ) {

        return buildDuePlusArrearsMessage({

            ...data,

            dueToday,

            arrears,

            totalPayable:
                Number(
                    data.totalPayable ??
                    (dueToday + arrears)
                )

        });

    }


    // -----------------------------------------------------
    // DUE TODAY
    // -----------------------------------------------------

    if (
        dueToday > 0 &&
        arrears <= 0 &&
        amountPaid <= 0
    ) {

        return buildDueTodayMessage({

            ...data,

            dueToday

        });

    }


    // -----------------------------------------------------
    // PARTIAL REPAYMENT
    // -----------------------------------------------------

    if (
        amountPaid > 0 &&
        remainingToday > 0
    ) {

        return buildPartialRepaymentMessage({

            ...data,

            dueToday,

            amountPaid,

            remainingToday

        });

    }


    // -----------------------------------------------------
    // FULL REPAYMENT
    // -----------------------------------------------------

    if (
        amountPaid > 0 &&
        remainingToday <= 0
    ) {

        return buildFullRepaymentMessage({

            ...data,

            amountPaid

        });

    }


    // -----------------------------------------------------
    // ARREARS ONLY
    // -----------------------------------------------------

    if (
        dueToday <= 0 &&
        arrears > 0
    ) {

        return buildArrearsMessage({

            ...data,

            arrears

        });

    }


    // -----------------------------------------------------
    // FALLBACK
    // -----------------------------------------------------

    return buildDueTodayMessage(
        data
    );

}


// =========================================================
// BUILD MESSAGE
//
// IMPORTANT:
//
// The actual financial values have priority over
// data.type.
//
// Therefore:
//
// dueToday > 0 + arrears > 0
//
// ALWAYS becomes:
//
// DUE TODAY + ARREARS
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


    const dueToday =
        Number(
            data.dueToday ??
            data.due ??
            data.installmentDue ??
            0
        );

    const arrears =
        Number(
            data.arrears ??
            data.overdueAmount ??
            data.overdue ??
            0
        );

    const amountPaid =
        Number(
            data.amountPaid ??
            data.paid ??
            data.paymentAmount ??
            0
        );


    // =====================================================
    // APPROVED
    // =====================================================

    if (
        type === "approved" ||
        type === "loan-approved"
    ) {

        return buildLoanApprovedMessage(
            data
        );

    }


    // =====================================================
    // PAYMENT
    // =====================================================

    if (
        amountPaid > 0
    ) {

        return buildRepaymentMessage({

            ...data,

            dueToday,

            arrears,

            amountPaid

        });

    }


    // =====================================================
    // DUE TODAY + ARREARS
    // =====================================================

    if (
        dueToday > 0 &&
        arrears > 0
    ) {

        return buildDuePlusArrearsMessage({

            ...data,

            dueToday,

            arrears,

            totalPayable:
                Number(
                    data.totalPayable ??
                    (dueToday + arrears)
                )

        });

    }


    // =====================================================
    // DUE TODAY
    // =====================================================

    if (
        dueToday > 0
    ) {

        return buildDueTodayMessage({

            ...data,

            dueToday

        });

    }


    // =====================================================
    // ARREARS ONLY
    // =====================================================

    if (
        arrears > 0
    ) {

        return buildArrearsMessage({

            ...data,

            arrears

        });

    }


    // =====================================================
    // EXPLICIT TYPE FALLBACK
    // =====================================================

    switch (type) {

        case "approved":

        case "loan-approved":

            return buildLoanApprovedMessage(
                data
            );


        case "due":

        case "due-today":

            return buildDueTodayMessage(
                data
            );


        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

            return buildDuePlusArrearsMessage(
                data
            );


        case "arrears":

        case "overdue":

            return buildArrearsMessage(
                data
            );


        case "partial":

        case "partial-arrears":

        case "partial-with-arrears":

            return buildPartialRepaymentMessage(
                data
            );


        case "full":

        case "paid":

            return buildFullRepaymentMessage(
                data
            );


        case "repayment":

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
//
// UI = ENGLISH
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


    const dueToday =
        Number(
            data.dueToday ??
            data.due ??
            data.installmentDue ??
            0
        );


    const arrears =
        Number(
            data.arrears ??
            data.overdueAmount ??
            data.overdue ??
            0
        );


    if (
        dueToday > 0 &&
        arrears > 0
    ) {

        return "Due Today + Arrears SMS";

    }


    if (
        dueToday > 0
    ) {

        return "Due Today SMS";

    }


    if (
        arrears > 0
    ) {

        return "Arrears SMS";

    }


    switch (type) {

        case "approved":

        case "loan-approved":

            return "Loan Approved SMS";


        case "partial":

        case "partial-arrears":

        case "partial-with-arrears":

            return "Partial Repayment SMS";


        case "full":

        case "paid":

            return "Full Repayment SMS";


        default:

            return "Repayment SMS";

    }

}


// =========================================================
// BUILD SUMMARY
//
// UI = ENGLISH
// SMS = SWAHILI
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


    const due =
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


    const paid =
        Number(
            data.amountPaid ||
            data.paid ||
            data.paymentAmount ||
            0
        );


    // =====================================================
    // APPROVED
    // =====================================================

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
                        First Repayment Date
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


                <div>

                    <span>
                        Outstanding Balance
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

            </div>

        `;

    }


    // =====================================================
    // DUE TODAY + ARREARS
    // =====================================================

    if (
        due > 0 &&
        arrears > 0
    ) {

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
                        Total Currently Due
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
                                data.outstanding ||
                                data.balance ||
                                data.remainingBalance
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // =====================================================
    // DUE TODAY
    // =====================================================

    if (
        due > 0
    ) {

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
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding ||
                                data.balance ||
                                data.remainingBalance
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // =====================================================
    // ARREARS ONLY
    // =====================================================

    if (
        arrears > 0
    ) {

        return `

            <div class="greymus-message-summary">

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
                        Outstanding Balance
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.outstanding ||
                                data.balance ||
                                data.remainingBalance
                            )
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // =====================================================
    // PARTIAL REPAYMENT
    // =====================================================

    if (
        type === "partial" ||
        type === "partial-arrears" ||
        type === "partial-with-arrears" ||
        (
            paid > 0 &&
            Number(
                data.remainingToday ??
                data.remainingDue ??
                (due - paid)
            ) > 0
        )
    ) {

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
                        Remaining Due Today
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(remaining)
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // =====================================================
    // FULL REPAYMENT
    // =====================================================

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
                            data.paid ||
                            data.paymentAmount
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


            <div>

                <span>
                    Outstanding Balance
                </span>

                <strong>
                    ${escapeHtml(
                        formatKES(
                            data.outstanding ||
                            data.balance ||
                            data.remainingBalance
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
                    aria-label="Close"
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
    // SEND USING PHONE SMS
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

    buildLoanApprovedMessage,

    buildRepaymentMessage,

    buildFullRepaymentMessage,

    buildPartialRepaymentMessage,

    buildDueTodayMessage,

    buildArrearsMessage,

    buildDuePlusArrearsMessage,

    buildPartialRepaymentPlusArrearsMessage,

    openNativeSMS

};


// =========================================================
// END OF messaging.js VERSION 6.1
// =========================================================