const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startApp, form, multipart, tokenHeader, writes } = require('./helpers');

const withApp = run => async () => {
	const app = await startApp(() => ({ results: { affectedRows: 1 } }));
	try {
		await run(app);
	} finally {
		await app.close();
	}
};

const send = (request, method, url, payload) =>
	request(method, url, { headers: { ...payload.headers, ...tokenHeader() }, body: payload.body });

test(
	'a urlencoded body reaches the database as plain string values',
	withApp(async ({ request, db, errors }) => {
		const res = await send(request, 'PUT', '/api/animations/5', form({ nom: 'Karaoké', lieu: '3' }));

		assert.equal(res.status, 200, res.text);
		assert.deepEqual(writes(db)[0].params, { nom: 'Karaoké', lieu: '3' });
		assert.equal(errors.length, 0);
	})
);

test(
	'a multipart body reaches the database as plain string values',
	withApp(async ({ request, db, errors }) => {
		const res = await send(request, 'POST', '/api/clients', multipart({ nom: 'Mairie' }));

		assert.equal(res.status, 200, res.text);
		assert.deepEqual(writes(db)[0].params, { nom: 'Mairie' });
		assert.equal(errors.length, 0);
	})
);

test(
	'a body that cannot be parsed is a client error, not a 500',
	withApp(async ({ request, db, errors }) => {
		const res = await send(request, 'POST', '/api/clients', {
			headers: { 'content-type': 'multipart/form-data; boundary=----testboundary' },
			body: 'this is not multipart',
		});

		assert.ok(res.status >= 400 && res.status < 500, `status ${res.status}: ${res.text}`);
		assert.equal(writes(db).length, 0);
		assert.equal(errors.length, 0);
	})
);
