import { test } from 'node:test';
import assert from 'node:assert/strict';

// Reproduit le bug : l'API retourne seatsLeft, mais app.js lisait availableSeats
test('affiche le nombre de places (seatsLeft) sans "undefined"', async () => {
  const capturedTexts = [];
  let capturedLoadTransfers;

  global.document = {
    getElementById: () => ({
      set innerHTML(_) {},
      get innerHTML() { return ''; },
      appendChild(el) { capturedTexts.push(el.textContent); }
    }),
    createElement: () => ({ textContent: '' }),
    addEventListener(event, fn) {
      if (event === 'DOMContentLoaded') capturedLoadTransfers = fn;
    }
  };

  global.fetch = async () => ({
    json: async () => [
      { id: 1, from: 'Papeete', to: 'Moorea', price: 3500, seatsLeft: 10 }
    ]
  });

  await import('./app.js');
  await capturedLoadTransfers();

  assert.ok(capturedTexts.length > 0, 'Aucun élément rendu dans la liste');
  assert.ok(
    !capturedTexts[0].includes('undefined'),
    `Le texte contient "undefined" : "${capturedTexts[0]}"`
  );
  assert.ok(
    capturedTexts[0].includes('10 places'),
    `Le texte ne contient pas "10 places" : "${capturedTexts[0]}"`
  );
});
