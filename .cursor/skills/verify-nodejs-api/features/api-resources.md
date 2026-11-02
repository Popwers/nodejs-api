# Resources CRUD

The planning client lists, reads, creates, updates and deletes four resources: `animations`, `animateurs`, `clients` and `lieux`. Each one is a single MySQL table of the same name. The four router files are identical apart from the names (`routes/<resource>.js`). Every handler sits behind `authMiddleware`. Writes also go through `fieldsMiddleware`.

## Sub-features

- `GET /api/<resource>` gives `200 {"statut":"success","results":[rows]}`.
- `GET /api/<resource>/:id` gives `200 {"statut":"success","results":[row]}`, or `[]` when the id is unknown.
- `POST /api/<resource>` takes form fields straight into `INSERT ... SET ?` and emits `subscribe<Resource>`.
- `PUT /api/<resource>/:id` takes form fields into `UPDATE ... SET ?` and emits `subscribe<Resource>`.
- `DELETE /api/<resource>/:id` gives `200` with the MySQL OK packet (`affectedRows`) and emits `subscribe<Resource>`.

## How to get to it (user POV)

The planning screens call these routes with the JWT that login returned.

## Driving it with verify-nodejs-api

The example uses `animations`. Swap in any of the four resources.

```bash
$V token --mint                                   # login is broken on master: see auth-login.md
$V http --auth --name post POST /api/animations -F nom=Clown -F description=Spectacle
$V sql "SELECT * FROM animations"                 # expect the new row; it stays empty on master
# precondition seed while POST is broken (state it in the report):
$V sql "INSERT INTO animations (nom, description) VALUES ('Clown', 'seed')"
$V http --auth --name list GET /api/animations
$V http --auth --name item GET /api/animations/1
$V http --auth --name put PUT /api/animations/1 -F nom=Magicien
$V sql "SELECT * FROM animations WHERE id = 1"
$V http --auth --name delete DELETE /api/animations/1
$V sql "SELECT COUNT(*) AS n FROM animations"     # expect 0
$V doctor
```

Proof per route: the request evidence plus a `$V sql` read showing the row created, updated or gone. For list and item, the JSON rows must match the SQL read.

## Gotchas

- **POST and PUT return 500 on master** (`formidable is not a function`, see `auth-login.md`), and nothing is written. Report them as failing. GET and DELETE work.
- `controllers/db.js` overwrites `res` in `finally`, so a failed SQL query (unknown column, syntax error) still answers `200 {"statut":"success","results":[]}`. Only `$V sql` proves a write.
- `searchEntry`, `putEntry` and `deleteEntry` interpolate `:id` into the SQL in double quotes (`WHERE \`id\` = "<id>"`). It is injectable. Do not probe that against anything but this disposable DB.
- `scaffolding/schema.sql` columns (`nom`, `description`) are a guess. The real client fields are not in the repo. An INSERT with fields the table lacks fails silently, as described above.
- CORS: `corsAuth` reads `req.headers.Origin` (capital O). Node lowercases header names, so `Access-Control-Allow-Origin` is never set, even for planning.jourdefete.re. Check it with `$V http --auth GET /api/animations -H 'Origin: https://planning.jourdefete.re'` and look for that header (it is absent on master).
