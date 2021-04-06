require('dotenv').config() //first line of entrypoint
import { checkImage, checkImages } from './rating/clarifai'
import col from 'ansi-colors'
import { logger } from './utils/logger'
import { scanner } from './scanner/poller'
/* start http server */
// import './server'



const main = async()=> {
	try {
		scanner() //do not await

		
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
		
		console.log(col.green('finished main :-)'))

	} catch (e) {
		logger('Error in main!\t', e.name, ':', e.message)
	}
}
main()

