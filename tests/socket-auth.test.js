const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

require('./helpers');
const jwt = require('jsonwebtoken');
const { ioAuth } = require('../middleware/auth');

const connect = () => {
	const socket = new EventEmitter();
	socket.id = 'socket-1';
	socket.disconnected = false;
	socket.sent = [];
	socket.disconnect = () => {
		socket.disconnected = true;
	};
	const baseEmit = socket.emit.bind(socket);
	socket.emit = (event, ...args) => {
		if (event === 'authenticated') socket.sent.push(event);
		return baseEmit(event, ...args);
	};
	const io = { sockets: { [socket.id]: socket } };
	ioAuth(socket, io);
	return { socket, io };
};

for (const [label, payload] of [
	['no payload', undefined],
	['a null payload', null],
	['a payload without token', {}],
	['a non-string token', { token: 42 }],
]) {
	test(`a socket authenticating with ${label} is disconnected without throwing`, () => {
		const { socket } = connect();

		assert.doesNotThrow(() => socket.emit('authenticate', payload));
		assert.equal(socket.disconnected, true);
		assert.deepEqual(socket.sent, []);
	});
}

test('a socket authenticating with a valid token is acknowledged', async () => {
	const { socket, io } = connect();
	const token = jwt.sign({ user_id: 1 }, process.env.TOKEN_KEY);

	socket.emit('authenticate', { token });
	await new Promise(resolve => setImmediate(resolve));

	assert.equal(socket.disconnected, false);
	assert.deepEqual(socket.sent, ['authenticated']);
	assert.equal(io.sockets[socket.id], socket);
});
