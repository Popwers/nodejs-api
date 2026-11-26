const app = require('express')();
const mysql = require('mysql');

const { createServer } = require('https');
const fs = require('fs');

const options = {
	key: fs.readFileSync('./certificates/selfsigned.key'),
	cert: fs.readFileSync('./certificates/selfsigned.crt'),
};

const httpsServer = createServer(options, app);
const { Server } = require('socket.io');
const io = new Server(httpsServer, {
	serveClient: false,
});

const { dbConfig } = require('./config');
const { ioAuth, corsAuth } = require('./middleware/auth');
const securityHeaders = require('./middleware/headers');
const authRouter = require('./routes/auth');
const animationsRouter = require('./routes/animations');
const animateursRouter = require('./routes/animateurs');
const clientsRouter = require('./routes/clients');
const lieuxRouter = require('./routes/lieux');

const db = mysql.createPool(dbConfig());
db.query('SELECT 1', err => {
	if (err) console.log('> Error when connecting to Database : ', err);
	else console.log('> SQL Database Ready');
});

app.set('io', io)
	.disable('x-powered-by')
	.use(securityHeaders)
	.use(corsAuth)
	.use('/auth', authRouter(db))
	.use('/api', animationsRouter(app, db))
	.use('/api', animateursRouter(app, db))
	.use('/api', clientsRouter(app, db))
	.use('/api', lieuxRouter(app, db))
	.use((req, res) => {
		res.sendStatus(404);
	});

io.on('connection', socket => {
	ioAuth(socket, io);
});

httpsServer.listen('passenger', err => {
	if (err) throw err;
	console.log(`> Server Ready`);
});
