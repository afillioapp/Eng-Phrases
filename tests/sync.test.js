'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, fireInput, readStorage, waitFor } = require('./helpers/app');

const URL_ = 'https://api.github.com/repos/afillioapp/phrasebook-data/contents/phrases.json';
const SYNC_KEY = 'phrasebook.sync';
const DEL_KEY = 'phrasebook.deleted';

/* ---------------------------------------------------------------------------
 * FakeGitHub: an in-memory stand-in for the GitHub contents API, enough for
 * one file. jsdom has no fetch, so fake.fetch is installed on window.fetch
 * before the app script runs. Several jsdom instances may share one fake to
 * play "iPhone" and "laptop".
 *
 *  - GET  -> 404 if no file, else 200 {sha, content}. Content is base64 of the
 *            file text with "\n" every 60 chars, like real GitHub.
 *  - PUT  -> 422 if the file exists and no sha was sent; 409 if the sha is
 *            stale; otherwise stores the decoded text and issues a new sha.
 *  - Every request is recorded in fake.requests with its parsed body.
 *  - Knobs: authFail (401 on everything), rejectNext (network error),
 *    beforePut (hook run before the first PUT is evaluated, used to simulate
 *    another device writing in between).
 * ------------------------------------------------------------------------ */
class FakeGitHub {
  constructor() { this.text = null; this.n = 0; this.sha = null; this.requests = []; this.authFail = false; this.rejectNext = false; this.beforePut = null; }
  setFile(obj) { this.text = typeof obj === 'string' ? obj : JSON.stringify(obj); this.sha = 'sha' + (++this.n); }
  get data() { return JSON.parse(this.text); }
  get puts() { return this.requests.filter(r => r.method === 'PUT'); }
  get gets() { return this.requests.filter(r => r.method === 'GET'); }
  static encode(text) { return Buffer.from(text, 'utf8').toString('base64').replace(/(.{60})/g, '$1\n'); }
  static decode(b64) { return Buffer.from(b64.replace(/\s/g, ''), 'base64').toString('utf8'); }
  res(status, body) { return { ok: status >= 200 && status < 300, status, json: async () => body }; }
  fetch = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    this.requests.push({ method, url, headers: Object.assign({}, opts.headers), cache: opts.cache, body });
    if (this.rejectNext) { this.rejectNext = false; throw new TypeError('network down'); }
    if (this.authFail) return this.res(401, {});
    if (method === 'GET') {
      if (this.text === null) return this.res(404, {});
      return this.res(200, { sha: this.sha, content: FakeGitHub.encode(this.text) });
    }
    if (this.beforePut) { const h = this.beforePut; this.beforePut = null; h(this); }
    if (this.text !== null && !body.sha) return this.res(422, {});
    if (this.text !== null && body.sha !== this.sha) return this.res(409, {});
    this.text = FakeGitHub.decode(body.content); this.sha = 'sha' + (++this.n);
    return this.res(200, {});
  };
}

const T0 = Date.parse('2026-03-10T12:00:00.000Z');
const HOUR = 3600e3;
const item = (id, phrase, created, extra = {}) => Object.assign(
  { id, phrase, meaning: '', source: '', created, due: '2026-03-10', status: 'new', seen: 0 }, extra);
// jsdom objects come from another realm, so compare via JSON, not deepEqual on prototypes.
const plain = v => JSON.parse(JSON.stringify(v));

/** A device with a saved key (already set up), sharing the given fake server. */
function device(fake, { fakeNowMs = T0, seedItems, confirm = () => true } = {}) {
  return loadApp({ fakeNowMs, seedItems, fetch: fake.fetch, confirm, storage: { [SYNC_KEY]: JSON.stringify({ token: 'tok-123' }) } });
}
const toastText = w => w.document.getElementById('toast').textContent;
const click = (w, sel) => w.document.querySelector(sel).click();

