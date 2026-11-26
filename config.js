const pick = (env, names) => names.map(name => env[name]).find(value => value !== undefined && value !== '');

/** Reads the DB_* names first: HOST, USER and PASSWORD collide with variables set by the OS and the hosting panel. */
const dbConfig = (env = process.env) => ({
	host: pick(env, ['DB_HOST', 'HOST']),
	user: pick(env, ['DB_USER', 'USER']),
	password: pick(env, ['DB_PASSWORD', 'PASSWORD']),
	database: pick(env, ['DB_DATABASE', 'DATABASE']),
	port: Number(pick(env, ['DB_PORT'])) || undefined,
	connectionLimit: 10,
	connectTimeout: 10000,
	acquireTimeout: 10000,
});

module.exports = { dbConfig };
