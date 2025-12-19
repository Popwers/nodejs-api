# CLAUDE.md - AI Assistant Guide

This file provides comprehensive guidance for AI assistants working with this codebase.

## Project Overview

**Name:** node-js-template
**Type:** Node.js REST API with real-time capabilities
**Purpose:** Event management API boilerplate with JWT authentication, Socket.io real-time subscriptions, and MySQL database

### Core Features
- JWT-based authentication with bcrypt password hashing
- HTTPS server with self-signed certificates
- Real-time data synchronization via Socket.io
- RESTful CRUD endpoints for event management entities
- Rate limiting for brute force protection
- CORS configuration for whitelisted domains

## Project Structure

```
nodejs-api/
├── index.js                    # Main entry point - HTTPS server, Express app, Socket.io
├── package.json                # Dependencies (Yarn package manager)
├── yarn.lock                   # Locked dependency versions
├── controllers/
│   └── db.js                   # Database abstraction layer (CRUD operations)
├── middleware/
│   ├── auth.js                 # JWT authentication, CORS, Socket.io auth
│   └── formidable.js           # Form data parsing middleware
├── routes/
│   ├── auth.js                 # Login/signup endpoints (/auth/*)
│   ├── animations.js           # Animations CRUD (/api/animations)
│   ├── animateurs.js           # Animators CRUD (/api/animateurs)
│   ├── clients.js              # Clients CRUD (/api/clients)
│   └── lieux.js                # Places/venues CRUD (/api/lieux)
└── certificates/
    ├── selfsigned.crt          # SSL certificate
    └── selfsigned.key          # SSL private key
```

## Development Commands

```bash
# Install dependencies
yarn install

# Start the server (manual)
node index.js
```

**Required Environment Variables:**
- `HOST` - MySQL server hostname
- `USER` - MySQL username
- `PASSWORD` - MySQL password
- `DATABASE` - MySQL database name
- `TOKEN_KEY` - JWT signing secret key

## Architecture Patterns

### Database Controller Pattern
Location: `controllers/db.js`

All database operations use a centralized controller with these methods:
- `get(fields, callback, table)` - SELECT all records
- `post(fields, callback, table)` - INSERT new record
- `searchEntry(searchValue, fields, callback, searchKey, table)` - SELECT with WHERE
- `putEntry(searchValue, fields, callback, searchKey, table)` - UPDATE record
- `deleteEntry(searchValue, callback, searchKey, table)` - DELETE record

**Response Format:**
```javascript
{
  statut: boolean,    // Operation success (note: French spelling)
  error: false|Error, // Error object if failed
  results: array      // Query results
}
```

### Route Factory Pattern
All route files export a factory function:
```javascript
module.exports = function(dbCon) {
  const router = require('express').Router();
  // Define routes...
  return router;
}
```

### Middleware Chain
Protected routes use: `authMiddleware` → `fieldsMiddleware` → handler

### Real-time Updates
Socket.io events are emitted on data changes:
- `subscribeAnimations` - Animation data updates
- `subscribeAnimateurs` - Animator data updates
- `subscribeClients` - Client data updates
- `subscribeLieux` - Venue data updates

## Code Style & Conventions

### Naming
- **Files:** lowercase with dots (`db.js`, `auth.js`)
- **Functions:** camelCase (`sendData`, `putEntry`)
- **Environment vars:** UPPERCASE (`TOKEN_KEY`, `DATABASE`)

### JavaScript Style
- Mixed `const` and `var` for variable declarations
- Async/await with try-catch-finally blocks
- Arrow functions for middleware and handlers
- Optional callbacks alongside promise-based APIs

### Response Conventions
- `statut` field for success/failure (French spelling - maintain consistency)
- HTTP status codes: 200 (success), 400 (bad request), 401 (unauthorized), 403 (forbidden), 409 (conflict), 500 (server error)
- Error messages are primarily in French

### Comment Style
Section headers use asterisk blocks:
```javascript
/**
 * Section Name
 */
```

## API Endpoints

### Authentication
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/login` | POST | User login | No |
| `/auth/signup` | POST | User registration | Yes |

### Data Entities
All data routes follow the same pattern:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/{entity}` | GET | List all records |
| `/api/{entity}` | POST | Create new record |
| `/api/{entity}/:id` | GET | Get single record |
| `/api/{entity}/:id` | PUT | Update record |
| `/api/{entity}/:id` | DELETE | Delete record |

Entities: `animations`, `animateurs`, `clients`, `lieux`

## Security Considerations

### Implemented Security
- JWT tokens with 30-day expiry
- Bcrypt password hashing (10 salt rounds)
- Rate limiting on login (5 requests per 60 minutes)
- HTTPS with SSL certificates
- CORS whitelist (planning.jourdefete.re)
- Socket.io authentication timeout (5 seconds)

### Known Issues (for future improvement)
- SQL queries use string interpolation instead of parameterized queries in `controllers/db.js`
- Consider implementing input validation on routes

## Dependencies

| Package | Purpose |
|---------|---------|
| express | Web framework |
| jsonwebtoken | JWT authentication |
| bcrypt | Password hashing |
| mysql | MySQL database driver |
| socket.io | Real-time communication |
| express-rate-limit | Brute force protection |
| formidable | Form/file upload parsing |
| bufferutil | WebSocket optimization |
| utf-8-validate | WebSocket UTF-8 validation |

## Testing

**Current Status:** No test framework configured

When adding tests, consider:
- Jest or Mocha for unit testing
- Supertest for API endpoint testing
- Test database connection mocking

## Key Files Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `index.js:1-99` | Server setup | HTTPS server, Express app, Socket.io, MySQL connection |
| `controllers/db.js` | Database operations | get, post, searchEntry, putEntry, deleteEntry |
| `middleware/auth.js` | Authentication | corsAuth, ioAuth, authMiddleware |
| `middleware/formidable.js` | Form parsing | fieldsMiddleware |
| `routes/auth.js` | Auth endpoints | Login with rate limiting, signup |

## Common Tasks

### Adding a New Entity/Route
1. Create route file in `routes/` following existing pattern
2. Import and use in `index.js` with `app.use()`
3. Add Socket.io event for real-time updates
4. Ensure routes use `authMiddleware` and `fieldsMiddleware`

### Modifying Database Queries
- Edit `controllers/db.js`
- Maintain the `{ statut, error, results }` response format
- Use async/await with try-catch-finally

### Adding New Middleware
1. Create file in `middleware/`
2. Export middleware function
3. Apply in route definitions or globally in `index.js`

## Git Workflow

- Pull request workflow for changes
- Automated dependency updates via Dependabot
- Security-focused maintenance (regular dependency patches)

## Notes for AI Assistants

1. **Language:** Error messages and some comments are in French - maintain this consistency
2. **Response format:** Always use `statut` (not `status`) for consistency
3. **No build process:** Code runs directly with Node.js
4. **Socket.io integration:** Remember to emit events on data mutations
5. **Authentication:** All `/api/*` routes require valid JWT token
6. **Database:** MySQL connection with auto-reconnect logic in `index.js`