function addPhrase(window, phrase, meaning = '') {
  const doc = window.document;
  click(window, 'nav button[data-tab="add"]');
  fireInput(window, doc.getElementById('f-phrase'), phrase);
  fireInput(window, doc.getElementById('f-meaning'), meaning);
  doc.getElementById('save').click();
}
function editMeaning(window, phrase, meaning) {
  const doc = window.document;
  click(window, 'nav button[data-tab="words"]');
  const card = [...doc.querySelectorAll('#list .card')].find(c => c.querySelector('.p').textContent === phrase);
  card.querySelector('.p').click();                       // open the row
  doc.querySelector('#list .card.open [data-a="edit"]').click();
  fireInput(window, doc.getElementById('f-meaning'), meaning);
  doc.getElementById('save').click();                     // "Update"
}
function deletePhrase(window, phrase) {
  const doc = window.document;
  click(window, 'nav button[data-tab="words"]');
  const card = [...doc.querySelectorAll('#list .card')].find(c => c.querySelector('.p').textContent === phrase);
  card.querySelector('.p').click();
  doc.querySelector('#list .card.open [data-a="del"]').click();
}

/* ---------------------------- 1. merge unit cases ------------------------- */

test('merge: the newer copy wins in both directions', () => {
  const { window } = loadApp();
  const old = item('a', 'old text', '2026-01-01T00:00:00.000Z', { updated: '2026-01-02T00:00:00.000Z' });
  const neu = item('a', 'new text', '2026-01-01T00:00:00.000Z', { updated: '2026-01-03T00:00:00.000Z' });
  assert.equal(window.__pb.merge([old], {}, { items: [neu], deleted: {} }).items[0].phrase, 'new text');
  assert.equal(window.__pb.merge([neu], {}, { items: [old], deleted: {} }).items[0].phrase, 'new text');
});

test('merge: falls back to created when updated is missing, and ties keep the remote copy', () => {
  const { window } = loadApp();
  const older = item('a', 'older', '2026-01-01T00:00:00.000Z');
  const newer = item('a', 'newer', '2026-01-05T00:00:00.000Z');
  assert.equal(window.__pb.merge([older], {}, { items: [newer] }).items[0].phrase, 'newer');
  assert.equal(window.__pb.merge([newer], {}, { items: [older] }).items[0].phrase, 'newer');
  // updated on one side, none on the other: updated compared against created
  const withUpd = item('a', 'edited', '2026-01-01T00:00:00.000Z', { updated: '2026-02-01T00:00:00.000Z' });
  assert.equal(window.__pb.merge([newer], {}, { items: [withUpd] }).items[0].phrase, 'edited');
  // tie
  const l = item('a', 'local', '2026-01-01T00:00:00.000Z', { updated: '2026-01-02T00:00:00.000Z' });
  const r = item('a', 'remote', '2026-01-01T00:00:00.000Z', { updated: '2026-01-02T00:00:00.000Z' });
  assert.equal(window.__pb.merge([l], {}, { items: [r] }).items[0].phrase, 'remote');
});

test('merge: a tombstone removes an older copy; an edit newer than the tombstone survives', () => {
  const { window } = loadApp();
  const it = item('a', 'gone', '2026-01-01T00:00:00.000Z', { updated: '2026-01-02T00:00:00.000Z' });
  // local tombstone vs remote copy
  let m = window.__pb.merge([], { a: '2026-01-03T00:00:00.000Z' }, { items: [it], deleted: {} });
  assert.equal(m.items.length, 0);
  // remote tombstone vs local copy
  m = window.__pb.merge([it], {}, { items: [], deleted: { a: '2026-01-03T00:00:00.000Z' } });
  assert.equal(m.items.length, 0);
  // edit after the deletion brings it back
  const revived = Object.assign({}, it, { updated: '2026-01-04T00:00:00.000Z' });
  m = window.__pb.merge([revived], { a: '2026-01-03T00:00:00.000Z' }, { items: [], deleted: {} });
  assert.equal(m.items.length, 1);
});

