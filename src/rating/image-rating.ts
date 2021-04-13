import { logger } from '../utils/logger'
import axios from 'axios'

import * as tf from '@tensorflow/tfjs-node'
import * as nsfw from 'nsfwjs'

//static everything to keep that model
export class NsfwTools {
	static _model: nsfw.NSFWJS
	private constructor(){} //hide

	static async loadModel()   {

		if(NsfwTools._model){
			// model already loaded
			return NsfwTools._model
		}

		logger('loading model once')

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
		try {
			const pic = await axios.get(url, {
				responseType: 'arraybuffer',
			})
			
			const res = await NsfwTools.checkImage(pic.data)
	
			console.log(url, res)
	
			//TODO: process results

		} catch (e) {
			logger('Error checking', url, e.name, ':', e.message)
		}
	}

	static checkImageTxid = async(txid: string)=> NsfwTools.checkImageUrl(`https://arweave.net/${txid}`)

}





