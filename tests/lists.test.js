const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startApp, tokenHeader } = require('./helpers');

const resources = ['animations', 'animateurs', 'clients', 'lieux'];
const rows = [{ id: 1 }, { id: 2 }];

const table = count => Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

const withApp = (run, respond = () => ({ results: rows })) => async () => {
	const app = await startApp(respond);
	try {
		await run(app);
	} finally {
		await app.close();
	}
};

const listing = ({ db }) => db.calls.find(({ sql }) => /^\s*SELECT/i.test(sql));

for (const resource of resources) {
	test(
		`GET /api/${resource} without paging parameters runs the unbounded query and returns the same body`,
		withApp(async app => {
			const res = await app.request('GET', `/api/${resource}`, { headers: tokenHeader() });

			assert.equal(res.status, 200, res.text);
			assert.deepEqual(res.json(), { statut: 'success', results: rows });
			assert.equal(listing(app).sql, `SELECT * FROM ${resource}`);
			assert.equal(listing(app).params, undefined);
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
			assert.match(listing(app).sql, /ORDER BY id LIMIT \? OFFSET \?$/);
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
			await app.request('GET', '/api/lieux?offset=0', { headers: tokenHeader() });
		} finally {
			delete process.env.LIST_MAX_ROWS;
		}

		assert.deepEqual(listing(app).params, [250, 0]);
	})
);

for (const query of ['limit=0', 'limit=-1', 'limit=abc', 'offset=-5', 'offset=1.5', 'limit=1e3', 'offset=99999999999999999999999']) {
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
		assert.equal(listing(app).sql, 'SELECT * FROM animations');
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

const emulate = count => (sql, params) => {
	const all = table(count);
	if (!/LIMIT/.test(sql)) return { results: all };
	const [limit, offset] = params;
	return { results: all.slice(offset, offset + limit) };
};

test(
	'a table larger than the maximum is returned whole, newest row included, when no paging parameter is sent',
	withApp(async app => {
		process.env.LIST_MAX_ROWS = '5';
		try {
			const res = await app.request('GET', '/api/animations', { headers: tokenHeader() });
			const { results } = res.json();

			assert.equal(results.length, 12);
			assert.equal(results.at(-1).id, 12);
		} finally {
			delete process.env.LIST_MAX_ROWS;
		}
	}, emulate(12))
);

test(
	'with a limit the maximum applies',
	withApp(async app => {
		process.env.LIST_MAX_ROWS = '5';
		try {
			const res = await app.request('GET', '/api/animations?limit=100', { headers: tokenHeader() });

			assert.equal(res.json().results.length, 5);
		} finally {
			delete process.env.LIST_MAX_ROWS;
		}
	}, emulate(12))
);
