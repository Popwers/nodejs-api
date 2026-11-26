const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startApp, tokenHeader } = require('./helpers');

const resources = ['animations', 'animateurs', 'clients', 'lieux'];
const rows = [{ id: 1 }, { id: 2 }];

const withApp = run => async () => {
	const app = await startApp(() => ({ results: rows }));
	try {
		await run(app);
	} finally {
		await app.close();
	}
};

const listing = ({ db }) => db.calls.find(({ sql }) => /^\s*SELECT/i.test(sql));

for (const resource of resources) {
	test(
		`GET /api/${resource} without paging parameters returns the same body, capped at the server maximum`,
		withApp(async app => {
			const res = await app.request('GET', `/api/${resource}`, { headers: tokenHeader() });

			assert.equal(res.status, 200, res.text);
			assert.deepEqual(res.json(), { statut: 'success', results: rows });
			assert.deepEqual(listing(app).params, [10000, 0]);
			assert.match(listing(app).sql, /ORDER BY id LIMIT \? OFFSET \?$/);
			assert.equal(app.errors.length, 0);
		})
	);

	test(
		`GET /api/${resource} passes limit and offset to the query`,
		withApp(async app => {
			const res = await app.request('GET', `/api/${resource}?limit=50&offset=100`, {
				headers: tokenHeader(),
			});

			assert.equal(res.status, 200, res.text);
			assert.deepEqual(listing(app).params, [50, 100]);
		})
	);
}

test(
	'a limit above the server maximum is lowered to it',
	withApp(async app => {
		await app.request('GET', '/api/clients?limit=99999999', { headers: tokenHeader() });

		assert.deepEqual(listing(app).params, [10000, 0]);
	})
);

test(
	'LIST_MAX_ROWS moves the server maximum',
	withApp(async app => {
		process.env.LIST_MAX_ROWS = '250';
		try {
			await app.request('GET', '/api/lieux', { headers: tokenHeader() });
		} finally {
			delete process.env.LIST_MAX_ROWS;
		}

		assert.deepEqual(listing(app).params, [250, 0]);
	})
);

for (const query of ['limit=0', 'limit=-1', 'limit=abc', 'offset=-5', 'offset=1.5', 'limit=1e3']) {
	test(
		`GET /api/animations?${query} answers 400 and does not query`,
		withApp(async app => {
			const res = await app.request('GET', `/api/animations?${query}`, { headers: tokenHeader() });

			assert.equal(res.status, 400, res.text);
			assert.equal(res.text, 'Paramètres de pagination invalides.');
			assert.equal(app.db.calls.length, 0);
		})
	);
}

test(
	'the other query parameters the front sends do not disturb the listing',
	withApp(async app => {
		const res = await app.request('GET', '/api/animations?date=2026-01&number=1', { headers: tokenHeader() });

		assert.equal(res.status, 200, res.text);
		assert.deepEqual(listing(app).params, [10000, 0]);
	})
);

test(
	'every statement carries a query timeout',
	withApp(async app => {
		await app.request('GET', '/api/animations', { headers: tokenHeader() });
		await app.request('GET', '/api/animations/1', { headers: tokenHeader() });

		assert.equal(app.db.calls.length, 2);
		for (const { timeout } of app.db.calls) assert.equal(timeout, 30000);
	})
);
