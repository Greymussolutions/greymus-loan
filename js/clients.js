// js/clients.js

import {
    db
} from "./firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ELEMENTS

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


// INPUTS

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


// DATA CACHE

let clients = [];


// CLOSE MODAL

function safe(value) {

    if (value === undefined || value === null) {

        return "-";

    }

    if (String(value).trim() === "") {

        return "-";

    }

    return value;

}

}


// FORMAT TEXT

function safe(value) {

    return value || "-";

}


// DISPLAY CLIENTS

function renderClients(list) {

    if (!clientsTableBody) return;


    clientsTableBody.innerHTML = "";


    list.forEach((client) => {


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>${safe(client.name)}</td>

            <td>${safe(client.phone)}</td>

            <td>${safe(client.idNumber)}</td>

            <td>${safe(client.occupation)}</td>

            <td>${safe(client.guarantor)}</td>

            <td>${safe(client.createdBy || client.officer || client.createdByName)}</td>

            <td>

                <button class="edit-client"
                    data-id="${client.id}">
                    Edit
                </button>


                <button class="delete-client"
                    data-id="${client.id}">
                    Delete
                </button>

            </td>

        `;


        clientsTableBody.appendChild(row);


    });


    attachActions();

}


// LOAD CLIENTS

function loadClients() {


    const clientsRef =
        collection(
            db,
            "clients"
        );


    onSnapshot(
        clientsRef,
        (snapshot) => {


            clients = [];


            snapshot.forEach(
                (item) => {


                    clients.push({

                        id: item.id,

                        ...item.data()

                    });


                }
            );


            renderClients(
                clients
            );


        }
    );

}


// SAVE CLIENT

if (clientForm) {


    clientForm.addEventListener(
        "submit",
        async (e) => {


            e.preventDefault();


            const data = {

                name: clientName.value.trim(),

                phone: clientPhone.value.trim(),

                idNumber: clientIdNumber.value.trim(),

                occupation: clientOccupation.value.trim(),

                guarantor: clientGuarantor.value.trim(),

                guarantorPhone:
                    clientGuarantorPhone.value.trim(),

                security:
                    clientSecurity.value.trim(),

                updatedAt:
                    serverTimestamp()

            };


            try {


                if (clientId.value) {


                    await updateDoc(

                        doc(
                            db,
                            "clients",
                            clientId.value
                        ),

                        data

                    );


                } else {


                    await addDoc(

                        collection(
                            db,
                            "clients"
                        ),

                        {

                            ...data,

                            createdAt:
                                serverTimestamp(),

                            createdBy:
                                localStorage.getItem(
                                    "userRole"
                                ) || "User"

                        }

                    );


                }


                clientForm.reset();

                clientId.value = "";

                closeClientModal();



            } catch (error) {


                console.error(
                    "Client save error:",
                    error
                );


            }


        }
    );


}


// SEARCH CLIENTS

if (clientSearch) {


    clientSearch.addEventListener(
        "input",
        () => {


            const value =
                clientSearch.value
                    .toLowerCase();


            const filtered =
                clients.filter(
                    (client) => {


                        return (

                            client.name
                                ?.toLowerCase()
                                .includes(value)

                            ||

                            client.phone
                                ?.toLowerCase()
                                .includes(value)

                            ||

                            client.idNumber
                                ?.toLowerCase()
                                .includes(value)

                        );


                    }
                );


            renderClients(
                filtered
            );


        }
    );


}


// TABLE ACTIONS

function attachActions() {


    document
        .querySelectorAll(".edit-client")
        .forEach(
            (button) => {


                button.addEventListener(
                    "click",
                    () => {


                        const client =
                            clients.find(
                                c =>
                                c.id ===
                                button.dataset.id
                            );


                        if (!client) return;


                        clientId.value =
                            client.id;

                        clientName.value =
                            client.name || "";

                        clientPhone.value =
                            client.phone || "";

                        clientIdNumber.value =
                            client.idNumber || "";

                        clientOccupation.value =
                            client.occupation || "";

                        clientGuarantor.value =
                            client.guarantor || "";

                        clientGuarantorPhone.value =
                            client.guarantorPhone || "";

                        clientSecurity.value =
                            client.security || "";


                        clientModal.classList.remove(
                            "hidden"
                        );


                    }
                );


            }
        );



    document
        .querySelectorAll(".delete-client")
        .forEach(
            (button) => {


                button.addEventListener(
                    "click",
                    async () => {


                        await deleteDoc(

                            doc(
                                db,
                                "clients",
                                button.dataset.id
                            )

                        );


                    }
                );


            }
        );


}


// CLOSE BUTTONS

document
    .querySelectorAll(".close-modal")
    .forEach(
        (button) => {


            button.addEventListener(
                "click",
                closeClientModal
            );


        }
    );


// START

loadClients();


// EXPORT

export {
    loadClients
};
