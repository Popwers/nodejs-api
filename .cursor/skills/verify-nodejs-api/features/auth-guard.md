# JWT guard

`authMiddleware` (`middleware/auth.js`) protects every `/api` route and `/auth/signup`. It looks for the token in the JSON body `token`, the `token` query parameter, the `x-access-token` header and a `token` cookie, in that order. It verifies the token with `TOKEN_KEY`. Only the header and the query string work in practice (see Gotchas).

## Sub-features

- No token gives `403 Un token est requis pour vous connecter.` The handler does not run.
- An invalid or expired token gives `401 Token non valide.` The handler does not run.
- A valid token in `x-access-token` or `?token=` lets the handler run.

## How to get to it (user POV)

Any planning call made without a session, or after the 30-day token has expired.

## Driving it with verify-nodejs-api

```bash
$V sql "INSERT INTO lieux (nom) VALUES ('Salle A')"
$V http --name no-token DELETE /api/lieux/1                                   # 403
$V sql "SELECT COUNT(*) AS n FROM lieux"                                      # expect 1
$V http --name bad-token DELETE /api/lieux/1 -H 'x-access-token: not-a-jwt'   # 401
$V sql "SELECT COUNT(*) AS n FROM lieux"                                      # expect 1
$V doctor                                                                     # still ready
# valid token, other locations:
$V http --name query-token GET "/api/lieux?token=$($V token)"                 # 200
$V http --name cookie-token GET /api/lieux -H "Cookie: token=$($V token)"     # 403: dead location
$V http --name body-token POST /api/lieux -F "token=$($V token)" -F nom=x     # 403: dead location
```

Proof: the status and body of each request, the `lieux` count after each one, and the doctor state afterwards.

## Gotchas

- The cookie location never works: there is no `cookie-parser`, so `req.cookies` is undefined.
- The body location never works either: no JSON or urlencoded parser is mounted, so `req.body` is undefined in Express 5. Form fields land on `req.fields`, and `fieldsMiddleware` runs after the guard. A JSON body with `token` also gets 403.
