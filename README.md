# Private Diary

A personal diary website you write in yourself, and share read-only with only the people you choose.

- **Owner mode** (`/owner`): password-protected. Write, edit, delete pages. Pick a mood, date, and a handwriting style (Kalam, Caveat, Yatra One) with Hindi and English support.
- **Private share links**: each person gets their own long, unguessable link plus a passcode. They can only read pages you marked as *Shared*. They cannot write, edit or see private pages.
- **You stay in control**: change a passcode, make a new link, switch a link off, or delete it any time.
- **Looks**: notebook-paper pages, glass cards, dark and light mode, mobile first.
- **Free to host**: Vercel Hobby + TiDB Cloud Serverless free tier. No card needed.

> The screenshots below use made-up sample text. No real diary content is in this repo. Entries live only in your database.

| Unlock | Reading | Dark |
|---|---|---|
| ![unlock](docs/unlock.png) | ![read](docs/read.png) | ![dark](docs/read-dark.png) |

| Pages | Share links | Owner dark |
|---|---|---|
| ![pages](docs/owner-pages.png) | ![share](docs/owner-share.png) | ![owner dark](docs/owner-dark.png) |

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
   - `OWNER_PASSWORD` = the password you will use at `/owner`
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
