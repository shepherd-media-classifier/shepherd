process.env.HOST_URL = 'https://arweave.net'
// process.env.GQL_URL = 'https://arweave.net/graphql'
process.env.GQL_URL = 'https://arweave-search.goldsky.com/graphql'
process.env.GQL_URL_SECONDARY = 'https://arweave-search.goldsky.com/graphql'
if(!process.env.DB_HOST) throw new Error('DB_HOST env var not set')

import { getByteRange } from '../src/byte-ranges/byteRanges'
import { TxRecord } from '../src/common/shepherd-plugin-interfaces/types'
import dbConnection from '../src/common/utils/db-connection'

const knex = dbConnection()

const main = async () => {
	// const recRead = knex<TxRecord>('txs').where({ flagged: true, byte_start: '-1' }).stream()
	const recRead = knex<TxRecord>('txs').where('top_score_value', '>', 0.9).where({ byte_start: '-1' }).stream()
	const promises = []
	let count = 0
	for await (const rec of recRead){
		count++
		promises.push((async (rec: TxRecord) => {
			const { start, end } = await getByteRange(rec.txid, rec.parent, rec.parents)
			console.log(rec.txid, 'byte range', start, end, `top_score_value:${rec.top_score_value}`,)
			const checkId = await knex<TxRecord>('txs').where('txid', rec.txid).update({ byte_start: start.toString(), byte_end: end.toString() }, ['txid'])
			if(checkId.length === 0 || checkId[0].txid !== rec.txid) throw new Error('error updating database')
		})(rec))
		if(count % 100 === 0){
			await Promise.all(promises)
			console.log('finished', count)
		}
	}
	await Promise.all(promises)
	console.log('finished', count)
	await knex.destroy()

}
main()