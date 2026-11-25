const { test } = require('node:test');
const assert = require('node:assert/strict');

require('./helpers');
const { corsAuth } = require('../middleware/auth');

const run = (method, origin) => {
	const headers = {};
	const res = {
		headers,
		statusCode: null,
		setHeader: (name, value) => {
			headers[name.toLowerCase()] = value;
		},
		sendStatus(code) {
			this.statusCode = code;
		},
	};
	let nextCalled = false;
	corsAuth({ method, headers: origin ? { origin } : {} }, res, () => {
		nextCalled = true;
	});
	return { res, nextCalled };
};

test('an allowed origin is echoed back with credentials allowed', () => {
	const { res, nextCalled } = run('GET', 'https://planning.jourdefete.re');

	assert.equal(res.headers['access-control-allow-origin'], 'https://planning.jourdefete.re');
	assert.equal(res.headers['access-control-allow-credentials'], 'true');
	assert.equal(res.headers.vary, 'Origin');
	assert.equal(nextCalled, true);
});

test('an unknown origin gets no CORS grant', () => {
	const { res } = run('GET', 'https://evil.example');

	assert.equal(res.headers['access-control-allow-origin'], undefined);
	assert.equal(res.headers['access-control-allow-credentials'], undefined);
});

test('a preflight request from an allowed origin is answered 204 and lists the token header', () => {
	const { res, nextCalled } = run('OPTIONS', 'https://planning.jourdefete.re');

	assert.equal(res.statusCode, 204);
	assert.equal(nextCalled, false);
	assert.match(res.headers['access-control-allow-headers'], /X-Access-Token/i);
});
