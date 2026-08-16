// =========================================================
// GREYMUS LOAN FINANCIAL HUB
// Firebase Cloud Functions
// Africa's Talking SMS Gateway
// =========================================================

const {
    onRequest
} = require("firebase-functions/v2/https");

const {
    defineSecret
} = require("firebase-functions/params");

const admin =
    require("firebase-admin");

const AfricasTalking =
    require("africastalking");


// =========================================================
// FIREBASE
// =========================================================

admin.initializeApp();


// =========================================================
// AFRICA'S TALKING SECRETS
// =========================================================
//
// These will be added securely later.
// DO NOT put the actual values here.
//

const AT_USERNAME =
    defineSecret("AT_USERNAME");

const AT_API_KEY =
    defineSecret("AT_API_KEY");


// =========================================================
// SEND SMS
// =========================================================

exports.sendGreymusSMS =
    onRequest(

        {
            secrets: [
                AT_USERNAME,
                AT_API_KEY
            ]
        },

        async (req, res) => {

            try {

                // -----------------------------------------
                // ONLY ACCEPT POST
                // -----------------------------------------

                if (
                    req.method !== "POST"
                ) {

                    return res.status(405).json({
                        success: false,
                        message:
                            "Method not allowed."
                    });

                }


                // -----------------------------------------
                // REQUEST DATA
                // -----------------------------------------

                const {
                    phone,
                    message
                } = req.body || {};


                // -----------------------------------------
                // VALIDATE PHONE
                // -----------------------------------------

                if (!phone) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Phone number is required."
                    });

                }


                // -----------------------------------------
                // VALIDATE MESSAGE
                // -----------------------------------------

                if (!message) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Message is required."
                    });

                }


                // -----------------------------------------
                // INITIALIZE AFRICA'S TALKING
                // -----------------------------------------

                const africastalking =
                    AfricasTalking({

                        username:
                            AT_USERNAME.value(),

                        apiKey:
                            AT_API_KEY.value()

                    });


                const sms =
                    africastalking.SMS;


                // -----------------------------------------
                // SEND SMS
                // -----------------------------------------

                const result =
                    await sms.send({

                        to: [
                            phone
                        ],

                        message:
                            message

                    });


                // -----------------------------------------
                // SUCCESS
                // -----------------------------------------

                return res.status(200).json({

                    success: true,

                    message:
                        "SMS sent successfully.",

                    result:
                        result

                });


            } catch (error) {

                console.error(
                    "GREYMUS SMS ERROR:",
                    error
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to send SMS."

                });

            }

        }

    );