const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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
		const [fields] = writes(db)[0].params;
		assert.deepEqual(fields, { nom: 'Karaoké', lieu: '3' });
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

const writtenCopies = (marker, before) => {
	const dir = os.tmpdir();
	return fs
		.readdirSync(dir)
		.filter(name => !before.has(name))
		.filter(name => {
			try {
				const file = path.join(dir, name);
				return fs.statSync(file).isFile() && fs.readFileSync(file, 'utf8').includes(marker);
			} catch {
				return false;
			}
		});
};

test(
	'an uploaded file is never written to disk and the fields still parse',
	withApp(async ({ request, db, errors }) => {
		const marker = `upload-marker-${process.pid}-${Date.now()}`;
		const before = new Set(fs.readdirSync(os.tmpdir()));
		const boundary = '----fileboundary';
		const body =
			`--${boundary}\r\nContent-Disposition: form-data; name="nom"\r\n\r\nMairie\r\n` +
			`--${boundary}\r\nContent-Disposition: form-data; name="doc"; filename="a.txt"\r\n` +
			`Content-Type: text/plain\r\n\r\n${marker}\r\n--${boundary}--\r\n`;

		const res = await send(request, 'POST', '/api/clients', {
			headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
			body,
		});

		const leftovers = writtenCopies(marker, before);
		for (const name of leftovers) fs.rmSync(path.join(os.tmpdir(), name), { force: true });
		assert.equal(res.status, 200, res.text);
		assert.deepEqual(writes(db)[0].params, { nom: 'Mairie' });
		assert.deepEqual(leftovers, []);
		assert.equal(errors.length, 0);
	})
);
