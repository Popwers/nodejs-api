---
name: verify-nodejs-api
description: Drive the nodejs-api HTTPS Express API (planning.jourdefete.re backend) against a disposable local MariaDB, over its Unix socket `passenger`, with curl and a socket.io polling client. Use when proving a mapped route (login, signup, the four /api resources, JWT guard, socket.io events), reproducing an API bug, or checking a change before shipping.
---

# Verify nodejs-api

This skill drives `Popwers/nodejs-api`. The surface is an HTTP API. There is no UI and no CLI. `index.js` serves HTTPS on a **Unix socket** named `passenger`, placed in the process working directory, not on a TCP port. MySQL settings come from `HOST`, `USER`, `PASSWORD` and `DATABASE`. The port is always the driver default, 3306. Socket.io runs on the same server.

Read `features/README.md` before you drive anything. Each feature file is a recipe. Do not invent other entry points.

Every command below runs from the repo root. `$V` is short for `.cursor/skills/verify-nodejs-api/bin/verify-nodejs-api`. Run `$V help` to list the subcommands.

## Launch

You need `bun`, `openssl` and `curl`. You also need MariaDB binaries (no sudo, no Docker). Download them once to `~/.cache/verify-nodejs-api/mariadb`, about 335 MB from archive.mariadb.org:

```bash
V=.cursor/skills/verify-nodejs-api/bin/verify-nodejs-api
$V fetch-mariadb          # once per machine; or set VERIFY_MARIADB_HOME to an existing MariaDB basedir
$V launch
```

`launch` does these steps, in order:

1. Runs `bun install --frozen-lockfile` when `node_modules/express` is missing. It leaves the marker `node_modules/.verify-nodejs-api-installed`. It never edits `package.json` or `bun.lock`.
2. Creates `/tmp/verify-nodejs-api/run/` (override the base with `VERIFY_DIR`). It writes `state.env` (mode 600) with a random DB password, a random `TOKEN_KEY` and a random seed-user password. Nothing goes into the repo.
3. Initializes a fresh MariaDB datadir. It starts `mariadbd` on **`127.0.0.42:3306`** (`VERIFY_DB_HOST`) plus a private socket. The app cannot take a port, so a separate loopback address keeps a developer MySQL on `127.0.0.1:3306` untouched.
4. Creates database `planning_verify` and user `verify`. It loads `scaffolding/schema.sql`, which is **verification scaffolding**: the real schema is not in the repo. It seeds one user, `verify-admin@example.test`, role `admin`, with a bcrypt hash made by the repo's own `bcrypt`.
5. Generates a self-signed pair in `run/certificates/` with the same `openssl` call as `make certs`.
6. Starts `bun <repo>/index.js` with cwd set to `run/`, a clean environment and the variables above. The socket appears at `/tmp/verify-nodejs-api/run/passenger`. The repo root gets no `passenger` socket and no `certificates/`.

The instance is ready when `launch` ends with the doctor output `doctor: ready`. That needs both log lines `> Server Ready` and `> SQL Database Ready`, plus a live 404 over the socket.

Manual equivalent of the product command, which is `make run`: export `HOST USER PASSWORD DATABASE TOKEN_KEY`, then run `make run` in the repo. That writes `certificates/` and the `passenger` socket into the repo root, both gitignored. Use it only when the helper cannot run. **`USER` is also the login shell's variable, so always set it explicitly.**

Isolation: only one instance per `VERIFY_DIR`. `launch` refuses to start when `state.env` already exists. A second parallel instance needs its own `VERIFY_DIR` **and** its own `VERIFY_DB_HOST` (for example `127.0.0.43`). On a machine shared by several verify jobs, take that machine's live lock before `launch` and release it after `cleanup`.

## Doctor

```bash
$V doctor
```

Doctor is read-only. Exit 0 means the instance is worth driving. It checks that:

- the MariaDB pid in the state file is alive;
- MariaDB answers on `VERIFY_DB_HOST:3306` as `verify`;
- the app pid is alive;
- `app.log` has `> Server Ready` and `> SQL Database Ready`;
- the socket exists;
- `GET /__doctor` over the socket returns 404 (the final `app.use` handler).

