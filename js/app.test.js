import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTransfers, reserve, cancelReservation, reservations, pendingTransfers } from './app.js';

function makeDOM() {
  const items = [];

  const list = {
    children: [],
    _textContent: null,
    set innerHTML(_) {
      this.children.length = 0;
      items.length = 0;
    },
    get innerHTML() { return ''; },
    appendChild(el) {
      items.push(el.textContent);
      this.children.push(el);
    },
    set textContent(v) {
      this._textContent = v;
      this.children.length = 0;
      items.length = 0;
    },
    get textContent() { return this._textContent; }
  };

  const errorEl = {
    _textContent: null,
    set textContent(v) { this._textContent = v; },
    get textContent() { return this._textContent; }
  };

  return {
    doc: {
      getElementById: (id) => id === 'action-error' ? errorEl : list,
      createElement: (tag) => ({
        tag,
        textContent: '',
        children: [],
        listeners: {},
        appendChild(child) { this.children.push(child); },
        addEventListener(event, fn) { this.listeners[event] = fn; }
      }),
      addEventListener() {}
    },
    list,
    errorEl,
    items,
    getError: () => list._textContent,
    getActionError: () => errorEl._textContent
  };
}

// --- Tests existants (affichage de la liste) ---

test('affiche la liste des transferts si l\'API répond avec succès', async () => {
  const { doc, items } = makeDOM();
  global.document = doc;
  reservations.clear();
  global.fetch = async () => ({
    ok: true,
    json: async () => [
      { id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 10 }
    ]
  });

  await loadTransfers();

  assert.ok(items.length > 0, 'Aucun élément rendu dans la liste');
  assert.ok(items[0].includes('Papeete'), `Le texte ne contient pas la ville : "${items[0]}"`);
  assert.ok(
    !items[0].includes('undefined'),
    `Le texte contient "undefined" : "${items[0]}"`
  );
  assert.ok(items[0].includes('10 places'), `Le texte ne contient pas "10 places" : "${items[0]}"`);
});

test("affiche une erreur si l'API répond en non-2xx", async () => {
  const { doc, getError } = makeDOM();
  global.document = doc;
  reservations.clear();
  global.fetch = async () => ({ ok: false, status: 500 });

  await loadTransfers();

  const err = getError();
  assert.ok(err !== null, "Aucun message d'erreur affiché");
  assert.ok(err.includes('500'), `Le message d'erreur ne mentionne pas le code HTTP : "${err}"`);
});

test('affiche une erreur si le réseau est injoignable', async () => {
  const { doc, getError } = makeDOM();
  global.document = doc;
  reservations.clear();
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };

  await loadTransfers();

  const err = getError();
  assert.ok(err !== null, "Aucun message d'erreur affiché");
  assert.ok(
    err.includes('Failed to fetch'),
    `Le message d'erreur n'inclut pas la cause : "${err}"`
  );
});

// --- Tests d'acceptation : boutons Réserver / Annuler ---

test('affiche le bouton Réserver pour un transfert avec places disponibles', async () => {
  const { doc, list } = makeDOM();
  global.document = doc;
  reservations.clear();
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 5 }]
  });

  await loadTransfers();

  const liEl = list.children[0];
  assert.ok(liEl, 'Aucun élément dans la liste');
  const btn = liEl.children.find(c => c.textContent === 'Réserver');
  assert.ok(btn, 'Bouton Réserver absent pour un transfert avec places disponibles');
});

test('n\'affiche pas le bouton Réserver si seatsLeft = 0', async () => {
  const { doc, list } = makeDOM();
  global.document = doc;
  reservations.clear();
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 0 }]
  });

  await loadTransfers();

  const liEl = list.children[0];
  assert.ok(liEl, 'Aucun élément dans la liste');
  assert.equal(liEl.children.length, 0, 'Un bouton inattendu est présent pour seatsLeft = 0');
});

