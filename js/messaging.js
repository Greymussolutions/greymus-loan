// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 1.1
//
// CLIENT SMS COMPOSER
//
// PURPOSE:
// Opens a message composer when the Dashboard
// "💬 Message" button is clicked.
//
// NO SMS API
// NO EXTERNAL SMS SERVICE
// NO FIREBASE CHANGES
//
// The final SEND SMS action opens the phone's
// native SMS composer with the client's phone
// number and message already filled.
//
// DASHBOARD INTEGRATION:
//
// import { openMessageComposer } from "./messaging.js";
//
// openMessageComposer({
//     type: "due",
//     loan,
//     client,
//     due,
//     dueDate,
//     outstanding
// });
//
// =========================================================


// =========================================================
// FORMAT KES
// =========================================================

function formatKES(amount) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    ).format(
        Number(amount || 0)
    );

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
// GET CLIENT NAME
// =========================================================

function getClientName(client) {

    return (
        client?.name ||
        client?.clientName ||
        client?.fullName ||
        "Client"
    );

}


// =========================================================
// GET CLIENT PHONE
// =========================================================

function getClientPhone(client) {

    let phone =
        client?.phone ||
        client?.phoneNumber ||
        client?.mobile ||
        client?.mobileNumber ||
        "";

    phone = String(phone).trim();


    // -----------------------------------------------------
    // ALREADY INTERNATIONAL KENYAN FORMAT
    // -----------------------------------------------------

    if (phone.startsWith("+254")) {
        return phone;
    }


    // -----------------------------------------------------
    // 2547XXXXXXXX
    // -----------------------------------------------------

    if (phone.startsWith("254")) {
        return "+" + phone;
    }


    // -----------------------------------------------------
    // 07XXXXXXXX
    // 01XXXXXXXX
    // -----------------------------------------------------

    if (
        phone.startsWith("07") ||
        phone.startsWith("01")
    ) {

        return (
            "+254" +
            phone.substring(1)
        );

    }


    // -----------------------------------------------------
    // REMOVE COMMON FORMATTING
    // -----------------------------------------------------

    return phone.replace(
        /[\s\-().]/g,
        ""
    );

}


// =========================================================
// BUILD DUE MESSAGE
// =========================================================

function buildDueMessage(data) {

    const name =
        getClientName(
            data.client
        );

    const amount =
        formatKES(
            data.due
        );


    return (
        `Hello ${name}, your GREYMUS repayment of ${amount} ` +
        `is due today. Please make your repayment on time. ` +
        `Thank you.`
    );

}


// =========================================================
// BUILD ARREARS MESSAGE
// =========================================================

function buildArrearsMessage(data) {

    const name =
        getClientName(
            data.client
        );

    const amount =
        formatKES(
            data.arrears
        );

    const missed =
        Number(
            data.overdueInstallments || 0
        );


    if (missed > 1) {

        return (
            `Hello ${name}, your GREYMUS loan has ${missed} ` +
            `missed repayments totaling ${amount}. Please make ` +
            `your outstanding payment as soon as possible. Thank you.`
        );

    }


    return (
        `Hello ${name}, your GREYMUS loan has an overdue ` +
        `repayment of ${amount}. Please make your outstanding ` +
        `payment as soon as possible. Thank you.`
    );

}


// =========================================================
// INJECT MESSAGING STYLES
//
// The styles are included here so the messaging system
// does not depend on additional CSS changes.
//
// =========================================================

