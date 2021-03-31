require('dotenv').config() //first line of entrypoint
import { checkImage, checkImages } from './clarifai'
import col from 'ansi-colors'
import { getIds } from './scanner'
import { logger } from './utils/logger'
import dbConnection from './utils/db-connection'
import { StateRecord } from './types'
/* start http server */
// import './server'


const main = async()=> {
	try {
		const db = dbConnection()
		let position = await db<StateRecord>('states').where({pname: 'scanner_position'})

		let min = position[0].blocknumber
		let max = min + 10000
		let keepGoing = true
		while(keepGoing){
			const res = await getIds(min, max)
			logger('images', res.images.length)
			logger('videos', res.videos.length)
			logger('other', res.textsAndUnsupported.length)

			logger('scanner_position', max)
			min += 10000
			max += 10000

			if((res.images.length + res.videos.length + res.textsAndUnsupported.length) > 0){
				keepGoing = false
			}
		}
		/**
		 * API Restrictions
		 * - 128 is the maximum number of images that can be sent at once
		 * - Each image should be less than 20MB
		 * - Format restrictions: https://docs.clarifai.com/api-guide/data/supported-formats
		 * 
		 */

	
		// let r1 = await checkImage(txids[0])
		// logger(r1)
	
		// let r2 = await checkImages(txids)
		// logger(r2)
		
		console.log(col.green('finished :-)'))

	} catch (e) {
		logger('Error in main!\t', e.name, ':', e.message)
	}
}
main()

