import { StateRecord, TxsRecord } from "../types"
import dbConnection from "../utils/db-connection"
import { logger } from "../utils/logger"

const prefix = 'rating'


export const runner = async()=> {
	try {
		const db = dbConnection()

		let position = (await db<StateRecord>('states').where({pname: 'rating_position'}))[0].value
		let imgCount = Number((await db<TxsRecord>('txs').where('content_type','LIKE','image%').count("id"))[0].count)
		
		console.log(imgCount)





	} catch (e) {
		logger(prefix, 'Error in runner!\t', e.name, ':', e.message)
	}
}