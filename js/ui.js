// js/ui.js

// TAB NAVIGATION

const tabButtons =
    document.querySelectorAll(".tab-btn");

data-tab="settings"

const tabContents =
    document.querySelectorAll(".tab-content");


function showTab(tabName) {


    tabContents.forEach(
        tab => {

            tab.classList.add(
                "hidden"
            );

        }
    );


    const activeTab =
        document.getElementById(
            `${tabName}-tab`
        );


    if (activeTab) {

        activeTab.classList.remove(
            "hidden"
        );

    }



    tabButtons.forEach(
        button => {


            if (
                button.dataset.tab === tabName
            ) {

                button.classList.add(
                    "active"
                );


            } else {


                button.classList.remove(
                    "active"
                );


            }


        }
    );


}


// TAB CLICK EVENTS

tabButtons.forEach(
    button => {


        button.addEventListener(
            "click",
            () => {


                showTab(
                    button.dataset.tab
                );


            }
        );


    }
);


// MODAL CONTROL

const modals =
    document.querySelectorAll(".modal");


function closeAllModals(){


    modals.forEach(
        modal => {


            modal.classList.add(
                "hidden"
            );


        }
    );


}


// CLOSE BUTTONS

document
.querySelectorAll(".modal-close-btn")
.forEach(
    button => {


        button.addEventListener(
            "click",
            closeAllModals
        );


    }
);


document
.querySelectorAll(".secondary-btn")
.forEach(
    button => {


        button.addEventListener(
            "click",
            closeAllModals
        );


    }
);


// CLICK OUTSIDE MODAL CLOSE

modals.forEach(
    modal => {


        modal.addEventListener(
            "click",
            (event)=>{


                if(
                    event.target === modal
                ){

                    closeAllModals();

                }


            }
        );


    }
);


// NOTIFICATION PANEL

const notificationBtn =
    document.getElementById(
        "notification-btn"
    );


const notificationPanel =
    document.getElementById(
        "notification-panel"
    );


const closeNotifications =
    document.getElementById(
        "close-notifications"
    );



if(notificationBtn){

    notificationBtn.addEventListener(
        "click",
        ()=>{

            notificationPanel
            ?.classList.toggle(
                "hidden"
            );

        }
    );

}



if(closeNotifications){

    closeNotifications.addEventListener(
        "click",
        ()=>{

            notificationPanel
            ?.classList.add(
                "hidden"
            );

        }
    );

}


// TOAST SYSTEM

function showToast(message, type = "success") {


    const toast =
        document.getElementById(
            "toast"
        );


    if(!toast) return;


    toast.textContent =
        message;


    toast.className =
        `toast ${type}`;


    toast.classList.add(
        "show"
    );


    setTimeout(
        ()=>{


            toast.classList.remove(
                "show"
            );


        },
        3000
    );


}


// LOADING OVERLAY

function showLoading(){


    const loader =
        document.getElementById(
            "loading-overlay"
        );


    loader?.classList.remove(
        "hidden"
    );


}



function hideLoading(){


    const loader =
        document.getElementById(
            "loading-overlay"
        );


    loader?.classList.add(
        "hidden"
    );


}


// CONFIRMATION MODAL

let confirmCallback = null;


function confirmAction(
    message,
    callback
){


    const modal =
        document.getElementById(
            "confirm-modal"
        );


    const text =
        document.getElementById(
            "confirm-message"
        );


    if(!modal) return;


    text.textContent =
        message;


    confirmCallback =
        callback;


    modal.classList.remove(
        "hidden"
    );


}



const confirmYes =
    document.getElementById(
        "confirm-yes"
    );


const confirmNo =
    document.getElementById(
        "confirm-no"
    );



if(confirmYes){


confirmYes.addEventListener(
"click",
()=>{


if(confirmCallback){

    confirmCallback();

}


confirmCallback=null;

closeAllModals();


});

}



if(confirmNo){


confirmNo.addEventListener(
"click",
()=>{


confirmCallback=null;

closeAllModals();


});


}


// DEFAULT TAB

if (document.getElementById("dashboard-tab")) {

    showTab("dashboard");

}

// EXPORTS

export {

    showTab,
    showToast,
    showLoading,
    hideLoading,
    confirmAction

};
