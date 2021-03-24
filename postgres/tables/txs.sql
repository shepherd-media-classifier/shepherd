CREATE TABLE txs (
    id character(43) NOT NULL PRIMARY KEY,
    flagged boolean NOT NULL,
    date_handled TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE NOT NULL,
    score_nsfw real NOT NULL,
    reason text NOT NULL,
    CONSTRAINT cc_id CHECK ((char_length(id) = 43))
);

ALTER TABLE txs OWNER TO dbowner;

