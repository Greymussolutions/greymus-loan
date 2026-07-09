// js/ui.js

import {
    openModal,
    closeModal,
    closeAllModals
} from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {

    initializeTabs();
    initializeModals();
    initializeNotifications();
    initializeFab();

});

// ======================================
// Tabs
// ======================================

function initializeTabs() {

    const buttons = document.querySelectorAll(".tab-btn");

    const clientsTab = document.getElementById("clients-tab");
    const loansTab = document.getElementById("loans-tab");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const tab = button.dataset.tab;

            buttons.forEach(btn => btn.classList.remove("active"));

            document
                .querySelectorAll(`.tab-btn[data-tab="${tab}"]`)
                .forEach(btn => btn.classList.add("active"));

            if (clientsTab) clientsTab.classList.add("hidden");
            if (loansTab) loansTab.classList.add("hidden");

            if (tab === "clients" && clientsTab) {
                clientsTab.classList.remove("hidden");
            }

            if (tab === "loans" && loansTab) {
                loansTab.classList.remove("hidden");
            }

        });

    });

}

// ======================================
// Modals
// ======================================

function initializeModals() {

    const newClientBtn = document.getElementById("new-client-btn");
    const newLoanBtn = document.getElementById("new-loan-btn");
    const fab = document.getElementById("fab-new-loan");

    if (newClientBtn) {

        newClientBtn.addEventListener("click", () => {
            openModal("client-modal");
        });

    }

    if (newLoanBtn) {

        newLoanBtn.addEventListener("click", () => {
            openModal("loan-modal");
        });

    }

    if (fab) {

        fab.addEventListener("click", () => {
            openModal("loan-modal");
        });

    }

    document.querySelectorAll(".close-modal").forEach(button => {
