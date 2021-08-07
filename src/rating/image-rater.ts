/**
 * nsfwjs rating system:
 * 
 * drawings - safe for work drawings (including anime)
 * neutral - safe for work neutral images
 * sexy - sexually explicit images, not pornography
 * hentai - hentai and pornographic drawings
 * porn - pornographic images, sexual acts
 * 
 * Supported formats: BMP, JPEG, PNG, or GIF (gif uses different api function)
 */

import { logger } from '../utils/logger'
import * as tf from '@tensorflow/tfjs-node'
import * as nsfw from 'nsfwjs'
import getDbConnection from '../utils/db-connection'
import { TxRecord } from '../types'
import { HOST_URL, NO_DATA_TIMEOUT } from '../constants'
import col from 'ansi-colors'
import { axiosDataTimeout } from '../utils/axiosDataTimeout'
import { corruptDataConfirmed, corruptDataMaybe, noDataFound404, oversizedPngFound, partialDataFound, timeoutInBatch } from './mark-txs'


// do this for all envs
tf.enableProdMode()

const prefix = 'rating'

const db = getDbConnection()

//static everything to keep model in memory
export class NsfwTools {
	static _model: nsfw.NSFWJS
	private constructor(){} //hide

	static async loadModel()   {

		if(NsfwTools._model){
			// model already loaded
			return NsfwTools._model
		}

		logger(prefix, 'loading model once')

		NsfwTools._model = await nsfw.load('file://src/model/', {size: 299})
		return NsfwTools._model
	}

	static checkImage = async(pic: Buffer)=> {

		const model = await NsfwTools.loadModel()
	
		const image = tf.node.decodeImage(pic,3) as tf.Tensor3D
		
		const predictions = await model.classify(image)
		image.dispose() // explicit TensorFlow memory management
	
		return predictions
	}

	static checkImageUrl = async(url: string)=> {

		const pic = await axiosDataTimeout(url)

		return NsfwTools.checkImage(pic)
	}

	static checkGifTxid = async(txid: string)=> {

		const url = `${HOST_URL}${txid}`

		try {

			const gif = await axiosDataTimeout(url)

			const model = await NsfwTools.loadModel()
			const framePredictions = await model.classifyGif(gif, {
				topk: 1,
				fps: 1,
			})

			let flagged = false
			let score: {nsfw_hentai?: number, nsfw_porn?: number, nsfw_sexy?: number } = {}

			for(const frame of framePredictions) {
				const class1 = frame[0].className
				const prob1 = frame[0].probability

				if(class1 === 'Hentai'){
					if(prob1 >= 0.5){
						logger(prefix, 'hentai gif detected', url)
						flagged = true
						score.nsfw_hentai = prob1
						break;
					}
					// logger(prefix, 'hentai < 0.5', url)
				}
				
				if(class1 === 'Porn'){
					logger(prefix, 'porn gif detected', url)
					flagged = true
					score.nsfw_porn = prob1
					break;
				}
				
				if(class1 === 'Sexy'){
					logger(prefix, 'sexy gif detected', url)
					flagged = true
					score.nsfw_sexy = prob1
					break;
				}
			}

			// if(!flagged){ 
			// 	logger(prefix, 'gif clean', url)
			// }

			await db<TxRecord>('txs').where({txid}).update({
				flagged,
				valid_data: true,
				...(true && score), //use some spread trickery to add non-null (or zero value) keys
				last_update_date: new Date(),
			})

		} catch (e) {

			/* handle all the bad data */

			if(e.response && e.response.status === 404){
				logger(prefix, 'no data found (404)', url)
				await noDataFound404(txid)
			}

			else if(
				e.message === 'Invalid GIF 87a/89a header.'
				|| e.message.startsWith('Unknown gif block:')
				|| e.message.startsWith('Invalid typed array length:')
				|| e.message === 'Invalid block size'
				|| e.message === 'Frame index out of range.'
				|| e.message === 'aborted'
			){
				logger(prefix, `gif. probable corrupt data found (${e.message})`, url)
				await corruptDataMaybe(txid)
			}

			else if(e.message === `Timeout of ${NO_DATA_TIMEOUT}ms exceeded`){
				logger(prefix, `Timeout of ${NO_DATA_TIMEOUT}ms exceeded`, url)
				await timeoutInBatch(txid)
			}

			else{
				logger(prefix, 'Error processing gif', url + ' ', e.name, ':', e.message)
				logger(prefix, 'UNHANDLED', e)
			}
		}
	}

