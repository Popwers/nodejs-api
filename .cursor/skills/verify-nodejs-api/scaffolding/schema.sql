-- Verification scaffolding: the production schema is not in the repo.
-- Columns are the ones the code reads or writes (routes/auth.js) plus a minimal
-- `nom` / `description` pair for the four resources. Loaded into a disposable
-- MariaDB by `verify-nodejs-api launch`. Never run this against a shared database.

CREATE TABLE users (
	id INT AUTO_INCREMENT PRIMARY KEY,
	mail VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	role VARCHAR(64) NOT NULL,
	token TEXT NULL
);

CREATE TABLE animations (
	id INT AUTO_INCREMENT PRIMARY KEY,
	nom VARCHAR(255) NOT NULL,
	description TEXT NULL
);

CREATE TABLE animateurs (
	id INT AUTO_INCREMENT PRIMARY KEY,
	nom VARCHAR(255) NOT NULL,
	description TEXT NULL
);

CREATE TABLE clients (
	id INT AUTO_INCREMENT PRIMARY KEY,
	nom VARCHAR(255) NOT NULL,
	description TEXT NULL
);

CREATE TABLE lieux (
	id INT AUTO_INCREMENT PRIMARY KEY,
	nom VARCHAR(255) NOT NULL,
	description TEXT NULL
);
