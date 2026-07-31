'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, fireInput } = require('./helpers/app');

const seedItems = [
  { id: '1', phrase: 'bite the bullet', meaning: 'endure something painful', source: 'Sam said it on standup', created: '2026-01-01T10:00:00.000Z', due: '2026-01-01', status: 'known', seen: 2 },
  { id: '2', phrase: 'spill the beans', meaning: 'reveal a secret', source: 'office gossip', created: '2026-01-02T10:00:00.000Z', due: '2026-01-02', status: 'new', seen: 0 },
  { id: '3', phrase: 'hit the sack', meaning: 'go to sleep', source: 'roommate at midnight', created: '2026-01-03T10:00:00.000Z', due: '2026-01-03', status: 'new', seen: 0 },
  { id: '4', phrase: 'under the weather', meaning: 'feeling slightly ill', source: 'coworker email', created: '2026-01-04T10:00:00.000Z', due: '2026-01-04', status: 'new', seen: 0 }
];

function goWords(window) {
  window.document.querySelector('nav button[data-tab="words"]').click();
}

test('the Words tab lists every saved phrase with no search text', () => {
  const dom = loadApp({ seedItems });
  const { window } = dom;
  goWords(window);

  const cards = window.document.querySelectorAll('#list .card');
  assert.equal(cards.length, 4);
});

test('searching narrows the list by a match in the phrase itself', () => {
  const dom = loadApp({ seedItems });
  const { window } = dom;
  goWords(window);

  fireInput(window, window.document.getElementById('search'), 'beans');

  const cards = window.document.querySelectorAll('#list .card');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].dataset.id, '2');
});

test('searching narrows the list by a match in the meaning', () => {
  const dom = loadApp({ seedItems });
  const { window } = dom;
  goWords(window);

  fireInput(window, window.document.getElementById('search'), 'secret');

  const cards = window.document.querySelectorAll('#list .card');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].dataset.id, '2');
});

test('searching narrows the list by a match in the source/context', () => {
  const dom = loadApp({ seedItems });
  const { window } = dom;
  goWords(window);

  fireInput(window, window.document.getElementById('search'), 'roommate');

  const cards = window.document.querySelectorAll('#list .card');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].dataset.id, '3');
});

test('search is case-insensitive', () => {
  const dom = loadApp({ seedItems });
  const { window } = dom;
  goWords(window);

  fireInput(window, window.document.getElementById('search'), 'SAM');

  const cards = window.document.querySelectorAll('#list .card');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].dataset.id, '1');
});

test('a query matching nothing shows the "nothing matches" empty state', () => {
  const dom = loadApp({ seedItems });
  const { window } = dom;
  goWords(window);

  fireInput(window, window.document.getElementById('search'), 'zzzznonexistent');

  const cards = window.document.querySelectorAll('#list .card');
  assert.equal(cards.length, 0);
  const empty = window.document.querySelector('#list .empty');
  assert.ok(empty, 'empty state should render');
  assert.match(empty.textContent, /Nothing matches/);
  assert.match(empty.textContent, /zzzznonexistent/);
});

test('an empty phrasebook shows the "no phrases yet" empty state, not "nothing matches"', () => {
  const dom = loadApp({ seedItems: [] });
  const { window } = dom;
  goWords(window);

  const empty = window.document.querySelector('#list .empty');
  assert.ok(empty);
  assert.match(empty.textContent, /No phrases yet/);
});

test('clearing the search restores the full list', () => {
  const dom = loadApp({ seedItems });
  const { window } = dom;
  goWords(window);

  const search = window.document.getElementById('search');
  fireInput(window, search, 'beans');
  assert.equal(window.document.querySelectorAll('#list .card').length, 1);

  fireInput(window, search, '');
  assert.equal(window.document.querySelectorAll('#list .card').length, 4);
});
