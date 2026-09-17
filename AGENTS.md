# nodejs-api

HTTPS Express API for planning.jourdefete.re. It stores animations, animateurs, clients, and lieux in MySQL and listens on the Unix socket `passenger` for Phusion Passenger. Package manager is Bun. The lockfile is `bun.lock`.

## Commands

| Target | Command |
| --- | --- |
| `make install` | `bun install` |
| `make run` | `bun index.js` |

`package.json` has no scripts and no test runner.

## Process

`index.js` builds an HTTPS server from `certificates/selfsigned.key` and `certificates/selfsigned.crt`. It listens on the Unix socket `passenger` for Phusion Passenger. MySQL comes from `process.env.HOST`, `process.env.USER`, `process.env.PASSWORD`, and `process.env.DATABASE`. A lost connection retries after 2 seconds. A keep-alive query runs every 5 seconds.

JWT uses `process.env.TOKEN_KEY` and expires in 30 days. Bcrypt uses 10 salt rounds.

## HTTP routes

Routes are mounted in `index.js`.

- `/auth` from `routes/auth.js`. `POST /auth/login` is public and rate-limited to 5 requests per 60 minutes. `POST /auth/signup` requires a JWT.
- `/api` from `routes/animations.js`, `routes/animateurs.js`, `routes/clients.js`, `routes/lieux.js`. Collection routes are `GET` and `POST`. Item routes are `GET`, `PUT`, and `DELETE` on `/:id`. Every `/api` handler uses `authMiddleware`.

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
controllers/db.js
middleware/auth.js
middleware/formidable.js
routes/auth.js
routes/animations.js
routes/animateurs.js
routes/clients.js
routes/lieux.js
certificates/selfsigned.crt
certificates/selfsigned.key
Makefile
```
