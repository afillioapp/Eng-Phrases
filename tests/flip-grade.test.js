'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/app');

const oneDueItem = [
  { id: '1', phrase: 'bite the bullet', meaning: 'endure something painful', source: 'Sam said it on standup', created: '2026-01-01T10:00:00.000Z', due: '2026-01-01', status: 'new', seen: 0 }
];

function goReview(window) {
  window.document.querySelector('nav button[data-tab="review"]').click();
}

test('a card starts face down: phrase shown, meaning and grade buttons hidden', () => {
  const dom = loadApp({ seedItems: oneDueItem });
  const { window } = dom;
  const doc = window.document;
  goReview(window);

  const flash = doc.getElementById('flash');
  assert.ok(flash, 'flash card should render since there is a due item');
  assert.match(flash.querySelector('.q').textContent, /bite the bullet/);

  assert.equal(flash.querySelector('.a'), null, 'meaning/source panel should not be in the DOM yet');
  assert.ok(flash.querySelector('.tap'), '"tap to reveal" hint should be showing');

  assert.equal(doc.getElementById('g-no'), null, 'grade buttons must not exist before flip');
  assert.equal(doc.getElementById('g-yes'), null);
  assert.equal(doc.querySelector('.grade'), null);
});

test('tapping the card reveals the meaning and source, and grade buttons appear', () => {
  const dom = loadApp({ seedItems: oneDueItem });
  const { window } = dom;
  const doc = window.document;
  goReview(window);

  doc.getElementById('flash').click();

  const flash = doc.getElementById('flash');
  assert.equal(flash.querySelector('.tap'), null, 'the tap hint should be gone once flipped');
  const answer = flash.querySelector('.a');
  assert.ok(answer, 'meaning/source panel should now be present');
  assert.match(answer.querySelector('.m').textContent, /endure something painful/);
  assert.match(answer.querySelector('.s').textContent, /Sam said it on standup/);

  assert.ok(doc.getElementById('g-no'), 'grade buttons only exist once flipped');
  assert.ok(doc.getElementById('g-yes'));
});

test('tapping the card again while already flipped does not un-flip it', () => {
  const dom = loadApp({ seedItems: oneDueItem });
  const { window } = dom;
  const doc = window.document;
  goReview(window);

  doc.getElementById('flash').click();
  doc.getElementById('flash').click();

  assert.ok(doc.getElementById('flash').querySelector('.a'), 'still showing the answer');
  assert.ok(doc.getElementById('g-yes'), 'grade buttons remain');
});

test('a phrase with no meaning saved shows the "no meaning saved" placeholder when flipped', () => {
  const noMeaning = [
    { id: '2', phrase: 'hit the sack', meaning: '', source: '', created: '2026-01-01T10:00:00.000Z', due: '2026-01-01', status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: noMeaning });
  const { window } = dom;
  const doc = window.document;
  goReview(window);

  doc.getElementById('flash').click();

  assert.match(doc.querySelector('.flash .a .m').textContent, /no meaning saved/);
});
