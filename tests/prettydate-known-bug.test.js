'use strict';
// KNOWN BUG, DOCUMENTED NOT FIXED.
//
// prettyDate() in phrasebook.html (~line 193) does `new Date(iso)` on a
// "YYYY-MM-DD" string. That parses as UTC midnight per the ISO 8601 spec.
// In a timezone behind UTC, formatting that instant with
// `.toLocaleDateString()` (which uses the local timezone) can render one
// calendar day earlier than the date string actually says.
//
// This is display-only: it does not affect `due`, `status`, or which items
// are due (the scheduling tests cover that separately using plain Date
// arithmetic, not string parsing, so they are unaffected by this bug).
//
// Per instructions, this test documents *current* (buggy) behaviour so a
// future fix doesn't accidentally regress unnoticed — it does NOT assert
// that the behaviour is correct. Do not treat a change to this test as
// license to "fix" it without telling the orchestrator; this file is not
// allowed to be edited to route around a real bug in phrasebook.html.
process.env.TZ = 'America/Los_Angeles';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/app');

test('KNOWN BUG: a future due date pill can render one day early in a timezone behind UTC', () => {
  // Fake "now" = 2026-01-01, far enough from the due date below that
  // prettyDate() falls past its "today"/"yesterday" special cases and into
  // the buggy `new Date(iso).toLocaleDateString()` branch.
  const fakeNowMs = Date.UTC(2026, 0, 1, 12, 0, 0); // noon UTC, Jan 1 2026
  const seed = [
    { id: '1', phrase: 'future phrase', meaning: '', source: '', created: '2026-01-01T00:00:00.000Z', due: '2026-01-05', status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed, fakeNowMs });
  const { window } = dom;
  const doc = window.document;

  doc.querySelector('nav button[data-tab="words"]').click();

  const pillText = doc.querySelector('.card .pill').textContent.trim();

  // What it SHOULD say, if prettyDate parsed "2026-01-05" as a local date:
  // "Jan 5". What it actually says today, because new Date("2026-01-05")
  // is parsed as UTC midnight and then formatted in America/Los_Angeles
  // (UTC-8 in January): "Jan 4" — one day early.
  assert.equal(pillText, 'Jan 4', 'documents the current (buggy) off-by-one-day display');
  assert.notEqual(pillText, 'Jan 5', 'the calendar-correct answer, which the app does NOT currently produce');
});
