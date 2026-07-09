// js/ui.js

// TAB NAVIGATION

const tabButtons =
    document.querySelectorAll(".tab-btn");

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
