// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// MESSAGING.JS
// SWAHILI CLIENT MESSAGING
//
// SAFE GREYMUS VERSION
// =========================================================


// =========================================================
// FORMAT KES
// =========================================================

function greymusFormatKES(value) {

    var amount = Number(value);

    if (!isFinite(amount)) {
        amount = 0;
    }

    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);

}


// =========================================================
// SAFE NUMBER
// =========================================================

function greymusNumber(value) {

    var number = Number(value);

    if (!isFinite(number) || number < 0) {
        return 0;
    }

    return number;

}


// =========================================================
// CLIENT NAME
// =========================================================

function greymusClientName(client) {

    client = client || {};

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

function greymusClientPhone(client) {

    client = client || {};

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

function greymusOutstanding(data) {

    data = data || {};

    var loan = data.loan || {};

    if (
        data.outstanding !== undefined &&
        data.outstanding !== null
    ) {
        return greymusNumber(data.outstanding);
    }

    if (
        data.outstandingBalance !== undefined &&
        data.outstandingBalance !== null
    ) {
        return greymusNumber(data.outstandingBalance);
    }

    if (
        loan.outstanding !== undefined &&
        loan.outstanding !== null
    ) {
        return greymusNumber(loan.outstanding);
    }

    if (
        loan.outstandingBalance !== undefined &&
        loan.outstandingBalance !== null
    ) {
        return greymusNumber(loan.outstandingBalance);
    }

    if (
        data.balance !== undefined &&
        data.balance !== null
    ) {
        return greymusNumber(data.balance);
    }

    if (
        loan.balance !== undefined &&
        loan.balance !== null
    ) {
        return greymusNumber(loan.balance);
    }

    return 0;

}


// =========================================================
// SIGNATURE
// =========================================================

function greymusSignature() {

    return (
        "\n\n" +
        "Kwa heshima,\n" +
        "GREYMUS."
    );

}


// =========================================================
// DUE TODAY
// =========================================================

function greymusDueMessage(data) {

    data = data || {};

    var client =
        data.client || {};

    var name =
        greymusClientName(client);

    var due =
        data.due;

    if (due === undefined) {
        due = data.dueToday;
    }

    if (due === undefined) {
        due = data.weeklyPayment;
    }

    if (due === undefined) {
        due = data.repaymentDue;
    }

    due =
        greymusNumber(due);

    var arrears =
        greymusNumber(
            data.arrears
        );

    var outstanding =
        greymusOutstanding(data);


    // -----------------------------------------------------
    // DUE TODAY + ARREARS
    // -----------------------------------------------------

    if (arrears > 0) {

        var totalDue =
            due + arrears;

        return (
            "Habari " +
            name +
            ", malipo yako ya GREYMUS ya " +
            greymusFormatKES(due) +
            " yanapaswa kulipwa leo. " +

            "Pia una deni la nyuma la " +
            greymusFormatKES(arrears) +
            ". " +

            "Jumla ya malipo yanayohitajika ni " +
            greymusFormatKES(totalDue) +
            ". " +

            "Salio lako la sasa la mkopo ni " +
            greymusFormatKES(outstanding) +
            ". " +

            "Tafadhali fanya malipo yako haraka iwezekanavyo. " +
            "Asante." +

            greymusSignature()
        );
    }


    // -----------------------------------------------------
    // DUE TODAY WITHOUT ARREARS
    // -----------------------------------------------------

    return (
        "Habari " +
        name +
        ", malipo yako ya GREYMUS ya " +
        greymusFormatKES(due) +
        " yanapaswa kulipwa leo. " +

        "Salio lako la sasa la mkopo ni " +
        greymusFormatKES(outstanding) +
        ". " +

        "Tafadhali fanya malipo yako kwa wakati. " +
        "Asante." +

        greymusSignature()
    );

}


// =========================================================
// ARREARS ONLY
// =========================================================

function greymusArrearsMessage(data) {

    data = data || {};

    var name =
        greymusClientName(
            data.client
        );

    var arrears =
        greymusNumber(
            data.arrears
        );

    var outstanding =
        greymusOutstanding(data);


    return (
        "Habari " +
        name +
        ", una deni la nyuma la GREYMUS la " +
        greymusFormatKES(arrears) +
        ". " +

        "Salio lako la sasa la mkopo ni " +
        greymusFormatKES(outstanding) +
        ". " +

        "Tafadhali lipa deni lako haraka iwezekanavyo. " +
        "Asante." +

        greymusSignature()
    );

}


// =========================================================
// REPAYMENT RECEIVED
// =========================================================

function greymusRepaymentMessage(data) {

    data = data || {};

    var name =
        greymusClientName(
            data.client
        );

    var paid =
        data.paid;

    if (paid === undefined) {
        paid = data.amount;
    }

    if (paid === undefined) {
        paid = data.repaymentAmount;
    }

    paid =
        greymusNumber(paid);


    var previousTotalDue =
        data.previousTotalDue;

    if (previousTotalDue === undefined) {
        previousTotalDue = data.totalDue;
    }

    if (previousTotalDue === undefined) {
        previousTotalDue = data.dueToday;
    }

    if (previousTotalDue === undefined) {
        previousTotalDue = data.due;
    }

    previousTotalDue =
        greymusNumber(previousTotalDue);


    var remaining =
        previousTotalDue - paid;

    if (remaining < 0) {
        remaining = 0;
    }


    var outstanding =
        greymusOutstanding(data);


    // -----------------------------------------------------
    // FULL PAYMENT
    // -----------------------------------------------------

    if (remaining === 0) {

        return (
            "Habari " +
            name +
            ", tumepokea malipo yako ya GREYMUS ya " +
            greymusFormatKES(paid) +
            ". " +

            "Malipo yako ya leo yamelipwa kikamilifu. " +

            "Salio lako la sasa la mkopo ni " +
            greymusFormatKES(outstanding) +
            ". " +

            "Asante." +

            greymusSignature()
        );

    }


    // -----------------------------------------------------
    // PARTIAL PAYMENT
    // -----------------------------------------------------

    return (
        "Habari " +
        name +
        ", tumepokea malipo yako ya GREYMUS ya " +
        greymusFormatKES(paid) +
        ". " +

        "Salio lako la malipo ya leo ni " +
        greymusFormatKES(remaining) +
        ". " +

        "Salio lako la sasa la mkopo ni " +
        greymusFormatKES(outstanding) +
        ". " +

        "Asante." +

        greymusSignature()
    );

}


// =========================================================
// PAYMENT CONFIRMATION
// =========================================================

function greymusPaymentConfirmation(data) {

    data = data || {};

    var name =
        greymusClientName(
            data.client
        );

    var paid =
        data.paid;

    if (paid === undefined) {
        paid = data.amount;
    }

    if (paid === undefined) {
        paid = data.repaymentAmount;
    }

    paid =
        greymusNumber(paid);


    var remaining =
        data.remainingToday;

    if (remaining === undefined) {
        remaining = data.remaining;
    }

    if (remaining === undefined) {
        remaining = data.dueRemaining;
    }

    remaining =
        greymusNumber(remaining);


    var outstanding =
        greymusOutstanding(data);


    // -----------------------------------------------------
    // FULL PAYMENT
    // -----------------------------------------------------

    if (remaining === 0) {

        return (
            "Habari " +
            name +
            ", tumepokea malipo yako ya GREYMUS ya " +
            greymusFormatKES(paid) +
            ". " +

            "Malipo yako ya leo yamelipwa kikamilifu. " +

            "Salio lako la sasa la mkopo ni " +
            greymusFormatKES(outstanding) +
            ". " +

            "Asante." +

            greymusSignature()
        );

    }


    // -----------------------------------------------------
    // PARTIAL PAYMENT
    // -----------------------------------------------------

    return (
        "Habari " +
        name +
        ", tumepokea malipo yako ya GREYMUS ya " +
        greymusFormatKES(paid) +
        ". " +

        "Salio lako la malipo ya leo ni " +
        greymusFormatKES(remaining) +
        ". " +

        "Salio lako la sasa la mkopo ni " +
        greymusFormatKES(outstanding) +
        ". " +

        "Asante." +

        greymusSignature()
    );

}


// =========================================================
// MAIN BUILDER
// =========================================================

function greymusBuildMessage(data) {

    data = data || {};

    var type =
        String(
            data.type || "due"
        ).toLowerCase();


    if (type === "repayment") {

        return greymusRepaymentMessage(
            data
        );

    }


    if (type === "payment") {

        return greymusPaymentConfirmation(
            data
        );

    }


    if (type === "arrears") {

        return greymusArrearsMessage(
            data
        );

    }


    return greymusDueMessage(
        data
    );

}


// =========================================================
// CREATE CLIENT MESSAGE
// =========================================================

function greymusCreateClientMessage(data) {

    data = data || {};

    return {

        phone:
            greymusClientPhone(
                data.client
            ),

        name:
            greymusClientName(
                data.client
            ),

        message:
            greymusBuildMessage(
                data
            )

    };

}


// =========================================================
// GREYMUS GLOBAL API
// =========================================================
//
// IMPORTANT:
// All internal function names have the GREYMUS prefix.
// This prevents collisions with other files in your app.
// =========================================================

window.GREYMUS_MESSAGING = {

    formatKES:
        greymusFormatKES,

    getClientName:
        greymusClientName,

    getClientPhone:
        greymusClientPhone,

    getOutstandingBalance:
        greymusOutstanding,

    buildDueMessage:
        greymusDueMessage,

    buildArrearsMessage:
        greymusArrearsMessage,

    buildRepaymentReceivedMessage:
        greymusRepaymentMessage,

    buildPaymentConfirmation:
        greymusPaymentConfirmation,

    buildMessage:
        greymusBuildMessage,

    createClientMessage:
        greymusCreateClientMessage

};


// =========================================================
// DONE
// =========================================================

console.log(
    "GREYMUS messaging loaded."
);