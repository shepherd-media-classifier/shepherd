/**
 * nsfwjs rating system:
 * 
 * drawings - safe for work drawings (including anime)
 * neutral - safe for work neutral images
 * sexy - sexually explicit images, not pornography
 * hentai - hentai and pornographic drawings
 * porn - pornographic images, sexual acts
 * 
 * Supported formats: BMP, JPEG, PNG, or GIF
 */

import { logger } from '../utils/logger'
import axios from 'axios'
import * as tf from '@tensorflow/tfjs-node'
import * as nsfw from 'nsfwjs'
import getDbConnection from '../utils/db-connection'
import { TxRecord } from '../types'
import { GET_IMAGE_TIMEOUT } from '../constants'
import col from 'ansi-colors'


if(process.env.NODE_ENV === 'production'){
	tf.enableProdMode()
}

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

		/**
		 * Axios never times out if the connection is opened correctly with non-zero Content-Length, but no data is ever returned.
		 * The workaround is ot set a timeout, cancel the request, and throw an error.
		 */
		const source = axios.CancelToken.source()
		const timer = setTimeout( ()=>source.cancel(), GET_IMAGE_TIMEOUT )

		try{

			const { data: pic } = await axios.get(url, {
				cancelToken: source.token,
				responseType: 'arraybuffer',
			})
			clearTimeout(timer)

			return NsfwTools.checkImage(pic)

		}catch(e){
			clearTimeout(timer)
			if(e.response){
				throw(e)
			}
			throw new Error(`Timeout of ${GET_IMAGE_TIMEOUT}ms exceeded`)
		}
	}

	static checkGifTxid = async(txid: string)=> {

		const url = `https://arweave.net/${txid}`

		try {

			const { data: pic } = await axios.get(url, {
				responseType: 'arraybuffer',
			})

			const model = await NsfwTools.loadModel()
			const framePredictions = await model.classifyGif(pic, {
				topk: 2,
				fps: 2,
			})

			console.log(col.red(JSON.stringify(framePredictions)))

			for (const frame of framePredictions) {
				const class1 = frame[0].className
				const prob1 = frame[0].probability
				const class2 = frame[1].className

				if(class1 === 'Hentai'){
					if(prob1 > 0.6){
						logger(prefix, 'hentai gif detected', url)
						return frame;
					}
					logger(prefix, 'hentai < 0.6', url)
				}

				if(class1 === 'Porn'){
					logger(prefix, 'porn gif detected', url)
					return frame
				}

				if(class1 === 'Sexy'){
					logger(prefix, 'sexy gif detected', url)
					return frame
				}
			}

			logger(prefix, 'gif clean', url)
			return []

		} catch (e) {

			/* handle all the bad data */

			if(e.response && e.response.status === 404){
				logger(prefix, 'no data found (404)', url)
			}

			if(e.message === 'Invalid GIF 87a/89a header.'){
				logger(prefix, 'bad data found (Invalid GIF 87a/89a header)', url)
			}

			else{
				logger(prefix, 'Error processing', url + ' ', e.name, ':', e.message)
				logger(prefix, 'UNHANDLED', e)
			}
		}
	}

	static checkImageTxid = async(txid: string, contentType: string)=> {

		const url = `https://arweave.net/${txid}`
		
		try {
			
			const predictions = await NsfwTools.checkImageUrl(url)
			
			//make this data easier to work with 
			type Scores = { [name in 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy' ]: number}
			// type Scores = Record<'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy', number> 
			let scores: Scores = {Drawing: 0,	Hentai: 0,	Neutral: 0,	Porn: 0,	Sexy: 0}
			
			for (const prediction of predictions) {
				scores[prediction.className] = prediction.probability
			}
			
			//calculate overall score. sexy+porn+hentai > 0.5 => flagged
			let sum = scores.Porn + scores.Sexy + scores.Hentai 
			const flagged = (sum > 0.5)
	
			if(flagged){
				logger(prefix,
					url + ' ', 
					flagged,
					JSON.stringify(scores),
				)
			}
			
			await db<TxRecord>('txs').where({txid: txid}).update({
				flagged,
				valid_data: true,
				
				nsfw_drawings: scores.Drawing,
				nsfw_hentai: scores.Hentai,
				nsfw_neutral: scores.Neutral,
				nsfw_porn: scores.Porn,
				nsfw_sexy: scores.Sexy,
				
				last_update_date: new Date(),
			})


		} catch (e) {
			/* catch all sorts of bad data */
			if(
				e.message === 'Expected image (BMP, JPEG, PNG, or GIF), but got unsupported image type'
				&& (contentType === 'image/bmp' || contentType === 'image/jpeg' || contentType === 'image/png')
			){

				logger(prefix, 'bad data found', contentType, url)
				await db<TxRecord>('txs').where({txid}).update({
					flagged: false,
					valid_data: false,
					last_update_date: new Date(),
				})

			}else if(e.response && e.response.status === 404){

				logger(prefix, 'no data found (404)', contentType, url)
				await db<TxRecord>('txs').where({txid}).update({
					flagged: false,
					valid_data: false,
					last_update_date: new Date(),
				})

			}else if(e.message.startsWith('Invalid TF_Status: 3')){

				//TODO: split this out into the different ways to resample/handle errors

				const reason = e.message.split('\n')[1]
				logger(prefix, 'bad/partial data, "Invalid TF_Status: 3" found, flagging=>true, reason:', reason, contentType, url)
				await db<TxRecord>('txs').where({txid}).update({
					flagged: true,
					valid_data: false,
					last_update_date: new Date(),
				})

			}else if(e.message === `Timeout of ${GET_IMAGE_TIMEOUT}ms exceeded`){

				logger(prefix, 'connection timed out *CHECK THIS ERROR* setting flagged=null, valid_data=false', contentType, url)
				await db<TxRecord>('txs').where({txid}).update({
					// flagged: false,
					valid_data: false,
					last_update_date: new Date(),
				})

			}else{

				logger(prefix, 'Error processing', url, e.name, ':', e.message)
				logger(prefix, 'UNHANDLED', e)
			}
		}
	}
}





