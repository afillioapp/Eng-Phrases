# Design prompt for Lovable

Paste everything below the line into Lovable to explore visual designs.

**This is for looking at, not for using.** Lovable builds React apps with a bundler
and Tailwind. `CLAUDE.md` makes "single HTML file, no React, no bundler, no runtime
dependencies" a hard constraint, so whatever comes back cannot be dropped into
`phrasebook.html`. Treat the output as a sketch to steal ideas from.

Two things deliberately written into the prompt, because without them every AI
builder drifts the same way:

- It states that the two-outcome scheduling rule is **intentional** and must not be
  "improved" into SM-2, ease factors or a confidence slider.
- It gives the **exact hex tokens** from the app's `:root`, so what comes back is
  comparable to what already exists rather than a different app in a different palette.

---

Build a personal English phrasebook app. Mobile-first, for one person on an iPhone.

THE PERSON
A non-native English speaker. During the day he overhears phrases, idioms and slang
he doesn't know — not single words, whole phrases like "sorry, I slept in early last
night". He captures them on his phone in the moment. At night, in bed, he reviews
them as flashcards. Nobody else will ever use this app. There are no accounts.

TWO HALVES

1. CAPTURE — fast, one-handed, usable in ten seconds while a conversation is still
   happening. Four fields:
   - Phrase (required) — the thing he heard, verbatim
   - What it means (optional) — HIS OWN WORDS, never generated for him
   - The situation (optional) — the social moment, not a place. Example: "chatting
     with someone I was trying to get to know". A short note here is what makes the
     phrase stick later.
   - Tag (optional) — one per phrase. Small text chips he taps, drawn from tags he
     has used before, plus a way to type a new one. No emoji, no icons.
   Saving with only the phrase filled in must work. Often there's only time for that.

2. REVIEW — a nightly flashcard deck.
   - Shows the phrase alone, face down. Tap anywhere on the card to reveal the
     meaning and the situation underneath.
   - Once revealed, two buttons only: "Didn't know" and "Knew it".
   - A thin progress bar and a quiet "3 of 11" counter.
   - When the deck is empty: a calm done state, plus an option to practise all
     phrases anyway.

THE SCHEDULING RULE — DELIBERATELY STUPID, DO NOT IMPROVE IT
   "Knew it" → the phrase disappears for 30 days.
   "Didn't know" → it comes back tomorrow.
   That is the entire algorithm. Do NOT implement SM-2, Anki intervals, ease
   factors, confidence sliders, or a third grade button. The simplicity is the
   feature — it keeps the nightly decision to one tap with no thinking.

A THIRD TAB holds the full list of saved phrases, with a search box that matches
phrase, meaning and situation, and a row of tag chips to filter by. Each phrase
shows as a card with its meaning, its situation in quotes and italics, and small
status pills. Tapping a card reveals Edit / Review again / Delete.

NAVIGATION is a fixed bottom bar with exactly three tabs: Add, Words, Review.
Review carries a small amber badge with the count of cards due tonight.

VISUAL LANGUAGE — this is the part I care most about
   Dark and low-light, because it is used in bed with the lights off. It should feel
   quiet and plain, like a well-set page — not like a product, not gamified, no
   celebration, no streaks, no mascot.

   Use exactly these colours:
     background      #12131a
     card surface    #1c1e28
     raised surface  #252836
     borders         #31344a
     text            #eef0f7
     muted text      #9aa0b8
     accent (indigo) #7c8cff
     positive        #3ecf8e
     warning (amber) #ffb454
   Corner radius 14px, 20px on the flashcard. System font stack
   (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif).

   ABSOLUTELY NO emoji, illustrations, gradients, drop shadows, or glows anywhere.
   Flat fills and single-pixel borders only. Icons, where needed, are thin stroked
   line icons in the style of iOS SF Symbols — about 1.9px stroke, rounded caps.

IPHONE CONSTRAINTS — treat these as hard requirements
   - Every tappable thing at least 44x44px.
   - Every text input at font-size exactly 16px, or iOS zooms the page on focus.
   - Respect safe-area insets top and bottom (notch and home indicator). Content
     runs full-bleed under the status bar.
   - Must look right at 375px wide. Long unbroken words must wrap, never scroll
     sideways.
   - It runs installed to the home screen with no browser chrome, so the layout
     cannot rely on a URL bar or browser back button existing.

EXPLICITLY DO NOT BUILD
   - Any AI feature, dictionary lookup, auto-translation, or generated example
     sentences. He writes every definition himself — that is the entire point.
   - Accounts, login, sync, sharing, social features, or analytics.
   - Spaced repetition beyond the two-outcome rule above.
   - Notifications, streaks, points, levels, or any gamification.

Data shape, for reference:
   { id, phrase, meaning, situation, tag, created, due (YYYY-MM-DD), status
     ("new" | "learning" | "known"), seen (number of times graded) }
   Dates are LOCAL calendar dates, never UTC — a phrase saved at 11pm belongs to
   that day, not the next one.

Show me the Add screen, the Review screen mid-flip, and the Words list with a tag
filter active.
