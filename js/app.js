// Front des transferts — consomme shift-pilot-resa-api.
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";

async function loadTransfers() {
  const response = await fetch(`${API_BASE_URL}/transfers`);
  const transfers = await response.json();

  const list = document.getElementById("transfers-list");
  list.innerHTML = "";
  for (const t of transfers) {
    const item = document.createElement("li");
    item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)`;
    list.appendChild(item);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", loadTransfers);
}
