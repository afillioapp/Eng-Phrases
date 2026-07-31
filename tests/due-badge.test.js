'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, localDayStr, localDayStrPlus } = require('./helpers/app');

test('the review badge shows the count of due, not-known items and hides when there are none', () => {
  const seed = [
    { id: '1', phrase: 'due today', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 },
    { id: '2', phrase: 'overdue from yesterday', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStrPlus(-3), status: 'learning', seen: 1 },
    { id: '3', phrase: 'known, so not due even though date has passed', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStrPlus(-3), status: 'known', seen: 3 },
    { id: '4', phrase: 'due in the future', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStrPlus(5), status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  const doc = window.document;

  // Items 1 and 2 qualify: status !== "known" && due <= today. Item 3 is
  // known (excluded regardless of date); item 4 isn't due yet.
  const badge = doc.getElementById('badge');
  assert.equal(badge.textContent, '2');
  assert.notEqual(badge.style.display, 'none');
  assert.equal(window.__pb.dueNow().length, 2);
});

test('the badge is hidden when nothing is due', () => {
  const seed = [
    { id: '1', phrase: 'already known', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStrPlus(-10), status: 'known', seen: 3 },
    { id: '2', phrase: 'due in the future', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStrPlus(2), status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  const doc = window.document;

  assert.equal(window.__pb.dueNow().length, 0);
  assert.equal(doc.getElementById('badge').style.display, 'none');
});

test('the badge count updates after grading a card away', () => {
  const seed = [
    { id: '1', phrase: 'due today', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  const doc = window.document;

  assert.equal(doc.getElementById('badge').textContent, '1');

  doc.querySelector('nav button[data-tab="review"]').click();
  doc.getElementById('flash').click();
  doc.getElementById('g-yes').click();

  assert.equal(doc.getElementById('badge').style.display, 'none', 'badge should hide once nothing is due');
  assert.equal(window.__pb.dueNow().length, 0);
});

test('the header phrase count reflects total items, singular vs plural', () => {
  const dom1 = loadApp({ seedItems: [
    { id: '1', phrase: 'only one', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 }
  ] });
  assert.match(dom1.window.document.getElementById('stat').textContent, /^1 phrase$/);

  const dom2 = loadApp({ seedItems: [
    { id: '1', phrase: 'one', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 },
    { id: '2', phrase: 'two', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: localDayStr(), status: 'new', seen: 0 }
  ] });
  assert.match(dom2.window.document.getElementById('stat').textContent, /^2 phrases$/);
});
