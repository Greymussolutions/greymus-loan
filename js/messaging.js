// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// MESSAGING.JS
// SWAHILI CLIENT MESSAGING
//
// GREYMUS APP COMPATIBLE VERSION
// =========================================================
//
// MESSAGE TYPES
//
// 1. Due today
// 2. Due today + arrears
// 3. Arrears only
// 4. Repayment received
// 5. Repayment fully clears today's amount
//
// IMPORTANT
//
// Every client message:
// - Includes current outstanding loan balance
// - Ends with "Kwa heshima, GREYMUS."
// - Uses current GREYMUS loan data
// =========================================================


// =========================================================
// FORMAT KES
// =========================================================

function formatKES(value) {

    const amount = Number(value || 0);

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    ).format(
        Number.isFinite(amount) ? amount : 0
    );

}


// =========================================================
// SAFE NUMBER
// =========================================================

function messagingNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? Math.max(0, number)
        : 0;

}


// =========================================================
// CLIENT NAME
// =========================================================

function getClientName(client = {}) {

    return (
        client.name ||
        client.clientName ||
        client.fullName ||
        client.full_name ||
        "Mteja"
    );

}


// =========================================================
// CLIENT PHONE
// =========================================================

function getClientPhone(client = {}) {

    return (
        client.phone ||
        client.phoneNumber ||
        client.mobile ||
        client.mobileNumber ||
        client.telephone ||
        ""
    );

}


// =========================================================
// OUTSTANDING BALANCE
// =========================================================
//
// GREYMUS records may use different field names.
// This helper checks the common fields safely.
//
// Priority:
// 1. Explicit outstanding
// 2. balance
// 3. loan balance
// 4. outstandingBalance
// =========================================================

function getOutstandingBalance(data = {}) {

    if (
        data.outstanding !== undefined &&
        data.outstanding !== null
    ) {

        return messagingNumber(
            data.outstanding
        );

    }


    if (
        data.outstandingBalance !== undefined &&
        data.outstandingBalance !== null
    ) {

        return messagingNumber(
            data.outstandingBalance
        );

    }


    if (
        data.loan?.outstanding !== undefined &&
        data.loan?.outstanding !== null
    ) {

        return messagingNumber(
            data.loan.outstanding
        );

    }


    if (
        data.loan?.outstandingBalance !== undefined &&
        data.loan?.outstandingBalance !== null
    ) {

        return messagingNumber(
            data.loan.outstandingBalance
        );

    }


    if (
        data.balance !== undefined &&
        data.balance !== null
    ) {

        return messagingNumber(
            data.balance
        );

    }


    if (
        data.loan?.balance !== undefined &&
        data.loan?.balance !== null
    ) {

        return messagingNumber(
            data.loan.balance
        );

    }


    return 0;

}


// =========================================================
// SIGNATURE
// =========================================================

function messageSignature() {

    return (
        "\n\n" +
        "Kwa heshima,\n" +
        "GREYMUS."
    );

}


// =========================================================
// DUE TODAY MESSAGE
// =========================================================

