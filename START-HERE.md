# Start here

Everything you need is in this folder. Follow these steps in order.

---

## Step 1 — Open Terminal in this folder

```bash
cd "$HOME/Documents/Business/Eng Phrases"
```

## Step 2 — Set up git and connect the repo

Run these one at a time:

```bash
git init
git add -A
git commit -m "Working version of Phrasebook"
git branch -M main
git remote add origin git@github.com:afillioapp/Eng-Phrases.git
git push -u origin main
```

If the last command fails with a permission or "Host key verification" error, your Mac isn't set up with an SSH key for GitHub yet. Either follow GitHub's SSH key guide, or switch to HTTPS instead:

```bash
git remote set-url origin https://github.com/afillioapp/Eng-Phrases.git
git push -u origin main
```

**Why this matters:** that first commit is your safety net. If anything later breaks the app, `git checkout .` puts it back exactly as it is right now.

## Step 3 — Back up any phrases you've already saved

If you've been using `phrasebook.html` already, open it, go to the **Words** tab, and hit **Back up**. That downloads a JSON file. Keep it somewhere safe.

Your phrases live inside your browser, not inside the file. Moving the file to a real website in Step 5 means starting from an empty list, and you'll restore from that JSON backup afterwards.

Skip this step if you haven't saved anything yet.

## Step 4 — Start Claude Code

```bash
claude
```

Then type this and press enter:

```
/model opus
```

This puts the orchestrator on Opus 5. Its subagents will run on Sonnet, which the prompt handles.

## Step 5 — Paste the first message

Open `KICKOFF-PROMPT.md` in this folder, copy the whole thing, and paste it as your first message to Claude.

It will read the app, then come back with a plan and a proposed team of subagents. **It's instructed not to write any code until you reply "go."** Read the plan first.

---

## What's in this folder

| File | What it is |
| --- | --- |
| `phrasebook.html` | The working app. Double-click to open it in a browser. |
| `KICKOFF-PROMPT.md` | The message to paste into Claude Code. |
| `CLAUDE.md` | Project rules Claude Code loads automatically every session. You don't need to paste this. |
| `START-HERE.md` | This file. |

## If you come back to this later

You don't need the kickoff prompt again. Just `cd` into the folder, run `claude`, `/model opus`, and describe what you want. `CLAUDE.md` reminds it of the rules automatically.
