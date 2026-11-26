const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startApp, tokenHeader } = require('./helpers');

const withApp = run => async () => {
	const app = await startApp(() => ({ results: [] }));
	try {
		await run(app);
	} finally {
		await app.close();
	}
};

test(
	'API answers carry nosniff and no-store, errors included',
	withApp(async ({ request }) => {
		const ok = await request('GET', '/api/clients', { headers: tokenHeader() });
		const refused = await request('GET', '/api/clients');

		for (const res of [ok, refused]) {
			assert.equal(res.headers['x-content-type-options'], 'nosniff');
			assert.equal(res.headers['cache-control'], 'no-store');
		}
	})
);

test(
	'a refused token is logged with its status, method and path but never the token',
	withApp(async ({ request, warnings }) => {
		await request('GET', '/api/clients');
		await request('GET', '/api/lieux', { headers: { 'x-access-token': 'secret-looking-value' } });

		assert.deepEqual(warnings, [
			'> Auth refused 403 GET /api/clients from unknown',
			'> Auth refused 401 GET /api/lieux from unknown',
		]);
	})
);
