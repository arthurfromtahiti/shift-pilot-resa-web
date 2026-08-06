// Front des transferts — consomme shift-pilot-resa-api.
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";

export async function loadTransfers() {
  const list = document.getElementById("transfers-list");
  try {
    const response = await fetch(`${API_BASE_URL}/transfers`);
    if (!response.ok) {
      throw new Error(`Erreur serveur : ${response.status}`);
    }
    const transfers = await response.json();

    list.innerHTML = "";
    for (const t of transfers) {
      const item = document.createElement("li");
      item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)`;
      list.appendChild(item);
    }
  } catch (err) {
    list.textContent = `Impossible de charger les transferts : ${err.message}`;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", loadTransfers);
}
