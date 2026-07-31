'use strict';
// Shared harness for driving the real phrasebook.html inside jsdom.
// Never inline a copy of the app's markup/script here — always load the file
// on disk so tests can't drift from what actually ships.

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.join(__dirname, '..', '..', 'phrasebook.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const STORAGE_KEY = 'phrasebook.v1';

/**
 * Replace window.Date with a subclass whose zero-arg constructor (and
 * Date.now()) always returns fixedNowMs. Date(...args) with explicit
 * arguments still behaves like the real Date, so parsing "YYYY-MM-DD"
 * strings elsewhere in the app is unaffected.
 */
function installFakeClock(window, fixedNowMs) {
  const RealDate = window.Date;
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixedNowMs);
      else super(...args);
    }
    static now() { return fixedNowMs; }
  }
  window.Date = FakeDate;
}

/**
 * Load a fresh copy of phrasebook.html in jsdom.
 *
 * @param {object} [opts]
 * @param {Array}  [opts.seedItems] - written to localStorage before the
 *   app's inline script runs, so it boots as if this were already on disk.
 * @param {number} [opts.fakeNowMs] - if set, installs the fake clock in
 *   beforeParse, i.e. before the app's script reads the clock at load.
 */
function loadApp({ seedItems, fakeNowMs } = {}) {
  const dom = new JSDOM(HTML, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      // jsdom doesn't implement smooth scrolling or real link navigation;
      // the app calls these as ordinary browser side effects on every tab
      // switch / backup download, so stub them to keep test output clean.
      window.scrollTo = () => {};
      window.HTMLAnchorElement.prototype.click = function () {};
      if (fakeNowMs !== undefined) installFakeClock(window, fakeNowMs);
      if (seedItems) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedItems));
    }
  });
  return dom;
}

/** Set an input/textarea's value and dispatch a real 'input' event. */
function fireInput(window, el, value) {
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

/** Read the raw persisted array back out of localStorage. */
function readStorage(window) {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
}

/** Local (not UTC) YYYY-MM-DD for a given Date, defaulting to now. */
function localDayStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Local YYYY-MM-DD for "today + days", computed independently of the app. */
function localDayStrPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDayStr(d);
}

/** Read a jsdom Blob's text content via FileReader (jsdom's Blob has no .text()). */
function blobText(window, blob) {
  return new Promise((resolve, reject) => {
    const r = new window.FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(blob);
  });
}

/** Poll until predicate() is truthy, for the async bits (FileReader). */
function waitFor(predicate, { timeout = 1000, interval = 10 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('waitFor timed out'));
      setTimeout(poll, interval);
    })();
  });
}

module.exports = {
  HTML_PATH,
  STORAGE_KEY,
  loadApp,
  installFakeClock,
  fireInput,
  readStorage,
  localDayStr,
  localDayStrPlus,
  blobText,
  waitFor
};
