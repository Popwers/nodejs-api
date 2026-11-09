const { formidable } = require('formidable');
const { firstValues } = require('formidable/src/helpers/firstValues.js');

module.exports = (req, res, next) => {
	const form = formidable({});
	form.parse(req, (err, fields) => {
		if (err) {
			res.status(500).send({ statut: 'failed', results: 'Parsing error' });
		} else {
			req.fields = firstValues(form, fields);
			next();
		}
	});
};
