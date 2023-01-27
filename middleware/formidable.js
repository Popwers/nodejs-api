const formidable = require('formidable');

module.exports = (req, res, next) => {
	const form = formidable({});
	form.parse(req, (err, fields) => {
		if (err) {
			res.status(500).send({ statut: 'failed', results: 'Parsing error' });
		} else {
			req.fields = fields;
			next();
		}
	});
};