function injectMessagingStyles() {

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

        /* =================================================
           MESSAGE OVERLAY
           ================================================= */

        .greymus-message-overlay {

            position: fixed;

            inset: 0;

            z-index: 999999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 18px;

            background:
                rgba(
                    0,
                    0,
                    0,
                    0.72
                );

        }


        /* =================================================
           MESSAGE MODAL
           ================================================= */

        .greymus-message-modal {

            width:
                min(
                    100%,
                    520px
                );

            max-height: 92vh;

            overflow-y: auto;

            background:
                #162235;

            color:
                #eef4fb;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.12
                );

            border-radius:
                20px;

            box-shadow:
                0 25px 70px
                rgba(
                    0,
                    0,
                    0,
                    0.45
                );

        }


        /* =================================================
           HEADER
           ================================================= */

        .greymus-message-header {

            display: flex;

            align-items: flex-start;

            justify-content: space-between;

            gap: 15px;

            padding: 20px;

            border-bottom:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.10
                );

        }


        .greymus-message-header h2 {

            margin: 0;

            font-size: 22px;

            color: #ffffff;

        }


        .greymus-message-header p {

            margin:
                5px 0 0;

            color:
                #9eacbf;

            font-size:
                13px;

        }


        /* =================================================
           CLOSE BUTTON
           ================================================= */

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
                rgba(
                    255,
                    255,
                    255,
                    0.08
                );

            color:
                #ffffff;

            font-size:
                28px;

            line-height:
                1;

            cursor:
                pointer;

        }


        /* =================================================
           BODY
           ================================================= */

        .greymus-message-body {

            padding:
                20px;

        }


        /* =================================================
           FIELD
           ================================================= */

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


        /* =================================================
           READ ONLY INFORMATION
           ================================================= */

        .greymus-message-readonly {

            width:
                100%;

            padding:
                13px 14px;

            border-radius:
                11px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.07
                );

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.09
                );

            color:
                #ffffff;

            font-size:
                15px;

        }


        /* =================================================
           SUMMARY
           ================================================= */

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
                rgba(
                    16,
                    185,
                    129,
                    0.10
                );

            border:
                1px solid
                rgba(
                    16,
                    185,
                    129,
                    0.18
                );

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

            display:
                block;

            font-size:
                16px;

            color:
                #ffffff;

        }


        /* =================================================
           MESSAGE TEXTAREA
           ================================================= */

        .greymus-message-field textarea {

            display:
                block;

            width:
                100%;

            min-height:
                145px;

            resize:
                vertical;

            padding:
                13px;

            border-radius:
                12px;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.13
                );

            background:
                #0d1726;

            color:
                #ffffff;

            font:
                inherit;

            font-size:
                15px;

            line-height:
                1.5;

            outline:
                none;

        }


        .greymus-message-field textarea:focus {

            border-color:
                #0f9d8f;

            box-shadow:
                0 0 0 3px
                rgba(
                    15,
                    157,
                    143,
                    0.14
                );

        }


        /* =================================================
           COUNTER
           ================================================= */

        .greymus-message-counter {

            display:
                flex;

            justify-content:
                space-between;

            gap:
                10px;

            margin-top:
                6px;

            font-size:
                11px;

            color:
                #8493a6;

        }


        /* =================================================
           ERROR
           ================================================= */

        .greymus-message-error {

            padding:
                12px;

            border-radius:
                10px;

            background:
                rgba(
                    239,
                    68,
                    68,
                    0.12
                );

            color:
                #ffb4b4;

            font-size:
                13px;

        }


        /* =================================================
           FOOTER
           ================================================= */

        .greymus-message-footer {

            display:
                flex;

            gap:
                10px;

            padding:
                16px 20px 20px;

            border-top:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.10
                );

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


        /* =================================================
           CANCEL
           ================================================= */

        .greymus-message-cancel {

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.09
                );

            color:
                #ffffff;

        }


        /* =================================================
           SEND
           ================================================= */

        .greymus-message-send {

            background:
                #0f9d8f;

            color:
                #ffffff;

        }


        .greymus-message-send:disabled {

            opacity:
                0.5;

            cursor:
                not-allowed;

        }


        /* =================================================
           MOBILE
           ================================================= */

        @media (
            max-width: 480px
        ) {

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
// REMOVE EXISTING COMPOSER
// =========================================================

function removeComposer() {

    const existing =
        document.getElementById(
            "greymus-message-composer"
        );


    if (existing) {

        existing.remove();

    }

}


// =========================================================
// OPEN NATIVE SMS COMPOSER
// =========================================================

function openNativeSms(
    phone,
    message
) {

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
// MAIN MESSAGE FUNCTION
//
// THIS IS THE FUNCTION dashboard.js ALREADY EXPECTS.
//
// =========================================================

export function openMessageComposer(
    data = {}
) {

    // -----------------------------------------------------
    // Remove any old composer
    // -----------------------------------------------------

    removeComposer();


    // -----------------------------------------------------
    // Make sure styles exist
    // -----------------------------------------------------

    injectMessagingStyles();


    // -----------------------------------------------------
    // Read supplied data
    // -----------------------------------------------------

    const type =
        data.type ||
        "due";


    const client =
        data.client ||
        {};


    // -----------------------------------------------------
    // Client information
    // -----------------------------------------------------

    const clientName =
        getClientName(
            client
        );


    const phone =
        getClientPhone(
            client
        );


    // -----------------------------------------------------
    // Build appropriate message
    // -----------------------------------------------------

    const defaultMessage =
        type === "arrears"
            ? buildArrearsMessage(data)
            : buildDueMessage(data);


    // -----------------------------------------------------
    // CREATE OVERLAY
    // -----------------------------------------------------

    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "greymus-message-composer";


    overlay.className =
        "greymus-message-overlay";


    // -----------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------

    let summaryHtml = "";


    if (
        type === "arrears"
    ) {

        summaryHtml = `

            <div
                class="greymus-message-summary"
            >

                <div>

                    <span>
                        Arrears Amount
                    </span>

                    <strong>
                        ${
                            escapeHtml(
                                formatKES(
                                    data.arrears
                                )
                            )
                        }
                    </strong>

                </div>


                <div>

                    <span>
                        Missed Installments
                    </span>

                    <strong>
                        ${
                            Number(
                                data.overdueInstallments ||
                                0
                            )
                        }
                    </strong>

                </div>

            </div>

        `;

    } else {

        summaryHtml = `

            <div
                class="greymus-message-summary"
            >

                <div>

                    <span>
                        Due Today
                    </span>

                    <strong>
                        ${
                            escapeHtml(
                                formatKES(
                                    data.due
                                )
                            )
                        }
                    </strong>

                </div>


                <div>

                    <span>
                        Outstanding
                    </span>

                    <strong>
                        ${
                            escapeHtml(
                                formatKES(
                                    data.outstanding
                                )
                            )
                        }
                    </strong>

                </div>

            </div>

        `;

    }


    // -----------------------------------------------------
    // HTML
    // -----------------------------------------------------

    overlay.innerHTML = `

        <div
            class="greymus-message-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="greymus-message-title"
        >


            <!-- =========================================
                 HEADER
                 ========================================= -->

            <div
                class="greymus-message-header"
            >

                <div>

                    <h2
                        id="greymus-message-title"
                    >
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
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <!-- =========================================
                 BODY
                 ========================================= -->

            <div
                class="greymus-message-body"
            >


                <!-- CLIENT -->

                <div
                    class="greymus-message-field"
                >

                    <label>
                        Client
                    </label>


                    <div
                        class="greymus-message-readonly"
                    >
                        ${
                            escapeHtml(
                                clientName
                            )
                        }
                    </div>

                </div>


                <!-- PHONE -->

                <div
                    class="greymus-message-field"
                >

                    <label>
                        Phone Number
                    </label>


                    <div
                        class="greymus-message-readonly"
                    >

                        ${
                            escapeHtml(
                                phone ||
                                "No phone number registered"
                            )
                        }

                    </div>

                </div>


                <!-- SUMMARY -->

                ${summaryHtml}


                <!-- MESSAGE -->

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
                    >${
                        escapeHtml(
                            defaultMessage
                        )
                    }</textarea>


                    <div
                        class="greymus-message-counter"
                    >

                        <span>
                            Edit before sending
                        </span>


                        <span
                            id="greymus-message-count"
                        >
                            ${
                                defaultMessage.length
                            }/500
                        </span>

                    </div>

                </div>


                <!-- PHONE ERROR -->

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


            <!-- =========================================
                 FOOTER
                 ========================================= -->

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
    // ADD TO BODY
    // -----------------------------------------------------

    document.body.appendChild(
        overlay
    );


    // -----------------------------------------------------
    // GET ELEMENTS
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
    // CLOSE FUNCTION
    // -----------------------------------------------------

    const close =
        () => {

            overlay.remove();

            document.removeEventListener(
                "keydown",
                onKeyDown
            );

        };


    // -----------------------------------------------------
    // ESCAPE KEY
    // -----------------------------------------------------

    const onKeyDown =
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                close();

            }

        };


    // -----------------------------------------------------
    // CLOSE BUTTON
    // -----------------------------------------------------

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            close
        );

    }


    // -----------------------------------------------------
    // CANCEL BUTTON
    // -----------------------------------------------------

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            close
        );

    }


    // -----------------------------------------------------
    // CLICK OUTSIDE
    // -----------------------------------------------------

    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                overlay
            ) {

                close();

            }

        }
    );


    // -----------------------------------------------------
    // ESCAPE LISTENER
    // -----------------------------------------------------

    document.addEventListener(
        "keydown",
        onKeyDown
    );


    // -----------------------------------------------------
    // CHARACTER COUNTER
    // -----------------------------------------------------

    if (textarea) {

        textarea.addEventListener(
            "input",
            () => {

                if (counter) {

                    counter.textContent =
                        `${textarea.value.length}/500`;

                }

            }
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


                // -----------------------------------------
                // NO PHONE
                // -----------------------------------------

                if (!phone) {

                    alert(
                        "This client does not have a valid phone number."
                    );

                    return;

                }


                // -----------------------------------------
                // NO MESSAGE
                // -----------------------------------------

                if (!message) {

                    alert(
                        "Please enter a message before sending."
                    );


                    if (textarea) {

                        textarea.focus();

                    }

                    return;

                }


                // -----------------------------------------
                // PREVENT DOUBLE TAP
                // -----------------------------------------

                sendButton.disabled =
                    true;


                sendButton.textContent =
                    "Opening SMS…";


                // -----------------------------------------
                // OPEN NATIVE SMS
                // -----------------------------------------

                openNativeSms(
                    phone,
                    message
                );

            }
        );

    }


    // -----------------------------------------------------
    // FOCUS TEXTAREA
    // -----------------------------------------------------

    if (textarea) {

        textarea.focus();


        textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length
        );

    }

}


// =========================================================
// GLOBAL REFERENCE
// =========================================================
//
// Useful for debugging from the browser console.
//
// window.GREYMUS_MESSAGING.openMessageComposer(...)
//
// =========================================================

window.GREYMUS_MESSAGING = {

    openMessageComposer

};


// =========================================================
// END OF messaging.js
// =========================================================