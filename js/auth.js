// ==========================================
// GREYMUS LOAN FINANCIAL HUB
// auth.js
// VERSION 4.0
// PART 1 OF 4
// ==========================================

console.log("auth.js loaded");

import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// SYSTEM ADMIN
// ==========================================

const ADMIN_EMAIL = "gayisi0901@gmail.com";


// ==========================================
// DOM ELEMENTS
// ==========================================

const loginSection =
    document.getElementById("login-section");

const dashboardSection =
    document.getElementById("dashboard-section");

const loginForm =
    document.getElementById("login-form");

const logoutBtn =
    document.getElementById("mobile-logout-btn");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loggedUser =
    document.getElementById("logged-user");

const loadingOverlay =
    document.getElementById("loading-overlay");


// ==========================================
// LOADER
// ==========================================

function showLoader(){

    if(loadingOverlay){

        loadingOverlay.classList.remove("hidden");

    }

}

function hideLoader(){

    if(loadingOverlay){

        loadingOverlay.classList.add("hidden");

    }

}


// ==========================================
// TOAST
// ==========================================

function showToast(message){

    const toast =
        document.getElementById("toast");

    if(!toast){

        alert(message);

        return;

    }

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}


// ==========================================
// ROLE HELPERS
// ==========================================

function isAdminEmail(email){

    return (
        email &&
        email.toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
    );

}

function defaultRole(email){

    return isAdminEmail(email)

        ? "Administrator"

        : "Loan Officer";

}// ==========================================
// PART 2 OF 4
// USER PROFILE & ROLE MANAGEMENT
// ==========================================

async function getUserRole(user){

    try{

        const userRef =
            doc(db,"users",user.uid);

        const snap =
            await getDoc(userRef);

        const role =
            defaultRole(user.email);

        const officerName =
            user.displayName ||
            user.email.split("@")[0];

        // ==================================
        // FIRST LOGIN
        // ==================================

        if(!snap.exists()){

            const profile={

                name: officerName,

                email: user.email,

                role: role,

                active: true,

                createdAt: serverTimestamp(),

                updatedAt: serverTimestamp()

            };

            await setDoc(

                userRef,

                profile

            );

            return profile;

        }

        // ==================================
        // EXISTING USER
        // ==================================

        const profile =
            snap.data();

        // Always make the official
        // admin account Administrator

        if(

            isAdminEmail(user.email) &&

            profile.role !== "Administrator"

        ){

            await setDoc(

                userRef,

                {

                    ...profile,

                    role:"Administrator",

                    updatedAt:
                        serverTimestamp()

                },

                {

                    merge:true

                }

            );

            profile.role =
                "Administrator";

        }

        // Always make every other user
        // Loan Officer

        if(

            !isAdminEmail(user.email) &&

            profile.role !== "Loan Officer"

        ){

            await setDoc(

                userRef,

                {

                    ...profile,

                    role:"Loan Officer",

                    updatedAt:
                        serverTimestamp()

                },

                {

                    merge:true

                }

            );

            profile.role =
                "Loan Officer";

        }

        return{

            name:
                profile.name ||
                officerName,

            email:
                profile.email ||
                user.email,

            role:
                profile.role

        };

    }

    catch(error){

        console.error(error);

        return{

            name:
                user.displayName ||
                user.email.split("@")[0],

            email:
                user.email,

            role:
                defaultRole(user.email)

        };

    }

}// ==========================================
// PART 3 OF 4
// LOGIN & AUTH STATE
// ==========================================

if(loginForm){

    loginForm.addEventListener("submit", async(e)=>{

        e.preventDefault();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value.trim();

        if(!email || !password){

            showToast(
                "Enter email and password."
            );

            return;

        }

        try{

            showLoader();

            const credential =

                await signInWithEmailAndPassword(

                    auth,

                    email,

                    password

                );

            const user =
                credential.user;

            const profile =
                await getUserRole(user);

            localStorage.setItem(
                "userRole",
                profile.role
            );

            localStorage.setItem(
                "userName",
                profile.name
            );

            localStorage.setItem(
                "userEmail",
                profile.email
            );

            showToast(
                `Welcome ${profile.name}`
            );

            loginForm.reset();

        }

        catch(error){

            console.error(error);

            switch(error.code){

                case "auth/invalid-email":

                    showToast(
                        "Invalid email."
                    );

                    break;

                case "auth/user-not-found":

                    showToast(
                        "User not found."
                    );

                    break;

                case "auth/wrong-password":

                case "auth/invalid-credential":

                    showToast(
                        "Incorrect email or password."
                    );

                    break;

                case "auth/network-request-failed":

                    showToast(
                        "Network error."
                    );

                    break;

                default:

                    showToast(
                        error.message
                    );

            }

        }

        finally{

            hideLoader();

        }

    });

}


// ==========================================
// AUTH STATE CHANGED
// ==========================================

onAuthStateChanged(auth, async(user)=>{

    if(user){

        const profile =
            await getUserRole(user);

        localStorage.setItem(
            "userRole",
            profile.role
        );

        localStorage.setItem(
            "userName",
            profile.name
        );

        localStorage.setItem(
            "userEmail",
            profile.email
        );

        if(loginSection){

            loginSection.classList.add(
                "hidden"
            );

        }

        if(dashboardSection){

            dashboardSection.classList.remove(
                "hidden"
            );

        }

        if(loggedUser){

            loggedUser.textContent =

                `${profile.name} (${profile.role})`;

        }

    }

    else{

        localStorage.removeItem("userRole");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");

        if(loginSection){

            loginSection.classList.remove(
                "hidden"
            );

        }

        if(dashboardSection){

            dashboardSection.classList.add(
                "hidden"
            );

        }

        if(loggedUser){

            loggedUser.textContent = "";

        }

    }

});// ==========================================
// PART 4 OF 4
// LOGOUT
// ==========================================

if(logoutBtn){

    logoutBtn.addEventListener("click", async()=>{

        try{

            showLoader();

            await signOut(auth);

            localStorage.removeItem("userRole");
            localStorage.removeItem("userName");
            localStorage.removeItem("userEmail");

            showToast(
                "Logged out successfully."
            );

        }

        catch(error){

            console.error(error);

            showToast(
                "Logout failed."
            );

        }

        finally{

            hideLoader();

        }

    });

}


// ==========================================
// ROLE HELPERS
// ==========================================

function getCurrentUserRole(){

    return (

        localStorage.getItem("userRole")

        || "Loan Officer"

    );

}

function getCurrentUserEmail(){

    return (

        localStorage.getItem("userEmail")

        || ""

    );

}

function getCurrentUserName(){

    return (

        localStorage.getItem("userName")

        || ""

    );

}

function isCurrentUserAdmin(){

    return (

        getCurrentUserRole()

        === "Administrator"

    );

}


// ==========================================
// EXPORTS
// ==========================================

export{

    getCurrentUserRole,

    getCurrentUserEmail,

    getCurrentUserName,

    isCurrentUserAdmin

};


// ==========================================
// END OF FILE
// GREYMUS LOAN FINANCIAL HUB
// auth.js
// VERSION 4.0
// ==========================================