# Kickoff prompt

Copy everything below the line and paste it as your first message to Claude Code.

(Make sure you've run `/model opus` first — see `START-HERE.md`.)

---

Read `CLAUDE.md` and then `phrasebook.html` in full before you plan anything or write any code.

## How I want you to work on this

You are the orchestrator, running on Opus 5. Spawn as many subagents as the work genuinely warrants, and run them on Sonnet.

Create them as project subagents — markdown files in `.claude/agents/` with YAML frontmatter — so they're committed to the repo and I can reuse them later. Each needs a `name`, a `description` specific enough that you know when to reach for it, a `tools` list scoped to only what it actually needs, and `model: sonnet`. Read-only agents get no Write or Edit.

Decide the roster yourself once you've read the code and understand the shape of the work. A reasonable starting instinct: someone who researches reference implementations on the web, someone who writes and runs tests, someone who audits the result against mobile and accessibility constraints. If the work wants a different split, use a different split. If a piece of work is small enough that delegating costs more than doing it, just do it yourself.

Two rules I care about:

- **Never let two subagents edit `phrasebook.html` at once.** It's a single file — concurrent edits will clobber each other. Fan out on research, review and tests; serialize the actual edits through you.
- **You own the final call.** Subagent output is a recommendation, not a decision. If two disagree, resolve it and tell me why.

Search the web freely rather than reinventing solved problems, following the guidance in `CLAUDE.md`.

## First task

Get the app onto my phone properly. Right now I have to open the file directly, and iOS can silently evict `localStorage` for `file://` pages, which would lose my saved phrases.

1. Add a web app manifest and a service worker so it installs to my home screen, opens full-screen, and works offline.
2. Generate the icons it needs.
3. Set up deployment to GitHub Pages, and walk me through the one-time steps I have to do myself. I can use Terminal but I'm not a developer — be explicit.
4. Build the jsdom test harness described in `CLAUDE.md` early, so you can delegate safely. Cover at minimum: saving an entry, search filtering, the flip-then-grade flow, that "didn't know" sets `due` to tomorrow while "knew it" pushes it 30 days out, and the local-midnight boundary.

Before anything else, tell me what could wipe the phrases I've already saved and how to back them up first. There's a Back up button in the Words tab that exports JSON.

## Now

Give me a short plan and your proposed subagent roster. **Don't write any code until I reply "go."**
