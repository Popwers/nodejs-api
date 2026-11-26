# nodejs-api

HTTPS Express API for planning.jourdefete.re. It stores animations, animateurs, clients, and lieux in MySQL and listens on the Unix socket `passenger` for Phusion Passenger. Package manager is Bun. The lockfile is `bun.lock`.

## Commands

| Target | Command |
| --- | --- |
| `make install` | `bun install` |
| `make run` | `bun index.js` |
| `bun run test` | `node --test "tests/**/*.test.js"` |

Tests use the built-in `node:test` runner and a fake MySQL connection. They mount the real routers on a Unix socket, so they need no database, no network, and no certificates. `tests/helpers.js` reloads the project modules for each app, because `routes/*.js` keep their router and rate limiter at module level.

## Process

`index.js` builds an HTTPS server from `certificates/selfsigned.key` and `certificates/selfsigned.crt`. They are gitignored; `make certs` (run by `make run`) generates them with `openssl` when missing. It listens on the Unix socket `passenger` for Phusion Passenger. MySQL settings come from `config.js`: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, and optional `DB_PORT`, falling back to `HOST`, `USER`, `PASSWORD`, and `DATABASE`. `index.js` opens one MySQL pool per process (10 connections, 10 s to connect or to wait for one). A lost connection is replaced on the next query. Every statement times out after 30 seconds.

JWT uses `process.env.TOKEN_KEY` and expires in 30 days. Bcrypt uses 10 salt rounds.

## HTTP routes

Routes are mounted in `index.js`.

- `/auth` from `routes/auth.js`. `POST /auth/login` is public and rate-limited to 5 requests per 60 minutes. `POST /auth/signup` requires a JWT whose account has the role `ADMIN_ROLE` (default `admin`), read from the `users` table.
- `/api` from `routes/animations.js`, `routes/animateurs.js`, `routes/clients.js`, `routes/lieux.js`. Collection routes are `GET` and `POST`. Item routes are `GET`, `PUT`, and `DELETE` on `/:id`. Every `/api` handler uses `authMiddleware`. List routes return every row unless `?limit` or `?offset` is sent; then they page by `id` and return at most `LIST_MAX_ROWS` rows (default 10000).

Unknown paths return 404 from a final `app.use` handler. Express 5 rejects `route('*')`.

## Socket.io

`ioAuth` waits 5 seconds for an `authenticate` event that carries `{ token }`. A valid token emits `authenticated`. Writes emit `subscribeAnimations`, `subscribeAnimateurs`, `subscribeClients`, or `subscribeLieux`.

## Invariants

- Database JSON uses `statut`, not `status`.
- User-facing error strings are French.
- Form bodies land on `req.fields` via `middleware/formidable.js`.
- Protected writes use `authMiddleware` then `fieldsMiddleware`.
- `controllers/db.js` returns `{ statut, error, results }` for `get`, `post`, `searchEntry`, `putEntry`, and `deleteEntry`.
- CORS origins are `http://planning.jourdefete.re` and `https://planning.jourdefete.re`, with and without `www`.
- Login tokens go in `req.body.token`, `req.query.token`, `x-access-token`, or cookie `token`.

## Layout

```
index.js
config.js
controllers/db.js
controllers/page.js
middleware/auth.js
middleware/formidable.js
middleware/pagination.js
routes/auth.js
routes/animations.js
routes/animateurs.js
routes/clients.js
routes/lieux.js
Makefile
tests/helpers.js
tests/*.test.js
```
