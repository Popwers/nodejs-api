const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { startApp, form, multipart, json, writes } = require('./helpers');

const passwordHash = bcrypt.hashSync('secret', 4);
const user = { id: 1, mail: 'agent@jourdefete.re', password: passwordHash };

const knownUser = sql => (/^\s*SELECT/i.test(sql) ? { results: [user] } : { results: { affectedRows: 1 } });
const unknownUser = sql => (/^\s*SELECT/i.test(sql) ? { results: [] } : { results: { affectedRows: 1 } });

const withApp = (respond, run) => async () => {
	const app = await startApp(respond);
	try {
		await run(app);
	} finally {
		await app.close();
	}
};

test(
	'login accepts valid credentials sent as urlencoded form',
	withApp(knownUser, async ({ request, db, errors }) => {
		const res = await request('POST', '/auth/login', form({ mail: user.mail, password: 'secret' }));

		assert.equal(res.status, 200, res.text);
		assert.equal(jwt.verify(res.json().token, process.env.TOKEN_KEY).user_id, 1);
		assert.equal(writes(db).length, 1);
		assert.equal(errors.length, 0);
	})
);

test(
	'login accepts valid credentials sent as multipart form',
	withApp(knownUser, async ({ request, errors }) => {
		const res = await request('POST', '/auth/login', multipart({ mail: user.mail, password: 'secret' }));

		assert.equal(res.status, 200, res.text);
		assert.equal(typeof res.json().token, 'string');
		assert.equal(errors.length, 0);
	})
);

test(
	'login answers 400 once on a wrong password and stores no token',
	withApp(knownUser, async ({ request, db, errors }) => {
		const res = await request('POST', '/auth/login', form({ mail: user.mail, password: 'nope' }));

		assert.equal(res.status, 400, res.text);
		assert.equal(res.text, 'Votre identifiant ou votre mot de passe est incorrect.');
		assert.equal(writes(db).length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'login answers 409 once for an unknown mail without touching the password check',
	withApp(unknownUser, async ({ request, db, errors }) => {
		const res = await request('POST', '/auth/login', form({ mail: 'ghost@jourdefete.re', password: 'secret' }));

		assert.equal(res.status, 409, res.text);
		assert.equal(res.text, 'Votre identifiant ou votre mot de passe est incorrect.');
		assert.equal(writes(db).length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'login answers 400 without querying when a field is missing',
	withApp(knownUser, async ({ request, db, errors }) => {
		const res = await request('POST', '/auth/login', form({ mail: user.mail }));

		assert.equal(res.status, 400, res.text);
		assert.equal(res.text, 'Veuillez remplir tous les champs.');
		assert.equal(db.calls.length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'login answers 400 when a field is not a string',
	withApp(knownUser, async ({ request, db, errors }) => {
		const res = await request('POST', '/auth/login', json({ mail: user.mail, password: 123 }));

		assert.equal(res.status, 400, res.text);
		assert.equal(db.calls.length, 0);
		assert.equal(errors.length, 0);
	})
);

test(
	'login answers 500 when the user lookup fails',
	withApp(
		() => ({ error: new Error('ER_DOWN') }),
		async ({ request, db, errors }) => {
			const res = await request('POST', '/auth/login', form({ mail: user.mail, password: 'secret' }));

			assert.equal(res.status, 500, res.text);
			assert.equal(res.text, 'Une erreur est survenue.');
			assert.equal(writes(db).length, 0);
			assert.equal(errors.length, 0);
		}
	)
);

test(
	'login binds the mail as a query parameter instead of splicing it into the SQL',
	withApp(unknownUser, async ({ request, db, errors }) => {
		const mail = 'x" OR "1"="1';
		const res = await request('POST', '/auth/login', form({ mail, password: 'secret' }));

		assert.equal(res.status, 409, res.text);
		const [lookup] = db.calls;
		assert.ok(!lookup.sql.includes(mail), lookup.sql);
		assert.ok(JSON.stringify(lookup.params).includes(JSON.stringify(mail).slice(1, -1)));
		assert.equal(errors.length, 0);
	})
);
