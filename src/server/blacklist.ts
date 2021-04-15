import { TxRecord } from '../types'
import getDb from '../utils/db-connection'
import { logger } from '../utils/logger'

const db = getDb()
const prefix = 'server'

export const getBlacklist = async(black: boolean)=> {
	const records = await db<TxRecord>('txs').where({flagged: black})
	logger(prefix, 'flagged txs retrieved', records.length)
	let text = ''
	for (const record of records) {
		text += record.txid + '\n'
	}
	return text
}