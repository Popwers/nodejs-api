const { formidable } = require('formidable');

const lastValue = values => (Array.isArray(values) ? values[values.length - 1] : values);

module.exports = (req, res, next) => {
	const form = formidable({});
	form.parse(req, (err, fields) => {
		if (err) {
			res.status(err.httpCode ?? 400).send({ statut: 'failed', results: 'Parsing error' });
			return;
		}
		req.fields = Object.fromEntries(Object.entries(fields).map(([name, values]) => [name, lastValue(values)]));
		next();
	});
};
