# Realtime events

The planning client opens a socket.io connection and sends `authenticate` with `{ token }`. It then refreshes a list whenever the server broadcasts `subscribeAnimations`, `subscribeAnimateurs`, `subscribeClients` or `subscribeLieux` after a write. Sources: `middleware/auth.js` (`ioAuth`) and `sendData` in each `routes/<resource>.js`.

## Sub-features

- A valid token in `authenticate` gets `authenticated` back.
- With no `authenticate` within 5 seconds, the server disconnects the socket.
- A bad token gets disconnected right away.
- A successful POST, PUT or DELETE emits `subscribe<Resource>` to every connected socket.

## How to get to it (user POV)

The client connects when a planning page loads, then reacts to changes made by other users.

## Driving it with verify-nodejs-api

`$V socket watch` speaks engine.io v4 over HTTP long-polling through the Unix socket, with no client library. It writes `->` for packets it sends and `<-` for packets it receives.

```bash
$V token --mint
$V sql "INSERT INTO clients (nom) VALUES ('C1')"
($V socket watch 8 >/dev/null 2>&1 &); sleep 2; $V http --auth --name delete-client DELETE /api/clients/1; sleep 7
cat "$(ls -1 /tmp/verify-nodejs-api/evidence/*/*-socket-watch.txt | tail -1)"
($V socket watch 8 --no-auth >/dev/null 2>&1 &); sleep 8
cat "$(ls -1 /tmp/verify-nodejs-api/evidence/*/*-socket-watch.txt | tail -1)"
```

Proof: the authenticated watch shows `<- 42["authenticated"]`, then `<- 42["subscribeClients"]`, with a timestamp inside the delete's window. The unauthenticated watch shows `<- 41` (disconnect) about 5 seconds in.

## Gotchas

- The transport is polling only. The helper never upgrades to WebSocket, and `serveClient: false` means there is no `/socket.io/socket.io.js`.
- `ioAuth` tries to hide unauthenticated sockets with `delete socketio.sockets[socket.id]`, which does nothing in socket.io 4. An unauthenticated socket may receive broadcasts during its 5-second grace period. To check, run a write inside that window during a `--no-auth` watch.
- Writes through POST and PUT are broken on master (`api-resources.md`). Use DELETE as the trigger. Do not emit the event any other way.
- The client must answer the server's ping `2` with `3` within 20 seconds. The helper does that, so watches longer than 25 seconds stay open.
