# nodejs-api

HTTPS Express API for planning.jourdefete.re. It stores animations, animateurs, clients, and lieux in MySQL. JWT protects `/api/*`. Socket.io emits an event on each write.

This repo is not on Vite+. Install and run with Bun.

## Install dependencies

```bash
make install
```

That target runs `bun install` from `bun.lock`.

## Set environment variables

The process reads these names from the environment. There is no `.env` loader.

| Name | Used for |
| --- | --- |
| `HOST` | MySQL host |
| `USER` | MySQL user |
| `PASSWORD` | MySQL password |
| `DATABASE` | MySQL database |
| `TOKEN_KEY` | JWT secret |

## Start the server

```bash
make run
```

That target runs `bun index.js`. `index.js` creates an HTTPS server with `certificates/selfsigned.key` and `certificates/selfsigned.crt`, then calls `httpsServer.listen('passenger')`. That binds a Unix socket named `passenger` in the repo root for Phusion Passenger. The socket path is gitignored.

The process reconnects to MySQL if the connection drops. It pings the database every 5 seconds.

## Call the API

Send login and signup as form fields. `middleware/formidable.js` puts parsed fields on `req.fields`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | none | Fields: `mail`, `password`. Rate limit: 5 requests per 60 minutes. Returns `{ token }`. |
| `POST` | `/auth/signup` | JWT | Fields: `mail`, `password`, `role`. |
| `GET`, `POST` | `/api/animations`, `/api/animateurs`, `/api/clients`, `/api/lieux` | JWT | List and create. |
| `GET`, `PUT`, `DELETE` | `/api/animations/:id`, `/api/animateurs/:id`, `/api/clients/:id`, `/api/lieux/:id` | JWT | Read, update, and delete one row. |

Pass the JWT in the JSON body as `token`, in the query as `token`, in the `x-access-token` header, or in a `token` cookie.

Writes emit `subscribeAnimations`, `subscribeAnimateurs`, `subscribeClients`, or `subscribeLieux`. CORS allows `planning.jourdefete.re` with and without `www`, over `http` and `https`.
