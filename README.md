# Phrasebook

A personal web app for learning English phrases. One user, one HTML file.

During the day Alireza hears a phrase, idiom or piece of slang he doesn't know and
captures it with his own definition plus a note about the situation he heard it in —
the context is what makes it stick. At night he opens the Review tab and flips
through flashcards.

Planned home: **https://afillioapp.github.io/Eng-Phrases/**. **Not live yet** — the
code has never been pushed to GitHub, so there is nothing there to serve. See
[DEPLOY.md](DEPLOY.md).

A design mockup with sample phrases is at **https://eng-phrases.vercel.app**. It's
for looking at: it never saves anything.

---

## Running it

Double-click `phrasebook.html`. That's it — no build step, no server, no install.

The caveat: opened that way the page runs from `file://`, where iOS Safari gives
storage the least protection of anywhere. The installed home-screen version is the
one to actually use day to day. [DEPLOY.md](DEPLOY.md) walks through getting there.

## Running the tests

```bash
npm install
npm test
```

`npm install` is needed once, and only pulls jsdom — dev-only tooling for the test
runner. **The app itself has no dependencies and must stay that way.** `node_modules`
is gitignored.

34 tests. Run them after every change.

## What's in here

| File | What it is |
| --- | --- |
| `phrasebook.html` | **The whole app.** HTML, CSS and JS in one file. |
| `index.html` | Three-line forwarder so the bare URL doesn't 404 on GitHub Pages. |
| `manifest.json` | Web app manifest — name, icons, standalone display. |
| `sw.js` | Service worker. Offline support. **Bump `VERSION` when app files change.** |
| `icons/` | Five PNGs: 32, 180, 192, 512, and a 512 maskable. |
| `tools/make-icons.js` | Regenerates the icons. No image library — `node tools/make-icons.js`. |
| `tests/` | jsdom test suite. |
| `mockup/index.html` | Throwaway design mockup with sample phrases, online at eng-phrases.vercel.app. Not the app. |
| `.nojekyll` | Stops GitHub Pages running the files through Jekyll. |
| `CLAUDE.md` | Project rules, loaded automatically by Claude Code each session. |
| `DEPLOY.md` | Getting it onto the phone, step by step. |
| `START-HERE.md` | Working on this in VS Code. |
| `LOVABLE-PROMPT.md` | Design-exploration prompt for Lovable. Not buildable code. |
| `.claude/agents/` | Four subagent definitions, reusable across sessions. |

## The two rules that matter most

**It stays one HTML file.** No React, no bundler, no runtime dependencies. The file
should still work if you email it to yourself. Dev-only tooling is fine, gitignored.

**Your phrases live in the browser, not in the file.** They're in `localStorage`,
keyed to the address the page was opened from — so `file://` and the GitHub Pages
URL have separate, unconnected copies. The **Back up** button in the Words tab
exports JSON; **Restore** merges it back without creating duplicates. Back up before
changing how or where you open the app.

Full constraints and reasoning: [CLAUDE.md](CLAUDE.md).
