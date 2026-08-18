// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 6.0
//
// GREYMUS CLIENT MESSAGING
// SWAHILI VERSION
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
// Due Today + Arrears are ONE reminder.
// If a client is due today and has arrears,
// the arrears are included in the Due Today reminder.
//
// All client messages are in Swahili.
//
// Every message ends with:
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
        "Mteja"
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
// Short message:
// - Amount received
// - Next repayment date
// - Outstanding balance
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
// Short message:
// - Amount received
// - Remaining amount due today
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
// Short reminder:
// - Today's due
// - Outstanding balance
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
// Used ONLY when:
// Today's due = 0
// AND arrears > 0
//
// Shows:
// - Arrears
// - Outstanding balance
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
// This is ONE reminder.
//
// Shows:
// - Today's due
// - Arrears
// - Total currently due
// - Outstanding balance
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
// PARTIAL REPAYMENT + ARREARS
//
// This remains supported for compatibility,
// but repayment messages remain short.
//
// If a payment is partial and arrears exist,
// the client is told only:
// - Amount received
// - Remaining amount due today
//
// The reminder handles arrears separately.
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


    // -----------------------------------------------------
    // PARTIAL
    // -----------------------------------------------------

    if (
        status === "partial" ||
        status === "partial-arrears" ||
        status === "partial-with-arrears"
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
    // DUE TODAY + ARREARS
    // -----------------------------------------------------

    if (
        dueToday > 0 &&
        arrears > 0
    ) {

        return buildDuePlusArrearsMessage(
            data
        );

    }


    // -----------------------------------------------------
    // DUE TODAY
    // -----------------------------------------------------

    if (
        dueToday > 0
    ) {

        return buildDueTodayMessage(
            data
        );

    }


    // -----------------------------------------------------
    // ARREARS ONLY
    // -----------------------------------------------------

    if (
        arrears > 0
    ) {

        return buildArrearsMessage(
            data
        );

    }


    // -----------------------------------------------------
    // PAYMENT FALLBACK
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

        case "approved":

        case "loan-approved":

            return buildLoanApprovedMessage(
                data
            );


        case "due":

        case "due-today":

            if (
                Number(
                    data.arrears ||
                    data.overdueAmount ||
                    data.overdue ||
                    0
                ) > 0
            ) {

                return buildDuePlusArrearsMessage(
                    data
                );

            }

            return buildDueTodayMessage(
                data
            );


        case "arrears":

        case "overdue":

            // If the client is also due today,
            // combine arrears with today's reminder.

            if (
                Number(
                    data.dueToday ||
                    data.due ||
                    data.installmentDue ||
                    0
                ) > 0
            ) {

                return buildDuePlusArrearsMessage(
                    data
                );

            }

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
//
// Opens the phone's native SMS application.
//
// No Africa's Talking.
// No Cloudflare.
// No API.
// No API key.
//
// The user presses SEND in the phone's SMS application.
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

            return "SMS ya Uidhinishaji wa Mkopo";


        case "due":

        case "due-today":

            if (
                Number(
                    data.arrears ||
                    data.overdueAmount ||
                    data.overdue ||
                    0
                ) > 0
            ) {

                return "SMS ya Malipo ya Leo + Deni la Nyuma";

            }

            return "SMS ya Kumbusho la Malipo ya Leo";


        case "arrears":

        case "overdue":

            if (
                Number(
                    data.dueToday ||
                    data.due ||
                    data.installmentDue ||
                    0
                ) > 0
            ) {

                return "SMS ya Malipo ya Leo + Deni la Nyuma";

            }

            return "SMS ya Deni la Nyuma";


        case "due-arrears":

        case "due-plus-arrears":

        case "due-today-arrears":

            return "SMS ya Malipo ya Leo + Deni la Nyuma";


        case "partial":

        case "partial-arrears":

        case "partial-with-arrears":

            return "SMS ya Malipo Sehemu";


        case "full":

        case "paid":

            return "SMS ya Malipo Kamili";


        default:

            return "SMS ya Malipo";

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
                        Kiasi Kilichoidhinishwa
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
                        Malipo ya Kila Wiki
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
                        Tarehe ya Kwanza ya Malipo
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
                        Salio la Mkopo
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


    // -----------------------------------------------------
    // DUE TODAY
    // -----------------------------------------------------

    if (
        type === "due" ||
        type === "due-today"
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
                data.overdueAmount ||
                data.overdue ||
                0
            );


        if (arrears > 0) {

            return `

                <div class="greymus-message-summary">

                    <div>
                        <span>
                            Malipo ya Leo
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatKES(due)
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Deni la Nyuma
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatKES(arrears)
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Jumla Inayodaiwa
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
                            Salio la Mkopo
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


        return `

            <div class="greymus-message-summary">

                <div>
                    <span>
                        Malipo ya Leo
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(due)
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Salio la Mkopo
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

        const due =
            Number(
                data.dueToday ||
                data.due ||
                0
            );

        const arrears =
            Number(
                data.arrears ||
                data.overdueAmount ||
                data.overdue ||
                0
            );


        if (due > 0) {

            return `

                <div class="greymus-message-summary">

                    <div>
                        <span>
                            Malipo ya Leo
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatKES(due)
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Deni la Nyuma
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatKES(arrears)
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Jumla Inayodaiwa
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
                            Salio la Mkopo
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


        return `

            <div class="greymus-message-summary">

                <div>
                    <span>
                        Deni la Nyuma
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(arrears)
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Salio la Mkopo
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
    // DUE + ARREARS
    // -----------------------------------------------------

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
                        Malipo ya Leo
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(due)
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Deni la Nyuma
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(arrears)
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Jumla Inayodaiwa
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
                        Salio la Mkopo
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
    // PARTIAL
    // -----------------------------------------------------

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


        return `

            <div class="greymus-message-summary">

                <div>
                    <span>
                        Kiasi Kilicholipwa
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(paid)
                        )}
                    </strong>
                </div>


                <div>
                    <span>
                        Kilichobaki Leo
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


    // -----------------------------------------------------
    // FULL REPAYMENT
    // -----------------------------------------------------

    return `

        <div class="greymus-message-summary">

            <div>

                <span>
                    Kiasi Kilicholipwa
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
                    Malipo Yanayofuata
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
                    Salio la Mkopo
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
                        Tuma Ujumbe
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
                        Mteja
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
                        Nambari ya Simu
                    </label>


                    <div
                        class="greymus-message-readonly"
                    >

                        ${escapeHtml(
                            phone ||
                            "Hakuna nambari ya simu iliyosajiliwa"
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
                        Ujumbe
                    </label>


                    <textarea
                        id="greymus-message-text"
                        maxlength="500"
                    >${escapeHtml(message)}</textarea>


                    <div
                        class="greymus-message-counter"
                    >

                        <span>
                            Unaweza kuhariri kabla ya kutuma
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

                            Mteja huyu hana nambari
                            halali ya simu.

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
                    Ghairi
                </button>


                <button
                    type="button"
                    class="greymus-message-send"
                    id="greymus-message-send"
                    ${phone ? "" : "disabled"}
                >
                    💬 Tuma SMS
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
                    "Mteja huyu hana nambari halali ya simu."
                );

                return;

            }


            if (!finalMessage) {

                alert(
                    "Tafadhali andika ujumbe kabla ya kutuma."
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
// END OF messaging.js VERSION 6.0
// =========================================================