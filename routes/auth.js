const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const fieldsMiddleware = require('../middleware/formidable');
const { authMiddleware } = require('../middleware/auth');

const rateLimit = require('express-rate-limit');
const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
});

const isFilledString = value => typeof value === 'string' && value !== '';

module.exports = db => {
	const dbController = require('../controllers/db')(db, 'users');

	router
		.post('/login', registerLimiter, fieldsMiddleware, async (req, res) => {
			const { mail, password } = req.fields;

			if (!(isFilledString(mail) && isFilledString(password))) {
				return res.status(400).send('Veuillez remplir tous les champs.');
			}

			const lookup = await dbController.searchEntry(mail, 'id, mail, password', false, 'mail');
			if (!lookup.statut) return res.status(500).send('Une erreur est survenue.');
			if (lookup.results.length <= 0) {
				return res.status(409).send('Votre identifiant ou votre mot de passe est incorrect.');
			}

			const user = lookup.results[0];
			if (!(await bcrypt.compare(password, user.password))) {
				return res.status(400).send('Votre identifiant ou votre mot de passe est incorrect.');
			}

			const token = jwt.sign({ user_id: user.id, mail: user.mail }, process.env.TOKEN_KEY, {
				expiresIn: '30 days',
			});
			const update = await dbController.putEntry(user.id, { token: token });
			if (!update.statut) return res.status(500).send('Une erreur est survenue.');
			return res.status(200).send({ token });
		})
		.post('/signup', [authMiddleware, fieldsMiddleware], async (req, res) => {
			const { mail, password, role } = req.fields;

			if (!(isFilledString(mail) && isFilledString(password) && isFilledString(role))) {
				return res.status(400).send('Veuillez remplir tous les champs.');
			}

			const lookup = await dbController.searchEntry(mail, 'id, mail, role', false, 'mail');
			if (!lookup.statut) return res.status(500).send('Une erreur est survenue.');
			if (lookup.results.length > 0) return res.status(409).send('User already exists. Please login.');

			const encryptedPassword = await bcrypt.hash(password, 10);
			const newUser = await dbController.post({
				mail: mail.toLowerCase(),
				password: encryptedPassword,
				role: role,
			});
			if (!newUser.statut || !(newUser.results?.affectedRows > 0)) {
				return res.status(500).send('Une erreur est survenue.');
			}
			return res.status(200).send('Compte utilisateur enregistré.');
		});

	return router;
};
