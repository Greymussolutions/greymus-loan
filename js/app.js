document.addEventListener("DOMContentLoaded", () => {
    console.log("Greymus Loan Financial Hub initialized.");

    const clientsTab = document.getElementById("clients-tab");
    const loansTab = document.getElementById("loans-tab");

    if (clientsTab) clientsTab.classList.remove("hidden");
    if (loansTab) loansTab.classList.add("hidden");

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");

            const tab = btn.dataset.tab;

            clientsTab.classList.toggle("hidden", tab !== "clients");
            loansTab.classList.toggle("hidden", tab !== "loans");
        });
    });

    console.log("Application ready.");
});
