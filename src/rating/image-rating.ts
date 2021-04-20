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


if(process.env.NODE_ENV === 'production'){
	tf.enableProdMode()
}

const prefix = 'rating'

const db = getDbConnection()

//static everything to keep that model
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

			const pic = await axios.get(url, {
				cancelToken: source.token,
				responseType: 'arraybuffer',
			})
			clearTimeout(timer)

			return NsfwTools.checkImage(pic.data)

		}catch(e){
			clearTimeout(timer)
			if(e.response){
				throw(e)
			}
			throw new Error(`Timeout of ${GET_IMAGE_TIMEOUT}ms exceeded`)
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

				logger(prefix, 'no data found', contentType, url)
				await db<TxRecord>('txs').where({txid}).update({
					flagged: false,
					valid_data: false,
					last_update_date: new Date(),
				})
			}else if(contentType === 'image/png' && e.message.startsWith('Invalid TF_Status: 3')){

				logger(prefix, 'bad png data found', contentType, url)
				await db<TxRecord>('txs').where({txid}).update({
					flagged: false,
					valid_data: false,
					last_update_date: new Date(),
				})
			}else if(e.message === `Timeout of ${GET_IMAGE_TIMEOUT}ms exceeded`){

				logger(prefix, 'connection timed out *CHECK THIS ERROR*', contentType, url)
				// await db<TxRecord>('txs').where({txid}).update({
				// 	flagged: false,
				// 	valid_data: false,
				// 	last_update_date: new Date(),
				// })
				logger(prefix, 'writing to db disabled for ', url)
			}else{

				logger(prefix, 'Error processing', url, e.name, ':', e.message)
				logger(prefix, 'UNHANDLED', e)
			}
		}
	}
}





