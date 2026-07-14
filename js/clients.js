// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// clients.js
// Version 1.0 (Rebuilt)
// Part 1
// ==========================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const clientsTableBody =
    document.getElementById("clients-table-body");

const clientForm =
    document.getElementById("client-form");

const clientModal =
    document.getElementById("client-modal");

const clientSearch =
    document.getElementById("client-search");

const clientId =
    document.getElementById("client-id");

const clientName =
    document.getElementById("client-name");

const clientPhone =
    document.getElementById("client-phone");

const clientIdNumber =
    document.getElementById("client-id-number");

const clientOccupation =
    document.getElementById("client-occupation");

const clientGuarantor =
    document.getElementById("client-guarantor");

const clientGuarantorPhone =
    document.getElementById("client-guarantor-phone");

const clientSecurity =
    document.getElementById("client-security");

// ==========================================
// CLIENT LOAN HISTORY ELEMENTS
// ==========================================

const clientHistoryModal =
    document.getElementById("client-history-modal");

const closeHistoryModal =
    document.getElementById("close-history-modal");

const historyClientName =
    document.getElementById("history-client-name");

const historyTotalLoans =
    document.getElementById("history-total-loans");

const historyTotalBorrowed =
    document.getElementById("history-total-borrowed");

const historyBalance =
    document.getElementById("history-balance");

const historyTableBody =
    document.getElementById("client-history-body");

// ==========================================
// DATA
// ==========================================

let clients = [];

// Stores loan history for each client
let clientLoans = [];


// ==========================================
// HELPERS
// ==========================================

function safe(value) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return "-";

    }

    return value;

}

// ==========================================
// CURRENCY FORMAT
// ==========================================

function currency(value) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(Number(value) || 0);

}

// ==========================================
// SHOW CLIENT LOAN HISTORY
// ==========================================

function showClientLoanHistory(client) {

    if (!clientHistoryModal) return;

    const loans = getClientLoans(client.id);

    historyClientName.textContent =
        client.name || "-";

    historyTotalLoans.textContent =
        loans.length;

    const totalBorrowed = loans.reduce(

        (sum, loan) => sum + Number(loan.amount || 0),

        0

    );

    const totalBalance = loans.reduce(

        (sum, loan) => sum + Number(loan.balance || 0),

        0

    );

    historyTotalBorrowed.textContent =
        currency(totalBorrowed);

    historyBalance.textContent =
        currency(totalBalance);

    historyTableBody.innerHTML = "";

    if (loans.length === 0) {

        historyTableBody.innerHTML = `

            <tr>

                <td colspan="6" style="text-align:center;">

                    No loans found.

                </td>

            </tr>

        `;

    } else {

        loans.forEach((loan) => {

            const row = document.createElement("tr");

            row.innerHTML = `

                <td>${loan.id.substring(0,8)}</td>

                <td>${currency(loan.amount)}</td>

                <td>${loan.status || "-"}</td>

                <td>${loan.approvalDate || "-"}</td>

                <td>${loan.dueDate || "-"}</td>

                <td>${currency(loan.balance)}</td>

            `;

            historyTableBody.appendChild(row);

        });

    }

    clientHistoryModal.classList.remove("hidden");

}

// ==========================================
// CLOSE CLIENT HISTORY MODAL
// ==========================================

closeHistoryModal?.addEventListener("click", () => {

    clientHistoryModal.classList.add("hidden");

});

clientHistoryModal?.addEventListener("click", (e) => {

    if (e.target === clientHistoryModal) {

        clientHistoryModal.classList.add("hidden");

    }

});

// ==========================================
// OPEN / CLOSE MODAL
// ==========================================

function openClientModal() {

    if (!clientModal) return;

    clientModal.classList.remove("hidden");

}

function closeClientModal() {

    if (!clientModal) return;

    clientModal.classList.add("hidden");

    if (clientForm) {

        clientForm.reset();

    }

    if (clientId) {

        clientId.value = "";

    }

}


// ==========================================
// LOAD CLIENTS
// ==========================================

function loadClients() {

    const clientsRef = collection(db, "clients");

    onSnapshot(clientsRef, async (snapshot) => {

        clients = [];

        snapshot.forEach((docSnap) => {

            clients.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });

        // Load all loans for client history
        const loansSnapshot = await getDocs(
            collection(db, "loans")
        );

        clientLoans = [];

        loansSnapshot.forEach((docSnap) => {

            clientLoans.push({

                id: docSnap.id,

                ...docSnap.data()

            });

        });

        renderClients(clients);

       });

}

// ==========================================
// RENDER CLIENTS
// ==========================================

