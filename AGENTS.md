# AGENTS.md

Guide for AI coding agents working with this Node.js REST API codebase.

## Commands

```bash
# Install dependencies
bun install

# Start server (requires environment variables)
node index.js
```

**Required Environment Variables:**
```bash
HOST=<mysql-host>
USER=<mysql-user>
PASSWORD=<mysql-password>
DATABASE=<mysql-database>
TOKEN_KEY=<jwt-secret-key>
```

## Project Structure

```
nodejs-api/
├── index.js              # Entry point: HTTPS server, Express, Socket.io, MySQL
├── controllers/
│   └── db.js             # Database CRUD abstraction layer
├── middleware/
│   ├── auth.js           # JWT auth, CORS, Socket.io authentication
│   └── formidable.js     # Form data parsing
├── routes/
│   ├── auth.js           # Login/signup endpoints (/auth/*)
│   ├── animations.js     # /api/animations CRUD
│   ├── animateurs.js     # /api/animateurs CRUD
│   ├── clients.js        # /api/clients CRUD
│   └── lieux.js          # /api/lieux CRUD
└── certificates/         # SSL certificates for HTTPS
```

## Code Style

### Naming Conventions
- **Files:** lowercase (`db.js`, `auth.js`)
- **Functions:** camelCase (`sendData`, `putEntry`, `handleDisconnect`)
- **Variables:** camelCase, use `var` for module-level, `const`/`let` for block scope
- **Environment vars:** UPPERCASE (`TOKEN_KEY`, `DATABASE`)

### JavaScript Patterns

```javascript
// Route factory pattern - all route files export a function
module.exports = (app, db) => {
  const router = require('express').Router();
  const dbController = require('../controllers/db')(db, 'tablename');
  const io = app.get('io');
  // Define routes...
  return router;
};

// Async/await with try-catch-finally for database operations
const getData = async (fields = '*', callback = false, table = dbTable) => {
  let res = null;
  let results = [];
  try {
    results = await query(`SELECT ${fields} FROM ${table}`);
  } catch (err) {
    await db.rollback();
    res = { statut: false, error: err, results: null };
  } finally {
    res = { statut: true, error: false, results: results };
  }
  if (callback && typeof callback == 'function') callback(res);
  return res;
};

// Arrow functions for middleware and handlers
const myMiddleware = (req, res, next) => {
  // logic
  next();
};
```

### Response Format
Always use this structure for database operations:
```javascript
{
  statut: boolean,    // NOTE: French spelling - maintain consistency
  error: false|Error,
  results: array
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad request / validation error
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (no token)
- `409` - Conflict (duplicate entry)
- `500` - Server error

### Error Messages
Write error messages in **French** to maintain consistency:
```javascript
res.status(400).send('Veuillez remplir tous les champs.');
res.status(401).send('Token non valide.');
res.status(403).send('Un token est requis pour vous connecter.');
```

### Comment Style
Use asterisk blocks for section headers:
```javascript
/* ******************************************************************* */
/* *********************** SECTION NAME ******************************* */
/* ******************************************************************* */
```

### Middleware Chain
Protected routes always use: `authMiddleware` -> `fieldsMiddleware` -> handler
```javascript
router.post('/endpoint', [authMiddleware, fieldsMiddleware], (req, res) => {
  // req.fields contains parsed form data
});
```

### Socket.io Events
Emit events on data mutations for real-time updates:
```javascript
const sendData = (statut, res, results, error, io = false) => {
  if (statut) {
    if (io) io.emit('subscribeAnimations');  // Notify subscribers
    res.status(200).send({ statut: 'success', results: results });
  } else res.status(500).send({ statut: 'failed', results: 'API error' });
};
```

## Database Controller API

Located in `controllers/db.js`. All methods return `{ statut, error, results }`:

| Method | Purpose | Signature |
|--------|---------|-----------|
| `get` | SELECT all | `get(fields, callback, table)` |
| `post` | INSERT | `post(fields, callback, table)` |
| `searchEntry` | SELECT WHERE | `searchEntry(value, fields, callback, key, table)` |
| `putEntry` | UPDATE | `putEntry(value, fields, callback, key, table)` |
| `deleteEntry` | DELETE | `deleteEntry(value, callback, key, table)` |

## Adding New Features

### New Entity/Route
1. Create `routes/newentity.js` following the factory pattern
2. Import in `index.js`: `const newRouter = require('./routes/newentity');`
3. Mount route: `.use('/api', newRouter(app, db))`
4. Add Socket.io event (e.g., `subscribeNewEntity`)

### New Middleware
1. Create `middleware/name.js` exporting a function `(req, res, next) => {}`
2. Import and apply in route definitions

## Security Notes

- JWT tokens expire in 30 days
- Bcrypt uses 10 salt rounds for password hashing
- Rate limiting: 5 requests per 60 minutes on `/auth/login`
- Socket.io auth timeout: 5 seconds
- All `/api/*` routes require valid JWT token

## Cursor Rules

From `.cursor/rules/snyk_rules.mdc`:
- Run Snyk code scan for new code in supported languages
- Fix security issues found by Snyk before committing
- Rescan after fixes to ensure no new issues introduced

## Key Reminders

1. Use `statut` (French) not `status` for consistency
2. No build process - code runs directly with Node.js
3. Always emit Socket.io events on data mutations
4. Form data is parsed into `req.fields` by formidable middleware
5. MySQL connection has auto-reconnect logic in `index.js`
