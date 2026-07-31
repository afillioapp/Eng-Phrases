'use strict';
// The one test in this suite that most needs to be real rather than
// decorative: a phrase saved right before local midnight, in a timezone
// behind UTC, must be filed under *today's local date* — not tomorrow's UTC
// date. node --test runs each test file in its own process, so setting TZ
// here at the very top (before jsdom or the app's script ever run) applies
// for this whole file without leaking into other test files.
process.env.TZ = 'America/Los_Angeles';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, fireInput } = require('./helpers/app');

// 2026-07-31T06:50:00.000Z is, in America/Los_Angeles (PDT, UTC-7 in July),
// 2026-07-30 23:50 local — 10 minutes before local midnight, while the UTC
// calendar date has already rolled over to the 31st.
const FIXED_NOW_MS = Date.UTC(2026, 6, 31, 6, 50, 0);
const LOCAL_DATE = '2026-07-30';
const UTC_DATE = '2026-07-31';

test('sanity check: TZ is actually applied and the fixed instant really does straddle midnight', () => {
  // Uses the real, un-faked Date — proves the TZ env var itself is in effect
  // in this process before we even touch jsdom.
  assert.equal(process.env.TZ, 'America/Los_Angeles');

  const real = new Date(FIXED_NOW_MS);
  assert.equal(real.getFullYear(), 2026);
  assert.equal(real.getMonth(), 6); // July, 0-indexed
  assert.equal(real.getDate(), 30, 'local calendar day should be the 30th');
  assert.equal(real.getHours(), 23);
  assert.equal(real.getMinutes(), 50);

  // And confirm the naive/UTC reading of the same instant really is the next
  // day, which is exactly the trap a naive implementation falls into.
  assert.equal(real.toISOString().slice(0, 10), UTC_DATE);
});

test('sanity check: the fake clock installed in the app actually moved the app\'s own clock', () => {
  const dom = loadApp({ fakeNowMs: FIXED_NOW_MS });
  const { window } = dom;

  // If this fake silently did nothing, __pb.today() would just be whatever
  // the real current date is, which is nowhere near 2026-07-30/31.
  assert.equal(window.__pb.today(), LOCAL_DATE, 'the app\'s own today() must read the faked instant');
  assert.notEqual(window.__pb.today(), UTC_DATE, 'and it must not be the naive UTC date either');
});

test('a phrase saved at 23:50 local time is filed under today\'s local date, not tomorrow\'s UTC date', () => {
  const dom = loadApp({ fakeNowMs: FIXED_NOW_MS });
  const { window } = dom;
  const doc = window.document;

  fireInput(window, doc.getElementById('f-phrase'), 'burning the midnight oil');
  doc.getElementById('save').click();

  assert.equal(window.__pb.items.length, 1);
  const it = window.__pb.items[0];

  assert.equal(it.due, LOCAL_DATE, 'due date must be the local calendar day the phrase was actually said on');
  assert.notEqual(it.due, UTC_DATE, 'must not have been filed under the UTC date one day ahead');
  assert.equal(it.status, 'new');
});

test('that same phrase shows up in tonight\'s deck, not tomorrow\'s', () => {
  const dom = loadApp({ fakeNowMs: FIXED_NOW_MS });
  const { window } = dom;
  const doc = window.document;

  fireInput(window, doc.getElementById('f-phrase'), 'burning the midnight oil');
  doc.getElementById('save').click();

  // dueNow() is items where status !== "known" && due <= today(). At the
  // faked instant this should include the phrase we just saved.
  const due = window.__pb.dueNow();
  assert.equal(due.length, 1);
  assert.equal(due[0].phrase, 'burning the midnight oil');

  // Drive it through the actual Review tab too, not just the __pb escape hatch.
  doc.querySelector('nav button[data-tab="review"]').click();
  const flash = doc.getElementById('flash');
  assert.ok(flash, 'the review deck should have a card to show tonight');
  assert.match(flash.querySelector('.q').textContent, /burning the midnight oil/);
});
