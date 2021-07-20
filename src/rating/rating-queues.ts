import { TxRecord } from '../types'
import getDbConnection from '../utils/db-connection'
import { logger } from '../utils/logger'
import { NsfwTools } from './image-rater'
import { unsupportedTypes, videoTypes } from '../constants'
import { checkInFlightVids } from './video/video-prepare'

const prefix = 'rating'
const db = getDbConnection()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const getImages = async()=> {
	const records = await db<TxRecord>('txs')
	.whereNull('valid_data') //not processed yet
	.where( function(){
		this.orWhere({ content_type: 'image/bmp'})
		.orWhere({ content_type: 'image/jpeg'})
		.orWhere({ content_type: 'image/png'})
	})
	const length = records.length
	logger(prefix, length, 'images found')

	return records
}

const getGifs = async()=> {
	const records = await db<TxRecord>('txs')
	.whereNull('valid_data') //not processed yet
	.where({ content_type: 'image/gif'})
	
	const length = records.length
	logger(prefix, length, 'gifs found')
	
	return records
}

const getVids = async()=> {
	const records = await db<TxRecord>('txs')
	.whereNull('valid_data') //not processed yet
	.whereIn('content_type', videoTypes)

	const length = records.length
	logger(prefix, length, 'videos found')

	return records
}

const getOthers = async()=> {

	//unsupported image types
	const otherImages = await db<TxRecord>('txs')
	.whereNull('valid_data') //not processed yet
	.whereIn('content_type', unsupportedTypes)

	//all the bad txids - partial/corrupt/oversized/timeouts
	const badDatas = await db<TxRecord>('txs')
	.where({valid_data: false}) //potential bad data
	.whereNull('flagged') //not processed

	logger(prefix, otherImages.length, 'unsupported images.', badDatas.length, '"bad" txids')

	return [
		...otherImages,
		...badDatas,
	] 
}

export const rater = async()=>{

	/* initialise. load nsfw tf model */

	await NsfwTools.loadModel()
	
	/* get backlog queues */

	const BATCH_IMAGE = 50
	const BATCH_GIF = 5
	const BATCH_VIDEO = 1
	const BATCH_OTHER = 1

	let imageQueue = await getImages()
	let gifQueue = await getGifs()
	let vidQueue = await getVids()
	let otherQueue = await getOthers()

	/* loop through each queue interleaving one batch at a time */

	let continueVids = true
	let vid: TxRecord[] = [] // just one record
	
	while(true){

		//splice off a batch from the queue
		let images = imageQueue.splice(0, Math.min(imageQueue.length, BATCH_IMAGE))
		let gifs = gifQueue.splice(0, Math.min(gifQueue.length, BATCH_GIF))
		let others = otherQueue.splice(0, Math.min(otherQueue.length, BATCH_OTHER))

		//videos have their own internal queue system
		if(continueVids){
			if(vidQueue.length > 0){
				vid = [vidQueue.pop() as TxRecord]
				logger(prefix, `processing 1 video from ${vidQueue.length + 1}`)
			}else{
				vid = []
			}
		} 
		continueVids = await checkInFlightVids(vid)


		/**
		 * TEMPORARY. Do not check others.length until this queue is handled.
		 */
		const total = images.length + gifs.length // + others.length

		if(total !== 0){
			//process a batch of images
			logger(prefix, `processing ${images.length} images of ${imageQueue.length + images.length}`)
			await Promise.all(images.map(image => NsfwTools.checkImageTxid(image.txid, image.content_type)))
			
			//process a batch of gifs
			logger(prefix, `processing ${gifs.length} gifs of ${gifQueue.length + gifs.length}`)
			await Promise.all(gifs.map(gif => NsfwTools.checkGifTxid(gif.txid)))
			
			// //process a batch of others
			// logger(prefix, `processing ${others.length} others of ${otherQueue.length + others.length}`)
			// //TODO: await Promise.all(others.map(other => checkOtherTxid(other)))
		}else if(continueVids){
			//do not sleep
			logger(prefix, 'images synced. continuing vids')
		}else{
			//all queues are empty so wait 30 seconds
			logger(prefix, 'all queues synced at zero length')
			await sleep(30000)
		}

		//try filling any empty queues
		if(imageQueue.length === 0) imageQueue = await getImages()
		if(gifQueue.length === 0) gifQueue = await getGifs()
		if(vidQueue.length === 0) vidQueue = await getVids()
		if(otherQueue.length === 0) otherQueue = await getOthers()
	}
}