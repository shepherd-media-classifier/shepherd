/**
 * CREATE TABLE txs (
 *	txid CHARACTER(43) NOT NULL PRIMARY KEY,
 *	content_type TEXT NOT NULL,
 *	content_size INTEGER NOT NULL,
 *	flagged BOOLEAN,
 *	clarifai_valid_data BOOLEAN,
 *	clarifai_nsfw real,
 *	clarifai_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE,
 *	CONSTRAINT cc_id CHECK ((char_length(id) = 43))
 * );
 */

export interface TxScanned {
	txid: string
	content_type: string
	content_size: number
}
export interface TxsRecord extends TxScanned {
	flagged: boolean
	clarifai_valid_data: boolean
	clarifai_nsfw: number
	clarifai_date: Date
}

/**
 *	CREATE TABLE states (
 *		id SERIAL PRIMARY KEY,
 *		pname TEXT NOT NULL,
 *		blocknumber INT NOT NULL
 *	);
 *
 *	 INSERT INTO states(pname, blocknumber) 
 *	 VALUES 
 *		 ('scanner_position', 0),
 *		 ('rating_position', 0);
 */

export interface StateRecord {
	pname: 'scanner_position' | 'rating_position' | (string & {}) //nice hack for intellisense
	blocknumber: number
}
