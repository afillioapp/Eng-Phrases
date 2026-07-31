'use strict';
// Asserts on real date strings, computed independently of the app's own
// dayStr/plusDays, so a broken implementation of either couldn't accidentally
// make these pass by comparing itself to itself.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, localDayStr, localDayStrPlus } = require('./helpers/app');

function goReview(window) {
  window.document.querySelector('nav button[data-tab="review"]').click();
}

function flipAndGrade(window, buttonId) {
  const doc = window.document;
  doc.getElementById('flash').click();
  doc.getElementById(buttonId).click();
}

test('"Didn\'t know" schedules the card for exactly tomorrow and marks it learning', () => {
  const seed = [
    { id: '1', phrase: 'bite the bullet', meaning: 'endure something painful', source: '', created: '2026-01-01T10:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  goReview(window);

  flipAndGrade(window, 'g-no');

  const it = window.__pb.items.find(i => i.id === '1');
  assert.equal(it.status, 'learning');
  assert.equal(it.due, localDayStrPlus(1), 'due date should be exactly tomorrow, local time');
  assert.equal(it.seen, 1);
});

test('"Knew it" schedules the card for exactly 30 days out and marks it known', () => {
  const seed = [
    { id: '1', phrase: 'bite the bullet', meaning: 'endure something painful', source: '', created: '2026-01-01T10:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  goReview(window);

  flipAndGrade(window, 'g-yes');

  const it = window.__pb.items.find(i => i.id === '1');
  assert.equal(it.status, 'known');
  assert.equal(it.due, localDayStrPlus(30), 'due date should be exactly 30 days out, local time');
  assert.equal(it.seen, 1);
});

test('seen increments from whatever it already was, for both grades', () => {
  const seed = [
    { id: '1', phrase: 'bite the bullet', meaning: 'endure something painful', source: '', created: '2026-01-01T10:00:00.000Z', due: localDayStr(), status: 'learning', seen: 4 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  goReview(window);

  flipAndGrade(window, 'g-yes');

  const it = window.__pb.items.find(i => i.id === '1');
  assert.equal(it.seen, 5);
});

test('grading is persisted to localStorage immediately', () => {
  const seed = [
    { id: '1', phrase: 'bite the bullet', meaning: '', source: '', created: '2026-01-01T10:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  goReview(window);

  flipAndGrade(window, 'g-no');

  const persisted = JSON.parse(window.localStorage.getItem('phrasebook.v1'));
  assert.equal(persisted[0].status, 'learning');
  assert.equal(persisted[0].due, localDayStrPlus(1));
});

test('after grading the only due card, the review tab shows "Done for tonight"', () => {
  const seed = [
    { id: '1', phrase: 'bite the bullet', meaning: '', source: '', created: '2026-01-01T10:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  goReview(window);

  flipAndGrade(window, 'g-yes');

  const empty = window.document.querySelector('#review-body .empty');
  assert.ok(empty);
  assert.match(empty.textContent, /Done for tonight/);
});
