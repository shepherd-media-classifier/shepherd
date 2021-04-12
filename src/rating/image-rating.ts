import { logger } from '../utils/logger'
import axios from 'axios'

import * as tf from '@tensorflow/tfjs-node'
import * as nsfw from 'nsfwjs'

let _model: nsfw.NSFWJS
const cachedModel = async()=> {
	if(_model){
		return _model
	}
	return await nsfw.load('file://src/model/', {size: 299}) 
}

export const checkImage = async(pic: Buffer)=> {

	const model = await cachedModel()

	const image = tf.node.decodeImage(pic,3) as tf.Tensor3D
	
	const predictions = await model.classify(image)
	image.dispose() // explicit TensorFlow memory management

	return predictions
}


export const checkImageTxid = async(txid: string)=> {
	try {

		const url = `https://arweave.net/${txid}`
		const pic = await axios.get(url, {
			responseType: 'arraybuffer',
		})
		
		const res = await checkImage(pic.data)

		console.log(url, res)

		
	} catch (e) {
		logger('Error checking', txid, e.name, ':', e.message)
	}
}