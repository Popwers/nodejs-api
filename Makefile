.PHONY: install run certs

install:
	bun install

certs: certificates/selfsigned.key

certificates/selfsigned.key:
	mkdir -p certificates
	openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=localhost" \
		-keyout certificates/selfsigned.key -out certificates/selfsigned.crt

run: certs
	bun index.js
