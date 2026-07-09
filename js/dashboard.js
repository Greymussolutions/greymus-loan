// dashboard.js

import { getClients } from "./clients.js";
import { getLoans } from "./loans.js";
import { formatCurrency } from "./utils.js";

export async function loadDashboard() {
  const clients = await getClients();
  const loans = await getLoans();

  document.getElementById("stat-clients").textContent = clients.length;
  document.getElementById("stat-pending").textContent =
    loans.filter(l => l.status === "Pending").length;
  document.getElementById("stat-approved").textContent =
    loans.filter(l => l.status === "Approved").length;
  document.getElementById("stat-rejected").textContent =
    loans.filter(l => l.status === "Rejected").length;

  const portfolio = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);

  document.getElementById("stat-portfolio").textContent =
    formatCurrency(portfolio);
                                  }
