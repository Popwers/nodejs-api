const DEFAULT_MAX_ROWS = 10000;

const maxRows = () => {
	const configured = Number.parseInt(process.env.LIST_MAX_ROWS, 10);
	return configured > 0 ? configured : DEFAULT_MAX_ROWS;
};

const toCount = value => {
	if (!/^\d+$/.test(value)) return null;
	const count = Number(value);
	return Number.isSafeInteger(count) ? count : null;
};

/**
 * Reads ?limit and ?offset. With neither, returns an empty page: the caller gets every row, as before paging existed.
 * Returns null when a value is not a whole number in range.
 */
const parsePage = query => {
	if (query.limit === undefined && query.offset === undefined) return {};
	const limit = query.limit === undefined ? maxRows() : toCount(query.limit);
	const offset = query.offset === undefined ? 0 : toCount(query.offset);
	if (limit === null || limit < 1 || offset === null) return null;
	return { limit: Math.min(limit, maxRows()), offset };
};

module.exports = { parsePage };
