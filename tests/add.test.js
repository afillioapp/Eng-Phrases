'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, fireInput, readStorage, localDayStr } = require('./helpers/app');

test('saving fills in the form fields and creates a well-shaped item', () => {
  const dom = loadApp();
  const { window } = dom;
  const doc = window.document;

  fireInput(window, doc.getElementById('f-phrase'), 'to bite the bullet');
  fireInput(window, doc.getElementById('f-meaning'), 'do something hard you have been avoiding');
  fireInput(window, doc.getElementById('f-source'), 'Sam said it on the standup call');
  doc.getElementById('save').click();

  assert.equal(window.__pb.items.length, 1, 'one item should now exist');
  const it = window.__pb.items[0];

  assert.equal(it.phrase, 'to bite the bullet');
  assert.equal(it.meaning, 'do something hard you have been avoiding');
  assert.equal(it.source, 'Sam said it on the standup call');
  assert.equal(it.due, localDayStr(), 'new items are due today');
  assert.equal(it.status, 'new');
  assert.equal(it.seen, 0);
  assert.ok(it.id, 'has an id');
  assert.ok(it.created, 'has a created timestamp');

  // Persisted to localStorage, not just in-memory. Compared as JSON strings
  // rather than assert.deepEqual: `it` is a jsdom-realm object and `persisted`
  // is a plain Node object, and deepEqual's prototype check fails across
  // realms even when the structures are identical.
  const persisted = readStorage(window);
  assert.equal(persisted.length, 1);
  assert.equal(JSON.stringify(persisted[0]), JSON.stringify(it));
});

test('saving a second entry lands it at the front of the list (newest first)', () => {
  const dom = loadApp();
  const { window } = dom;
  const doc = window.document;

  fireInput(window, doc.getElementById('f-phrase'), 'first phrase');
  doc.getElementById('save').click();
  fireInput(window, doc.getElementById('f-phrase'), 'second phrase');
  doc.getElementById('save').click();

  assert.equal(window.__pb.items.length, 2);
  assert.equal(window.__pb.items[0].phrase, 'second phrase', 'most recently saved item is first');
  assert.equal(window.__pb.items[1].phrase, 'first phrase');

  const persisted = readStorage(window);
  assert.equal(persisted[0].phrase, 'second phrase');
});

test('the form clears after a successful save, ready for the next phrase', () => {
  const dom = loadApp();
  const { window } = dom;
  const doc = window.document;

  fireInput(window, doc.getElementById('f-phrase'), 'to bite the bullet');
  fireInput(window, doc.getElementById('f-meaning'), 'do something hard');
  doc.getElementById('save').click();

  assert.equal(doc.getElementById('f-phrase').value, '');
  assert.equal(doc.getElementById('f-meaning').value, '');
  assert.equal(doc.getElementById('f-source').value, '');
});

test('saving with an empty phrase is refused', () => {
  const dom = loadApp();
  const { window } = dom;
  const doc = window.document;

  fireInput(window, doc.getElementById('f-meaning'), 'a meaning with no phrase');
  doc.getElementById('save').click();

  assert.equal(window.__pb.items.length, 0, 'nothing should be saved');
  assert.equal(readStorage(window).length, 0);
});

test('saving with only whitespace as the phrase is also refused', () => {
  const dom = loadApp();
  const { window } = dom;
  const doc = window.document;

  fireInput(window, doc.getElementById('f-phrase'), '   ');
  doc.getElementById('save').click();

  assert.equal(window.__pb.items.length, 0);
});
