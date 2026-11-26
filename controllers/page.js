const DEFAULT_MAX_ROWS = 10000;

const maxRows = () => {
	const configured = Number.parseInt(process.env.LIST_MAX_ROWS, 10);
	return configured > 0 ? configured : DEFAULT_MAX_ROWS;
};

const toCount = value => (/^\d+$/.test(value) ? Number(value) : null);

/** Reads ?limit and ?offset. No parameter means the first `maxRows()` rows, which is what clients got before paging existed. */
const parsePage = query => {
	const limit = query.limit === undefined ? maxRows() : toCount(query.limit);
	const offset = query.offset === undefined ? 0 : toCount(query.offset);
	if (limit === null || limit < 1 || offset === null) return null;
	return { limit: Math.min(limit, maxRows()), offset };
};

module.exports = { maxRows, parsePage };
