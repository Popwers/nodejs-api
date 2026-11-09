# Resources CRUD

The planning client lists, reads, creates, updates and deletes four resources: `animations`, `animateurs`, `clients` and `lieux`. Each one is a single MySQL table of the same name. The four router files are identical apart from the names (`routes/<resource>.js`). Every handler sits behind `authMiddleware`. Writes also go through `fieldsMiddleware`.

## Sub-features

- `GET /api/<resource>` gives `200 {"statut":"success","results":[rows]}`.
- `GET /api/<resource>/:id` gives `200 {"statut":"success","results":[row]}`, or `[]` when the id is unknown.
- `POST /api/<resource>` takes form fields straight into `INSERT ... SET ?`, answers `200` with the MySQL OK packet (`affectedRows`, `insertId`) and emits `subscribe<Resource>`.
- `PUT /api/<resource>/:id` takes form fields into `UPDATE ... SET ?`, answers `200` with the OK packet and emits `subscribe<Resource>`.
- `DELETE /api/<resource>/:id` gives `200` with the OK packet (`affectedRows`) and emits `subscribe<Resource>`.
- A query that fails (unknown column, empty body) gives `500 {"statut":"failed","results":"API error"}` and emits nothing.

## How to get to it (user POV)

The planning screens call these routes with the JWT that login returned.

## Driving it with verify-nodejs-api

The example uses `animations`. Swap in any of the four resources.

```bash
$V token                                          # real login (see auth-login.md)
$V sql "SELECT COUNT(*) AS n FROM animations"     # expect 0
$V http --auth --name post POST /api/animations -F nom=Clown -F description=Spectacle
$V sql "SELECT * FROM animations"                 # expect the new row, id 1
$V http --auth --name list GET /api/animations
$V http --auth --name item GET /api/animations/1
$V http --auth --name item-unknown GET /api/animations/999        # results: []
$V http --auth --name put PUT /api/animations/1 -F nom=Magicien
$V sql "SELECT * FROM animations WHERE id = 1"
$V http --auth --name post-badcol POST /api/animations -F nom=X -F bogus=1   # 500, no row added
$V http --auth --name delete DELETE /api/animations/1
$V sql "SELECT COUNT(*) AS n FROM animations"     # expect 0
$V doctor
```

Proof per route: the request evidence plus a `$V sql` read showing the row created, updated or gone. For list and item, the JSON rows must match the SQL read.

## Gotchas

- A `200` proves the query ran, not that a row changed. `PUT` or `DELETE` on an unknown id answers `200` with `affectedRows: 0` and still emits `subscribe<Resource>`. Only `$V sql` proves a write.
- `:id` is bound as a parameter (`WHERE ?? = ?`). `GET /api/lieux/999%22%20OR%20%221%22=%221` returns `[]`. MySQL casts a string id to a number, so `1" OR "1"="1` matches id 1 only.
- `middleware/formidable.js` keeps the last value of a repeated field. Both multipart (`-F`) and urlencoded (`--data-urlencode`) bodies work. Reading the code, a body formidable cannot parse answers `4xx {"statut":"failed","results":"Parsing error"}` (not driven yet).
- `scaffolding/schema.sql` columns (`nom`, `description`) are a guess. The real client fields are not in the repo. A field the table lacks makes the write answer 500.
- CORS: `corsAuth` reads `req.headers.Origin` (capital O). Node lowercases header names, so `Access-Control-Allow-Origin` is never set, even for planning.jourdefete.re. Check it with `$V http --auth GET /api/animations -H 'Origin: https://planning.jourdefete.re'` and look for that header (it is absent on master; the `Allow-Credentials`, `Allow-Methods` and `Allow-Headers` headers are present).
