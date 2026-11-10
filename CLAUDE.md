# Phrasebook

`phrasebook.html` is a working app. Read it in full before changing or planning anything.

## What it is

A personal, mobile-first web app for learning English. Alireza is a non-native speaker. During the day he hears a phrase, idiom or piece of slang he doesn't know, and captures it in the app with his own definition plus a note about the situation he heard it in — the context is what makes it stick. At night before bed he opens the review tab and flips through flashcards.

It has two halves and they matter equally: **capture**, which has to be fast enough to use mid-conversation, and **review**, which has to be thoughtless enough to do half-asleep.

Single user, on an iPhone and a laptop. No one else will ever use it.

Alireza is comfortable in Terminal but is not a developer. When he needs to do something himself, be explicit and assume nothing. Explain trade-offs in plain language.

Repo: `git@github.com:afillioapp/Eng-Phrases.git` (public)
Planned home: `https://afillioapp.github.io/Eng-Phrases/`

## Where things stand

- **Not live anywhere yet.** As of 2026-11-10 nothing has ever been pushed: the GitHub repo is empty, Pages is off, and the URL above returns 404. His phrases exist only in whichever browser he has opened `phrasebook.html` in.
- **Vercel is linked to this repo.** Project `eng-phrases` (team Afillio, production branch `main`, root directory unset) serves the design mockup at `https://eng-phrases.vercel.app`, deployed by hand from `mockup/`. Because of the link, the first push to `main` would make Vercel build the repo root and replace the mockup with the app.
- **Before the first push,** settle with Alireza where the real app lives — GitHub Pages as `DEPLOY.md` plans, or Vercel — and set Vercel's root directory to match. Remind him the repo is public: a push publishes everything committed.

## Hard constraints — do not violate without asking first

- **It stays a single HTML file.** No React, no bundler, no runtime dependencies, no shipped `node_modules`. The file should work if emailed to yourself. Dev-only tooling like a test runner is fine, gitignored. The PWA support files beside it — `manifest.json`, `sw.js`, `index.html`, `icons/` — are expected and do not count against this, and neither does the throwaway design mockup in `mockup/`.
- **No backend, no accounts, no sync, no analytics.** `localStorage` only.
- **No AI features and no dictionary API.** Alireza writes every definition himself in his own words — that is the entire point of the app. No auto-lookup, auto-translation, or generated example sentences.
- **No spaced-repetition algorithm.** The rule is deliberately simple: knew it → gone for 30 days, didn't know → back tomorrow. Do not upgrade it to SM-2 or Anki-style intervals.
- **Don't redesign it.** The visual language is settled — match what's already in the file.
- **No emoji, illustrations, gradients, or drop shadows.**

If one of these seems wrong, say so and make the argument. Don't silently work around it.

## Data model

```js
{
  id,        // timestamp + random suffix
  phrase,    // required
  meaning,   // his own words, may be empty
  source,    // the situation he heard it in, may be empty
  created,   // ISO string
  due,       // "YYYY-MM-DD"
  status,    // "new" | "learning" | "known"
  seen       // times graded
}
```

Stored newest-first in `localStorage` under the key `phrasebook.v1`. New entries are created `due: today, status: "new"` so they appear in the same night's deck. Tonight's deck is every item where `status !== "known" && due <= today`, shuffled.

**Known bug, scheduling:** because the deck excludes `known` items whatever their date, a phrase marked "Knew it" never comes back after its 30 days — only "Review again" or a grade in practice mode returns it. That contradicts the hard constraint ("gone for 30 days"). The likely fix is a deck of every item with `due <= today`; `tests/due-badge.test.js` asserts the current behaviour and would change with it. Not fixed: it changes what appears each night, so confirm with Alireza first.

A second key, `phrasebook.backup`, holds the `YYYY-MM-DD` of the last export. It is deliberately separate so the `phrasebook.v1` array keeps its shape.

Dates are local-timezone `YYYY-MM-DD` strings, never UTC — a phrase saved at 11pm belongs to that day, not the next one. Use the existing `dayStr()` helper, not `toISOString().slice(0,10)`. When differencing two date strings, build from the parts (`Date.UTC(y, m-1, d)`), never `new Date("YYYY-MM-DD")`, which parses as UTC midnight and lands a day out.

