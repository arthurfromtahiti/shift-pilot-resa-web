import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTransfers } from './app.js';

function makeDOM() {
  const items = [];
  let errorText = null;
  const list = {
    set innerHTML(_) {},
    get innerHTML() { return ''; },
    appendChild(el) { items.push(el.textContent); },
    set textContent(v) { errorText = v; },
    get textContent() { return errorText; }
  };
  return {
    doc: {
      getElementById: () => list,
      createElement: () => ({ textContent: '' }),
      addEventListener() {}
    },
    items,
    getError: () => errorText
  };
}

test('affiche la liste des transferts si l\'API répond avec succès', async () => {
  const { doc, items } = makeDOM();
  global.document = doc;
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
  global.fetch = async () => ({ ok: false, status: 500 });

  await loadTransfers();

  const err = getError();
  assert.ok(err !== null, "Aucun message d'erreur affiché");
  assert.ok(err.includes('500'), `Le message d'erreur ne mentionne pas le code HTTP : "${err}"`);
});

test('affiche une erreur si le réseau est injoignable', async () => {
  const { doc, getError } = makeDOM();
  global.document = doc;
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };

  await loadTransfers();

  const err = getError();
  assert.ok(err !== null, "Aucun message d'erreur affiché");
  assert.ok(
    err.includes('Failed to fetch'),
    `Le message d'erreur n'inclut pas la cause : "${err}"`
  );
});
