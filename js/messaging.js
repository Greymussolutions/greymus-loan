// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 2.0
//
// GREYMUS CLIENT MESSAGING
//
// ✔ Due today message
// ✔ Partial repayment message
// ✔ Due today + arrears message
// ✔ Arrears message
// ✔ Remaining installment amount
// ✔ Current outstanding loan balance
// ✔ Dynamic client name
// ✔ Dynamic amounts
// ✔ Native phone SMS
// ✔ No SMS API
// ✔ No external messaging service
// ✔ Every message ends with:
//      With regards,
//      GREYMUS.
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


    // Kenya: 07XXXXXXXX
    if (
        phone.startsWith("07") ||
        phone.startsWith("01")
    ) {

        return (
            "+254" +
            phone.substring(1)
        );

    }


    // Kenya: 2547XXXXXXXX
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
// MESSAGE SIGNATURE
// =========================================================

function messageSignature() {

    return `

With regards,
GREYMUS.`;

}


// =========================================================
// BUILD DUE MESSAGE
// =========================================================
//
// CASE 1:
// Due today and NOT in arrears.
//
// CASE 2:
// Due today AND client is in arrears.
//
// CASE 3:
// Partial repayment already made.
//
// =========================================================

function buildDueMessage(data) {

    const name =
        getClientName(
            data.client
        );


    const due =
        Number(
            data.due || 0
        );


    const paid =
        Number(
            data.paid || 0
        );


    const remaining =
        Math.max(
            0,
            due - paid
        );


    const arrears =
        Number(
            data.arrears || 0
        );


    const outstanding =
        Number(
            data.outstanding || 0
        );


    // =====================================================
    // PARTIAL PAYMENT + ARREARS
    // =====================================================

    if (
        paid > 0 &&
        remaining > 0 &&
        arrears > 0
    ) {

        const totalToPay =
            remaining +
            arrears;


        return (
            `Hello ${name}, your GREYMUS repayment ` +
            `of ${formatKES(due)} was partially paid. ` +
            `The remaining amount for today's repayment ` +
            `is ${formatKES(remaining)}. ` +
            `You also have ${formatKES(arrears)} in arrears. ` +
            `Your total amount to be paid is ` +
            `${formatKES(totalToPay)}. ` +
            `Your current outstanding loan balance is ` +
            `${formatKES(outstanding)}. ` +
            `Please make your payment as soon as possible. ` +
            `Thank you.` +
            messageSignature()
        );

    }


    // =====================================================
    // PARTIAL PAYMENT WITHOUT ARREARS
    // =====================================================

    if (
        paid > 0 &&
        remaining > 0
    ) {

        return (
            `Hello ${name}, your GREYMUS repayment ` +
            `of ${formatKES(due)} was partially paid. ` +
            `The remaining amount for today's repayment ` +
            `is ${formatKES(remaining)}. ` +
            `Your current outstanding loan balance is ` +
            `${formatKES(outstanding)}. ` +
            `Please clear the remaining amount as soon as possible. ` +
            `Thank you.` +
            messageSignature()
        );

    }


    // =====================================================
    // DUE TODAY + ARREARS
    // =====================================================

    if (
        arrears > 0
    ) {

        const totalToPay =
            due +
            arrears;


        return (
            `Hello ${name}, your GREYMUS repayment ` +
            `of ${formatKES(due)} is due today. ` +
            `You also have ${formatKES(arrears)} in arrears. ` +
            `Your total amount to be paid is ` +
            `${formatKES(totalToPay)}. ` +
            `Your current outstanding loan balance is ` +
            `${formatKES(outstanding)}. ` +
            `Please make your payment as soon as possible. ` +
            `Thank you.` +
            messageSignature()
        );

    }


    // =====================================================
    // NORMAL DUE TODAY
    // =====================================================

    return (
        `Hello ${name}, your GREYMUS repayment ` +
        `of ${formatKES(due)} is due today. ` +
        `Your current outstanding loan balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your payment on time. ` +
        `Thank you.` +
        messageSignature()
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


    const arrears =
        Number(
            data.arrears || 0
        );


    const outstanding =
        Number(
            data.outstanding || 0
        );


    return (
        `Hello ${name}, your GREYMUS loan has an overdue ` +
        `repayment of ${formatKES(arrears)}. ` +
        `Your current outstanding loan balance is ` +
        `${formatKES(outstanding)}. ` +
        `Please make your outstanding payment as soon as possible. ` +
        `Thank you.` +
        messageSignature()
    );

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
// OPEN NATIVE SMS
// =========================================================

function openNativeSMS(
    phone,
    message
) {

    const encoded =
        encodeURIComponent(
            message
        );


    const smsUrl =
        `sms:${phone}?body=${encoded}`;


    window.location.href =
        smsUrl;

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
        type === "arrears"

            ? buildArrearsMessage(data)

            : buildDueMessage(data);


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

    } else {

        summary = `

            <div
                class="greymus-message-summary"
            >

                <div>

                    <span>
                        Today's Due
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatKES(
                                data.due
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


            sendButton.disabled =
                true;


            sendButton.textContent =
                "Opening SMS…";


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

    openMessageComposer

};


// =========================================================
// END OF messaging.js
// =========================================================