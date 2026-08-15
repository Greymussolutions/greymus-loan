// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// messages.js
// VERSION 2.0
//
// MANUAL CLIENT MESSAGING
// ✔ No API required
// ✔ WhatsApp
// ✔ SMS
// ✔ Copy message
// ✔ Automatic loan/client data
// ✔ GREYMUS branded messages
// ✔ Works with normal <script>
// ✔ Compatible with loans.js message buttons
// ==========================================


let messageModal = null;


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ==========================================
// MONEY FORMAT
// ==========================================

function money(value) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value) || 0
    );

}


// ==========================================
// DATE FORMAT
// ==========================================

function dateText(value) {

    if (!value) {
        return "-";
    }

    let date;

    try {

        if (
            value &&
            typeof value.toDate === "function"
        ) {

            date = value.toDate();

        } else {

            date = new Date(value);

        }

    } catch (error) {

        return String(value);

    }


    if (
        !date ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-KE",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

}


// ==========================================
// NORMALIZE PHONE NUMBER
// ==========================================

function normalizePhone(phone) {

    let value =
        String(
            phone || ""
        )
            .trim();


    if (!value) {

        return "";

    }


    value =
        value.replace(
            /[\s()-]/g,
            ""
        );


    // Convert 00XXXXXXXXX
    // to XXXXXXXXX

    if (
        value.startsWith("00")
    ) {

        value =
            value.slice(2);

    }


    // Remove +

    if (
        value.startsWith("+")
    ) {

        value =
            value.slice(1);

    }


    // Kenya local number
    // 07XXXXXXXX
    // 01XXXXXXXX

    if (
        /^0[17]\d{8}$/.test(
            value
        )
    ) {

        value =
            "254" +
            value.slice(1);

    }


    return value;

}


// ==========================================
// CLIENT NAME
// ==========================================

function getClientName(context) {

    return (

        context?.client?.name ||

        context?.loan?.clientName ||

        context?.clientName ||

        "Client"

    )
        .trim();

}


// ==========================================
// CLIENT PHONE
// ==========================================

function getPhone(context) {

    return normalizePhone(

        context?.client?.phone ||

        context?.loan?.clientPhone ||

        context?.clientPhone ||

        ""

    );

}


// ==========================================
// LOAN AMOUNT
// ==========================================

function getLoanAmount(context) {

    return Number(

        context?.loan?.amount ||

        context?.loanAmount ||

        0

    );

}


// ==========================================
// WEEKLY REPAYMENT
// ==========================================

function getWeeklyPayment(context) {

    return Number(

        context?.loan?.weeklyPayment ||

        context?.loan?.repayment ||

        context?.weeklyPayment ||

        context?.due ||

        0

    );

}


// ==========================================
// OUTSTANDING BALANCE
// ==========================================

function getOutstanding(context) {

    if (
        context?.outstanding !==
        undefined
    ) {

        return Number(
            context.outstanding
        ) || 0;

    }


    if (
        context?.loan?.balance !==
        undefined
    ) {

        return Number(
            context.loan.balance
        ) || 0;

    }


    if (
        context?.outstandingBalance !==
        undefined
    ) {

        return Number(
            context.outstandingBalance
        ) || 0;

    }


    return 0;

}


// ==========================================
// NORMALIZE MESSAGE TYPE
// ==========================================

function normalizeMessageType(
    type
) {

    const value =
        String(
            type || ""
        )
            .trim()
            .toLowerCase();


    /*
     * loans.js uses:
     *
     * approval
     * repayment
     * due
     * arrears
     * completed
     *
     * messages.js originally used:
     *
     * approved
     * payment
     *
     * This function allows both.
     */


    if (
        value === "approval" ||
        value === "approved"
    ) {

        return "approved";

    }


    if (
        value === "repayment" ||
        value === "payment" ||
        value === "paid"
    ) {

        return "payment";

    }


    if (
        value === "due" ||
        value === "dueToday"
    ) {

        return "due";

    }


    if (
        value === "dueSoon"
    ) {

        return "dueSoon";

    }


    if (
        value === "arrears"
    ) {

        return "arrears";

    }


    if (
        value === "completed" ||
        value === "complete"
    ) {

        return "completed";

    }


    return "general";

}


// ==========================================
// GENERATE MESSAGE
// ==========================================

function getMessage(context = {}) {

    const type =
        normalizeMessageType(
            context.type
        );


    const name =
        getClientName(
            context
        );


    const loanAmount =
        getLoanAmount(
            context
        );


    const weeklyPayment =
        getWeeklyPayment(
            context
        );


    const outstanding =
        getOutstanding(
            context
        );


    const dueDate =
        dateText(
            context?.dueDate
        );


    const dueAmount =
        Number(
            context?.due ||
            context?.dueAmount ||
            weeklyPayment ||
            0
        );


    const arrears =
        Number(
            context?.arrears ||
            context?.arrearsAmount ||
            0
        );


    const overdueInstallments =
        Number(
            context?.overdueInstallments ||
            0
        );


    const payment =
        Number(
            context?.payment ||
            context?.paymentAmount ||
            0
        );


    // ======================================
    // APPROVED
    // ======================================

    if (
        type === "approved"
    ) {

        return `Dear ${name}, your GREYMUS loan of ${money(loanAmount)} has been approved successfully. Your weekly repayment is ${money(weeklyPayment)}. Your current outstanding balance is ${money(outstanding)}. Please make your repayments on time.

With regard,
GREYMUS`;

    }


    // ======================================
    // PAYMENT CONFIRMATION
    // ======================================

    if (
        type === "payment"
    ) {

        return `Dear ${name}, GREYMUS has received your loan repayment of ${money(payment)}. Your current outstanding balance is ${money(outstanding)}. Thank you for making your repayment.

With regard,
GREYMUS`;

    }


    // ======================================
    // DUE TODAY
    // ======================================

    if (
        type === "due"
    ) {

        return `Dear ${name}, this is a reminder from GREYMUS that your loan repayment of ${money(dueAmount)} is due today. Your current outstanding balance is ${money(outstanding)}. Please make your repayment on time.

With regard,
GREYMUS`;

    }


    // ======================================
    // DUE SOON
    // ======================================

    if (
        type === "dueSoon"
    ) {

        return `Dear ${name}, this is a reminder from GREYMUS that your loan repayment of ${money(dueAmount)} is due on ${dueDate}. Your current outstanding balance is ${money(outstanding)}. Please ensure your repayment is made on time.

With regard,
GREYMUS`;

    }


    // ======================================
    // ARREARS
    // ======================================

    if (
        type === "arrears"
    ) {

        const installmentText =
            overdueInstallments === 1
                ? "overdue repayment"
                : "overdue repayments";


        return `Dear ${name}, your GREYMUS loan is currently in arrears. You have ${overdueInstallments} ${installmentText} totaling ${money(arrears)}. Your current outstanding balance is ${money(outstanding)}. Please make your repayments as soon as possible.

With regard,
GREYMUS`;

    }


    // ======================================
    // COMPLETED
    // ======================================

    if (
        type === "completed"
    ) {

        return `Dear ${name}, congratulations. Your GREYMUS loan has been fully repaid. Thank you for completing your repayments with GREYMUS. We appreciate your business.

With regard,
GREYMUS`;

    }


    // ======================================
    // GENERAL
    // ======================================

    return `Dear ${name}, this is a message from GREYMUS regarding your loan. Your current outstanding balance is ${money(outstanding)}. Please contact GREYMUS for further information.

With regard,
GREYMUS`;

}


// ==========================================
// CREATE MESSAGE MODAL
// ==========================================

function ensureModal() {

    if (
        messageModal &&
        document.body.contains(
            messageModal
        )
    ) {

        return messageModal;

    }


    messageModal =
        document.createElement(
            "div"
        );


    messageModal.id =
        "greymus-message-modal";


    messageModal.className =
        "greymus-message-modal hidden";


    messageModal.innerHTML = `

        <div
            class="greymus-message-overlay"
            data-message-close="true">
        </div>


        <div
            class="greymus-message-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="greymus-message-title"
        >

            <div
                class="greymus-message-header"
            >

                <div>

                    <span
                        class="greymus-message-kicker"
                    >
                        GREYMUS
                    </span>


                    <h2
                        id="greymus-message-title"
                    >
                        Send Message
                    </h2>

                </div>


                <button
                    type="button"
                    class="greymus-message-close"
                    data-message-close="true"
                    aria-label="Close"
                >
                    &times;
                </button>

            </div>


            <div
                class="greymus-message-recipient"
                id="greymus-message-recipient"
            >
            </div>


            <label
                class="greymus-message-label"
                for="greymus-message-text"
            >
                Message
            </label>


            <textarea
                id="greymus-message-text"
                class="greymus-message-text"
                rows="9"
            ></textarea>


            <div
                class="greymus-message-actions"
            >

                <button
                    type="button"
                    class="greymus-message-btn whatsapp"
                    id="greymus-message-whatsapp"
                >
                    💬 WhatsApp
                </button>


                <button
                    type="button"
                    class="greymus-message-btn sms"
                    id="greymus-message-sms"
                >
                    📱 SMS
                </button>


                <button
                    type="button"
                    class="greymus-message-btn copy"
                    id="greymus-message-copy"
                >
                    📋 Copy
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        messageModal
    );


    // ======================================
    // CLOSE
    // ======================================

    messageModal.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "[data-message-close='true']"
                )
            ) {

                closeMessageComposer();

            }

        }
    );


    // ======================================
    // WHATSAPP
    // ======================================

    document
        .getElementById(
            "greymus-message-whatsapp"
        )
        ?.addEventListener(
            "click",
            () => {

                const phone =
                    messageModal.dataset.phone ||
                    "";


                const textarea =
                    document.getElementById(
                        "greymus-message-text"
                    );


                const text =
                    textarea?.value ||
                    "";


                if (!phone) {

                    alert(
                        "This client does not have a valid phone number."
                    );

                    return;

                }


                const url =
                    "https://wa.me/" +
                    phone +
                    "?text=" +
                    encodeURIComponent(
                        text
                    );


                window.open(
                    url,
                    "_blank"
                );

            }
        );


    // ======================================
    // SMS
    // ======================================

    document
        .getElementById(
            "greymus-message-sms"
        )
        ?.addEventListener(
            "click",
            () => {

                const phone =
                    messageModal.dataset.phone ||
                    "";


                const textarea =
                    document.getElementById(
                        "greymus-message-text"
                    );


                const text =
                    textarea?.value ||
                    "";


                if (!phone) {

                    alert(
                        "This client does not have a valid phone number."
                    );

                    return;

                }


                window.location.href =
                    "sms:" +
                    phone +
                    "?body=" +
                    encodeURIComponent(
                        text
                    );

            }
        );


    // ======================================
    // COPY
    // ======================================

    document
        .getElementById(
            "greymus-message-copy"
        )
        ?.addEventListener(
            "click",
            async () => {

                const textarea =
                    document.getElementById(
                        "greymus-message-text"
                    );


                const text =
                    textarea?.value ||
                    "";


                if (!text) {

                    return;

                }


                try {

                    await navigator.clipboard.writeText(
                        text
                    );


                    alert(
                        "Message copied successfully."
                    );


                } catch (
                    error
                ) {

                    textarea.focus();

                    textarea.select();


                    document.execCommand(
                        "copy"
                    );


                    alert(
                        "Message copied successfully."
                    );

                }

            }
        );


    return messageModal;

}


// ==========================================
// OPEN MESSAGE COMPOSER
// ==========================================

function openMessageComposer(
    context = {}
) {

    try {

        const modal =
            ensureModal();


        const message =
            getMessage(
                context
            );


        const phone =
            getPhone(
                context
            );


        const name =
            getClientName(
                context
            );


        modal.dataset.phone =
            phone;


        modal.dataset.clientName =
            name;


        modal.dataset.messageType =
            normalizeMessageType(
                context.type
            );


        // ==================================
        // TITLE
        // ==================================

        let title =
            "Send Message";


        const type =
            normalizeMessageType(
                context.type
            );


        if (
            type === "approved"
        ) {

            title =
                "Loan Approved";

        } else if (
            type === "payment"
        ) {

            title =
                "Payment Confirmation";

        } else if (
            type === "due"
        ) {

            title =
                "Repayment Due Today";

        } else if (
            type === "dueSoon"
        ) {

            title =
                "Repayment Reminder";

        } else if (
            type === "arrears"
        ) {

            title =
                "Arrears Reminder";

        } else if (
            type === "completed"
        ) {

            title =
                "Loan Completed";

        }


        const titleElement =
            document.getElementById(
                "greymus-message-title"
            );


        const recipientElement =
            document.getElementById(
                "greymus-message-recipient"
            );


        const textarea =
            document.getElementById(
                "greymus-message-text"
            );


        if (
            titleElement
        ) {

            titleElement.textContent =
                title;

        }


        if (
            recipientElement
        ) {

            recipientElement.innerHTML = `

                <strong>
                    ${escapeHtml(
                        name
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        phone ||
                        "No phone number"
                    )}
                </span>

            `;

        }


        if (
            textarea
        ) {

            textarea.value =
                message;

        }


        modal.classList.remove(
            "hidden"
        );


        document.body.style.overflow =
            "hidden";


        setTimeout(
            () => {

                textarea?.focus();

                textarea?.setSelectionRange(
                    0,
                    0
                );

            },
            50
        );


    } catch (
        error
    ) {

        console.error(
            "Message composer error:",
            error
        );


        alert(
            "Unable to open the message composer."
        );

    }

}


// ==========================================
// CLOSE MESSAGE COMPOSER
// ==========================================

function closeMessageComposer() {

    if (
        !messageModal
    ) {

        return;

    }


    messageModal.classList.add(
        "hidden"
    );


    /*
     * Restore scrolling.
     */

    document.body.style.overflow =
        "";

}


// ==========================================
// GET GENERATED MESSAGE
// ==========================================

function getGeneratedMessage(
    context = {}
) {

    return getMessage(
        context
    );

}


// ==========================================
// NORMALIZE MESSAGE PHONE
// ==========================================

function normalizeMessagePhone(
    phone
) {

    return normalizePhone(
        phone
    );

}


// ==========================================
// FIND LOAN
// ==========================================

function findMessageLoan(
    loanId
) {

    if (
        !loanId
    ) {

        return null;

    }


    /*
     * loans.js keeps the current loans
     * collection in the global `loans`.
     */

    if (
        Array.isArray(
            window.loans
        )
    ) {

        const found =
            window.loans.find(
                loan =>
                    loan.id ===
                    loanId
            );


        if (
            found
        ) {

            return found;

        }

    }


    /*
     * Also support a locally scoped `loans`
     * variable if loans.js exposes it
     * differently.
     */

    try {

        if (
            typeof loans !==
            "undefined" &&
            Array.isArray(
                loans
            )
        ) {

            return (
                loans.find(
                    loan =>
                        loan.id ===
                        loanId
                ) ||
                null
            );

        }

    } catch (
        error
    ) {

        // Ignore.

    }


    return null;

}


// ==========================================
// FIND CLIENT
// ==========================================

function findMessageClient(
    loan
) {

    if (
        !loan
    ) {

        return null;

    }


    try {

        if (
            typeof clients !==
            "undefined" &&
            Array.isArray(
                clients
            )
        ) {

            if (
                loan.clientId
            ) {

                const byId =
                    clients.find(
                        client =>
                            client.id ===
                            loan.clientId
                    );


                if (
                    byId
                ) {

                    return byId;

                }

            }


            const loanName =
                (
                    loan.clientName ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                loanName
            ) {

                return (
                    clients.find(
                        client =>
                            (
                                client.name ||
                                ""
                            )
                                .trim()
                                .toLowerCase() ===
                            loanName
                    ) ||
                    null
                );

            }

        }

    } catch (
        error
    ) {

        console.warn(
            "Client lookup failed:",
            error
        );

    }


    return null;

}


// ==========================================
// BUILD CONTEXT FROM LOAN
// ==========================================

function buildMessageContext(
    loan,
    type,
    extra = {}
) {

    if (
        !loan
    ) {

        return {

            type:
                type

        };

    }


    const client =
        findMessageClient(
            loan
        );


    let outstanding =
        Number(
            loan.balance ||
            0
        );


    /*
     * Use the helper from loans.js when
     * available.
     */

    try {

        if (
            typeof getLoanOutstandingBalance ===
            "function"
        ) {

            outstanding =
                getLoanOutstandingBalance(
                    loan
                );

        }

    } catch (
        error
    ) {

        // Keep stored balance.

    }


    let due =
        Number(
            loan.weeklyPayment ||
            loan.repayment ||
            0
        );


    let dueDate =
        loan.nextRepaymentDate ||
        "";


    let arrears =
        Number(
            extra.arrears ||
            0
        );


    let overdueInstallments =
        Number(
            extra.overdueInstallments ||
            0
        );


    /*
     * Read repayment schedule for the next
     * unpaid installment and arrears.
     */

    if (
        Array.isArray(
            loan.repaymentSchedule
        )
    ) {

        const unpaid =
            loan.repaymentSchedule.filter(
                item =>
                    !item.paid &&
                    Number(
                        item.remainingAmount ??
                        item.amount ??
                        0
                    ) > 0
            );


        const next =
            unpaid[0];


        if (
            next
        ) {

            due =
                Number(
                    next.remainingAmount ??
                    next.amount ??
                    due
                );


            dueDate =
                next.dueDate ||
                dueDate;

        }


        if (
            type ===
            "arrears"
        ) {

            const todayDate =
                new Date();


            todayDate.setHours(
                0,
                0,
                0,
                0
            );


            let calculatedArrears =
                0;


            let calculatedOverdue =
                0;


            loan.repaymentSchedule.forEach(
                item => {

                    if (
                        item.paid
                    ) {

                        return;

                    }


                    if (
                        !item.dueDate
                    ) {

                        return;

                    }


                    const itemDate =
                        new Date(
                            `${item.dueDate}T00:00:00`
                        );


                    if (
                        itemDate <
                        todayDate
                    ) {

                        calculatedArrears +=
                            Number(
                                item.remainingAmount ??
                                item.amount ??
                                0
                            );


                        calculatedOverdue++;

                    }

                }
            );


            if (
                arrears <=
                0
            ) {

                arrears =
                    calculatedArrears;

            }


            if (
                overdueInstallments <=
                0
            ) {

                overdueInstallments =
                    calculatedOverdue;

            }

        }

    }


    return {

        ...extra,

        type:
            type,

        loan:
            loan,

        client:
            client,

        loanAmount:
            Number(
                loan.amount ||
                0
            ),

        weeklyPayment:
            Number(
                loan.weeklyPayment ||
                loan.repayment ||
                0
            ),

        outstanding:
            outstanding,

        due:
            due,

        dueDate:
            dueDate,

        arrears:
            arrears,

        overdueInstallments:
            overdueInstallments,

        clientName:
            loan.clientName ||
            client?.name ||
            "",

        clientPhone:
            loan.clientPhone ||
            client?.phone ||
            ""

    };

}


// ==========================================
// MAIN MESSAGE FUNCTION
// ==========================================

function messageLoan(
    loanId,
    type = "general"
) {

    const loan =
        findMessageLoan(
            loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan could not be found."
        );

        return;

    }


    const normalizedType =
        normalizeMessageType(
            type
        );


    const context =
        buildMessageContext(
            loan,
            normalizedType
        );


    openMessageComposer(
        context
    );

}


// ==========================================
// APPROVAL MESSAGE
// ==========================================

function messageApproval(
    loanId
) {

    messageLoan(
        loanId,
        "approved"
    );

}


// ==========================================
// REPAYMENT MESSAGE
// ==========================================

function messageRepayment(
    loanId,
    paymentAmount = 0
) {

    const loan =
        findMessageLoan(
            loanId
        );


    if (
        !loan
    ) {

        alert(
            "Loan could not be found."
        );

        return;

    }


    const context =
        buildMessageContext(
            loan,
            "payment",
            {

                payment:
                    Number(
                        paymentAmount ||
                        0
                    )

            }
        );


    openMessageComposer(
        context
    );

}


// ==========================================
// DUE TODAY MESSAGE
// ==========================================

function messageDueToday(
    loanId
) {

    messageLoan(
        loanId,
        "due"
    );

}


// ==========================================
// ARREARS MESSAGE
// ==========================================

function messageArrears(
    loanId
) {

    messageLoan(
        loanId,
        "arrears"
    );

}


// ==========================================
// COMPLETED MESSAGE
// ==========================================

function messageCompleted(
    loanId
) {

    messageLoan(
        loanId,
        "completed"
    );

}


// ==========================================
// GENERAL MESSAGE
// ==========================================

function messageGeneral(
    loanId
) {

    messageLoan(
        loanId,
        "general"
    );

}


// ==========================================
// GLOBAL FUNCTIONS
// ==========================================
//
// IMPORTANT:
// There are NO `export` statements here.
// This allows the file to work when loaded
// using a normal <script src="messages.js">
// tag.
// ==========================================

window.openMessageComposer =
    openMessageComposer;


window.closeMessageComposer =
    closeMessageComposer;


window.getGeneratedMessage =
    getGeneratedMessage;


window.normalizeMessagePhone =
    normalizeMessagePhone;


window.messageLoan =
    messageLoan;


window.messageApproval =
    messageApproval;


window.messageRepayment =
    messageRepayment;


window.messageDueToday =
    messageDueToday;


window.messageArrears =
    messageArrears;


window.messageCompleted =
    messageCompleted;


window.messageGeneral =
    messageGeneral;


window.getMessage =
    getMessage;


// ==========================================
// INITIALIZE AFTER DOM LOAD
// ==========================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            console.log(
                "GREYMUS Messages module ready."
            );

        }
    );

} else {

    console.log(
        "GREYMUS Messages module ready."
    );

}


// ==========================================
// END OF messages.js VERSION 2.0
// ==========================================