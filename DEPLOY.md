# Getting Phrasebook onto your phone

Follow these in order. Steps marked **you** are ones only you can do — they need your
GitHub account or your phone.

Read step 1 before doing anything else.

---

## 1. Back up first — you

Your phrases are not inside `phrasebook.html`. They're in a storage bucket that belongs to
the *address* the page was opened from. `file:///Users/...` and
`https://afillioapp.github.io/...` are different addresses, so they get different buckets.

**When you first open the website version, it will look completely empty. That is expected.
Nothing has been deleted.** Your old phrases are still in the old bucket. You'll put them
into the new one in step 6.

Do this on **every device where you've saved phrases** — your iPhone and your laptop are
separate piles with no connection between them.

1. Open the app the way you normally do.
2. Top right of the header shows a count, like "23 phrases". **Write that number down.**
3. **Words** tab → **Back up**. A file called `phrasebook-2026-07-31.json` downloads.
4. Open that file in any text editor. It should start with `[` and you should recognise your
   own phrases in it. Check the number of entries roughly matches step 2.
5. **Get it off the device.** On the iPhone it lands in Files → Downloads, which is on the
   same phone you're protecting against. Open it in Files, tap the share icon, and save it to
   iCloud Drive or Google Drive. On the laptop, do the same or email it to yourself.

Don't put the JSON in this project folder expecting it to go to GitHub — `.gitignore`
deliberately excludes `phrasebook-*.json` so your phrases never get published.

---

## 2. Push the code to GitHub

If the push has already been done for you, skip to step 3.

```bash
cd "$HOME/Documents/Business/Eng Phrases"
git push -u origin main
```

If that fails with a permission or "Host key verification" error, your Mac isn't set up with
an SSH key for GitHub. Switch to HTTPS instead and it will ask for your username and a
personal access token:

```bash
git remote set-url origin https://github.com/afillioapp/Eng-Phrases.git
git push -u origin main
```

---

## 3. Turn on GitHub Pages — you

This part is clicking in a web browser. It cannot be done from Terminal.

1. Go to `https://github.com/afillioapp/Eng-Phrases`
2. Click **Settings** — the tab along the top of the repository, *not* your account settings.
3. In the left sidebar, under **Code and automation**, click **Pages**.
4. Under **Build and deployment**, the **Source** dropdown says **None**. Change it to
   **Deploy from a branch**.
5. Two more dropdowns appear. Set the branch to **main** and the folder to **/ (root)**.
6. Click **Save**.

**What it looks like when it worked:** after a few minutes the page shows a box near the top
saying *"Your site is live at https://afillioapp.github.io/Eng-Phrases/"* with a **Visit
site** button.

The first publish can take **up to 10 minutes**. If nothing appears after an hour, something
actually failed — come back and say so.

---

## 4. Check it loads

On the laptop, open:

```
https://afillioapp.github.io/Eng-Phrases/
```

You should get the app, with a padlock in the address bar. It will be empty — that's step 1
again, and it's fine.

---

## 5. Install it on the iPhone — you

**Do this while you have signal.** A web app can only work offline after it has successfully
loaded online at least once — there is nothing cached until then. If you install it and
immediately go offline, it will fail, and that's not a bug.

1. Open **Safari** on the iPhone. It has to be Safari — Chrome on iOS can't install to the
   home screen.
2. Go to `https://afillioapp.github.io/Eng-Phrases/`
3. Tap the **Share** button (the square with an arrow), scroll down, tap **Add to Home
   Screen**, then **Add**.
4. Close Safari entirely and open Phrasebook from the **home screen icon**.

It should fill the whole screen with no address bar. That's the installed version.

**From now on, always use the home screen icon, not a Safari tab.** They may not share
storage — phrases you add through the icon might be invisible in a Safari tab and vice
versa. Pick the icon and stick to it.

---

## 6. Put your phrases back — you

Do this **inside the installed app**, opened from the home screen icon — not in a Safari tab.
That way the data lands in the copy you'll actually use every night.

1. Get your backup JSON onto the phone — from iCloud Drive, Google Drive, or the email you
   sent yourself.
2. Open Phrasebook from the home screen icon.
3. **Words** tab → **Restore** → pick the JSON file.
4. It says "Added N phrases". Check the count in the header matches what you wrote down in
   step 1.

Restore is safe to run more than once — it skips anything already there, so a double import
won't create duplicates.

---

## 7. Check it works offline — you

1. Open Phrasebook from the home screen icon at least once with signal, so it can cache.
2. Turn on **Airplane Mode**.
3. Close the app completely (swipe it away in the app switcher) and open it again.

It should open normally with all your phrases. If it does, you're done.

---

## Things worth knowing

**Your phrases still only live on that phone.** The home screen install makes iOS far less
likely to clear them — Apple gives installed web apps their own timer instead of the 7-day
one it applies to ordinary websites. But that's Apple's stated intent, not a guarantee, and
it says nothing about what happens if you delete the icon. **Keep hitting Back up now and
then**, and send the file to iCloud or Drive from the share sheet. The app will remind you
when it's been a while.

**The phone and the laptop are still separate.** Adding a phrase on one won't show it on the
other. Moving a backup file across is the way to sync them by hand.

**When the app gets updated:** push the change, then wait up to 10 minutes for GitHub to
publish and for your browser to stop using its cached copy. If you're impatient, close the
app fully and reopen it. Whoever edits the code must bump `VERSION` at the top of `sw.js`,
or the offline copy can serve the old app.

**If something breaks badly:** `git checkout .` in the project folder returns the code to the
last committed state. That never touches your phrases, which are in the browser, not in the
files.
