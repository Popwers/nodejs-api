const express = require('express');
const router = express.Router();

const fieldsMiddleware = require('../middleware/formidable');
const { authMiddleware } = require('../middleware/auth');

module.exports = (app, db) => {
	const dbController = require('../controllers/db')(db, 'animateurs');
	const io = app.get('io');

	const sendData = (statut, res, results, error, io = false) => {
		if (statut) {
			if (io) io.emit('subscribeAnimateurs');
			res.status(200).send({ statut: 'success', results: results });
		} else res.status(500).send({ statut: 'failed', results: 'API error' });
	};

	router
		.route('/animateurs')
		.get(authMiddleware, (req, res) => {
			dbController.get('*', ({ statut, error, results }) => sendData(statut, res, results, error));
		})
		.post([authMiddleware, fieldsMiddleware], (req, res) => {
			dbController.post(req.fields, ({ statut, error, results }) =>
				sendData(statut, res, results, error, io)
			);
		});

	router
		.route('/animateurs/:id')
		.get(authMiddleware, (req, res) => {
			dbController.searchEntry(req.params.id, '*', ({ statut, error, results }) =>
				sendData(statut, res, results, error)
			);
		})
		.put([authMiddleware, fieldsMiddleware], (req, res) => {
			dbController.putEntry(req.params.id, req.fields, ({ statut, error, results }) =>
				sendData(statut, res, results, error, io)
			);
		})
		.delete(authMiddleware, (req, res) => {
			dbController.deleteEntry(req.params.id, ({ statut, error, results }) =>
				sendData(statut, res, results, error, io)
			);
		});

	return router;
};
