'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, blobText, waitFor } = require('./helpers/app');

function goWords(window) {
  window.document.querySelector('nav button[data-tab="words"]').click();
}

test('backing up produces a JSON blob containing exactly what is in localStorage', async () => {
  const seed = [
    { id: '1', phrase: 'bite the bullet', meaning: 'endure something painful', source: 'Sam on standup', created: '2026-01-01T10:00:00.000Z', due: '2026-01-01', status: 'known', seen: 2 },
    { id: '2', phrase: 'spill the beans', meaning: 'reveal a secret', source: '', created: '2026-01-02T10:00:00.000Z', due: '2026-01-02', status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: seed });
  const { window } = dom;
  const doc = window.document;
  goWords(window);

  // jsdom doesn't implement URL.createObjectURL / real file downloads, so we
  // stand in for the browser here to capture what the app tries to download.
  const capturedBlobs = [];
  let anchorInfo = null;
  window.URL.createObjectURL = (blob) => { capturedBlobs.push(blob); return 'blob:mock-' + (capturedBlobs.length - 1); };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {
    anchorInfo = { href: this.href, download: this.download };
  };

  doc.getElementById('export').click();

  assert.equal(capturedBlobs.length, 1, 'export should create exactly one blob');
  assert.equal(capturedBlobs[0].type, 'application/json');
  assert.ok(anchorInfo, 'export should trigger a download click');
  assert.match(anchorInfo.download, /^phrasebook-\d{4}-\d{2}-\d{2}\.json$/);

  const text = await blobText(window, capturedBlobs[0]);
  const parsed = JSON.parse(text);
  assert.equal(parsed.length, 2);
  assert.equal(JSON.stringify(parsed), JSON.stringify(window.__pb.items), 'backup contents must match live data exactly');

  const toast = doc.getElementById('toast');
  assert.match(toast.textContent, /Backed up/);
  assert.ok(toast.classList.contains('on'));
});

test('restoring adds only genuinely new items (deduped by id) and keeps newest-created first', async () => {
  const existing = [
    { id: 'keep-1', phrase: 'already here', meaning: '', source: '', created: '2026-01-05T00:00:00.000Z', due: '2026-01-05', status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: existing });
  const { window } = dom;
  const doc = window.document;
  goWords(window);

  const incoming = [
    // Same id as an existing item, with different content: must be ignored,
    // not used to overwrite the local copy.
    { id: 'keep-1', phrase: 'DUPLICATE - should be ignored', meaning: 'x', source: '', created: '2020-01-01T00:00:00.000Z', due: '2020-01-01', status: 'known', seen: 9 },
    { id: 'new-1', phrase: 'freshly restored phrase', meaning: 'restored meaning', source: 'from backup', created: '2026-02-01T00:00:00.000Z', due: '2026-02-01', status: 'new', seen: 0 }
  ];
  const file = new window.File([JSON.stringify(incoming)], 'backup.json', { type: 'application/json' });
  const input = doc.getElementById('importfile');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));

  await waitFor(() => window.__pb.items.length > 1);

  const items = window.__pb.items;
  assert.equal(items.length, 2, 'the duplicate id must not be added a second time');

  const dupe = items.find(i => i.id === 'keep-1');
  assert.equal(dupe.phrase, 'already here', 'existing item content must survive untouched');

  const added = items.find(i => i.id === 'new-1');
  assert.ok(added, 'the genuinely new item should have been added');
  assert.equal(added.phrase, 'freshly restored phrase');

  assert.equal(items[0].id, 'new-1', 'list should be re-sorted so the newest `created` is first');

  const toast = doc.getElementById('toast');
  assert.match(toast.textContent, /Added 1 phrase/);
});

test('restoring a file that is not a JSON array is rejected without changing any data', async () => {
  const existing = [
    { id: 'keep-1', phrase: 'already here', meaning: '', source: '', created: '2026-01-05T00:00:00.000Z', due: '2026-01-05', status: 'new', seen: 0 }
  ];
  const dom = loadApp({ seedItems: existing });
  const { window } = dom;
  const doc = window.document;

  const file = new window.File(['not valid json {{{'], 'broken.json', { type: 'application/json' });
  const input = doc.getElementById('importfile');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));

  await waitFor(() => doc.getElementById('toast').textContent.length > 0);

  assert.equal(window.__pb.items.length, 1, 'nothing should have been added or removed');
  assert.match(doc.getElementById('toast').textContent, /didn't look right/);
});
