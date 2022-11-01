/**
 * task sequence:
 * 	create new_txs_table / database
 * 	run scanner on entire weave using goldsky (up to X height)
 * 	create csv update file in public s3
 * 	
 * updater: <= maybe dont use knex's seed facility? 1-shot service would be ideal, but could hang off of scanner also.
 * 	read csv record
 * 	insert xor update new columns on conflict
 * 	save seed progess in `states`
 * can we generalise this updater for future use?
 * 
 * 
 */