The socket file survives an app crash, so the pid check and the 404 check are the real signals. **This app crashes easily** (see `features/auth-guard.md`). After any 500, or any request with a bad token, run doctor again. If it fails, read `$V logs 40`, then `$V cleanup && $V launch`. Never drive an instance this run did not start. Never point any command at planning.jourdefete.re or a production database.

## Drive

The harness is plain HTTP over the Unix socket, plus a socket.io polling client. Both are wrapped by the helper, and every call saves its request, response headers, body and status as evidence.

```bash
$V token                    # JWT via POST /auth/login with the seed user (cached in state.env)
$V token --mint             # JWT signed with TOKEN_KEY; workaround while login is broken (see auth-login.md)
$V http [--auth] [--name NAME] METHOD PATH [extra curl args]
$V http --auth GET /api/animations
$V http --auth --name create POST /api/animations -F nom=Clown -F description=Test   # form fields, like the client
$V http --name bad-token DELETE /api/lieux/1 -H 'x-access-token: not-a-jwt'
$V sql "SELECT * FROM animations"      # side effects, as the app's DB user
$V socket watch 8                      # engine.io polling, sends authenticate, logs packets
$V socket watch 8 --no-auth
$V logs 40
```

- `--auth` and `socket watch` use the login token. When there is none, they use the minted token, if `token --mint` has run. Otherwise they try to log in. `$V token` never returns a minted token.
- `--auth` sends the token in `x-access-token`. The other places are `?token=`, a JSON body `token` or a `token` cookie (`middleware/auth.js`). Note that `req.cookies` is never populated, because there is no cookie parser.
- Bodies are **form fields** (`-F` multipart, or `--data-urlencode` urlencoded). `middleware/formidable.js` parses them.
- Raw curl when needed: `curl -sk --unix-socket /tmp/verify-nodejs-api/run/passenger https://localhost/<path>`. `-k` is required because the certificate is self-signed.
- To watch socket events while you write, run in one shell command: `($V socket watch 8 >/dev/null 2>&1 &); sleep 2; <write>; sleep 7`. Then read the newest `*-socket-watch.txt`.

## Evidence

Each `launch` sets a run id. Every `http`, `sql`, `socket` and `token` call writes `/tmp/verify-nodejs-api/evidence/<run id>/NNN-<name>.txt`. Override the base with `VERIFY_EVIDENCE_DIR`. `cleanup` copies `app.log` and `mariadb.log` into `<run id>/logs/`. The seed password is masked in the login evidence.

Proof standards:

- Exercise the real route over the socket, the way the planning client does. Seeding rows with `$V sql` is allowed only as a **precondition** (POST is broken on master). Say so in the report.
- Capture the action (the request file) **and** the resulting state: a `$V sql` read before and after every write. `controllers/db.js` overwrites `statut` in `finally`, so the API answers `{"statut":"success"}` even when the SQL failed. A response body alone never proves a write.
- For socket.io, the proof is the `42["subscribe<Resource>"]` packet in the watch file, next to the write that caused it.
- A token from `token --mint` proves only the route behind the guard, never login. Label it that way.
- Mocks: none. MariaDB is real. The self-signed certificate is the same kind the product generates.

## Cleanup

```bash
$V cleanup                  # stops the app and MariaDB by their recorded pids, deletes /tmp/verify-nodejs-api/run
$V cleanup --node-modules   # also deletes node_modules, only if launch installed it (marker file)
```

Cleanup never kills by process name. It keeps `/tmp/verify-nodejs-api/evidence/`. The MariaDB download in `~/.cache/verify-nodejs-api/` stays for reuse. Delete it by hand if you need the disk space. Run cleanup after every failed attempt too, so pids and `127.0.0.42:3306` are not left behind.

## Helpers

- `bin/verify-nodejs-api`: an executable bash helper with every subcommand above (`$V help`).
- `scaffolding/schema.sql`: the disposable schema that `launch` loads: `users` (`id`, `mail`, `password`, `role`, `token`) and `animations` / `animateurs` / `clients` / `lieux` (`id`, `nom`, `description`). Extend it here when a journey needs a column the client really sends. Never run it against a shared database.
