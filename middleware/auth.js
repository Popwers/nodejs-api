const jwt = require('jsonwebtoken');

module.exports = {
	corsAuth: (req, res, next) => {
		var allowedOrigins = [
			'http://planning.jourdefete.re',
			'https://planning.jourdefete.re',
			'http://www.planning.jourdefete.re',
			'https://www.planning.jourdefete.re',
		];
		var Origin = req.headers.Origin;
		if (allowedOrigins.indexOf(Origin) > -1) {
			res.setHeader('Access-Control-Allow-Origin', origin);
		}
		//res.setHeader('Access-Control-Allow-Origin', "*")
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
		res.setHeader(
			'Access-Control-Allow-Headers',
			'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers'
		);
		res.setHeader('Content-Type', 'application/json; charset=utf-8');
		next();
	},

	ioAuth: (socket, socketio) => {
		//temp delete socket from namespace connected map
		delete socketio.sockets[socket.id];

		var options = {
			secret: process.env.TOKEN_KEY,
			timeout: 5000,
		};

		var auth_timeout = setTimeout(function () {
			socket.disconnect('Token non valide.');
		}, options.timeout || 5000);

		var authenticate = function (data) {
			clearTimeout(auth_timeout);
			jwt.verify(data.token, options.secret, options, function (err, decoded) {
				if (err) {
					socket.disconnect('Token non valide.');
				}
				if (!err && decoded) {
					//restore temporarily disabled connection
					socketio.sockets[socket.id] = socket;

					socket.decoded_token = decoded;
					socket.connectedAt = new Date();

					// Disconnect listener
					socket.on('disconnect', function () {
						console.info('SOCKET [%s] DISCONNECTED', socket.id);
					});

					console.info('SOCKET [%s] CONNECTED', socket.id);
					socket.emit('authenticated');
				}
			});
		};

		socket.on('authenticate', authenticate);
	},

	authMiddleware: (req, res, next) => {
		const token =
			req.body?.token || req.query?.token || req.headers['x-access-token'] || req.cookies?.token;

		if (!token) res.status(403).send('Un token est requis pour vous connecter.');
		try {
			const decoded = jwt.verify(token, process.env.TOKEN_KEY);
			req.user = decoded;
		} catch (err) {
			res.status(401).send('Token non valide.');
		}
		next();
	},
};
