const { parsePage } = require('../controllers/page');

module.exports = (req, res, next) => {
	const page = parsePage(req.query);
	if (!page) return res.status(400).send('Paramètres de pagination invalides.');
	req.page = page;
	next();
};
