# Private Diary

A personal diary website you write in yourself, and share read-only with only the people you choose.

- **Owner mode** (`/owner`): password-protected journal. Every day is a page you design yourself.
- **Page editor**: drag, resize and rotate photos, text, stickers, washi tape, to-do notes and a music player. Polaroid, tape, round and film frames, photo filters, 4 paper styles. Autosaves.
- **Media**: upload photos (shrunk in the browser), a short video (10-20s, converted in the browser to a small muted looping clip) and your own song (audio file). Stored in your own database, about 14 MB per file.
- **Settings**: light/dark/auto theme, default paper, diary name, change password, share links, storage and cleanup.
- **Private share links**: each person gets a long unguessable link plus a passcode and can read only pages marked *Shared*.
- **Free to host**: Vercel Hobby + TiDB Cloud Serverless free tier. No card needed.

> Screenshots use made-up sample content. No real diary content is in this repo.

| Home | Editor | Editor dark |
|---|---|---|
| ![home](docs/home.png) | ![editor](docs/editor.png) | ![dark](docs/editor-dark.png) |

| Settings | Shared view |
|---|---|
| ![settings](docs/settings.png) | ![shared](docs/shared-view.png) |

## Privacy and security

- Pages are stored in your own database, never in this repo.
- Share links are 32 random characters. Passcodes are stored hashed (scrypt), never in plain text.
- Wrong passcode or password 6 times locks that IP for 15 minutes.
- Cookies are HttpOnly, Secure, SameSite=Strict and signed. Changing a passcode or link logs old viewers out.
- Every page sends `noindex`, `robots.txt` blocks crawlers, and a strict Content-Security-Policy is set. Nothing is public to search engines.
- API checks the request origin on every write (CSRF protection).

## Deploy your own (free)

1. Create a free [TiDB Cloud Serverless](https://tidbcloud.com) cluster and copy its connection details.
2. Fork this repo and import it in [Vercel](https://vercel.com) (Hobby plan).
3. Add these environment variables in Vercel:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (and optionally `DB_PORT`, default 4000) from your TiDB connect dialog. Or one `DB_URL` = `mysql://USER:PASSWORD@HOST:4000/DBNAME`.
   - `OWNER_PASSWORD` = the first password for `/owner` (you can change it later in Settings; the changed one is stored as a hash in your database)
4. Deploy. Tables are created automatically on first request.
5. Open `/owner`, log in, write a page, then use the *Share* tab to make a link.

## Run locally

```bash
npm install
node dev-server.js   # in-memory database, owner password: test
```

## Stack

Static HTML/CSS/JS front end, one Node serverless function (`api/index.js`), MySQL-compatible database. No frameworks.

## License

MIT

## Install as an app

- Owner: open `/owner` in Chrome (Android) and tap Install, or in Safari (iPhone) Share > Add to Home Screen. The home screen also shows an Install button.
- Android APK: see the `v1.0.0-android` release (a thin WebView wrapper that opens the owner page).
