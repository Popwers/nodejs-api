# Signup

A signed-in user creates another account: `mail`, `password` and `role`. The password is stored as a bcrypt hash with 10 rounds, and the mail is lowercased on insert. Source: `routes/auth.js`, `POST /signup`.

## Sub-features

- A new mail gives `200 Compte utilisateur enregistré.` and a new `users` row.
- An existing mail gives `409 User already exists. Please login.` (an English message) and adds no row.
- Missing or empty fields give `400 Veuillez remplir tous les champs.`
- No token gives `403`, and a bad token gives `401` (see `auth-guard.md`).
- A database error on the lookup or the insert gives `500 Une erreur est survenue.`

## How to get to it (user POV)

An admin who is already logged in submits the account form. The client posts form fields to `/auth/signup` with the JWT.

## Driving it with verify-nodejs-api

```bash
$V token                                          # real login; counts against the 5-login budget
$V sql "SELECT id, mail, role FROM users"
$V http --auth --name signup POST /auth/signup -F mail=New.User@example.test -F password=secret -F role=animateur
$V sql "SELECT id, mail, role, password LIKE '\$2b\$10\$%' AS bcrypt10 FROM users"
$V http --auth --name signup-dup POST /auth/signup -F mail=NEW.USER@example.test -F password=x -F role=animateur   # 409
$V http --auth --name signup-missing POST /auth/signup -F mail=a@example.test                                     # 400
$V http --name signup-no-token POST /auth/signup -F mail=a@example.test -F password=x -F role=r                   # 403
$V sql "SELECT COUNT(*) AS n FROM users"          # expect 2: the 409, 400 and 403 added nothing
$V doctor
```

Proof: a new row with `mail` lowercased (`new.user@example.test`), the role you sent and `bcrypt10 = 1`, plus the 200 response. The count after the negative cases is unchanged.

## Gotchas

- The duplicate check looks up the mail as sent, not lowercased. It catches `NEW.USER@…` only because the scaffolding's default MariaDB collation is case-insensitive. The production collation is not in the repo.
- Use the login token (`$V token`). `token --mint` is only a fallback when the login budget is spent; say so in the report.
