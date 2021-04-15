import { TxRecord } from '../types'
import getDbConnection from '../utils/db-connection'
import { logger } from '../utils/logger'
import col from 'ansi-colors'
import { NsfwTools } from './image-rating'

const prefix = 'rating'
const db = getDbConnection()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const waitForImages = async()=> {
	while(true){
		const records = await db<TxRecord>('txs')
		.whereNull('valid_data') //not processed yet
		.andWhere( function(){
			this.orWhere({ content_type: 'image/bmp'})
			.orWhere({ content_type: 'image/jpeg'})
			.orWhere({ content_type: 'image/png'})
		})
		const length = records.length
		logger(prefix, length, 'records found')

		if(length > 0) return records
		if(length <= 0) await sleep(30000)
	}
}

export const rater = async()=> {
try {
	
	/* initialise. load nsfw tf model */

	await NsfwTools.loadModel()

	/* get images with native nsfwjs support: BMP, JPEG, PNG, or GIF(later) */
	
	let records = await waitForImages()
	let backlog = records.length

	//max num of images to process at one time
	const calcMaxImages = (backlog: number) => {
		if(backlog <= 0) return 0 //sanity
		if(backlog >= 100) return 100
		if(backlog >= 10) return 10
		return 1
	}

	let maxImages = calcMaxImages(backlog)

	while(true){

		let batch = records.splice(0, maxImages)
		logger(prefix, `Rating ${batch.length} of ${records.length} images`)

		await Promise.all(batch.map(record => {
			logger(prefix, 'processing', record.txid, record.content_type, record.content_size)
			return NsfwTools.checkImageTxid(record.txid, record.content_type)
		}))

		if(records.length <= 0){
			records = await waitForImages()
		}

		maxImages = calcMaxImages(records.length)
	}



	console.log(col.green('rater finished!'))
} catch (e) {
	logger(prefix, 'Error in rater!\t', e.name, ':', e.message)
}
}