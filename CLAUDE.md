# Phrasebook

`phrasebook.html` is a working app. Read it in full before changing or planning anything.

## What it is

A personal, mobile-first web app for learning English. Alireza is a non-native speaker. During the day he hears a phrase, idiom or piece of slang he doesn't know, and captures it in the app with his own definition plus a note about the situation he heard it in — the context is what makes it stick. At night before bed he opens the review tab and flips through flashcards.

It has two halves and they matter equally: **capture**, which has to be fast enough to use mid-conversation, and **review**, which has to be thoughtless enough to do half-asleep.

Single user, on an iPhone and a laptop. No one else will ever use it.

Alireza is comfortable in Terminal but is not a developer. When he needs to do something himself, be explicit and assume nothing. Explain trade-offs in plain language.

Repo: `git@github.com:afillioapp/Eng-Phrases.git` (public)
Live: `https://afillioapp.github.io/Eng-Phrases/`

## Where things stand

- **Live on GitHub Pages** since 2026-11-10, published from `main` (root folder). Every push to `main` republishes it, usually within 10 minutes. Phrases he saved before then are still in whichever browser he opened `phrasebook.html` in; `DEPLOY.md` steps 1 and 6 move them across.
- **Vercel serves only the mockup.** Project `eng-phrases` (team Afillio) is linked to this repo with its root directory set to `mockup`, so every push also rebuilds `https://eng-phrases.vercel.app` from that folder alone. Keep the real app off Vercel: a second address would hold a second, separate copy of his phrases.
- **Sync store:** private repo `afillioapp/phrasebook-data`, created 2026-11-20. Every sync is a commit there, so its history is also a backup. He turns sync on per device following `DEPLOY.md` step 8.
- **The repo is public.** A push publishes everything committed, commit author emails included. Since 2026-11-10 this repo commits with his private GitHub noreply address (set in this repo's `git config user.email` only); the earlier commits still show his work email.

## Hard constraints — do not violate without asking first

- **It stays a single HTML file.** No React, no bundler, no runtime dependencies, no shipped `node_modules`. The file should work if emailed to yourself. Dev-only tooling like a test runner is fine, gitignored. The PWA support files beside it — `manifest.json`, `sw.js`, `index.html`, `icons/` — are expected and do not count against this, and neither does the throwaway design mockup in `mockup/`.
- **No backend of our own, no accounts, no analytics.** Data lives in `localStorage`. The one exception, added 2026-11-20 at his request, is the optional Sync button. It reads and writes one JSON file in his private repo `afillioapp/phrasebook-data`, using an access key he pastes on each device. Nothing else talks to the network.
- **No AI features and no dictionary API.** Alireza writes every definition himself in his own words — that is the entire point of the app. No auto-lookup, auto-translation, or generated example sentences.
- **No spaced-repetition algorithm.** The rule is deliberately simple: knew it → gone for 30 days, didn't know → back tomorrow. Do not upgrade it to SM-2 or Anki-style intervals.
- **Keep the visual language.** Redesigned on 2026-11-20 from a reference Alireza chose: warm cream by day, warm dark by night, serif phrases, generous spacing, one task per screen. Match what's in the file; don't drift back toward dense layouts.
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
  updated,   // ISO string, stamped on every change; sync keeps the newer copy (older items lack it and fall back to created)
  due,       // "YYYY-MM-DD"
  status,    // "new" | "learning" | "known"
  seen       // times graded
}
```

Stored newest-first in `localStorage` under the key `phrasebook.v1`. New entries are created `due: today, status: "new"` so they appear in the same night's deck. Tonight's deck is every item where `status !== "known" && due <= today`, shuffled.

**Known bug, scheduling:** because the deck excludes `known` items whatever their date, a phrase marked "Knew it" never comes back after its 30 days — only "Review again" or a grade in practice mode returns it. That contradicts the hard constraint ("gone for 30 days"). The likely fix is a deck of every item with `due <= today`; `tests/due-badge.test.js` asserts the current behaviour and would change with it. Not fixed: it changes what appears each night, so confirm with Alireza first.

A second key, `phrasebook.backup`, holds the `YYYY-MM-DD` of the last export. It is deliberately separate so the `phrasebook.v1` array keeps its shape. `phrasebook.deleted` maps each deleted id to when it was deleted, so a sync doesn't bring the phrase back. `phrasebook.sync` holds `{token, last}`. The token is his GitHub access key and must never leave that device's `localStorage`: the app's repo is public.

**Sync** (`syncNow()`, `merge()`) works in five steps. It GETs `phrases.json` from the data repo, holding `{version:1, items, deleted}` in base64. It merges per id, so the newest `updated` wins, and a deletion beats any older copy. It saves locally, then PUTs with the file's `sha`. If the PUT returns 409/422, the other device wrote in between, so it starts over (3 attempts). A 404 on the first GET just means no file yet. The PUT is skipped when nothing changed, so idle syncs don't add commits. Tested end to end against the real GitHub API on 2026-11-20, including a real 409.

Dates are local-timezone `YYYY-MM-DD` strings, never UTC — a phrase saved at 11pm belongs to that day, not the next one. Use the existing `dayStr()` helper, not `toISOString().slice(0,10)`. When differencing two date strings, build from the parts (`Date.UTC(y, m-1, d)`), never `new Date("YYYY-MM-DD")`, which parses as UTC midnight and lands a day out.

**Known bug, display only:** `prettyDate()` passes a `"YYYY-MM-DD"` string to `new Date()` and so can render the wrong local day in a timezone behind UTC. Scheduling is unaffected — `dueNow()` compares strings. A test documents the current behaviour rather than asserting it is correct. Left unfixed deliberately; fix it if touching that area.

## Design

Tokens are defined in `:root`, with a dark set under `prefers-color-scheme: dark`. The app follows the phone's appearance, so the bedtime review is dark when Appearance is set to Automatic. Serif (`ui-serif`, New York on iPhone) for phrases and situations, system sans for everything else. 44px minimum touch targets (the drawn shape can be smaller), inputs at 16px or larger so iOS doesn't zoom on focus, safe-area insets respected top and bottom.

**Monotask:** each screen does one job, and he asked for exactly that. Add is the phrase box plus two quiet fields, with Save in the top bar where the keyboard can't cover it. Words is a grouped list where a row shows the phrase and one line of meaning, and tapping it opens everything plus the actions. Review is one card that fills the screen, with the phrase fixed in place and the two equal-weight answers pinned low. Resist adding elements to any screen.

`body` must **not** set `padding-bottom: env(safe-area-inset-bottom)` — `nav` is the last flex child and reserves it already. Having both leaves dead space under the nav in standalone mode. The toast sits at the top, offset by the top inset, so the keyboard can't hide it.

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
npm test      # 56 tests
```

