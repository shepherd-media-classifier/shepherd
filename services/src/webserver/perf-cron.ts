import { HistoryRecord, StateRecord, TxRecord } from "../common/shepherd-plugin-interfaces/types";
import dbConnection from "../common/utils/db-connection";
import { getGqlHeight } from "../common/utils/gql-height";

const knex = dbConnection()

const INTERVAL = 60*60*1000 //60 mins

const cronjob = async()=> {
	// count group by flagged
	const results = await knex<TxRecord>('txs').select('flagged').count('*').groupBy('flagged')

	const output: Partial<HistoryRecord> = {}
	let totalTxs = 0
	for (const result of results) {
		//@ts-ignore
		const count: string = result.count
		if(result.flagged === null){
			output.unflagged = count
		}
		totalTxs += +count
	}

	//fix crash when txs table empty
	if(results.length === 0){
		output.unflagged = "0"
	}

	output.total_txs = totalTxs.toString()
	output.gql_height = await getGqlHeight()
	output.indexer_pass1 = (await knex<StateRecord>('states').where({pname: 'indexer_pass1'}))[0].value

	console.log('[perf-cron]', output)
	await knex<HistoryRecord>('history').insert(output)
}

setInterval(()=> {
	cronjob();
},INTERVAL)

cronjob() //run once at start also
