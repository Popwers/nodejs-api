const { test } = require('node:test');
const assert = require('node:assert/strict');

const { dbConfig } = require('../config');

test('dbConfig prefers the DB_ names over the colliding OS variables', () => {
	const config = dbConfig({
		DB_HOST: 'db.internal',
		DB_USER: 'planning',
		DB_PASSWORD: 'secret',
		DB_DATABASE: 'jdf',
		HOST: 'laptop.local',
		USER: 'lionel',
		PASSWORD: 'os-value',
		DATABASE: 'old',
	});

	assert.deepEqual(
		[config.host, config.user, config.password, config.database],
		['db.internal', 'planning', 'secret', 'jdf']
	);
});

test('dbConfig keeps reading the former names when the DB_ names are absent', () => {
	const config = dbConfig({ HOST: 'db.internal', USER: 'planning', PASSWORD: 'secret', DATABASE: 'jdf' });

	assert.deepEqual(
		[config.host, config.user, config.password, config.database, config.port],
		['db.internal', 'planning', 'secret', 'jdf', undefined]
	);
});

test('dbConfig ignores empty DB_ values and reads DB_PORT as a number', () => {
	const config = dbConfig({ DB_HOST: '', HOST: 'db.internal', DB_PORT: '3307' });

	assert.equal(config.host, 'db.internal');
	assert.equal(config.port, 3307);
});

test('dbConfig bounds the pool and the connection wait', () => {
	const config = dbConfig({});

	assert.ok(config.connectionLimit > 0);
	assert.ok(config.connectTimeout > 0 && config.acquireTimeout > 0);
});
