# Phrasebook

`phrasebook.html` is a working app. Read it in full before changing or planning anything.

## What it is

A personal, mobile-first web app for learning English. Alireza is a non-native speaker. During the day he hears a phrase, idiom or piece of slang he doesn't know, and captures it in the app with his own definition plus a note about where he heard it — the context is what makes it stick. At night before bed he opens the review tab and flips through flashcards.

Single user, on an iPhone and a laptop. No one else will ever use it.

Alireza is comfortable in Terminal but is not a developer. When he needs to do something himself, be explicit and assume nothing. Explain trade-offs in plain language.

Repo: `git@github.com:afillioapp/Eng-Phrases.git`

## Hard constraints — do not violate without asking first

- **It stays a single HTML file.** No React, no bundler, no runtime dependencies, no shipped `node_modules`. The file should work if emailed to yourself. Dev-only tooling like a test runner is fine, gitignored.
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
  source,    // where he heard it, may be empty
  created,   // ISO string
  due,       // "YYYY-MM-DD"
  status,    // "new" | "learning" | "known"
  seen       // times graded
}
```

Stored newest-first in `localStorage` under the key `phrasebook.v1`. New entries are created `due: today, status: "new"` so they appear in the same night's deck. Tonight's deck is every item where `status !== "known" && due <= today`, shuffled.

Dates are local-timezone `YYYY-MM-DD` strings, never UTC — a phrase saved at 11pm belongs to that day, not the next one. Use the existing `dayStr()` helper, not `toISOString().slice(0,10)`.

## Design

Tokens are defined in the file's `:root`. Dark and low-light because the app is used in bed. System font stack, 44px minimum tap targets, 16px inputs so iOS doesn't zoom on focus, safe-area insets respected top and bottom.

## Verification

Tests use jsdom: load the HTML with `runScripts: 'dangerously'`, drive it with real click and input events, assert against the resulting DOM and the `window.__pb` object the file exposes.

Run the tests after every change. Keep `node_modules` gitignored — the app itself must stay dependency-free.

If something can't be verified in jsdom — service worker behavior, a real iOS install — say so plainly and explain how to check it on the phone. Do not report it as working.

## Working style

Small, reviewable commits: one logical change each, with a message saying what changed and why.

Search the web rather than reinventing solved problems — especially service workers, manifests, iOS home-screen PWA quirks, and `localStorage` eviction on iOS Safari. That area is full of stale and wrong advice, so prefer official sources (MDN, web.dev, Apple's WebKit blog), check dates, and flag when sources conflict. Adapt findings to this codebase's style rather than pasting them in, and never add a library for something that's twenty lines of vanilla JS.

## Subagents

Use them, on Sonnet, defined in `.claude/agents/` with `model: sonnet` and a `tools` list scoped to what each actually needs. Read-only agents get no Write or Edit.

**Never let two subagents edit `phrasebook.html` at the same time.** Everything lives in that one file, so concurrent edits clobber each other. Fan out on research, review and tests; serialize edits to that file through the orchestrator.

Give each subagent enough context to work alone — they start cold. Run independent ones in parallel. If a task is small enough that delegating costs more than doing it, just do it.

## Backlog

1. **Save with an empty meaning.** Sometimes there's only time to catch the phrase. Allow saving the phrase alone, mark it incomplete, add a "needs meaning" filter in the Words tab.
2. **Tags.** Free-text tags (work, TV, slang, phrasal verbs), with the ability to review one tag at a time.
3. **Reverse cards.** Show the definition, recall the phrase.
4. **Pronunciation.** Read the phrase aloud with the browser's built-in `speechSynthesis`. No external API.
5. **Light stats.** Nightly streak, how many marked known this week, which phrases keep getting failed.
