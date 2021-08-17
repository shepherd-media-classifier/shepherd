import { RatingResult, RatingPluginInterface } from '../RatingPluginInterface'

import { logger } from '../utils/logger'

import getDbConnection from '../utils/db-connection'
import type { TxRecord } from '../types'
import { HOST_URL, imageTypes, NO_DATA_TIMEOUT } from '../constants'
import { axiosDataTimeout } from '../utils/axiosDataTimeout'
import { dbCorruptDataConfirmed, dbCorruptDataMaybe, dbNoDataFound404, dbNoMimeType, dbOversizedPngFound, dbPartialDataFound, dbTimeoutInBatch, dbWrongMimeType, updateDb } from './db-update-txs'
import { checkImageMime, getImageMime } from './image-filetype'

import RaterPlugin from '../NsfwjsPlugin'


const prefix = 'image-rating'

const db = getDbConnection()

export const init = RaterPlugin.init

export const checkImage = RaterPlugin.checkImage

export const checkImageTxid = async(txid: string, contentType: string)=> {

	/* handle all downloading & mimetype problems before sending to RaterPlugin */

	const url = `${HOST_URL}/${txid}`
	
	try {

		const pic = await axiosDataTimeout(url) //catch errors below

		const mime = await getImageMime(pic)
		if(mime === undefined){
			logger(prefix, 'image mime-type found to be `undefined`. omitting from rating. Original:', contentType, txid)
			await dbNoMimeType(txid)
			return true
		}else if(!mime.startsWith('image/')){
			logger(prefix, `image mime-type found to be '${mime}'. updating record; will be automatically requeued. Original:`, contentType, txid)
			await dbWrongMimeType(txid, mime)
			return true
		}

		const results = await RaterPlugin.checkImage(pic, mime, txid)

		//TODO: remove this NsfwjsPlugin specific code later
		let scores: {nsfw_hentai?: number, nsfw_porn?: number, nsfw_sexy?: number, nsfw_neutral?: number, nsfw_drawings?: number } = {}
		if(results.scores){
			let s = JSON.parse(results.scores)
			// some rough type checking
			if('nsfw_hentai' in s || 'nsfw_porn' in s || 'nsfw_sexy' in s || 'nsfw_neutral' in s || 'nsfw_drawings' in s ){
				scores = s
			}
		}

		await updateDb(txid, {
			flagged: results.flagged,
			valid_data: results.valid_data,
			data_reason: results.data_reason,

			//TODO: replace this specific NsfwjsPlugin score data in the DB
			...(true && scores), //use some spread trickery to add non-null (or zero value) keys

			last_update_date: new Date(),
		})
		return true;
	} catch (e) {

		/* catch network issues & no data situations */

		if(e.response && e.response.status === 404){
			logger(prefix, 'no data found (404)', contentType, url)
			await dbNoDataFound404(txid)
			return true;
		}
		
		else if(
			(e.message === `Timeout of ${NO_DATA_TIMEOUT}ms exceeded`)
			// || (!e.response && e.code && e.code === 'ECONNRESET')
		){
			logger(prefix, 'connection timed out. check again later', contentType, url)
			await dbTimeoutInBatch(txid)
		}
		
		else if(
			( e.response && e.response.status && [500,504].includes(Number(e.response.status)) )
			// || (e.response && e.code && e.code === 'ECONNRESET')
		){
			// error in the gateway somewhere, not important to us
			logger(txid, e.message, 'image will automatically retry downloading') //do nothing, record remains in unprocessed queue
		}
		
		else{
			logger(prefix, 'UNHANDLED Error processing', url + ' ', e.name, ':', e.message)
			// logger(prefix, 'UNHANDLED', e)
			throw e
		}
		return false;
	}
}