**Known bug, display only:** `prettyDate()` passes a `"YYYY-MM-DD"` string to `new Date()` and so can render the wrong local day in a timezone behind UTC. Scheduling is unaffected — `dueNow()` compares strings. A test documents the current behaviour rather than asserting it is correct. Left unfixed deliberately; fix it if touching that area.

## Design

Tokens are defined in the file's `:root`. Dark and low-light because the app is used in bed. System font stack, 44px minimum touch targets (the drawn shape can be smaller), inputs at 16px or larger so iOS doesn't zoom on focus, safe-area insets respected top and bottom.

`body` must **not** set `padding-bottom: env(safe-area-inset-bottom)` — `nav` is the last flex child and reserves it already. Having both leaves dead space under the nav in standalone mode. The toast's `bottom` offsets include the inset for the same reason.

## Files

| File | What it is |
| --- | --- |
| `phrasebook.html` | The whole app. |
| `index.html` | Forwarder so the bare Pages URL doesn't 404. |
| `manifest.json` | `start_url` and `scope` are relative — they must stay that way or they break under the `/Eng-Phrases/` subpath. |
| `sw.js` | Network-first for the page, cache-first for assets. |
| `icons/` | 32, 180, 192, 512, 512-maskable. |
| `tools/make-icons.js` | Regenerates them, no image library. |
| `tests/` | jsdom suite. |
| `mockup/index.html` | Throwaway design mockup. Sample data in memory, never touches `localStorage`. Served at eng-phrases.vercel.app. Not the app: port ideas from it one at a time, never copy it over `phrasebook.html`. |

**Everything is served from a subpath on GitHub Pages**, so every path in every file must be relative. An absolute `/sw.js` resolves off the site entirely — this is the single most common way this deploy breaks, because most tutorials assume root hosting.

**Bump `VERSION` in `sw.js` whenever `phrasebook.html`, `manifest.json` or an icon changes.** The cache name derives from it, and that is what evicts the stale offline copy. Online, network-first means an update lands anyway; offline, a forgotten bump serves the old app.

## Verification

```bash
npm install   # once; pulls jsdom only
npm test      # 34 tests
```

Tests use jsdom: load the HTML with `runScripts: 'dangerously'`, drive it with real click and input events, assert against the resulting DOM and the `window.__pb` object the file exposes. They load the real file from disk — never inline a copy, or they drift from the app.

Run the tests after every change. Keep `node_modules` gitignored — the app itself must stay dependency-free.

If something can't be verified in jsdom — service worker behavior, a real iOS install — say so plainly and explain how to check it on the phone. Do not report it as working. Service worker behaviour *can* be checked in a real browser served over localhost, and that is worth doing before claiming it works; serve it under an `/Eng-Phrases/` path so subpath bugs can't hide.

**Still unverified on a real device:** whether an installed home-screen app and a Safari tab of the same URL share `localStorage`, and what happens to storage when the home-screen icon is deleted. No primary source settles either. Don't claim either way.

## Working style

Small, reviewable commits: one logical change each, with a message saying what changed and why.

