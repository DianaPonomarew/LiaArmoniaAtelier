# Uploading to GitHub & deploying

Do this once. After that, every change is three commands.

---

## Before you start

Install Git if you have not: <https://git-scm.com/downloads>
Check it works — open Terminal (Mac) or Git Bash (Windows) and run:

```bash
git --version
```

Set your identity once per computer:

```bash
git config --global user.name "Diana"
git config --global user.email "atelier@liaarmonia.com"
```

---

## 1. Create the empty repository on GitHub

1. Go to <https://github.com/new>
2. **Repository name:** `lia-armonia`
3. **Visibility:** Private (you can make it public later)
4. Do **not** tick "Add a README", "Add .gitignore" or "Choose a license" —
   this folder already has them, and ticking them creates a conflict on the
   first push.
5. Click **Create repository**

GitHub then shows you a URL like `https://github.com/YOURNAME/lia-armonia.git`.
Keep that tab open.

---

## 2. Push this folder

Unzip this package, then in Terminal navigate into the unzipped folder:

```bash
cd path/to/lia-armonia
```

On Mac you can type `cd ` (with the space) and then drag the folder onto the
Terminal window — it fills in the path for you.

Then:

```bash
git init
git add .
git commit -m "Lia Armonia website: launch build"
git branch -M main
git remote add origin https://github.com/YOURNAME/lia-armonia.git
git push -u origin main
```

Replace `YOURNAME` with your actual GitHub username.

**On the password prompt:** GitHub no longer accepts your account password.
Create a token at <https://github.com/settings/tokens> → *Generate new token
(classic)* → tick the **repo** scope → copy it, and paste that as the password.
The username is your normal GitHub username.

---

## 3. Connect the repository to Vercel

1. <https://vercel.com/new>
2. **Import** the `lia-armonia` repository
3. Framework preset: **Other**
4. Build command: leave empty. Output directory: leave empty.
   This is a static site with serverless functions in `/api` — Vercel detects
   both automatically.
5. **Deploy**

Then add the three environment variables under
**Settings → Environment Variables** (see `MAIL-SETUP.md`) and
**redeploy** — variables only take effect on a new deployment.

---

## 4. Everyday workflow

After you change anything:

```bash
git add .
git commit -m "Describe what changed"
git push
```

Vercel rebuilds and publishes automatically within about a minute. Every push
also creates a preview deployment, so you can check a change before it becomes
the live site.

---

## Useful commands

```bash
git status              # what has changed and what is staged
git log --oneline       # history, newest first
git diff                # exact lines you changed since the last commit
git restore FILENAME    # throw away changes to one file
git pull                # pull down changes made elsewhere (e.g. edited on github.com)
```

---

## Rules that will save you pain

**Never commit `RESEND_API_KEY`.** The `.gitignore` in this folder already
excludes `.env`, but do not paste the key into any `.js`, `.html` or `.md` file.
Anything pushed to GitHub is permanent in the history even after you delete it —
if a key ever leaks, rotate it in Resend immediately rather than just removing
the line.

**The `assets/` folder is about 32 MB**, mostly the six `.mp4` files. Git handles
that, but if you keep adding large video files the repository will get slow. If
that happens, move video to a CDN or Vercel Blob and reference it by URL rather
than committing it.

**Do not delete `.gitignore` or `.gitattributes`.** The second one normalises
line endings, which prevents the "every single file shows as changed" problem
when moving between Windows and Mac.

---

## If something goes wrong

| Message | Fix |
|---|---|
| `remote origin already exists` | `git remote set-url origin https://github.com/YOURNAME/lia-armonia.git` |
| `failed to push some refs` / `rejected` | You ticked README on GitHub. Run `git pull origin main --allow-unrelated-histories`, resolve, then push again |
| `Support for password authentication was removed` | Use a personal access token as the password (step 2) |
| `nothing to commit, working tree clean` | There is nothing new to push — you are already up to date |
| `fatal: not a git repository` | You are in the wrong folder. `cd` into the unzipped project folder first |
