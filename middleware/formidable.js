const { formidable } = require('formidable');

const lastValue = values => (Array.isArray(values) ? values[values.length - 1] : values);

module.exports = (req, res, next) => {
	// The API reads fields only: skipping file parts keeps unauthenticated uploads out of the temp directory.
	const form = formidable({ filter: () => false, maxFields: 100, maxFieldsSize: 1024 * 1024 });
	form.parse(req, (err, fields) => {
		if (err) {
			res.status(err.httpCode ?? 400).send({ statut: 'failed', results: 'Parsing error' });
			return;
		}
		req.fields = Object.fromEntries(Object.entries(fields).map(([name, values]) => [name, lastValue(values)]));
		next();
	});
};