test('affiche le bouton Annuler si une réservation est active', async () => {
  const { doc, list } = makeDOM();
  global.document = doc;
  reservations.clear();
  reservations.set(1, 'uuid-1');
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 9 }]
  });

  await loadTransfers();

  const liEl = list.children[0];
  assert.ok(liEl, 'Aucun élément dans la liste');
  const btn = liEl.children.find(c => c.textContent === 'Annuler');
  assert.ok(btn, 'Bouton Annuler absent alors qu\'une réservation est active');
  reservations.clear();
});

// --- Tests d'acceptation : reserve() ---

test('reserve envoie POST /transfers/:id/reserve et stocke le reservationId', async () => {
  const { doc, items, list } = makeDOM();
  global.document = doc;
  reservations.clear();

  let callCount = 0;
  global.fetch = async (url, opts) => {
    callCount++;
    if (callCount === 1) {
      assert.ok(url.includes('/transfers/1/reserve'), `URL inattendue : ${url}`);
      assert.equal(opts?.method, 'POST');
      return { ok: true, json: async () => ({ reservationId: 'uuid-1', transferId: 1, seatsLeft: 9 }) };
    }
    // Second call: loadTransfers après réservation
    return {
      ok: true,
      json: async () => [{ id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 9 }]
    };
  };

  await reserve(1);

  assert.ok(reservations.has(1), 'reservationId non stocké dans reservations');
  assert.equal(reservations.get(1), 'uuid-1', 'reservationId incorrect');
  assert.ok(items.length > 0, 'La liste n\'a pas été rafraîchie après réservation');
  // Le bouton Annuler doit apparaître (réservation active)
  const liEl = list.children[0];
  const cancelBtn = liEl?.children?.find(c => c.textContent === 'Annuler');
  assert.ok(cancelBtn, 'Bouton Annuler absent après réservation réussie');
  reservations.clear();
});

test('reserve affiche une erreur si l\'API répond en non-2xx', async () => {
  const { doc, getActionError } = makeDOM();
  global.document = doc;
  reservations.clear();
  global.fetch = async () => ({ ok: false, status: 409 });

  await reserve(1);

  const err = getActionError();
  assert.ok(err !== null, "Aucun message d'erreur affiché");
  assert.ok(err.includes('409'), `Le message d'erreur ne mentionne pas le code : "${err}"`);
  assert.ok(!reservations.has(1), 'reservationId stocké malgré l\'erreur');
});

// --- Tests d'acceptation : cancelReservation() ---

test('cancelReservation envoie DELETE et supprime la réservation', async () => {
  const { doc, items, list } = makeDOM();
  global.document = doc;
  reservations.clear();
  reservations.set(1, 'uuid-1');

  let callCount = 0;
  global.fetch = async (url, opts) => {
    callCount++;
    if (callCount === 1) {
      assert.ok(url.includes('/transfers/1/reservations/uuid-1'), `URL inattendue : ${url}`);
      assert.equal(opts?.method, 'DELETE');
      return { ok: true, json: async () => ({ seatsLeft: 10 }) };
    }
    // Second call: loadTransfers après annulation
    return {
      ok: true,
      json: async () => [{ id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 10 }]
    };
  };

  await cancelReservation(1, 'uuid-1');

  assert.ok(!reservations.has(1), 'reservationId non supprimé de reservations');
  assert.ok(items.length > 0, 'La liste n\'a pas été rafraîchie après annulation');
  // Le bouton Réserver doit réapparaître (places libérées, plus de réservation active)
  const liEl = list.children[0];
  const reserveBtn = liEl?.children?.find(c => c.textContent === 'Réserver');
  assert.ok(reserveBtn, 'Bouton Réserver absent après annulation (places libérées)');
});

