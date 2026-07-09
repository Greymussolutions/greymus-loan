// utils.js

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0
  }).format(amount || 0);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-KE");
}

export function generateLoanNumber() {
  return "LN-" + Date.now();
}
