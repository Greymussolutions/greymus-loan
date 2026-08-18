// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// SWAHILI CLIENT MESSAGING LOGIC
//
// MESSAGE RULE
//
// 1. Due today + arrears
// 2. Due today without arrears
// 3. Repayment received
// 4. Repayment fully clears today's amount
// 5. Arrears only
//
// Payment messages are intentionally short.
// The system simply confirms the amount received and
// shows the remaining balance for today.
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
// CLIENT NAME
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
// SIGNATURE
// =========================================================

function messageSignature() {

    return `

Kwa heshima,
GREYMUS.`;

}


// =========================================================
// NORMAL DUE TODAY
// =========================================================

function buildDueMessage(data = {}) {

    const name =
        getClientName(data.client);

    const due =
        Math.max(
            0,
            Number(data.due || 0)
        );

    const arrears =
        Math.max(
            0,
            Number(data.arrears || 0)
        );

    const outstanding =
        Math.max(
            0,
            Number(data.outstanding || 0)
        );


    // =====================================================
    // DUE TODAY + ARREARS
    // =====================================================

    if (arrears > 0) {

        const totalDue =
            due + arrears;


        return (
            `Habari ${name}, malipo yako ya GREYMUS ya ` +
            `${formatKES(due)} yanapaswa kulipwa leo. ` +
            `Pia una deni la nyuma la ${formatKES(arrears)}. ` +
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
        Math.max(
            0,
            Number(data.arrears || 0)
        );

    const outstanding =
        Math.max(
            0,
            Number(data.outstanding || 0)
        );


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
// REPAYMENT RECEIVED
// =========================================================
//
// Example:
//
// Received: KES 500
// Previous total due: KES 1,500
// Remaining: KES 1,000
//
// Message:
//
// Habari John, tumepokea malipo yako ya GREYMUS
// ya KES 500. Salio lako la malipo ya leo ni
// KES 1,000. Asante.
//
// =========================================================

function buildRepaymentReceivedMessage(data = {}) {

    const name =
        getClientName(data.client);

    const paid =
        Math.max(
            0,
            Number(data.paid || 0)
        );

    const previousTotalDue =
        Math.max(
            0,
            Number(
                data.previousTotalDue || 0
            )
        );


    const remaining =
        Math.max(
            0,
            previousTotalDue - paid
        );


    // =====================================================
    // FULLY PAID
    // =====================================================

    if (remaining === 0) {

        return (
            `Habari ${name}, tumepokea malipo yako ya ` +
            `GREYMUS ya ${formatKES(paid)}. ` +
            `Malipo yako ya leo yamelipwa kikamilifu. ` +
            `Asante.` +
            messageSignature()
        );

    }


    // =====================================================
    // PAYMENT RECEIVED + BALANCE REMAINS
    // =====================================================

    return (
        `Habari ${name}, tumepokea malipo yako ya ` +
        `GREYMUS ya ${formatKES(paid)}. ` +
        `Salio lako la malipo ya leo ni ` +
        `${formatKES(remaining)}. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// SHORT REPAYMENT MESSAGE
// =========================================================
//
// This function is useful when the application already
// calculated the remaining balance.
//
// Example:
//
// buildPaymentConfirmation({
//     client,
//     paid: 500,
//     remainingToday: 1000
// });
//
// =========================================================

function buildPaymentConfirmation(data = {}) {

    const name =
        getClientName(data.client);

    const paid =
        Math.max(
            0,
            Number(data.paid || 0)
        );

    const remainingToday =
        Math.max(
            0,
            Number(
                data.remainingToday || 0
            )
        );


    if (remainingToday === 0) {

        return (
            `Habari ${name}, tumepokea malipo yako ya ` +
            `GREYMUS ya ${formatKES(paid)}. ` +
            `Malipo yako ya leo yamelipwa kikamilifu. ` +
            `Asante.` +
            messageSignature()
        );

    }


    return (
        `Habari ${name}, tumepokea malipo yako ya ` +
        `GREYMUS ya ${formatKES(paid)}. ` +
        `Salio lako la malipo ya leo ni ` +
        `${formatKES(remainingToday)}. ` +
        `Asante.` +
        messageSignature()
    );

}


// =========================================================
// MESSAGE BUILDER
// =========================================================

function buildMessage(data = {}) {

    const type =
        data.type || "due";


    switch (type) {

        case "repayment":

            return buildRepaymentReceivedMessage(
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
// GLOBAL DEBUG ACCESS
// =========================================================

window.GREYMUS_MESSAGING = {

    buildDueMessage,
    buildArrearsMessage,
    buildRepaymentReceivedMessage,
    buildPaymentConfirmation,
    buildMessage

};