test('merge: deleted maps are unioned keeping the later time per id', () => {
  const { window } = loadApp();
  const m = window.__pb.merge([], { a: '2026-01-05T00:00:00.000Z', b: '2026-01-01T00:00:00.000Z' },
    { items: [], deleted: { a: '2026-01-02T00:00:00.000Z', b: '2026-01-09T00:00:00.000Z', c: '2026-01-03T00:00:00.000Z' } });
  assert.deepEqual(plain(m.deleted), { a: '2026-01-05T00:00:00.000Z', b: '2026-01-09T00:00:00.000Z', c: '2026-01-03T00:00:00.000Z' });
});

test('merge: entries without an id or phrase are skipped, and output is newest-created first', () => {
  const { window } = loadApp();
  const a = item('a', 'oldest', '2026-01-01T00:00:00.000Z');
  const b = item('b', 'middle', '2026-01-02T00:00:00.000Z');
  const c = item('c', 'newest', '2026-01-03T00:00:00.000Z');
  const m = window.__pb.merge([a, { phrase: 'no id', created: '2026-05-01T00:00:00.000Z' }, null],
    {}, { items: [c, { id: 'x', phrase: '' }, b] });
  assert.deepEqual(plain(m.items.map(i => i.phrase)), ['newest', 'middle', 'oldest']);
});

/* ---------------------------- 2. setup flow ------------------------------- */

test('setup through the UI stores the key, syncs with the Bearer header and shows the Sync button', async () => {
  const fake = new FakeGitHub();
  const { window } = loadApp({ fakeNowMs: T0, fetch: fake.fetch, seedItems: [item('a', 'seed', '2026-03-09T00:00:00.000Z')] });
  const doc = window.document;
  click(window, 'nav button[data-tab="words"]');

  assert.equal(doc.getElementById('syncbtn').hidden, true);
  assert.equal(doc.getElementById('sync-a').textContent, 'Set up sync');
  assert.equal(doc.getElementById('sync-setup').hidden, true);

  doc.getElementById('sync-a').click();
  assert.equal(doc.getElementById('sync-setup').hidden, false);
  assert.equal(doc.getElementById('sync-a').textContent, 'Save key');
  assert.equal(doc.getElementById('sync-b').hidden, false);

  fireInput(window, doc.getElementById('sync-key'), '  ghp_secret  ');
  doc.getElementById('sync-a').click();
  await waitFor(() => toastText(window) === 'Synced');

  assert.equal(JSON.parse(window.localStorage.getItem(SYNC_KEY)).token, 'ghp_secret', 'token is trimmed and stored');
  assert.ok(JSON.parse(window.localStorage.getItem(SYNC_KEY)).last, 'last-synced time recorded');
  assert.equal(fake.gets.length, 1);
  assert.equal(fake.puts.length, 1);
  for (const r of fake.requests) {
    assert.equal(r.url, URL_);
    assert.equal(r.headers.Authorization, 'Bearer ghp_secret');
    assert.equal(r.headers.Accept, 'application/vnd.github+json');
  }
  assert.equal(fake.gets[0].cache, 'no-store');
  assert.equal(doc.getElementById('syncbtn').hidden, false);
  assert.equal(doc.getElementById('sync-a').textContent, 'Remove key');
});

test('Cancel closes the key box without saving anything; an empty key is refused', () => {
  const fake = new FakeGitHub();
  const { window } = loadApp({ fetch: fake.fetch });
  const doc = window.document;
  doc.getElementById('sync-a').click();
  doc.getElementById('sync-a').click();               // empty key
  assert.match(toastText(window), /Paste the key first/);
  assert.equal(window.localStorage.getItem(SYNC_KEY), null);
  doc.getElementById('sync-b').click();
  assert.equal(doc.getElementById('sync-setup').hidden, true);
  assert.equal(doc.getElementById('sync-a').textContent, 'Set up sync');
  assert.equal(fake.requests.length, 0);
});

