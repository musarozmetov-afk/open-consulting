---
name: publish-site
description: Publish the OPEN CONSULTING website — check translations, bump CSS/JS cache versions, commit, push to main, wait for the GitHub Pages and Cloudflare Pages builds, and confirm the live page serves the new version.
disable-model-invocation: true
---

# Publish the OPEN CONSULTING site

Run these steps in order from the repository root. Stop and report at the first failure; never skip a step to get a release out.

## 1. Translations

```bash
python scripts/check-i18n.py
```

Every Russian string must have `en` and `kk` entries in `i18n.js`. If anything is listed, add the translations to the `translations` dictionary (the key is the exact Russian text) and run the check again.

## 2. Cache versions

Only when `theme.css`, `i18n.js` or `script.js` changed since `origin/main` (`git diff --name-only origin/main -- theme.css i18n.js script.js`):

```bash
python scripts/bump-version.py
```

## 3. Review and commit

- `git status` and `git diff --stat`: commit only site files and the intended scripts. Never commit `.claude/launch.json`, `skill-observations/` or anything holding a secret.
- Commit with a message that says what changed for visitors and why.

## 4. Push to main

```bash
git fetch origin
git merge-base --is-ancestor origin/main HEAD   # must succeed; otherwise merge origin/main first and re-run steps 1–3
git push origin HEAD:main
```

If the current branch is not `main`, also push the branch itself (`git push origin HEAD`).

## 5. Wait for the builds

```bash
gh run list --repo musarozmetov-afk/open-consulting --limit 3
gh api repos/musarozmetov-afk/open-consulting/commits/$(git rev-parse HEAD)/check-runs --jq '.check_runs[] | "\(.name): \(.status) \(.conclusion)"'
```

Wait (Bash `run_in_background` with an until-loop, not repeated polling) until every check run is `completed`. Any conclusion other than `success` is a failed release: report it with the run link.

## 6. Confirm the live site

- GitHub Pages: fetch `https://musarozmetov-afk.github.io/open-consulting/` and confirm the HTML contains the new `?v=` value from step 2 (or a change from this commit).
- Cloudflare Pages: `https://openconsulting.pages.dev` (admin panel and `/api/*` only work there). On 2026-11-25 this host did not resolve in public DNS although builds succeeded — if it still fails, say so plainly; it is a Cloudflare project/domain setting, not the code.
- Check the page on a phone width (375px) in the browser pane: bottom contact bar visible, no horizontal scroll, RU/EN/KZ switch works.

Never submit the contact form while checking: it sends a real inquiry through Formspree.

## 7. Report

One short summary: commit hash, what visitors will see, the live URL(s) checked, and anything that failed or was not verified.
