# Deploying to IIS

The full guide is `DEPLOY_IIS.md` in the `voting_backend` repository. On the server, this
repository is cloned to `C:\inetpub\wwwroot\zbvs`. The IIS application `/zbvs` serves its
`build\` folder, and the backend is cloned into `Server\` inside it, which this repository
ignores.

`build/` is committed, so the server only runs `git pull`. **After changing the frontend,
build and commit `build/` with the source.** Use PowerShell or cmd; Git Bash has crashed during
this build:

```powershell
npm run build
git add -A
git commit -m "..."
git push
```

`src/api/base.js` chooses the API address:

| | API base |
| --- | --- |
| `npm start` (development) | `http://localhost:5000/api` |
| `npm run build` (IIS) | `/zbvs/api` |
| either, with `VITE_API_BASE` set | that value |

The build includes `web.config` (from `public/`). It sets `index.html` as the default document,
stops browsers caching it so a new build is picked up, and caches the hashed files in
`assets/` for a year. Routing uses the URL hash (`#/...`), so IIS needs no rewrite rules.

On the server, sign-in uses the Zemen Bank domain account (username or email). Locally it
still uses the test passwords. `src/api/auth.js` attaches the signed-in user's token to every
API request, because the server refuses API calls without one.