/* ---------------------------- 3. first sync ------------------------------- */

test('first sync with no remote file PUTs without a sha, and the content decodes to the local items', async () => {
  const fake = new FakeGitHub();
  const seed = [item('a', 'café — “curly”', '2026-03-09T00:00:00.000Z', { meaning: 'naïve ünïcode' })];
  const { window } = device(fake, { seedItems: seed });
  await window.__pb.syncNow();

  assert.equal(fake.puts.length, 1);
  assert.equal(fake.puts[0].body.sha, undefined);
  assert.ok(fake.puts[0].body.message);
  const file = JSON.parse(FakeGitHub.decode(fake.puts[0].body.content));
  assert.equal(file.version, 1);
  assert.deepEqual(file.items, plain(window.__pb.items));
  assert.equal(file.items[0].phrase, 'café — “curly”');
  assert.deepEqual(file.deleted, {});
  assert.equal(toastText(window), 'Synced');
});

test('a base64 body with line breaks (as real GitHub sends) is read correctly', async () => {
  const fake = new FakeGitHub();
  const remoteItems = [];
  for (let i = 0; i < 6; i++) remoteItems.push(item('r' + i, 'phrase number ' + i + ' ✓', '2026-03-0' + (i + 1) + 'T00:00:00.000Z'));
  fake.setFile({ version: 1, items: remoteItems, deleted: {} });
  assert.ok(FakeGitHub.encode(fake.text).includes('\n'), 'fixture really has line breaks');
  const { window } = device(fake);
  await window.__pb.syncNow();
  assert.equal(window.__pb.items.length, 6);
  assert.equal(fake.puts.length, 0, 'nothing new to send');
});

/* ---------------------------- 4. two devices ------------------------------ */

test('two devices: an added phrase reaches the other, and its edit comes back', async () => {
  const fake = new FakeGitHub();
  const A = device(fake, { fakeNowMs: T0 }).window;
  const B = device(fake, { fakeNowMs: T0 + HOUR }).window;

  addPhrase(A, 'break the ice');
  await A.__pb.syncNow();
  assert.equal(fake.data.items.length, 1);

  await B.__pb.syncNow();
  assert.deepEqual(plain(B.__pb.items.map(i => i.phrase)), ['break the ice']);
  assert.equal(readStorage(B).length, 1, 'persisted locally on B');

  editMeaning(B, 'break the ice', 'start a conversation');
  await B.__pb.syncNow();
  assert.equal(fake.data.items[0].meaning, 'start a conversation');

  await A.__pb.syncNow();
  assert.equal(A.__pb.items.length, 1);
  assert.equal(A.__pb.items[0].meaning, 'start a conversation');
  assert.equal(readStorage(A)[0].meaning, 'start a conversation');
});

/* ---------------------------- 5. deletion --------------------------------- */

test('a deletion on A reaches B, and B records the tombstone', async () => {
  const fake = new FakeGitHub();
  const A = device(fake, { fakeNowMs: T0 }).window;
  const B = device(fake, { fakeNowMs: T0 + HOUR }).window;

  addPhrase(A, 'doomed phrase');
  addPhrase(A, 'survivor');
  const doomedId = A.__pb.items.find(i => i.phrase === 'doomed phrase').id;
  await A.__pb.syncNow();
  await B.__pb.syncNow();
  assert.equal(B.__pb.items.length, 2);

  deletePhrase(A, 'doomed phrase');
  assert.ok(JSON.parse(A.localStorage.getItem(DEL_KEY))[doomedId], 'A recorded a tombstone');
  await A.__pb.syncNow();
  assert.ok(fake.data.deleted[doomedId]);
  assert.deepEqual(fake.data.items.map(i => i.phrase), ['survivor']);

  await B.__pb.syncNow();
  assert.deepEqual(plain(B.__pb.items.map(i => i.phrase)), ['survivor']);
  assert.ok(JSON.parse(B.localStorage.getItem(DEL_KEY))[doomedId], 'B persisted the tombstone');
});

