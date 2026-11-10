# Working on this in VS Code

The setup steps that used to be here are done — git is initialised, the app is a
working PWA, and there's a test suite. This is what to do from here.

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

### 4. Connect it to GitHub

This hasn't been done yet. Check first:

```bash
git remote -v
```

If that prints nothing, add the remote and push:

```bash
git remote add origin git@github.com:afillioapp/Eng-Phrases.git
```

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

Then follow [DEPLOY.md](DEPLOY.md) to switch on GitHub Pages and install the app on
your phone.

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
changed and why.

```bash
git add -A
git commit -m "What changed and why"
git push
```

A push automatically republishes the site. Allow up to 10 minutes.

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

## Using Claude Code on this

From the project folder:

```bash
claude
```

`CLAUDE.md` loads automatically every session — you don't need to paste anything.
Just describe what you want.

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
