# Login

A planning user signs in with mail and password and gets a 30-day JWT. The server also stores that token in `users.token`. Source: `routes/auth.js`, `POST /login`.

## Sub-features

- A good mail and password give `200 {"token":"<jwt>"}`, and `users.token` is updated for that user.
- An unknown mail gives `409 Votre identifiant ou votre mot de passe est incorrect.`
- A wrong password gives `400` with the same message.
- Missing fields give `400 Veuillez remplir tous les champs.`
- The rate limit (`express-rate-limit`) allows 5 requests per 60 minutes, then answers `429`.

## How to get to it (user POV)

The planning login form posts the `mail` and `password` form fields to `/auth/login` with no token.

## Driving it with verify-nodejs-api

```bash
$V sql "SELECT id, mail, token IS NULL AS no_token FROM users"
$V token                     # POST /auth/login -F mail=verify-admin@example.test -F password=<seed>
$V sql "SELECT id, mail, LEFT(token, 20) AS token FROM users"
# negative cases (each counts against the 5-request budget):
$V http --name login-unknown POST /auth/login -F mail=nobody@example.test -F password=x
$V http --name login-missing POST /auth/login -F mail=verify-admin@example.test
```

Proof: the 200 body holds a JWT, and the second SQL read shows `users.token` equal to that JWT. A token from `token --mint` never proves this feature.

## Gotchas

- **Broken on master.** Every call returns `500` with an HTML page containing `TypeError: formidable is not a function`. `middleware/formidable.js` calls `require('formidable')({})`, but formidable 3.5 in CommonJS exports an object (`{ formidable, IncomingForm, default, ... }`). This happens under Node 26 and Bun 1.4 alike. Report the journey as failing with the `*-auth-login-for-token.txt` evidence. Do not work around it here.
- The rate limiter is keyed by `req.ip`. Over a Unix socket `req.ip` is undefined, so `app.log` shows `ERR_ERL_UNDEFINED_IP_ADDRESS` and **every client shares one budget of 5 per process**. The sixth login, failed ones included, gets `429`. Only a relaunch resets it (memory store). Behind Passenger in production, the same thing may apply unless `trust proxy` is set; that was not checked here.
- Once form parsing is fixed, check that `bcrypt.compare` receives a string. formidable v3 returns each field as an array (`["value"]`).
- Not observed yet, because form parsing fails first. Reading the code, an unknown mail sends 409 and the handler then keeps going (`user.password` on the result object). Expect a second-send error or a crash in `app.log` once parsing works, and run `$V doctor` afterwards.