/* ---------------------------- 6. conflicts -------------------------------- */

test('409 on PUT: the app re-reads, merges and retries; final file holds both changes', async () => {
  const fake = new FakeGitHub();
  const z = item('z', 'from the other device', '2026-03-01T00:00:00.000Z');
  fake.setFile({ version: 1, items: [z], deleted: {} });
  const { window } = device(fake, { seedItems: [item('x', 'only local', '2026-03-05T00:00:00.000Z')] });

  // Between the app's GET and its PUT, another device writes a new phrase.
  fake.beforePut = f => {
    const d = f.data;
    d.items.push(item('y', 'written mid-sync', '2026-03-06T00:00:00.000Z'));
    f.setFile(d);                                   // new sha, so the app's sha is stale
  };
  await window.__pb.syncNow();

  assert.equal(fake.puts.length, 2, 'first PUT rejected, second accepted');
  assert.equal(fake.gets.length, 2, 'it re-read the file before retrying');
  assert.deepEqual(fake.data.items.map(i => i.id).sort(), ['x', 'y', 'z']);
  assert.deepEqual(plain(window.__pb.items.map(i => i.id).sort()), ['x', 'y', 'z']);
  assert.equal(toastText(window), 'Synced');
});

test('422 on PUT (file created by someone else after a 404): the app retries and keeps both', async () => {
  const fake = new FakeGitHub();
  const { window } = device(fake, { seedItems: [item('x', 'only local', '2026-03-05T00:00:00.000Z')] });
  fake.beforePut = f => f.setFile({ version: 1, items: [item('y', 'created by other', '2026-03-06T00:00:00.000Z')], deleted: {} });
  await window.__pb.syncNow();
  assert.equal(fake.puts.length, 2);
  assert.equal(fake.puts[0].body.sha, undefined);
  assert.ok(fake.puts[1].body.sha);
  assert.deepEqual(fake.data.items.map(i => i.id).sort(), ['x', 'y']);
});

/* ---------------------------- 7. no-op sync ------------------------------- */

test('syncing again with nothing changed makes no PUT', async () => {
  const fake = new FakeGitHub();
  const { window } = device(fake, { seedItems: [item('a', 'steady', '2026-03-09T00:00:00.000Z')] });
  await window.__pb.syncNow();
  assert.equal(fake.puts.length, 1);
  await window.__pb.syncNow();
  assert.equal(fake.puts.length, 1, 'no second PUT');
  assert.equal(fake.gets.length, 2);
  assert.equal(toastText(window), 'Synced');
});

/* ---------------------------- 8. errors ----------------------------------- */

async function assertFailsCleanly(setup, expectedToast) {
  const fake = new FakeGitHub();
  const seed = [item('a', 'mine', '2026-03-09T00:00:00.000Z', { updated: '2026-03-09T00:00:00.000Z' })];
  const { window } = device(fake, { seedItems: seed });
  setup(fake);
  await window.__pb.syncNow();
  assert.match(toastText(window), expectedToast);
  assert.equal(fake.puts.length, 0, 'no PUT after a failure');
  assert.deepEqual(plain(window.__pb.items), seed, 'local items untouched');
  assert.deepEqual(readStorage(window), seed);
  assert.equal(JSON.parse(window.localStorage.getItem(SYNC_KEY)).last, undefined, 'not marked as synced');
  assert.equal(window.document.getElementById('syncbtn').disabled, false, 'button usable again');
}

test('401 shows the key-not-accepted message', () =>
  assertFailsCleanly(f => { f.authFail = true; }, /Access key not accepted/));