test('cancelReservation affiche une erreur si l\'API répond 404', async () => {
  const { doc, getActionError } = makeDOM();
  global.document = doc;
  reservations.clear();
  reservations.set(1, 'uuid-1');
  global.fetch = async () => ({ ok: false, status: 404 });

  await cancelReservation(1, 'uuid-1');

  const err = getActionError();
  assert.ok(err !== null, "Aucun message d'erreur affiché");
  assert.ok(err.includes('404'), `Le message d'erreur ne mentionne pas le code : "${err}"`);
  assert.ok(reservations.has(1), 'reservationId supprimé malgré l\'erreur');
  reservations.clear();
});

// --- Tests anti double-clic ---

test('reserve ignore un second appel si une opération est déjà en cours pour ce transfert', async () => {
  const { doc } = makeDOM();
  global.document = doc;
  reservations.clear();
  pendingTransfers.clear();
  pendingTransfers.add(1); // simule une opération en cours

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({ reservationId: 'uuid-1' }) };
  };

  await reserve(1);

  assert.equal(fetchCalled, false, 'fetch appelé malgré une opération en cours');
  assert.ok(!reservations.has(1), 'reservationId stocké malgré une opération en cours');
  pendingTransfers.clear();
  reservations.clear();
});

test('reserve ignore un appel si le transfert est déjà réservé dans reservations', async () => {
  const { doc } = makeDOM();
  global.document = doc;
  reservations.clear();
  pendingTransfers.clear();
  reservations.set(1, 'uuid-existant');

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({ reservationId: 'uuid-nouveau' }) };
  };

  await reserve(1);

  assert.equal(fetchCalled, false, 'fetch appelé malgré une réservation déjà active');
  assert.equal(reservations.get(1), 'uuid-existant', 'reservationId écrasé par un appel ignoré');
  reservations.clear();
});

test('cancelReservation ignore un second appel si une opération est déjà en cours pour ce transfert', async () => {
  const { doc } = makeDOM();
  global.document = doc;
  reservations.clear();
  pendingTransfers.clear();
  reservations.set(1, 'uuid-1');
  pendingTransfers.add(1); // simule une opération en cours

  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({}) };
  };

  await cancelReservation(1, 'uuid-1');

  assert.equal(fetchCalled, false, 'fetch appelé malgré une opération en cours');
  assert.ok(reservations.has(1), 'reservationId supprimé malgré une opération en cours');
  pendingTransfers.clear();
  reservations.clear();
});

// --- Tests de non-destruction de liste en cas d'erreur d'action ---

test('reserve conserve la liste des transferts en cas d\'erreur', async () => {
  const { doc, items, getActionError } = makeDOM();
  global.document = doc;
  reservations.clear();

  // Charger la liste initiale
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 5 }]
  });
  await loadTransfers();
  assert.ok(items.length > 0, 'Pré-condition : la liste doit être remplie');

  // Simuler un échec de réservation
  global.fetch = async () => ({ ok: false, status: 409 });
  await reserve(1);

  assert.ok(items.length > 0, 'La liste a été effacée par l\'erreur de réservation');
  const err = getActionError();
  assert.ok(err !== null && err.includes('409'), `L'erreur doit s'afficher dans la zone dédiée : "${err}"`);
});

test('cancelReservation conserve la liste des transferts en cas d\'erreur', async () => {
  const { doc, items, getActionError } = makeDOM();
  global.document = doc;
  reservations.clear();
  reservations.set(1, 'uuid-1');

  // Charger la liste initiale
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 0 }]
  });
  await loadTransfers();
  assert.ok(items.length > 0, 'Pré-condition : la liste doit être remplie');

  // Simuler un échec d'annulation
  global.fetch = async () => ({ ok: false, status: 404 });
  await cancelReservation(1, 'uuid-1');

  assert.ok(items.length > 0, 'La liste a été effacée par l\'erreur d\'annulation');
  const err = getActionError();
  assert.ok(err !== null && err.includes('404'), `L'erreur doit s'afficher dans la zone dédiée : "${err}"`);
  reservations.clear();
});