function renderClients(list) {

    if (!clientsTableBody) return;

    clientsTableBody.innerHTML = "";

    if (list.length === 0) {

        clientsTableBody.innerHTML = `

            <tr>

                <td colspan="7" style="text-align:center;padding:20px;">

                    No clients found.

                </td>

            </tr>

        `;

        return;

    }

    list.forEach((client) => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${safe(client.name)}</td>

            <td>${safe(client.phone)}</td>

            <td>${safe(client.idNumber)}</td>

            <td>${safe(client.occupation)}</td>

            <td>${safe(client.guarantor)}</td>

            <td>${safe(client.createdBy)}</td>

            <td>

    <button
        class="loan-history"
        data-id="${client.id}"
        title="Loan History">
        📋
    </button>

    <button
        class="edit-client"
        data-id="${client.id}"
        title="Edit Client">
        ✏️
    </button>

    <button
        class="delete-client"
        data-id="${client.id}"
        title="Delete Client">
        🗑️
    </button>

</td>

        `;

        clientsTableBody.appendChild(row);

    });

    attachActions();

}


// ==========================================
// SEARCH
// ==========================================

if (clientSearch) {

    clientSearch.addEventListener("input", () => {

        const keyword =
            clientSearch.value
            .trim()
            .toLowerCase();

        if (!keyword) {

            renderClients(clients);

            return;

        }

        const filtered = clients.filter((client) => {

            return (

                (client.name || "")
                    .toLowerCase()
                    .includes(keyword)

                ||

                (client.phone || "")
                    .toLowerCase()
                    .includes(keyword)

                ||

                (client.idNumber || "")
                    .toLowerCase()
                    .includes(keyword)

                ||

                (client.occupation || "")
                    .toLowerCase()
                    .includes(keyword)

                ||

                (client.guarantor || "")
                    .toLowerCase()
                    .includes(keyword)

            );

        });

        renderClients(filtered);

    });

}


// ==========================================
// NEW CLIENT BUTTON
// ==========================================

document
.getElementById("new-client-btn")
?.addEventListener("click", () => {

    openClientModal();

});


// ==========================================
// CLOSE BUTTONS
// ==========================================

document
.querySelectorAll(".close-modal")
.forEach((button) => {

    button.addEventListener(
        "click",
        closeClientModal
    );

});

// ==========================================
// SAVE / UPDATE CLIENT
// ==========================================

if (clientForm) {

    clientForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const clientData = {

            name: clientName.value.trim(),

            phone: clientPhone.value.trim(),

            idNumber: clientIdNumber.value.trim(),

            occupation: clientOccupation.value.trim(),

            guarantor: clientGuarantor.value.trim(),

            guarantorPhone: clientGuarantorPhone.value.trim(),

            security: clientSecurity.value.trim(),

createdBy:
    localStorage.getItem("userName") ||
    localStorage.getItem("userEmail") ||
    "Unknown Officer",

createdByEmail:
    localStorage.getItem("userEmail") || "",

updatedAt: serverTimestamp()

            
        };

        try {

            if (clientId.value) {

                await updateDoc(

                    doc(db, "clients", clientId.value),

                    clientData

                );

                alert("Client updated successfully.");

            } else {

                await addDoc(

    collection(db, "clients"),

    {

        ...clientData,

        createdAt: serverTimestamp()

    }

);
                alert("Client added successfully.");

            }

            closeClientModal();

        } catch (error) {

            console.error(error);

            alert("Failed to save client.");

        }

    });

}


// ==========================================
// EDIT / DELETE ACTIONS
// ==========================================

function attachActions() {

// ==========================================
// LOAN HISTORY
// ==========================================

document.querySelectorAll(".loan-history").forEach((button) => {

    button.onclick = () => {

    const client = clients.find(
        c => c.id === button.dataset.id
    );

    if (!client) return;

    showClientLoanHistory(client);

};

});

    document.querySelectorAll(".edit-client").forEach((button) => {

        button.onclick = () => {

            const client = clients.find(

                c => c.id === button.dataset.id

            );

            if (!client) return;

            clientId.value = client.id;

            clientName.value = client.name || "";

            clientPhone.value = client.phone || "";

            clientIdNumber.value = client.idNumber || "";

            clientOccupation.value = client.occupation || "";

            clientGuarantor.value = client.guarantor || "";

            clientGuarantorPhone.value = client.guarantorPhone || "";

            clientSecurity.value = client.security || "";

            openClientModal();

        };

    });

    document.querySelectorAll(".delete-client").forEach((button) => {

        button.onclick = async () => {

            const confirmed = confirm(
                "Delete this client?"
            );

            if (!confirmed) return;

            try {

                await deleteDoc(

                    doc(
                        db,
                        "clients",
                        button.dataset.id
                    )

                );

                alert("Client deleted successfully.");

            } catch (error) {

                console.error(error);

                alert("Failed to delete client.");

            }

        };

    });

}// ==========================================
// INITIALIZE
// ==========================================

loadClients();

// ==========================================
// GET CLIENT LOANS
// ==========================================

function getClientLoans(clientId) {

    return clientLoans.filter(

        loan => loan.clientId === clientId

    );

}

// ==========================================
// EXPORTS
// ==========================================

export {

    loadClients,

    renderClients,

    getClientLoans

};


// ==========================================
// END OF FILE
// ==========================================