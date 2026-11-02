# JWT guard

`authMiddleware` (`middleware/auth.js`) protects every `/api` route and `/auth/signup`. It reads the token from the JSON body `token`, the `token` query parameter, the `x-access-token` header or a `token` cookie. It verifies the token with `TOKEN_KEY`.

## Sub-features

- No token gives `403 Un token est requis pour vous connecter.`
- An invalid or expired token gives `401 Token non valide.`
- A valid token in any of the four locations lets the handler run.

## How to get to it (user POV)

Any planning call made without a session, or after the 30-day token has expired.

## Driving it with verify-nodejs-api

```bash
$V sql "INSERT INTO lieux (nom) VALUES ('Salle A')"
$V http --name no-token DELETE /api/lieux/1
$V sql "SELECT COUNT(*) AS n FROM lieux"          # expect 1
$V doctor                                         # still ready
$V http --name bad-token DELETE /api/lieux/1 -H 'x-access-token: not-a-jwt'
$V sql "SELECT COUNT(*) AS n FROM lieux"          # the guard should keep 1
$V doctor
# valid token, other locations:
$V http --name query-token GET "/api/lieux?token=$($V token --mint)"
```

Proof: the status and body of each request, the `lieux` count after each one, and the doctor state afterwards.

## Gotchas

- **An invalid token bypasses the guard on master.** The middleware sends 401 but then calls `next()` anyway. The DELETE runs (the count drops to 0), the handler tries to send a second response, and the process **crashes** with `ERR_HTTP_HEADERS_SENT` (`Bun v1.4.2` in `app.log`). Doctor then fails. Report the bypass and the crash, then `$V cleanup && $V launch`.
- With no token at all, the 403 is sent, then `jwt.verify(undefined)` throws, then the 401 send throws inside the middleware. Express turns that into an error, so the handler does **not** run and the process survives. That is luck, not a guard.
- The cookie location never works: there is no `cookie-parser`, so `req.cookies` is undefined.
- The body location works only for JSON bodies, and nothing parses JSON. In practice only the header and the query string carry a token.