Tests use jsdom: load the HTML with `runScripts: 'dangerously'`, drive it with real click and input events, assert against the resulting DOM and the `window.__pb` object the file exposes. They load the real file from disk — never inline a copy, or they drift from the app.

Run the tests after every change. Keep `node_modules` gitignored — the app itself must stay dependency-free.

If something can't be verified in jsdom — service worker behavior, a real iOS install — say so plainly and explain how to check it on the phone. Do not report it as working. Service worker behaviour *can* be checked in a real browser served over localhost, and that is worth doing before claiming it works; serve it under an `/Eng-Phrases/` path so subpath bugs can't hide.

**Still unverified on a real device:** whether an installed home-screen app and a Safari tab of the same URL share `localStorage`, and what happens to storage when the home-screen icon is deleted. No primary source settles either. Don't claim either way.

## Working style

Small, reviewable commits: one logical change each, with a message saying what changed and why.

Search the web rather than reinventing solved problems — especially service workers, manifests, iOS home-screen PWA quirks, and `localStorage` eviction on iOS Safari. That area is full of stale and wrong advice, so prefer official sources (MDN, web.dev, Apple's WebKit blog), check dates, and flag when sources conflict. Adapt findings to this codebase's style rather than pasting them in, and never add a library for something that's twenty lines of vanilla JS.

Worth not re-litigating: `apple-mobile-web-app-capable` is **not** meaningfully deprecated for iOS — the widespread claim traces to a single 2017 forum post. Since the redesign, `status-bar-style` is `default`, not `black-translucent`, because the light theme needs dark status-bar text and `black-translucent` draws it white. Research on 2026-11-20 found no primary source for how `default` looks in dark mode, whether `theme-color` affects an installed app's status bar, or whether an installed icon picks up changed tags without being re-added. All three are unverified on a device. Apple documents that home-screen web apps get their own storage-eviction counter, separate from Safari's 7-day cap, but words it as expectation rather than guarantee. Backups stay load-bearing.

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

- **The known-phrases bug** — fixing it changes the nightly deck (see Data model).
- **Practice-mode grading.** "Practice all" reschedules every card it grades, so a known phrase marked "Didn't know" in practice comes back tomorrow. Keep that, or give practice cards a plain "Next" and leave scheduling alone.

## Backlog

1. **Import ~200 phrases from WhatsApp — waiting on his file.** He is copying them into a Word file in the format given in `START-HERE.md`: line 1 the phrase, optional `Meaning:` and `Situation:` lines, a blank line between phrases. Convert it to backup-format JSON so the existing **Restore** imports it with no app change: `Situation:` goes in `source`, `status: "new"`, `seen: 0`, and deterministic ids so restoring twice adds nothing. Keep his text exactly, typos included, and never write a meaning for him. Ask whether everything is due tonight or spread out (suggested: 10 a night, oldest first — this sets first due dates only, not the rule). The file and the JSON hold his phrases, so keep both out of the public repo; name the JSON `phrasebook-….json` so `.gitignore` catches it. Import into the copy he uses nightly: the home-screen install from the Pages URL, so it needs installing first.
2. **Tags — designed, not built.** One tag per phrase, stored as a `tag` string on the item, empty allowed. Picked by tapping a chip from tags already used, plus a "+ New" that reveals a text input. Rendered as **text chips in the existing pill style — not emoji, not icons.** Used to filter the Words tab only; reviewing one tag at a time was considered and deliberately dropped for now. Chips in the Add form and the filter row are tappable, so they need the 44px minimum.
3. **Save with an empty meaning.** Already works — only `phrase` is required. What's missing is marking such entries incomplete and adding a "needs meaning" filter in the Words tab.
4. **Relabel `source`.** The field is labelled "Where I heard it" but what he actually writes is the social situation ("chatting with someone I was trying to get to know"). The label and placeholder should ask for that. The stored key stays `source` so old backups keep importing.
5. **Remaining design proposals from the mockup — not decided.** The redesign already took Save in the top bar, the large growing phrase box, equal-weight answers pinned low, a phrase that doesn't move, serif type and pressed states. Still only in `mockup/index.html` (which keeps the old dark look): Undo after each grade, "Add meaning" instead of the grade buttons when a card has no meaning, the backup reminder at the top of Words when overdue, and Delete confirmed on the button instead of `confirm()`. Port one per commit.
6. **Reverse cards.** Show the definition, recall the phrase.
7. **Pronunciation.** Read the phrase aloud with the browser's built-in `speechSynthesis`. No external API.
8. **Light stats.** Nightly streak, how many marked known this week, which phrases keep getting failed.
