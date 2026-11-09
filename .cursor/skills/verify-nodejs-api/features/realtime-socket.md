# Realtime events

The planning client opens a socket.io connection and sends `authenticate` with `{ token }`. It then refreshes a list whenever the server broadcasts `subscribeAnimations`, `subscribeAnimateurs`, `subscribeClients` or `subscribeLieux` after a write. Sources: `middleware/auth.js` (`ioAuth`) and `sendData` in each `routes/<resource>.js`.

## Sub-features

- A valid token in `authenticate` gets `authenticated` back.
- With no `authenticate` within 5 seconds, the server disconnects the socket (`41`).
- A bad token gets disconnected right away (`41`).
- A successful POST, PUT or DELETE emits `subscribe<Resource>` to every connected socket. A write that answers 500 emits nothing.

## How to get to it (user POV)

The client connects when a planning page loads, then reacts to changes made by other users.

## Driving it with verify-nodejs-api

`$V socket watch SECONDS [--no-auth|--bad-token]` speaks engine.io v4 over HTTP long-polling through the Unix socket, with no client library. It writes `->` for packets it sends and `<-` for packets it receives. `--bad-token` sends `authenticate` with `not-a-jwt`.

```bash
$V token
($V socket watch 8 >/dev/null 2>&1 &); sleep 2; $V http --auth --name post-client POST /api/clients -F nom=C1; sleep 7
cat "$(ls -1 /tmp/verify-nodejs-api/evidence/*/*-socket-watch.txt | tail -1)"
($V socket watch 6 >/dev/null 2>&1 &); sleep 2; $V http --auth --name post-client-bad POST /api/clients -F nosuchcol=x; sleep 6
cat "$(ls -1 /tmp/verify-nodejs-api/evidence/*/*-socket-watch.txt | tail -1)"   # no subscribeClients
($V socket watch 9 --no-auth >/dev/null 2>&1 &); sleep 2; $V http --auth --name delete-client DELETE /api/clients/1; sleep 8
cat "$(ls -1 /tmp/verify-nodejs-api/evidence/*/*-socket-watch.txt | tail -1)"
$V socket watch 5 --bad-token
$V doctor
```

Proof: the first watch shows `<- 42["authenticated"]`, then `<- 42["subscribeClients"]`, next to the 200 of the POST. The failed POST (500) leaves its watch with no `subscribeClients`. The `--no-auth` watch shows `<- 41` about 5 seconds after its start line. The `--bad-token` watch shows `<- 41` at once. Watch files carry timestamps only on their first and last lines.

## Gotchas

- **An `authenticate` event with no payload crashes the process.** `ioAuth` reads `data.token` without a guard (`middleware/auth.js`), so `42["authenticate"]` throws `TypeError` and kills the app (doctor: `FAIL app pid … alive`). Any client can do this before authenticating. Report it, then `$V cleanup && $V launch`.
- **An unauthenticated socket receives broadcasts** during its 5-second grace period. `ioAuth` tries to hide it with `delete socketio.sockets[socket.id]`, which does nothing in socket.io 4. The `--no-auth` watch above shows `<- 42["subscribeClients"]` before `<- 41`.
- The transport is polling only. The helper never upgrades to WebSocket (the server offers it), and `serveClient: false` means there is no `/socket.io/socket.io.js`.
- The server pings every 25 seconds (`pingInterval: 25000`, `pingTimeout: 20000` in the handshake). The helper answers `2` with `3`, so long watches stay open.
