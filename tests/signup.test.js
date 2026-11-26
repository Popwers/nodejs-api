const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startApp, form, tokenHeader, writes } = require('./helpers');

const respondWith =
	(existing, callerRole = 'admin') =>
	(sql, params) => {
		if (!/^\s*SELECT/i.test(sql)) return { results: { affectedRows: 1 } };
		if (Array.isArray(params) && params[0] === 'id') return { results: callerRole ? [{ id: 1, role: callerRole }] : [] };
		return { results: existing };
	};

const newAccount = { mail: 'New@Jourdefete.re', password: 'secret', role: 'admin' };

const withApp = (respond, run) => async () => {
	const app = await startApp(respond);
	try {
		await run(app);
	} finally {
		await app.close();
	}
};

const signup = (request, fields, headers = tokenHeader()) => {
	const { headers: formHeaders, body } = form(fields);
	return request('POST', '/auth/signup', { headers: { ...formHeaders, ...headers }, body });
};

test(
	'signup stores a lowercased mail and a hashed password',
	withApp(respondWith([]), async ({ request, db, errors }) => {
		const res = await signup(request, newAccount);

		assert.equal(res.status, 200, res.text);
		assert.equal(res.text, 'Compte utilisateur enregistré.');
		const [insert] = writes(db);
		assert.equal(insert.params.mail, 'new@jourdefete.re');
		assert.equal(insert.params.role, 'admin');
		assert.match(insert.params.password, /^\$2[aby]\$/);
		assert.equal(errors.length, 0);
	})
);

test(
	'signup answers 409 once for an existing mail and inserts nothing',
	withApp(respondWith([{ id: 7, mail: 'new@jourdefete.re', role: 'admin' }]), async ({ request, db, errors }) => {
		const res = await signup(request, newAccount);

		assert.equal(res.status, 409, res.text);
		assert.equal(writes(db).length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'signup answers 400 without looking up the mail when a field is missing',
	withApp(respondWith([]), async ({ request, db, errors }) => {
		const res = await signup(request, { mail: newAccount.mail, role: 'admin' });

		assert.equal(res.status, 400, res.text);
		assert.equal(res.text, 'Veuillez remplir tous les champs.');
		assert.deepEqual(
			db.calls.map(({ params }) => params[0]),
			['id']
		);
		assert.equal(errors.length, 0);
	})
);

test(
	'signup answers 403 and inserts nothing without a token',
	withApp(respondWith([]), async ({ request, db, errors }) => {
		const res = await signup(request, newAccount, {});

		assert.equal(res.status, 403, res.text);
		assert.equal(db.calls.length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'signup answers 403 and inserts nothing when the caller is not an administrator',
	withApp(respondWith([], 'planner'), async ({ request, db, errors }) => {
		const res = await signup(request, newAccount);

		assert.equal(res.status, 403, res.text);
		assert.equal(res.text, 'Accès réservé aux administrateurs.');
		assert.equal(writes(db).length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'signup answers 403 when the token belongs to an account that no longer exists',
	withApp(respondWith([], null), async ({ request, db, errors }) => {
		const res = await signup(request, newAccount);

		assert.equal(res.status, 403, res.text);
		assert.equal(writes(db).length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'signup reads the administrator role from ADMIN_ROLE when it is set',
	withApp(respondWith([], 'direction'), async ({ request, errors }) => {
		process.env.ADMIN_ROLE = 'direction';
		try {
			const res = await signup(request, newAccount);
			assert.equal(res.status, 200, res.text);
		} finally {
			delete process.env.ADMIN_ROLE;
		}
		assert.equal(errors.length, 0);
	})
);
