const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startApp, form, tokenHeader } = require('./helpers');

const resources = ['animations', 'animateurs', 'clients', 'lieux'];
const rows = [{ id: 1 }];

const withApp = run => async () => {
	const app = await startApp(() => ({ results: rows }));
	try {
		await run(app);
	} finally {
		await app.close();
	}
};

for (const resource of resources) {
	test(
		`GET /api/${resource} answers 403 once without a token and does not query`,
		withApp(async ({ request, db, errors }) => {
			const res = await request('GET', `/api/${resource}`);

			assert.equal(res.status, 403, res.text);
			assert.equal(res.text, 'Un token est requis pour vous connecter.');
			assert.equal(db.calls.length, 0);
			assert.equal(errors.length, 0);
		})
	);

	test(
		`GET /api/${resource} answers 401 once with an invalid token and does not query`,
		withApp(async ({ request, db, errors }) => {
			const res = await request('GET', `/api/${resource}`, { headers: { 'x-access-token': 'nope' } });

			assert.equal(res.status, 401, res.text);
			assert.equal(res.text, 'Token non valide.');
			assert.equal(db.calls.length, 0);
			assert.equal(errors.length, 0);
		})
	);

	test(
		`POST /api/${resource} with an invalid token inserts nothing`,
		withApp(async ({ request, db, errors, emitted }) => {
			const { headers, body } = form({ nom: 'x' });
			const res = await request('POST', `/api/${resource}`, {
				headers: { ...headers, 'x-access-token': 'nope' },
				body,
			});

			assert.equal(res.status, 401, res.text);
			assert.equal(db.calls.length, 0);
			assert.equal(emitted.length, 0);
			assert.equal(errors.length, 0);
		})
	);

	test(
		`DELETE /api/${resource}/1 without a token deletes nothing`,
		withApp(async ({ request, db, errors }) => {
			const res = await request('DELETE', `/api/${resource}/1`);

			assert.equal(res.status, 403, res.text);
			assert.equal(db.calls.length, 0);
			assert.equal(errors.length, 0);
		})
	);
}

test(
	'GET /api/animations returns the rows for a valid token',
	withApp(async ({ request, errors }) => {
		const res = await request('GET', '/api/animations', { headers: tokenHeader() });

		assert.equal(res.status, 200, res.text);
		assert.deepEqual(res.json(), { statut: 'success', results: rows });
		assert.equal(errors.length, 0);
	})
);
