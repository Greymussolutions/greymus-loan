// js/utils.js

// ===============================
// Currency Formatter
// ===============================
export function formatCurrency(amount = 0) {
    const value = Number(amount) || 0;

    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}

// ===============================
// Date Formatter
// ===============================
export function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

// ===============================
// Generate Loan Number
// ===============================
export function generateLoanNumber() {
    const now = new Date();

    const year = now.getFullYear();

    const random = Math.floor(Math.random() * 9000 + 1000);

    return `GL-${year}-${random}`;
}

// ===============================
// Toast Notification
// ===============================
export function showToast(message, type = "success") {

    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;

    toast.className = `toast ${type}`;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ===============================
// Loading Overlay
// ===============================
export function showLoader() {

    const overlay = document.getElementById("loading-overlay");

    if (overlay) {
        overlay.classList.remove("hidden");
    }
}

export function hideLoader() {

    const overlay = document.getElementById("loading-overlay");

    if (overlay) {
        overlay.classList.add("hidden");
    }
}

// ===============================
// Open Modal
// ===============================
export function openModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.remove("hidden");
    }
}

// ===============================
// Close Modal
// ===============================
export function closeModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.add("hidden");
    }
}

// ===============================
// Close All Modals
// ===============================
export function closeAllModals() {

    document.querySelectorAll(".modal").forEach(modal => {
        modal.classList.add("hidden");
    });
}

// ===============================
// Confirm Dialog
// ===============================
export function confirmAction(message, callback) {

    const modal = document.getElementById("confirm-modal");

    const text = document.getElementById("confirm-message");

    const yes = document.getElementById("confirm-yes");

    const no = document.getElementById("confirm-no");

    if (!modal) {
        if (confirm(message)) callback();
        return;
    }

    text.textContent = message;

    modal.classList.remove("hidden");

    yes.onclick = () => {
        modal.classList.add("hidden");
        callback();
    };

    no.onclick = () => {
        modal.classList.add("hidden");
    };
}

// ===============================
// Form Reset
// ===============================
export function resetForm(formId) {

    const form = document.getElementById(formId);

    if (form) {
        form.reset();
    }
}

// ===============================
// Debounce
// ===============================
export function debounce(func, delay = 300) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);

    };

}

// ===============================
// Random ID
// ===============================
export function generateId(prefix = "") {

    return (
        prefix +
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 8)
    );

}

// ===============================
// Empty State Helper
// ===============================
export function renderEmptyRow(tableBody, message, colspan) {

    tableBody.innerHTML = `
        <tr>
            <td colspan="${colspan}" style="text-align:center;padding:30px;">
                ${message}
            </td>
        </tr>
    `;

}

// ===============================
// Status Badge
// ===============================
export function statusBadge(status = "") {

    switch (status.toLowerCase()) {

        case "approved":
            return `<span class="badge success">Approved</span>`;

        case "pending":
            return `<span class="badge warning">Pending</span>`;

        case "rejected":
            return `<span class="badge danger">Rejected</span>`;

        case "arrears":
            return `<span class="badge arrears">Arrears</span>`;

        default:
            return `<span class="badge">${status}</span>`;
    }

}
