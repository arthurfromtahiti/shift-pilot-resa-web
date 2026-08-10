// Front des transferts — consomme shift-pilot-resa-api.
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";

// State: map transferId -> reservationId (réservations actives de l'utilisateur)
export const reservations = new Map();
// Set de transferIds avec une opération en cours (protection double-clic)
export const pendingTransfers = new Set();

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

      const reservationId = reservations.get(t.id);
      if (reservationId) {
        const btn = document.createElement("button");
        btn.textContent = "Annuler";
        btn.addEventListener("click", () => cancelReservation(t.id, reservationId));
        item.appendChild(btn);
      } else if (t.seatsLeft > 0) {
        const btn = document.createElement("button");
        btn.textContent = "Réserver";
        btn.addEventListener("click", () => reserve(t.id));
        item.appendChild(btn);
      }

      list.appendChild(item);
    }
  } catch (err) {
    list.textContent = `Impossible de charger les transferts : ${err.message}`;
  }
}

export async function reserve(transferId) {
  if (reservations.has(transferId) || pendingTransfers.has(transferId)) return;
  pendingTransfers.add(transferId);
  try {
    const response = await fetch(`${API_BASE_URL}/transfers/${transferId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seats: 1 }),
    });
    if (!response.ok) {
      throw new Error(`Erreur réservation : ${response.status}`);
    }
    const data = await response.json();
    reservations.set(transferId, data.reservationId);
    await loadTransfers();
  } catch (err) {
    document.getElementById("action-error").textContent = `Impossible de réserver : ${err.message}`;
  } finally {
    pendingTransfers.delete(transferId);
  }
}

export async function cancelReservation(transferId, reservationId) {
  if (pendingTransfers.has(transferId)) return;
  pendingTransfers.add(transferId);
  try {
    const response = await fetch(
      `${API_BASE_URL}/transfers/${transferId}/reservations/${reservationId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      throw new Error(`Erreur annulation : ${response.status}`);
    }
    reservations.delete(transferId);
    await loadTransfers();
  } catch (err) {
    document.getElementById("action-error").textContent = `Impossible d'annuler : ${err.message}`;
  } finally {
    pendingTransfers.delete(transferId);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", loadTransfers);
}
