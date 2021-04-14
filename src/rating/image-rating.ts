/**
 * nsfwjs rating system:
 * 
 * drawings - safe for work drawings (including anime)
 * neutral - safe for work neutral images
 * sexy - sexually explicit images, not pornography
 * hentai - hentai and pornographic drawings
 * porn - pornographic images, sexual acts
 * 
 */

import { logger } from '../utils/logger'
import axios from 'axios'
import * as tf from '@tensorflow/tfjs-node'
import * as nsfw from 'nsfwjs'
import getDbConnection from '../utils/db-connection'
import { TxRecord } from '../types'

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

		const pic = await axios.get(url, {
			responseType: 'arraybuffer',
		})
		
		return NsfwTools.checkImage(pic.data)
	}

	static checkImageTxid = async(txid: string)=> {

		const url = `https://arweave.net/${txid}`
		
		try {
			
			const predictions = await NsfwTools.checkImageUrl(url)
			
			//make this data easier to work with 
			// let scores: { [name in string ]: number} = {}
			type Scores = { [name in 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy' ]: number}
			let scores: Scores = {Drawing: 0,	Hentai: 0,	Neutral: 0,	Porn: 0,	Sexy: 0}
			// let scores: Record<'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy', number> = {}
			
			for (const prediction of predictions) {
				scores[prediction.className] = prediction.probability
			}
			
			//calculate overall score. sexy+porn+hentai > 0.5 => flagged
			let sum = scores.Porn + scores.Sexy + scores.Hentai 
			const flagged = (sum > 0.5)
	
			logger(prefix,
				url, 
				flagged,
				JSON.stringify(scores),
			)
			
			await db<TxRecord>('txs').where({txid: txid}).update({
				flagged,
				valid_data: true,
				
				nsfw_drawings: scores.Drawing,
				nsfw_hentai: scores.Hentai,
				nsfw_neutral: scores.Neutral,
				nsfw_porn: scores.Porn,
				nsfw_sexy: scores.Sexy,
				
				last_update_date: new Date()
			})
			
			


		} catch (e) {
			logger(prefix, 'Error processing', url, e.name, ':', e.message)
			console.log(e)
		}
	}


}





