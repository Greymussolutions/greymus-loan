// ui.js

export function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

export function showLoading() {
  document.getElementById("loading-overlay")?.classList.remove("hidden");
}

export function hideLoading() {
  document.getElementById("loading-overlay")?.classList.add("hidden");
}

export function openModal(id) {
  document.getElementById(id)?.classList.remove("hidden");
}

export function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
  }
