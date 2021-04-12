require('dotenv').config() //first line of entrypoint
import { checkImage, checkImages } from './rating/clarifai-images'
import col from 'ansi-colors'
import { logger } from './utils/logger'
import { scanner } from './scanner/poller'
import { runner } from './rating/runner'
/* start http server */
// import './server'



const main = async()=> {
	try {
		scanner() //do not await

		// const res = await runner()
		
		
		console.log(col.green('finished main :-)'))
	} catch (e) {
		logger('Error in main!\t', e.name, ':', e.message)
	}
}
main()