function buildDueMessage(data = {}) {

    const name =
        getClientName(data.client);

    const due =
        messagingNumber(
            data.due ??
            data.dueToday ??
            data.weeklyPayment ??
            data.repaymentDue
        );

    const arrears =
        messagingNumber(
            data.arrears
        );

    const outstanding =
        getOutstandingBalance(data);


    // =====================================================
    // DUE TODAY + ARREARS
    // =====================================================

    if (arrears > 0) {

        const totalDue =
            due + arrears;


        return (
            `Habari ${name}, malipo yako ya GREYMUS ya ` +
            `${formatKES(due)} yanapaswa kulipwa leo. ` +
            `Pia una deni la nyuma la ` +
            `${formatKES(arrears)}. ` +
            `Jumla ya malipo yanayohitajika ni ` +
            `${formatKES(totalDue)}. ` +
            `Salio lako la sasa la mkopo ni ` +
            `${formatKES(outstanding)}. ` +
            `Tafadhali fanya malipo yako haraka iwezekanavyo. ` +
            `Asante.` +
            messageSignature()
        );

    }


    // =====================================================
    // DUE TODAY WITHOUT ARREARS
    // =====================================================

    return (
        `Habari ${name}, malipo yako ya GREYMUS ya ` +
        `${formatKES(due)} yanapaswa kulipwa leo. ` +
        `Salio lako la sasa la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Tafadhali fanya malipo yako kwa wakati. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// ARREARS ONLY
// =========================================================

function buildArrearsMessage(data = {}) {

    const name =
        getClientName(data.client);

    const arrears =
        messagingNumber(
            data.arrears
        );

    const outstanding =
        getOutstandingBalance(data);


    return (
        `Habari ${name}, una deni la nyuma la GREYMUS ` +
        `la ${formatKES(arrears)}. ` +
        `Salio lako la sasa la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Tafadhali lipa deni lako haraka iwezekanavyo. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// REPAYMENT RECEIVED MESSAGE
// =========================================================

function buildRepaymentReceivedMessage(data = {}) {

    const name =
        getClientName(data.client);

    const paid =
        messagingNumber(
            data.paid ??
            data.amount ??
            data.repaymentAmount
        );

    const previousTotalDue =
        messagingNumber(
            data.previousTotalDue ??
            data.totalDue ??
            data.dueToday ??
            data.due
        );

    const remaining =
        Math.max(
            0,
            previousTotalDue - paid
        );

    const outstanding =
        getOutstandingBalance(data);


    // =====================================================
    // PAYMENT FULLY CLEARS TODAY'S AMOUNT
    // =====================================================

    if (remaining === 0) {

        return (
            `Habari ${name}, tumepokea malipo yako ya ` +
            `GREYMUS ya ${formatKES(paid)}. ` +
            `Malipo yako ya leo yamelipwa kikamilifu. ` +
            `Salio lako la sasa la mkopo ni ` +
            `${formatKES(outstanding)}. ` +
            `Asante.` +
            messageSignature()
        );

    }


    // =====================================================
    // PARTIAL PAYMENT
    // =====================================================

    return (
        `Habari ${name}, tumepokea malipo yako ya ` +
        `GREYMUS ya ${formatKES(paid)}. ` +
        `Salio lako la malipo ya leo ni ` +
        `${formatKES(remaining)}. ` +
        `Salio lako la sasa la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// PAYMENT CONFIRMATION
// =========================================================
//
// Used when the repayment code has already calculated
// remainingToday.
//
// =========================================================

function buildPaymentConfirmation(data = {}) {

    const name =
        getClientName(data.client);

    const paid =
        messagingNumber(
            data.paid ??
            data.amount ??
            data.repaymentAmount
        );

    const remainingToday =
        messagingNumber(
            data.remainingToday ??
            data.remaining ??
            data.dueRemaining
        );

    const outstanding =
        getOutstandingBalance(data);


    // =====================================================
    // FULL PAYMENT
    // =====================================================

    if (remainingToday === 0) {

        return (
            `Habari ${name}, tumepokea malipo yako ya ` +
            `GREYMUS ya ${formatKES(paid)}. ` +
            `Malipo yako ya leo yamelipwa kikamilifu. ` +
            `Salio lako la sasa la mkopo ni ` +
            `${formatKES(outstanding)}. ` +
            `Asante.` +
            messageSignature()
        );

    }


    // =====================================================
    // PARTIAL PAYMENT
    // =====================================================

    return (
        `Habari ${name}, tumepokea malipo yako ya ` +
        `GREYMUS ya ${formatKES(paid)}. ` +
        `Salio lako la malipo ya leo ni ` +
        `${formatKES(remainingToday)}. ` +
        `Salio lako la sasa la mkopo ni ` +
        `${formatKES(outstanding)}. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// MAIN MESSAGE BUILDER
// =========================================================

function buildMessage(data = {}) {

    const type =
        String(
            data.type || "due"
        ).toLowerCase();


    switch (type) {

        case "repayment":

            return buildRepaymentReceivedMessage(
                data
            );


        case "payment":

            return buildPaymentConfirmation(
                data
            );


        case "arrears":

            return buildArrearsMessage(
                data
            );


        case "due":

        default:

            return buildDueMessage(
                data
            );

    }

}


// =========================================================
// MESSAGE PHONE + TEXT HELPER
// =========================================================
//
// Useful for the HTML messaging button.
//
// Example:
//
// const message =
//     GREYMUS_MESSAGING.createClientMessage({
//         client,
//         type: "due",
//         due: 500,
//         arrears: 0,
//         outstanding: 4500
//     });
//
// =========================================================

function createClientMessage(data = {}) {

    return {

        phone:
            getClientPhone(
                data.client
            ),

        name:
            getClientName(
                data.client
            ),

        message:
            buildMessage(
                data
            )

    };

}


// =========================================================
// GLOBAL GREYMUS MESSAGING API
// =========================================================

window.GREYMUS_MESSAGING = {

    formatKES,

    getClientName,

    getClientPhone,

    getOutstandingBalance,

    buildDueMessage,

    buildArrearsMessage,

    buildRepaymentReceivedMessage,

    buildPaymentConfirmation,

    buildMessage,

    createClientMessage

};


// =========================================================
// READY
// =========================================================

console.log(
    "GREYMUS Messaging loaded successfully."
);