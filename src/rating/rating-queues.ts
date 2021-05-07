import { TxRecord } from '../types'
import getDbConnection from '../utils/db-connection'
import { logger } from '../utils/logger'
import { NsfwTools } from './image-rater'
import { unsupportedTypes, videoTypes } from '../constants'

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
	logger(prefix, length, 'images found')

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

	while(true){

		//splice off a batch from the queue
		let images = imageQueue.splice(0, Math.min(imageQueue.length, BATCH_IMAGE))
		let gifs = gifQueue.splice(0, Math.min(gifQueue.length, BATCH_GIF))
		let vids = vidQueue.splice(0, Math.min(vidQueue.length, BATCH_VIDEO))
		let others = otherQueue.splice(0, Math.min(otherQueue.length, BATCH_OTHER))

		const total = images.length + gifs.length + vids.length + others.length

		if(total === 0){
			//all queues are empty so wait 30 seconds
			logger(prefix, 'all queues synced at zero length')
			await sleep(30000)
		}else{
			//process batch of images
			logger(prefix, `processing ${images.length} images of ${imageQueue.length + images.length}`)
			await Promise.all(images.map(image => NsfwTools.checkImageTxid(image.txid, image.content_type)))

			//process batch of gifs
			logger(prefix, `processing ${gifs.length} gifs of ${gifQueue.length + gifs.length}`)
			await Promise.all(gifs.map(gif => NsfwTools.checkGifTxid(gif.txid)))

			//process batch of vids
			logger(prefix, `processing ${vids.length} vids of ${vidQueue.length + vids.length}`)
			//TODO: await Promise.all(vids.map(vid => checkVidTxid(vid)))
			
			//process batch of others
			logger(prefix, `processing ${others.length} others of ${otherQueue.length + others.length}`)
			//TODO: await Promise.all(others.map(other => checkOtherTxid(other)))
		}
	}
}