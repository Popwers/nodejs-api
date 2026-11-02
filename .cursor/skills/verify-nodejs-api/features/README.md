# nodejs-api verification map

This directory is the maintained source for verifying what the planning client can do with nodejs-api. Read this index before you drive anything. Then use the matching file as the recipe.

| Feature | File | Entry points | Status on master (2026-11-03) |
| --- | --- | --- | --- |
| Login | [auth-login.md](auth-login.md) | `POST /auth/login` | **Broken**: 500, `formidable is not a function` |
| Signup | [auth-signup.md](auth-signup.md) | `POST /auth/signup` | **Broken**: same 500 |
| Resources CRUD | [api-resources.md](api-resources.md) | `GET`/`POST /api/{animations,animateurs,clients,lieux}`, `GET`/`PUT`/`DELETE /api/<resource>/:id` | GET and DELETE work; POST and PUT 500 |
| JWT guard | [auth-guard.md](auth-guard.md) | every `/api` route, the 4 token locations | Missing token is blocked. An **invalid token still runs the handler**, then crashes the process |
| Realtime events | [realtime-socket.md](realtime-socket.md) | socket.io `authenticate`, `subscribe*` | Works |

## Baseline preconditions

- `$V launch` ends with `doctor: ready` (`$V` = `.cursor/skills/verify-nodejs-api/bin/verify-nodejs-api`).
- The DB holds only the seed user `verify-admin@example.test`. The resource tables are empty.
- Unknown paths return 404 (`$V http GET /nope`). Doctor relies on that.
- The instance answers only on `/tmp/verify-nodejs-api/run/passenger`. Never target planning.jourdefete.re.

## Driving conventions

- Start each recipe from a fresh `launch` unless it says otherwise. A crash or the login rate limit (5 per process) changes the state.
- Run HTTP calls through `$V http`, reads of side effects through `$V sql`, and socket checks through `$V socket watch`. Every call writes evidence.
- Send bodies as form fields (`-F name=value`), never JSON. The token goes in `x-access-token` (`--auth`).
- Run `$V doctor` after every request that returned 500 or used a bad token.

## Proof and skip reporting

- Pair each write with a `$V sql` read before and after it. The API body says `success` even when the SQL failed.
- Name the feature file, the entry point and the evidence path for every claim.
- When a journey fails on master, report it as failing with the evidence file. Do not reroute it through `$V sql` or `token --mint` and call it verified.
- A route you seeded or authenticated with a workaround is verified only for what ran after the workaround. Say which workaround you used.
