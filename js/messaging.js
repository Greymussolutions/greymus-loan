// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// messaging.js
// VERSION 1.0
//
// Manual client messaging - NO API REQUIRED
// ✔ WhatsApp
// ✔ SMS
// ✔ Copy message
// ✔ Automatic loan/client data
// ==========================================

let messageModal = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function money(value) {
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function dateText(value) {
    if (!value) return "-";

    const date = value?.toDate?.() || new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-KE", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function normalizePhone(phone) {
    let value = String(phone || "").trim();

    if (!value) return "";

    value = value.replace(/[\s()-]/g, "");

    if (value.startsWith("00")) {
        value = value.slice(2);
    }

    if (value.startsWith("+")) {
        value = value.slice(1);
    }

    // Kenya local number: 07xxxxxxxx / 01xxxxxxxx
    if (/^0[17]\d{8}$/.test(value)) {
        value = "254" + value.slice(1);
    }

    return value;
}

function getClientName(context) {
    return (
        context?.client?.name ||
        context?.loan?.clientName ||
        "Client"
    ).trim();
}

function getPhone(context) {
    return normalizePhone(
        context?.client?.phone ||
        context?.loan?.clientPhone ||
        ""
    );
}

function getLoanAmount(context) {
    return Number(
        context?.loan?.amount || 0
    );
}

function getWeeklyPayment(context) {
    return Number(
        context?.loan?.weeklyPayment ||
        context?.loan?.repayment ||
        context?.due ||
        0
    );
}

function getOutstanding(context) {
    if (context?.outstanding !== undefined) {
        return Number(context.outstanding) || 0;
    }

    return Number(
        context?.loan?.balance || 0
    );
}

function getMessage(context) {
    const name = getClientName(context);
    const loanAmount = getLoanAmount(context);
    const weeklyPayment = getWeeklyPayment(context);
    const outstanding = getOutstanding(context);
    const dueDate = dateText(context?.dueDate);
    const arrears = Number(context?.arrears || 0);
    const overdueInstallments = Number(
        context?.overdueInstallments || 0
    );
    const payment = Number(context?.payment || 0);

    switch (context?.type) {
        case "approved":
            return `Dear ${name}, your GREYMUS loan of ${money(loanAmount)} has been approved successfully. Your weekly repayment is ${money(weeklyPayment)}. Your current outstanding balance is ${money(outstanding)}. Please make your repayments on time.\n\nWith regard,\nGREYMUS`;

        case "payment":
            return `Dear ${name}, GREYMUS has received your loan repayment of ${money(payment)}. Your current outstanding balance is ${money(outstanding)}. Thank you for making your repayment.\n\nWith regard,\nGREYMUS`;

        case "due":
            return `Dear ${name}, this is a reminder from GREYMUS that your loan repayment of ${money(context?.due || weeklyPayment)} is due today. Your current outstanding balance is ${money(outstanding)}. Please make your repayment on time.\n\nWith regard,\nGREYMUS`;

        case "dueSoon":
            return `Dear ${name}, this is a reminder from GREYMUS that your loan repayment of ${money(context?.due || weeklyPayment)} is due on ${dueDate}. Your current outstanding balance is ${money(outstanding)}. Please ensure your repayment is made on time.\n\nWith regard,\nGREYMUS`;

        case "arrears":
            return `Dear ${name}, your GREYMUS loan is currently in arrears. You have ${overdueInstallments} overdue repayment${overdueInstallments === 1 ? "" : "s"} totaling ${money(arrears)}. Your current outstanding balance is ${money(outstanding)}. Please make your repayments as soon as possible.\n\nWith regard,\nGREYMUS`;

        default:
            return `Dear ${name}, this is a message from GREYMUS regarding your loan. Your current outstanding balance is ${money(outstanding)}. Please contact GREYMUS for further information.\n\nWith regard,\nGREYMUS`;
    }
}

function ensureModal() {
    if (messageModal && document.body.contains(messageModal)) {
        return messageModal;
    }

    messageModal = document.createElement("div");
    messageModal.id = "greymus-message-modal";
    messageModal.className = "greymus-message-modal hidden";
    messageModal.innerHTML = `
        <div class="greymus-message-overlay" data-message-close="true"></div>
        <div class="greymus-message-dialog" role="dialog" aria-modal="true" aria-labelledby="greymus-message-title">
            <div class="greymus-message-header">
                <div>
                    <span class="greymus-message-kicker">GREYMUS</span>
                    <h2 id="greymus-message-title">Send Message</h2>
                </div>
                <button type="button" class="greymus-message-close" data-message-close="true" aria-label="Close">&times;</button>
            </div>

            <div class="greymus-message-recipient" id="greymus-message-recipient"></div>

            <label class="greymus-message-label" for="greymus-message-text">Message</label>
            <textarea id="greymus-message-text" class="greymus-message-text" rows="9"></textarea>

            <div class="greymus-message-actions">
                <button type="button" class="greymus-message-btn whatsapp" id="greymus-message-whatsapp">💬 WhatsApp</button>
                <button type="button" class="greymus-message-btn sms" id="greymus-message-sms">📱 SMS</button>
                <button type="button" class="greymus-message-btn copy" id="greymus-message-copy">📋 Copy</button>
            </div>
        </div>
    `;

    document.body.appendChild(messageModal);

    const close = () => closeMessageComposer();

    messageModal.addEventListener("click", event => {
        if (event.target.closest("[data-message-close='true']")) {
            close();
        }
    });

    document
        .getElementById("greymus-message-whatsapp")
        ?.addEventListener("click", () => {
            const phone = messageModal.dataset.phone || "";
            const text = document.getElementById("greymus-message-text")?.value || "";

            if (!phone) {
                alert("This client does not have a valid phone number.");
                return;
            }

            window.open(
                `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
                "_blank"
            );
        });

    document
        .getElementById("greymus-message-sms")
        ?.addEventListener("click", () => {
            const phone = messageModal.dataset.phone || "";
            const text = document.getElementById("greymus-message-text")?.value || "";

            if (!phone) {
                alert("This client does not have a valid phone number.");
                return;
            }

            window.location.href =
                `sms:${phone}?body=${encodeURIComponent(text)}`;
        });

    document
        .getElementById("greymus-message-copy")
        ?.addEventListener("click", async () => {
            const textarea = document.getElementById("greymus-message-text");
            const text = textarea?.value || "";

            try {
                await navigator.clipboard.writeText(text);
                alert("Message copied successfully.");
            } catch (error) {
                textarea?.focus();
                textarea?.select();
                document.execCommand("copy");
                alert("Message copied successfully.");
            }
        });

    return messageModal;
}

export function openMessageComposer(context = {}) {
    const modal = ensureModal();
    const message = getMessage(context);
    const phone = getPhone(context);
    const name = getClientName(context);

    modal.dataset.phone = phone;
    modal.dataset.clientName = name;

    const title =
        context.type === "approved"
            ? "Loan Approved"
            : context.type === "payment"
                ? "Payment Confirmation"
                : context.type === "due"
                    ? "Repayment Due Today"
                    : context.type === "arrears"
                        ? "Arrears Reminder"
                        : "Send Message";

    const titleElement =
        document.getElementById("greymus-message-title");

    const recipientElement =
        document.getElementById("greymus-message-recipient");

    const textarea =
        document.getElementById("greymus-message-text");

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (recipientElement) {
        recipientElement.innerHTML = `
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(phone || "No phone number")}</span>
        `;
    }

    if (textarea) {
        textarea.value = message;
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    setTimeout(() => textarea?.focus(), 50);
}

export function closeMessageComposer() {
    if (!messageModal) return;

    messageModal.classList.add("hidden");

    if (!document.querySelector(".modal:not(.hidden)")) {
        document.body.style.overflow = "";
    }
}

export function getGeneratedMessage(context = {}) {
    return getMessage(context);
}

export function normalizeMessagePhone(phone) {
    return normalizePhone(phone);
}
