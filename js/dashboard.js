// js/dashboard.js

import {
    db
} from "./firebase.js";

import {
    collection,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// DASHBOARD ELEMENTS

const portfolioStat =
    document.getElementById("stat-portfolio");

const clientsStat =
    document.getElementById("stat-clients");

const revenueStat =
    document.getElementById("stat-revenue");

const pendingStat =
    document.getElementById("stat-pending");

const approvedStat =
    document.getElementById("stat-approved");

const rejectedStat =
    document.getElementById("stat-rejected");

const arrearsStat =
    document.getElementById("stat-arrears");


// FORMAT CURRENCY

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
        }
    ).format(amount || 0);

}


// LOAD CLIENT STATISTICS

function loadClientsCount() {

    const clientsRef =
        collection(
            db,
            "clients"
        );


    onSnapshot(
        clientsRef,
        (snapshot) => {

            if (clientsStat) {

                clientsStat.textContent =
                    snapshot.size;

            }

        }
    );

}


// LOAD LOAN STATISTICS

function loadLoanStatistics() {

    const loansRef =
        collection(
            db,
            "loans"
        );


    onSnapshot(
        loansRef,
        (snapshot) => {


            let portfolio = 0;
            let revenue = 0;

            let pending = 0;
            let approved = 0;
            let rejected = 0;
            let arrears = 0;



            snapshot.forEach(
                (doc) => {

                    const loan =
                        doc.data();


                    const amount =
                        Number(
                            loan.amount ||
                            loan.loanAmount ||
                            0
                        );


                    const interest =
                        Number(
                            loan.interest ||
                            0
                        );


                    const status =
                        loan.status ||
                        "Pending";



                    if (
                        status === "Approved"
                    ) {

                        portfolio += amount;

                        approved++;


                    } else if (
                        status === "Pending"
                    ) {

                        pending++;


                    } else if (
                        status === "Rejected"
                    ) {

                        rejected++;


                    } else if (
                        status === "Arrears"
                    ) {

                        arrears++;

                    }



                    revenue +=
                        amount *
                        (interest / 100);


                }
            );



            if (portfolioStat) {

                portfolioStat.textContent =
                    formatCurrency(
                        portfolio
                    );

            }


            if (revenueStat) {

                revenueStat.textContent =
                    formatCurrency(
                        revenue
                    );

            }


            if (pendingStat) {

                pendingStat.textContent =
                    pending;

            }


            if (approvedStat) {

                approvedStat.textContent =
                    approved;

            }


            if (rejectedStat) {

                rejectedStat.textContent =
                    rejected;

            }


            if (arrearsStat) {

                arrearsStat.textContent =
                    arrears;

            }


        }
    );

}


// QUICK ACTION BUTTONS

const newClientBtn =
    document.getElementById(
        "new-client-btn"
    );


const newLoanBtn =
    document.getElementById(
        "new-loan-btn"
    );


const fabLoan =
    document.getElementById(
        "fab-new-loan"
    );



function openModal(id) {

    const modal =
        document.getElementById(id);


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}



if (newClientBtn) {

    newClientBtn.addEventListener(
        "click",
        () => {

            openModal(
                "client-modal"
            );

        }
    );

}



if (newLoanBtn) {

    newLoanBtn.addEventListener(
        "click",
        () => {

            openModal(
                "loan-modal"
            );

        }
    );

}



if (fabLoan) {

    fabLoan.addEventListener(
        "click",
        () => {

            openModal(
                "loan-modal"
            );

        }
    );

}



// INITIALIZE DASHBOARD

loadClientsCount();

loadLoanStatistics();


// EXPORT

export {

    formatCurrency

};