test('a rejected fetch shows the could-not-reach message', () =>
  assertFailsCleanly(f => { f.rejectNext = true; }, /Couldn't reach GitHub/));

test('corrupt remote JSON shows the file-did-not-look-right message', () =>
  assertFailsCleanly(f => f.setFile('this is {not json'), /The synced file didn't look right/));

test('403/404 on PUT shows the cannot-open-repo message', async () => {
  const fake = new FakeGitHub();
  const { window } = device(fake, { seedItems: [item('a', 'mine', '2026-03-09T00:00:00.000Z')] });
  const orig = fake.fetch;
  window.fetch = async (url, opts = {}) => (opts.method === 'PUT' ? fake.res(403, {}) : orig(url, opts));
  await window.__pb.syncNow();
  assert.match(toastText(window), /This key can't open the phrasebook-data repo/);
});

/* ---------------------------- 9. updated stamps --------------------------- */

test('updated is stamped on create, edit, grade and Review again', () => {
  const { window } = loadApp({ fakeNowMs: T0 });
  const doc = window.document;
  const iso = new Date(T0).toISOString();

  addPhrase(window, 'stamp me', 'first meaning');
  const created = readStorage(window)[0];
  assert.equal(created.updated, created.created);
  assert.equal(created.updated, iso);

  // grade: stamp is rewritten (freeze a later clock by replacing the stored value first)
  const stale = Object.assign({}, created, { updated: '2000-01-01T00:00:00.000Z' });
  const g = loadApp({ fakeNowMs: T0, seedItems: [stale] }).window;
  g.document.querySelector('nav button[data-tab="review"]').click();
  g.document.getElementById('flash').click();
  g.document.getElementById('g-yes').click();
  assert.equal(readStorage(g)[0].updated, iso, 'grade stamps updated');
  assert.equal(readStorage(g)[0].seen, 1);

  // Review again
  const r = loadApp({ fakeNowMs: T0, seedItems: [Object.assign({}, stale, { status: 'known' })] }).window;
  r.document.querySelector('nav button[data-tab="words"]').click();
  r.document.querySelector('#list .card .p').click();
  r.document.querySelector('#list [data-a="reset"]').click();
  assert.equal(readStorage(r)[0].updated, iso, 'Review again stamps updated');

  // Edit
  const e = loadApp({ fakeNowMs: T0, seedItems: [stale] }).window;
  editMeaning(e, 'stamp me', 'changed');
  assert.equal(readStorage(e)[0].updated, iso, 'edit stamps updated');
  assert.equal(readStorage(e)[0].created, stale.created, 'created is not changed by an edit');
});

/* ---------------------------- 10. remove key ------------------------------ */

test('Remove key with confirm=true clears the saved key and hides the Sync button', () => {
  const fake = new FakeGitHub();
  let asked = 0;
  const { window } = device(fake, { confirm: () => { asked++; return true; } });
  const doc = window.document;
  assert.equal(doc.getElementById('syncbtn').hidden, false);
  assert.equal(doc.getElementById('sync-a').textContent, 'Remove key');
  doc.getElementById('sync-a').click();
  assert.equal(asked, 1);
  assert.equal(window.localStorage.getItem(SYNC_KEY), null);
  assert.equal(doc.getElementById('syncbtn').hidden, true);
  assert.equal(doc.getElementById('sync-a').textContent, 'Set up sync');
});

test('Remove key with confirm=false keeps the key', () => {
  const fake = new FakeGitHub();
  const { window } = device(fake, { confirm: () => false });
  window.document.getElementById('sync-a').click();
  assert.equal(JSON.parse(window.localStorage.getItem(SYNC_KEY)).token, 'tok-123');
  assert.equal(window.document.getElementById('syncbtn').hidden, false);
});

test('syncNow without a key does nothing', async () => {
  const fake = new FakeGitHub();
  const { window } = loadApp({ fetch: fake.fetch });
  await window.__pb.syncNow();
  assert.equal(fake.requests.length, 0);
});
