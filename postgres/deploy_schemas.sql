CREATE USER dbowner WITH PASSWORD 'dbowner';
GRANT ALL PRIVILEGES ON DATABASE arblacklist TO dbowner;

-- -- Deploy fresh database tables
-- \i '/docker-entrypoint-initdb.d/tables/txs.sql'

CREATE TABLE txs (
	txid CHARACTER(43) NOT NULL PRIMARY KEY,
	content_type TEXT NOT NULL,
	content_size INTEGER NOT NULL,
	flagged BOOLEAN,
	clarifai_valid_data BOOLEAN,
	clarifai_nsfw real,
	clarifai_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE,
	CONSTRAINT cc_id CHECK ((char_length(txid) = 43))
);

ALTER TABLE txs OWNER TO dbowner;

CREATE TABLE states (
	id SERIAL PRIMARY KEY,
	pname TEXT NOT NULL,
	blocknumber INT NOT NULL
);

INSERT INTO states(pname, blocknumber) 
VALUES 
	('scanner_position', 0),
	('rating_position', 0);

ALTER TABLE states OWNER TO dbowner;

