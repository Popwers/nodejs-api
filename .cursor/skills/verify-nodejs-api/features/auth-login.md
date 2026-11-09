# Login

A planning user signs in with mail and password and gets a 30-day JWT. The server also stores that token in `users.token`. Source: `routes/auth.js`, `POST /login`.

## Sub-features

- A good mail and password give `200 {"token":"<jwt>"}`, and `users.token` is updated to that same JWT.
- An unknown mail gives `409 Votre identifiant ou votre mot de passe est incorrect.`
- A wrong password gives `400` with the same message.
- Missing or empty fields give `400 Veuillez remplir tous les champs.`
- The rate limit (`express-rate-limit`) allows 5 requests per 60 minutes, then answers `429 Too many requests, please try again later.` (the library's English default). Every response carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`.

## How to get to it (user POV)

The planning login form posts the `mail` and `password` form fields to `/auth/login` with no token.

## Driving it with verify-nodejs-api

```bash
$V sql "SELECT id, mail, token IS NULL AS no_token FROM users"
$V token                     # POST /auth/login -F mail=verify-admin@example.test -F password=<seed>
$V sql "SELECT token = '$($V token)' AS same FROM users WHERE mail = 'verify-admin@example.test'"   # expect 1
# negative cases (each counts against the 5-request budget; $V token counts once, then it is cached):
$V http --name login-unknown POST /auth/login -F mail=nobody@example.test -F password=x            # 409
$V http --name login-wrongpass POST /auth/login -F mail=verify-admin@example.test -F password=x    # 400
$V http --name login-missing POST /auth/login -F mail=verify-admin@example.test                    # 400
$V http --name login-5th POST /auth/login -F mail=nobody@example.test -F password=x                # 409, X-RateLimit-Remaining: 0
$V http --name login-6th POST /auth/login -F mail=nobody@example.test -F password=x                # 429
$V doctor
```

Proof: the 200 body in `*-auth-login-for-token.txt` holds a JWT, and the SQL read shows `users.token` equal to it. A token from `token --mint` never proves this feature.

## Gotchas

- The rate limiter is keyed by `req.ip`. Over a Unix socket `req.ip` is undefined, so `app.log` shows an `ERR_ERL_UNDEFINED_IP_ADDRESS` ValidationError stack (logged, not fatal) and **every client shares one budget of 5 per process**. The sixth login, failed ones included, gets `429`. Only a relaunch resets it (memory store). Behind Passenger in production, the same thing may apply unless `trust proxy` is set; that was not checked here.
- Plan the budget: `$V token` spends one call. When a run needs more than 5 logins, relaunch, or use `token --mint` for the routes behind the guard and say so.
- `middleware/formidable.js` keeps the last value of a repeated field (`-F mail=a -F mail=b` logs in as `b`).
- The lookup uses the mail as sent. With the scaffolding's default MariaDB collation the match is case-insensitive; the production collation is unknown.