Search the web rather than reinventing solved problems — especially service workers, manifests, iOS home-screen PWA quirks, and `localStorage` eviction on iOS Safari. That area is full of stale and wrong advice, so prefer official sources (MDN, web.dev, Apple's WebKit blog), check dates, and flag when sources conflict. Adapt findings to this codebase's style rather than pasting them in, and never add a library for something that's twenty lines of vanilla JS.

Two findings worth not re-litigating: `apple-mobile-web-app-capable` and `status-bar-style: black-translucent` are **not** meaningfully deprecated for iOS — the widespread claim traces to a single 2017 forum post — and `black-translucent` is what the header's `env(safe-area-inset-top)` padding is written for. Apple documents that home-screen web apps get their own storage-eviction counter, separate from Safari's 7-day cap, but words it as expectation rather than guarantee. Backups stay load-bearing.

**Models.** Alireza uses Fable 5.2 only for design input — critiques, mockups — and Opus 5.5 for everything else, because Fable drains his allowance. On Fable, stay on design and remind him to switch back with `/model opus`. Subagents stay on Sonnet.

## Subagents

Use them, on Sonnet, defined in `.claude/agents/` with `model: sonnet` and a `tools` list scoped to what each actually needs. Read-only agents get no Write or Edit.

Four exist already:

| Agent | For |
| --- | --- |
| `pwa-researcher` | iOS storage, manifest, icons, service worker behaviour. Read-only. |
| `pages-researcher` | GitHub Pages subpaths, SW scope, caching, publishing. Read-only. |
| `test-writer` | Writes and runs the jsdom suite. Never edits `phrasebook.html`. |
| `mobile-auditor` | Audits against iOS, accessibility and these constraints. Read-only. |

**Never let two subagents edit `phrasebook.html` at the same time.** Everything lives in that one file, so concurrent edits clobber each other. Fan out on research, review and tests; serialize edits to that file through the orchestrator.

Give each subagent enough context to work alone — they start cold. Run independent ones in parallel. If a task is small enough that delegating costs more than doing it, just do it.

## Open decisions

Ask Alireza before acting on any of these.

- **Where the real app lives** — GitHub Pages or Vercel. Blocks the first push (see Where things stand).
- **The known-phrases bug** — fixing it changes the nightly deck (see Data model).
- **Practice-mode grading.** "Practice all" reschedules every card it grades, so a known phrase marked "Didn't know" in practice comes back tomorrow. Keep that, or give practice cards a plain "Next" and leave scheduling alone.
- **A real redesign.** The mockup kept the settled look and changed only how things work; he found the difference too small. A visibly new look means relaxing "Don't redesign it" — his call, and a job for Fable.

## Backlog

1. **Import ~200 phrases from WhatsApp — waiting on his file.** He is copying them into a Word file in the format given in `START-HERE.md`: line 1 the phrase, optional `Meaning:` and `Situation:` lines, a blank line between phrases. Convert it to backup-format JSON so the existing **Restore** imports it with no app change: `Situation:` goes in `source`, `status: "new"`, `seen: 0`, and deterministic ids so restoring twice adds nothing. Keep his text exactly, typos included, and never write a meaning for him. Ask whether everything is due tonight or spread out (suggested: 10 a night, oldest first — this sets first due dates only, not the rule). The file and the JSON hold his phrases, so keep both out of the public repo; name the JSON `phrasebook-….json` so `.gitignore` catches it. Import into the copy he uses nightly, which means getting the app online and on his phone first.
2. **Tags — designed, not built.** One tag per phrase, stored as a `tag` string on the item, empty allowed. Picked by tapping a chip from tags already used, plus a "+ New" that reveals a text input. Rendered as **text chips in the existing pill style — not emoji, not icons.** Used to filter the Words tab only; reviewing one tag at a time was considered and deliberately dropped for now. Chips in the Add form and the filter row are tappable, so they need the 44px minimum.
3. **Save with an empty meaning.** Already works — only `phrase` is required. What's missing is marking such entries incomplete and adding a "needs meaning" filter in the Words tab.
4. **Relabel `source`.** The field is labelled "Where I heard it" but what he actually writes is the social situation ("chatting with someone I was trying to get to know"). The label and placeholder should ask for that. The stored key stays `source` so old backups keep importing.
5. **Design proposals from the mockup — not decided.** All shown working in `mockup/index.html`. Each stands alone: port one per commit, and keep the mockup's sample data out of the app.
   - Save in the header on Add, where the keyboard can't cover it, with the "Saved" confirmation there too — a bottom toast sits behind the keyboard.
   - The phrase field as the largest text, growing with what's typed; all three fields start one line tall.
   - Grade buttons of equal weight (both outlined), pinned to the bottom of the screen. The answer fades in and the phrase doesn't move.
   - Undo after each grade.
   - "Add meaning" in place of the grade buttons when a card has no meaning.
   - The backup reminder at the top of Words when a backup is overdue.
   - Delete confirmed on the button itself instead of `confirm()`.
   - Pressed states on tabs, cards and chips.
   - Phrases and situations in the system serif (New York on iPhone). This changes the look, so it needs his OK under "Don't redesign it".
6. **Reverse cards.** Show the definition, recall the phrase.
7. **Pronunciation.** Read the phrase aloud with the browser's built-in `speechSynthesis`. No external API.
8. **Light stats.** Nightly streak, how many marked known this week, which phrases keep getting failed.
