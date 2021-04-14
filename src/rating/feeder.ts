import { TxRecord } from '../types'
import getDbConnection from '../utils/db-connection'
import { logger } from '../utils/logger'
import { NsfwTools } from './image-rating'

const prefix = 'rating'
const db = getDbConnection()

export const rater = async()=> {

	/* initialise. load nsfw tf model */

	await NsfwTools.loadModel()

	/* get images with native nsfwjs support: BMP, JPEG, PNG, or GIF */
	
	const records = await db<TxRecord>('txs')
	.whereNull('flagged') //not processed yet
	.andWhere( function(){
		this.orWhere({ content_type: 'image/bmp'})
		.orWhere({ content_type: 'image/jpeg'})
		.orWhere({ content_type: 'image/png'})
		// .orWhere({ content_type: 'image/gif'}) //none working for some reason
	})
	console.log(records.length, 'records found')

	for (let index = 0; index < 10; index++) {
		const record = records[index];
		logger(prefix, 'processing', record.txid, record.content_type, record.content_size)
		NsfwTools.checkImageTxid(record.txid)
	}




}