// =====================================================
// utils.js
// Part 1
// =====================================================

// ---------------------------
// Currency Formatter
// ---------------------------

export function formatCurrency(amount) {

    amount = Number(amount) || 0;

    return new Intl.NumberFormat("en-KE", {

        style: "currency",

        currency: "KES",

        minimumFractionDigits: 2

    }).format(amount);

}

// ---------------------------
// Number Formatter
// ---------------------------

export function formatNumber(number) {

    return new Intl.NumberFormat("en-KE").format(

        Number(number) || 0

    );

}

// ---------------------------
// Percentage Formatter
// ---------------------------

export function formatPercentage(value) {

    return `${Number(value || 0).toFixed(2)}%`;

}

// ---------------------------
// Today's Date
// ---------------------------

export function today() {

    return new Date().toISOString().split("T")[0];

}

// ---------------------------
// Format Date
// ---------------------------

export function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleDateString(

        "en-KE",

        {

            year: "numeric",

            month: "short",

            day: "numeric"

        }

    );

}

// ---------------------------
// Add Days
// ---------------------------

export function addDays(date, days) {

    const newDate = new Date(date);

    newDate.setDate(

        newDate.getDate() + Number(days)

    );

    return newDate;

}

// ---------------------------
// Add Weeks
// ---------------------------

export function addWeeks(date, weeks) {

    return addDays(

        date,

        Number(weeks) * 7

    );

}

// ---------------------------
// Generate Loan Number
// ---------------------------

export function generateLoanNumber() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(

        now.getMonth() + 1

    ).padStart(2, "0");

    const day = String(

        now.getDate()

    ).padStart(2, "0");

    const random = Math.floor(

        Math.random() * 9000 + 1000

    );

    return `GL-${year}${month}${day}-${random}`;

}

// ---------------------------
// Calculate Interest
// ---------------------------

export function calculateInterest(

    principal,

    rate

) {

    principal = Number(principal);

    rate = Number(rate);

    return principal * (rate / 100);

}

// ---------------------------
// Calculate Processing Fee
// ---------------------------

export function calculateProcessingFee(

    principal,

    percentage

) {

    return Number(principal) *

        (Number(percentage) / 100);

}

// ---------------------------
// Calculate Total Repayment
// ---------------------------

export function calculateTotalRepayment(

    principal,

    interest,

    processingFee

) {

    return (

        Number(principal) +

        Number(interest) +

        Number(processingFee)

    );

}// =====================================================
// utils.js
// Part 2
// =====================================================

// ---------------------------
// Calculate Weekly Repayment
// ---------------------------

export function calculateWeeklyRepayment(

    totalRepayment,

    durationMonths

) {

    const weeks = Number(durationMonths) * 4;

    if (weeks <= 0) return 0;

    return Number(totalRepayment) / weeks;

}

// ---------------------------
// Generate Repayment Schedule
// First repayment starts 7 days after application
// ---------------------------

export function generateRepaymentSchedule(

    principal,

    interestRate,

    processingFee,

    durationMonths,

    applicationDate = new Date()

) {

    principal = Number(principal);

    interestRate = Number(interestRate);

    processingFee = Number(processingFee);

    durationMonths = Number(durationMonths);

    const interest = calculateInterest(

        principal,

        interestRate

    );

    const totalRepayment = calculateTotalRepayment(

        principal,

        interest,

        processingFee

    );

    const weeks = durationMonths * 4;

    const weeklyPayment = totalRepayment / weeks;

    let balance = totalRepayment;

    const schedule = [];

    const firstPaymentDate = addDays(

        applicationDate,

        7

    );

    for (let week = 1; week <= weeks; week++) {

        const paymentDate = addWeeks(

            firstPaymentDate,

            week - 1

        );

        balance -= weeklyPayment;

        schedule.push({

            week,

            date: paymentDate.toISOString().split("T")[0],

            amount: Number(

                weeklyPayment.toFixed(2)

            ),

            balance: Math.max(

                0,

                Number(balance.toFixed(2))

            ),

            paid: false

        });

    }

    return schedule;

}

// ---------------------------
// Remaining Balance
// ---------------------------

export function calculateBalance(

    totalRepayment,

    amountPaid

) {

    return Math.max(

        0,

        Number(totalRepayment) -

        Number(amountPaid)

    );

}

// ---------------------------
// Collection Rate
// ---------------------------

export function calculateCollectionRate(

    totalCollected,

    totalExpected

) {

    if (Number(totalExpected) === 0)

        return 0;

    return (

        Number(totalCollected) /

        Number(totalExpected)

    ) * 100;

}

// ---------------------------
// Loan Status
// ---------------------------

export function determineLoanStatus(

    balance,

    dueDate

) {

    if (Number(balance) <= 0)

        return "Completed";

    const todayDate = new Date();

    const repaymentDate = new Date(dueDate);

    if (repaymentDate < todayDate)

        return "Arrears";

    return "Approved";

}

// ---------------------------
// Random ID
// ---------------------------

export function generateId(length = 20) {

    const chars =

        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let id = "";

    for (let i = 0; i < length; i++) {

        id += chars.charAt(

            Math.floor(

                Math.random() * chars.length

            )

        );

    }

    return id;

}// =====================================================
// utils.js
// Part 3
// =====================================================

// ---------------------------
// Loan Summary
// ---------------------------

export function calculateLoanSummary(

    principal,

    interestRate,

    processingFeeRate,

    durationMonths

) {

    principal = Number(principal) || 0;

    interestRate = Number(interestRate) || 0;

    processingFeeRate = Number(processingFeeRate) || 0;

    durationMonths = Number(durationMonths) || 1;

    const interest = calculateInterest(
        principal,
        interestRate
    );

    const processingFee = calculateProcessingFee(
        principal,
        processingFeeRate
    );

    const totalRepayment = calculateTotalRepayment(
        principal,
        interest,
        processingFee
    );

    const weeks = durationMonths * 4;

    const weeklyRepayment =
        calculateWeeklyRepayment(
            totalRepayment,
            durationMonths
        );

    return {

        principal,

        interest,

        processingFee,

        totalRepayment,

        weeks,

        weeklyRepayment

    };

}

// ---------------------------
// Search Filter
// ---------------------------

export function searchRecords(records, keyword) {

    if (!keyword) return records;

    keyword = keyword.toLowerCase();

    return records.filter(record =>

        Object.values(record).some(value =>

            String(value)
                .toLowerCase()
                .includes(keyword)

        )

    );

}

// ---------------------------
// Sort Records
// ---------------------------

export function sortRecords(

    records,

    field,

    ascending = true

) {

    return [...records].sort((a, b) => {

        if (a[field] < b[field])

            return ascending ? -1 : 1;

        if (a[field] > b[field])

            return ascending ? 1 : -1;

        return 0;

    });

}

// ---------------------------
// Status Filter
// ---------------------------

export function filterByStatus(

    loans,

    status

) {

    if (

        !status ||

        status === "ALL"

    ) {

        return loans;

    }

    return loans.filter(

        loan => loan.status === status

    );

}

// ---------------------------
// Validate Email
// ---------------------------

export function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}

// ---------------------------
// Validate Phone
// ---------------------------

export function isValidPhone(phone) {

    return /^[0-9]{10,15}$/.test(

        String(phone)

    );

}

// ---------------------------
//
