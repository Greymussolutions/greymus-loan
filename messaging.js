// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 1.0
//
// PURPOSE:
// Dashboard client messaging using the device's
// native SMS composer.
//
// NO SMS API
// NO EXTERNAL SMS SERVICE
// NO FIREBASE CHANGES
//
// INTEGRATION:
// dashboard.js imports:
//
// import { openMessageComposer } from "./messaging.js";
//
// =========================================================


// =========================================================
// CURRENCY FORMATTER
// =========================================================

function formatCurrency(amount) {

    const value = Number(amount || 0);

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    ).format(value);

}


// =========================================================
// PHONE NUMBER CLEANUP
// =========================================================

function cleanPhoneNumber(phone) {

    if (!phone) {
        return "";
    }

    let number = String(phone).trim();

    // Remove spaces, hyphens and brackets
    number = number.replace(/[\s\-().]/g, "");

    // Convert Kenyan local format:
    // 07XXXXXXXX -> +2547XXXXXXXX
    // 01XXXXXXXX -> +2541XXXXXXXX

    if (
        number.startsWith("07") ||
        number.startsWith("01")
    ) {
        number = "+254" + number.substring(1);
    }

    // Convert 254XXXXXXXXX -> +254XXXXXXXXX

    if (
        number.startsWith("254") &&
        !number.startsWith("+254")
    ) {
        number = "+" + number;
    }

    return number;

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
// REMOVE EXISTING COMPOSER
// =========================================================

function removeMessageComposer() {

    const existing =
        document.getElementById(
            "greymus-message-composer"
        );

    if (existing) {
        existing.remove();
    }

}


// =========================================================
// GET CLIENT NAME
// =========================================================

function getClientName(client) {

    if (!client) {
        return "Client";
    }

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

function getClientPhone(client) {

    if (!client) {
        return "";
    }

    return cleanPhoneNumber(
        client.phone ||
        client.phoneNumber ||
        client.mobile ||
        client.mobileNumber ||
        ""
    );

}


// =========================================================
// BUILD DUE MESSAGE
// =========================================================

function buildDueMessage({
    client,
    due,
    dueDate
}) {

    const name =
        getClientName(client);

    const amount =
        formatCurrency(due);

    let message =
        `Hello ${name}, your GREYMUS repayment of ${amount} is due today. Please make your repayment on time. Thank you.`;

    if (dueDate) {

        message =
            `Hello ${name}, your GREYMUS repayment of ${amount} is due today (${dueDate}). Please make your repayment on time. Thank you.`;

    }

    return message;

}


// =========================================================
// BUILD ARREARS MESSAGE
// =========================================================

function buildArrearsMessage({
    client,
    arrears,
    overdueInstallments
}) {

    const name =
        getClientName(client);

    const amount =
        formatCurrency(arrears);

    const installments =
        Number(overdueInstallments || 0);

    if (installments > 1) {

        return (
            `Hello ${name}, your GREYMUS loan has ${installments} overdue repayments totaling ${amount}. Please make your outstanding payment as soon as possible. Thank you.`
        );

    }

    return (
        `Hello ${name}, your GREYMUS loan has an overdue repayment of ${amount}. Please make your outstanding payment as soon as possible. Thank you.`
    );

}


// =========================================================
// OPEN NATIVE SMS COMPOSER
// =========================================================

function openNativeSmsComposer(
    phone,
    message
) {

    if (!phone) {

        alert(
            "This client does not have a valid phone number."
        );

        return;

    }

    const encodedMessage =
        encodeURIComponent(message);

    const smsUrl =
        `sms:${phone}?body=${encodedMessage}`;

    window.location.href = smsUrl;

}


// =========================================================
// OPEN MESSAGE COMPOSER
// =========================================================

export function openMessageComposer(data = {}) {

    // -----------------------------------------------------
    // REMOVE ANY OLD COMPOSER
    // -----------------------------------------------------

    removeMessageComposer();


    // -----------------------------------------------------
    // DATA
    // -----------------------------------------------------

    const {
        type = "due",
        loan = {},
        client = {},
        due = 0,
        dueDate = "",
        outstanding = 0,
        arrears = 0,
        overdueInstallments = 0
    } = data;


    // -----------------------------------------------------
    // CLIENT INFORMATION
    // -----------------------------------------------------

    const clientName =
        getClientName(client);

    const phone =
        getClientPhone(client);


    // -----------------------------------------------------
    // MESSAGE
    // -----------------------------------------------------

    let defaultMessage = "";

    if (type === "arrears") {

        defaultMessage =
            buildArrearsMessage({
                client,
                arrears,
                overdueInstallments
            });

    } else {

        defaultMessage =
            buildDueMessage({
                client,
                due,
                dueDate
            });

    }


    // -----------------------------------------------------
    // OVERLAY
    // -----------------------------------------------------

    const overlay =
        document.createElement("div");

    overlay.id =
        "greymus-message-composer";

    overlay.className =
        "greymus-message-overlay";


    // -----------------------------------------------------
    // COMPOSER
    // -----------------------------------------------------

    overlay.innerHTML = `

        <div
            class="greymus-message-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="greymus-message-title"
        >

            <div class="greymus-message-header">

                <div>

                    <h2 id="greymus-message-title">
                        Send Message
                    </h2>

                    <p>
                        GREYMUS Client SMS
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


            <div class="greymus-message-body">


                <div class="greymus-message-field">

                    <label>
                        Client
                    </label>

                    <div class="greymus-message-readonly">

                        ${escapeHtml(clientName)}

                    </div>

                </div>


                <div class="greymus-message-field">

                    <label>
                        Phone Number
                    </label>

                    <div class="greymus-message-readonly">

                        ${
                            escapeHtml(
                                phone || "No phone number"
                            )
                        }

                    </div>

                </div>


                ${
                    type === "due"
                    ? `

                        <div class="greymus-message-summary">

                            <div>

                                <span>
                                    Due Today
                                </span>

                                <strong>
                                    ${formatCurrency(due)}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    Outstanding
                                </span>

                                <strong>
                                    ${formatCurrency(outstanding)}
                                </strong>

                            </div>

                        </div>

                    `
                    : `

                        <div class="greymus-message-summary">

                            <div>

                                <span>
                                    Arrears
                                </span>

                                <strong>
                                    ${formatCurrency(arrears)}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    Overdue
                                </span>

                                <strong>
                                    ${Number(
                                        overdueInstallments || 0
                                    )}
                                </strong>

                            </div>

                        </div>

                    `
                }


                <div class="greymus-message-field">

                    <label
                        for="greymus-message-text"
                    >
                        Message
                    </label>

                    <textarea
                        id="greymus-message-text"
                        rows="7"
                        maxlength="500"
                    >${escapeHtml(defaultMessage)}</textarea>

                    <div class="greymus-message-counter">

                        <span>
                            Edit the message before sending if needed.
                        </span>

                        <span id="greymus-message-count">
                            ${defaultMessage.length}/500
                        </span>

                    </div>

                </div>


                ${
                    !phone
                    ? `

                        <div class="greymus-message-error">

                            This client does not have a phone number.
                            The SMS cannot be opened.

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
                    ${
                        phone
                        ? ""
                        : "disabled"
                    }
                >
                    💬 Send SMS
                </button>

            </div>

        </div>

    `;


    // -----------------------------------------------------
    // ADD TO DOCUMENT
    // -----------------------------------------------------

    document.body.appendChild(overlay);


    // -----------------------------------------------------
    // ELEMENTS
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // UPDATE CHARACTER COUNT
    // -----------------------------------------------------

    function updateCounter() {

        if (!textarea || !counter) {
            return;
        }

        counter.textContent =
            `${textarea.value.length}/500`;

    }


    // -----------------------------------------------------
    // CLOSE
    // -----------------------------------------------------

    function closeComposer() {

        overlay.remove();

    }


    // -----------------------------------------------------
    // CLOSE BUTTON
    // -----------------------------------------------------

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeComposer
        );

    }


    // -----------------------------------------------------
    // CANCEL BUTTON
    // -----------------------------------------------------

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeComposer
        );

    }


    // -----------------------------------------------------
    // CLICK OUTSIDE MODAL
    // -----------------------------------------------------

    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {

                closeComposer();

            }

        }
    );


    // -----------------------------------------------------
    // ESCAPE KEY
    // -----------------------------------------------------

    function handleEscape(event) {

        if (event.key === "Escape") {

            closeComposer();

            document.removeEventListener(
                "keydown",
                handleEscape
            );

        }

    }

    document.addEventListener(
        "keydown",
        handleEscape
    );


    // -----------------------------------------------------
    // MESSAGE COUNTER
    // -----------------------------------------------------

    if (textarea) {

        textarea.addEventListener(
            "input",
            updateCounter
        );

    }


    // -----------------------------------------------------
    // SEND SMS
    // -----------------------------------------------------

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            () => {

                const message =
                    textarea
                    ? textarea.value.trim()
                    : "";

                if (!phone) {

                    alert(
                        "This client does not have a valid phone number."
                    );

                    return;

                }

                if (!message) {

                    alert(
                        "Please enter a message before sending."
                    );

                    if (textarea) {
                        textarea.focus();
                    }

                    return;

                }


                // Prevent accidental double taps

                sendButton.disabled = true;

                sendButton.textContent =
                    "Opening SMS…";


                openNativeSmsComposer(
                    phone,
                    message
                );

            }
        );

    }


    // -----------------------------------------------------
    // FOCUS MESSAGE
    // -----------------------------------------------------

    if (textarea) {

        textarea.focus();

        textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length
        );

    }


    // -----------------------------------------------------
    // INITIAL COUNTER
    // -----------------------------------------------------

    updateCounter();

}


// =========================================================
// GLOBAL SAFETY
// =========================================================

window.GREYMUS_MESSAGING = {

    openMessageComposer

};


// =========================================================
// END OF FILE
// =========================================================
