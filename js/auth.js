// js/auth.js

import {
    auth,
    db
} from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// DOM ELEMENTS

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loggedUser = document.getElementById("logged-user");

const loadingOverlay = document.getElementById("loading-overlay");


// SHOW / HIDE LOADER

function showLoader() {

    if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
    }

}


function hideLoader() {

    if (loadingOverlay) {
        loadingOverlay.classList.add("hidden");
    }

}


// TOAST MESSAGE

function showToast(message) {

    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


// GET USER ROLE

async function getUserRole(uid) {

    try {

        const userRef = doc(db, "users", uid);

        const userSnap = await getDoc(userRef);


        if (userSnap.exists()) {

            return userSnap.data();

        }


        return {

            role: "Field Officer"

        };


    } catch (error) {

        console.error(
            "Role error:",
            error
        );


        return {

            role: "Field Officer"

        };

    }

}


// LOGIN

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const email =
                emailInput.value.trim();


            const password =
                passwordInput.value.trim();


            try {

                showLoader();


                const result =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    result.user;


                const profile =
                    await getUserRole(
                        user.uid
                    );


                localStorage.setItem(
                    "userRole",
                    profile.role
                );


                showToast(
                    "Login successful"
                );


                loginForm.reset();


            } catch (error) {


                console.error(
                    error
                );


                showToast(
                    "Login failed. Check email or password."
                );


            } finally {

                hideLoader();

            }

        }
    );

}


// AUTH STATE LISTENER

onAuthStateChanged(
    auth,
    async (user) => {


        if (user) {


            const profile =
                await getUserRole(
                    user.uid
                );


            localStorage.setItem(
                "userRole",
                profile.role
            );


            if (loginSection) {

                loginSection.classList.add(
                    "hidden"
                );

            }


            if (dashboardSection) {

                dashboardSection.classList.remove(
                    "hidden"
                );

            }


            if (loggedUser) {

                loggedUser.textContent =
                    `${user.email} (${profile.role})`;

            }


        } else {


            if (loginSection) {

                loginSection.classList.remove(
                    "hidden"
                );

            }


            if (dashboardSection) {

                dashboardSection.classList.add(
                    "hidden"
                );

            }


            if (loggedUser) {

                loggedUser.textContent = "";

            }


        }

    }
);


// LOGOUT

if (logoutBtn) {


    logoutBtn.addEventListener(
        "click",
        async () => {


            try {


                showLoader();


                await signOut(
                    auth
                );


                localStorage.removeItem(
                    "userRole"
                );


                showToast(
                    "Logged out successfully"
                );


            } catch (error) {


               
