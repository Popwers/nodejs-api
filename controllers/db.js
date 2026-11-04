const util = require('util');

module.exports = (db, dbTable) => {
	const query = util.promisify(db.query).bind(db);
	const get = async (fields = '*', callback = false, table = dbTable) => {
		let res = null;
		try {
			const results = await query(`SELECT ${fields} FROM ${table}`);
			res = { statut: true, error: false, results: results };
		} catch (err) {
			await db.rollback();
			res = { statut: false, error: err, results: null };
		}

		if (callback && typeof callback == 'function') {
			callback(res);
		}
		return res;
	};

	const post = async (fields, callback = false, table = dbTable) => {
		let res = null;
		try {
			const results = await query(`INSERT INTO ${table} SET ?`, fields);
			res = { statut: true, error: false, results: results };
		} catch (err) {
			await db.rollback();
			res = { statut: false, error: err, results: null };
		}

		if (callback && typeof callback == 'function') {
			callback(res);
		}
		return res;
	};

	const searchEntry = async (
		searchValue,
		fields = '*',
		callback = false,
		searchKey = 'id',
		table = dbTable
	) => {
		let res = null;
		try {
			const results = await query(`SELECT ${fields} FROM ${table} WHERE ?? = ?`, [searchKey, searchValue]);
			res = { statut: true, error: false, results: results };
		} catch (err) {
			await db.rollback();
			res = { statut: false, error: err, results: null };
		}

		if (callback && typeof callback == 'function') {
			callback(res);
		}
		return res;
	};

	const putEntry = async (searchValue, fields, callback = false, searchKey = 'id', table = dbTable) => {
		let res = null;
		try {
			const results = await query(`UPDATE ${table} SET ? WHERE ?? = ?`, [fields, searchKey, searchValue]);
			res = { statut: true, error: false, results: results };
		} catch (err) {
			await db.rollback();
			res = { statut: false, error: err, results: null };
		}

		if (callback && typeof callback == 'function') {
			callback(res);
		}
		return res;
	};

	const deleteEntry = async (searchValue, callback = false, searchKey = 'id', table = dbTable) => {
		let res = null;
		try {
			const results = await query(`DELETE FROM ${table} WHERE ?? = ?`, [searchKey, searchValue]);
			res = { statut: true, error: false, results: results };
		} catch (err) {
			await db.rollback();
			res = { statut: false, error: err, results: null };
		}

		if (callback && typeof callback == 'function') {
			callback(res);
		}
		return res;
	};

	return { get, searchEntry, post, putEntry, deleteEntry };
};
