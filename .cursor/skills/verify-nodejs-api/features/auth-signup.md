# Signup

A signed-in user creates another account: `mail`, `password` and `role`. The password is stored as a bcrypt hash with 10 rounds, and the mail is lowercased. Source: `routes/auth.js`, `POST /signup`.

## Sub-features

- A new mail gives `200 Compte utilisateur enregistré.` and a new `users` row.
- An existing mail gives `409 User already exists. Please login.` (the only English message).
- Missing fields give `400 Veuillez remplir tous les champs.`
- No token gives `403`, and a bad token gives `401` (see `auth-guard.md`).

## How to get to it (user POV)

An admin who is already logged in submits the account form. The client posts form fields to `/auth/signup` with the JWT.

## Driving it with verify-nodejs-api

```bash
$V sql "SELECT id, mail, role FROM users"
$V http --auth --name signup POST /auth/signup -F mail=New.User@example.test -F password=secret -F role=animateur
$V sql "SELECT id, mail, role, password LIKE '\$2b\$10\$%' AS bcrypt10 FROM users"
$V doctor
```

Proof: a new row with `mail` lowercased (`new.user@example.test`), the role you sent and `bcrypt10 = 1`, plus the 200 response.

## Gotchas

- **Broken on master**, the same `formidable is not a function` 500 as login, because `fieldsMiddleware` runs before the handler. Report it as failing.
- Login is broken too, so the JWT has to come from `$V token --mint`. Say so in the report.
- Not observed yet, because form parsing fails first. Reading the code, when `mail` already exists the handler sends 409 and then still calls `dbController.post` with `password: null`. Check `app.log` for a second-send error, and check that no row was added.
