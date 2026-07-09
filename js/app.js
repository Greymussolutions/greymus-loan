// js/app.js

import {
    auth
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    showLoading,
    hideLoading
} from "./ui.js";


// APPLICATION INITIALIZATION

function initializeApp() {


    console.log(
        "Greymus Loan Financial Hub started"
    );


    setupAuthWatcher();

    setupGlobalEvents();


}


// AUTH WATCHER

function setupAuthWatcher() {


    onAuthStateChanged(
        auth,
        (user)=>{


            if(user){


                console.log(
                    "Active user:",
                    user.email
                );


            } else {


                console.log(
                    "No active user"
                );


            }


        }
    );


}


// GLOBAL EVENTS

function setupGlobalEvents(){


    // PREVENT DOUBLE FORM SUBMISSION

    document
    .querySelectorAll("form")
    .forEach(
        form=>{


            form.addEventListener(
                "submit",
                ()=>{


                    const button =
                        form.querySelector(
                            "button[type='submit']"
                        );


                    if(button){


                        button.disabled =
                            true;


                        setTimeout(
                            ()=>{


                                button.disabled =
                                    false;


                            },
                            2000
                        );


                    }


                }
            );


        }
    );



    // ESCAPE KEY