	static checkImageTxid = async(txid: string, contentType: string)=> {

		// process gifs separately
		if(contentType === 'image/gif'){
			return NsfwTools.checkGifTxid(txid)
		}

		const url = `${HOST_URL}${txid}`
		
		try {
			
			const predictions = await NsfwTools.checkImageUrl(url)
			
			/* our first attempt prediction formula: flagged = (porn + sexy + hentai) > 0.5 */

			//make prediction data easier to work with 
			type Scores = Record<'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy', number> 
			let scores: Scores = {'Drawing': 0,	'Hentai': 0, 'Neutral': 0, 'Porn': 0, 'Sexy': 0}
			for (const prediction of predictions) {
				scores[prediction.className] = prediction.probability
			}

			let sum = scores['Porn'] + scores['Sexy'] + scores['Hentai']
			const flagged = (sum > 0.5)
	
			if(flagged){
				logger(prefix, url + ' ', flagged, JSON.stringify(scores))
			}
			
			await db<TxRecord>('txs').where({txid: txid}).update({
				flagged,
				valid_data: true,
				
				nsfw_drawings: scores['Drawing'],
				nsfw_hentai: scores['Hentai'],
				nsfw_neutral: scores['Neutral'],
				nsfw_porn: scores['Porn'],
				nsfw_sexy: scores['Sexy'],
				
				last_update_date: new Date(),
			})


		} catch (e) {

			/* catch all sorts of bad data */

			if(
				e.message === 'Expected image (BMP, JPEG, PNG, or GIF), but got unsupported image type'
				&& (contentType === 'image/bmp' || contentType === 'image/jpeg' || contentType === 'image/png')
			){
				logger(prefix, 'probable corrupt data found', contentType, url)
				await corruptDataMaybe(txid)
			}
			
			else if(e.response && e.response.status === 404){
				logger(prefix, 'no data found (404)', contentType, url)
				await noDataFound404(txid)
			}
			
			else if(e.message.startsWith('Invalid TF_Status: 3')){

				/* Handle these errors depending on error reason given. */
				const reason: string = e.message.split('\n')[1]
				
				if(
					reason.startsWith('Message: Invalid PNG data, size')
					|| reason === 'Message: jpeg::Uncompress failed. Invalid JPEG data or crop window.'
				){
					//partial image
					logger(prefix, 'partial image found', contentType, url)
					await partialDataFound(txid)
				}
				
				else if(reason === 'Message: PNG size too large for int: 23622 by 23622'){
					//oversized png
					logger(prefix, 'oversized png found', contentType, url)
					await oversizedPngFound(txid)
				}
				
				else if(
					reason === 'Message: Input size should match (header_size + row_size * abs_height) but they differ by 2'
					|| reason.startsWith('Message: Number of channels inherent in the image must be 1, 3 or 4, was')
				){
					// unreadable data
					logger(prefix, 'bad data found', contentType, url)
					await corruptDataConfirmed(txid)
				}
				
				else{
					logger(prefix, 'Unhandled "Invalid TF_Status: 3" found. reason:', reason, contentType, url)
					logger(prefix, 'UNHANDLED', e)
				}
			}
			
			else if(e.message === `Timeout of ${NO_DATA_TIMEOUT}ms exceeded`){
				logger(prefix, 'connection timed out. check again later', contentType, url)
				await timeoutInBatch(txid)
			}
			
			else if(e.response && e.response.status && e.response.status === 504){
				// error in arweave.net somewhere, not important to us
				logger(prefix, e.message, 'will automatically try again later') //do nothing, record remains in unprocessed queue
			}
			
			else{
				logger(prefix, 'Error processing', url + ' ', e.name, ':', e.message)
				logger(prefix, 'UNHANDLED', e)
			}
		}
	}
}





