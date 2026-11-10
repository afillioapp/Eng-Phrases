# Working on this in VS Code

Most of the setup is done — git is initialised, the app is a working PWA, and there's
a test suite. **What's left is getting it online: step 4.**

---

## One-time setup

### 1. Open the folder in VS Code

```bash
code "$HOME/Documents/Business/Eng Phrases"
```

If `code` isn't a command yet: open VS Code, press `Cmd+Shift+P`, type
"Shell Command: Install 'code' command in PATH", hit enter, then try again.

### 2. Install the test dependencies

In VS Code's terminal (`Ctrl+` ` to open it):

```bash
npm install
```

Once, ever. It pulls jsdom, which is only used by the tests. The app itself has no
dependencies and must stay that way.

### 3. Check the tests pass

```bash
npm test
```

You should see `pass 34`. If you don't, something is wrong before you've even
started — say so.

### 4. Push it to GitHub — not done yet

The GitHub address is already connected (`git remote -v` prints `origin`), but
nothing has ever been pushed. The repository on GitHub is still empty, so the app
isn't online anywhere.

**Before your first push, know two things:**

- **The repository is public.** Everything you commit becomes visible to anyone.
  Your phrases aren't in the code, and `.gitignore` keeps backup files out.
- **Vercel is linked to the repository** and rebuilds on every push. Left as it is,
  your first push replaces the design mockup at eng-phrases.vercel.app with the whole
  project. Decide where the real app should live — GitHub Pages, as
  [DEPLOY.md](DEPLOY.md) describes, or Vercel — and ask Claude to set Vercel up to
  match before you push.

Then push:

```bash
git push -u origin main
```

If the push fails with a permission or "Host key verification" error, your Mac has
no SSH key for GitHub. The easy way round it is HTTPS — it'll ask for your username
and a personal access token:

```bash
git remote set-url origin https://github.com/afillioapp/Eng-Phrases.git
```

```bash
git push -u origin main
```

If the app is going on GitHub Pages, follow [DEPLOY.md](DEPLOY.md) next to switch
Pages on and install the app on your phone.

---

## Day to day

**Editing the app.** Everything is in `phrasebook.html` — markup, styles and logic in
one file. Scroll to the `<style>` block for appearance, the `<script>` block for
behaviour.

**Previewing a change.** Double-click `phrasebook.html`, or in VS Code right-click it
and choose "Open with Live Server" if you have that extension. Note that phrases
saved in a preview are stored separately from the ones in your installed app.

**After every change, run the tests.**

```bash
npm test
```

**Committing.** Small commits, one logical change each, with a message saying what
changed and why. Run `git status` first — it lists what will be included. If you see
a file you don't recognise, ask before committing it: the repository is public.

```bash
git add -A
git commit -m "What changed and why"
git push
```

Once the app is online, a push republishes it. Allow up to 10 minutes. Vercel also
rebuilds on every push.

---

## The one thing that's easy to forget

**If you change `phrasebook.html`, `manifest.json`, or anything in `icons/`, bump
`VERSION` at the top of `sw.js`.**

```js
const VERSION = "2";   // -> "3"
```

The service worker keeps an offline copy of the app, and that number is what tells
it the copy is stale. Forget, and your phone can keep opening the old version even
though the new one is live. Online you'd usually still get the update, but the
offline copy would stay behind.

---

## Importing your WhatsApp phrases

Copy them into a Word file, one phrase per block, with an empty line between phrases:

```text
To cut them slack
Meaning: To treat them less harshly

You should come with
Situation: I overheard a colleague
```

- Line 1 is always the phrase.
- `Meaning:` and `Situation:` are optional. Leave out whichever you don't have.
- Typos are fine. Claude keeps your words exactly and never writes a meaning for you.

**Save the file outside this folder** — your Desktop is fine. This folder goes to a
public repository, and the file is full of your phrases.

Then tell Claude where the file is. You'll get back a backup file to load with
**Restore** in the Words tab, and a question: everything due tonight, or about 10 a
night?

Load it into the copy of the app you'll use every night. If the app isn't on your
phone yet, do that first, or the phrases land in the wrong copy.

---

## The design mockup

`mockup/index.html` shows proposed design changes with sample phrases. It never saves
anything. It's online at https://eng-phrases.vercel.app — on the laptop you see the
three screens side by side, on the iPhone it runs full-screen.

It isn't the app, so don't add it to your home screen. To change it, ask Claude.

---

## Using Claude Code on this

From the project folder:

```bash
claude
```

`CLAUDE.md` loads automatically every session — you don't need to paste anything.
Just describe what you want.

**Which model:** use `/model fable` for design questions only — how it looks,
mockups, critiques — and `/model opus` for everything else. Fable uses your allowance
much faster. Ask all your design questions in one go, then switch back: the first
message after each switch costs more, because the new model reads the whole
conversation again.

Four subagents are already defined in `.claude/agents/` and Claude will reach for
them when they fit: two read-only researchers (iOS PWA behaviour, GitHub Pages), a
test writer, and a mobile and accessibility auditor.

`KICKOFF-PROMPT.md` is the original first message from the PWA work. It's kept for
reference — you don't need it again.

---

## If something breaks

```bash
git checkout .
```

Returns every file to the last commit. **It never touches your saved phrases** —
those live in the browser, not in the files.

If you've lost phrases rather than code, that's what the **Back up** button in the
Words tab is for, and why [DEPLOY.md](DEPLOY.md) nags you about it.
