const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nodeModules = path.join(root, 'node_modules') + path.sep;

process.env.TOKEN_KEY = 'test-token-key';

const express = require('express');
const jwt = require('jsonwebtoken');

const forgetProjectModules = () => {
	for (const file of Object.keys(require.cache)) {
		if (file.startsWith(root) && !file.startsWith(nodeModules) && !file.startsWith(__dirname)) {
			delete require.cache[file];
		}
	}
};

/**
 * Fake `mysql` connection. `respond(sql, params)` returns `{ results }` or `{ error }`.
 * Every statement is recorded in `calls`.
 */
const createFakeDb = respond => {
	const calls = [];
	return {
		calls,
		rollback: callback => callback?.(),
		query(sql, params, callback) {
			const done = typeof params === 'function' ? params : callback;
			calls.push({ sql, params: typeof params === 'function' ? undefined : params });
			const outcome = respond(sql, params);
			if (outcome.error) done(outcome.error);
			else done(null, outcome.results);
		},
	};
};

const writes = db => db.calls.filter(({ sql }) => !/^\s*SELECT/i.test(sql));

/**
 * Mounts the real routers on a fresh app, listening on a Unix socket like production.
 * Project modules are reloaded so module-level state (router, rate limiter) starts clean.
 */
const startApp = async respond => {
	forgetProjectModules();
	const db = createFakeDb(respond);
	const emitted = [];
	const errors = [];
	const app = express();
	app.set('io', { emit: event => emitted.push(event) });
	app.use('/auth', require('../routes/auth')(db))
		.use('/api', require('../routes/animations')(app, db))
		.use('/api', require('../routes/animateurs')(app, db))
		.use('/api', require('../routes/clients')(app, db))
		.use('/api', require('../routes/lieux')(app, db))
		.use((req, res) => res.sendStatus(404))
		.use((err, req, res, next) => {
			errors.push(err);
			if (res.headersSent) res.destroy();
			else res.status(500).send('Une erreur est survenue.');
		});

	const socketPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nodejs-api-')), 'passenger');
	const server = http.createServer(app);
	await new Promise(resolve => server.listen(socketPath, resolve));

	const request = (method, url, { headers = {}, body } = {}) =>
		new Promise((resolve, reject) => {
			const req = http.request({ socketPath, path: url, method, headers }, res => {
				const chunks = [];
				res.on('data', chunk => chunks.push(chunk));
				res.on('end', () => {
					const text = Buffer.concat(chunks).toString();
					resolve({ status: res.statusCode, text, json: () => JSON.parse(text) });
				});
			});
			req.on('error', reject);
			req.end(body);
		});

	const close = async () => {
		await new Promise(resolve => server.close(resolve));
		fs.rmSync(path.dirname(socketPath), { recursive: true, force: true });
	};

	return { db, errors, emitted, request, close };
};

const form = fields => ({
	headers: { 'content-type': 'application/x-www-form-urlencoded' },
	body: new URLSearchParams(fields).toString(),
});

const multipart = fields => {
	const boundary = '----testboundary';
	const body =
		Object.entries(fields)
			.map(
				([name, value]) =>
					`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
			)
			.join('') + `--${boundary}--\r\n`;
	return { headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body };
};

const json = value => ({
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(value),
});

const tokenHeader = () => ({ 'x-access-token': jwt.sign({ user_id: 1 }, process.env.TOKEN_KEY) });

module.exports = { startApp, form, multipart, json, tokenHeader, writes };
