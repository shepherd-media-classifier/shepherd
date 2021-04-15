require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { logger } from './utils/logger'
import { scanner } from './scanner/poller'
import { NsfwTools } from './rating/image-rating'
import { rater } from './rating/rating'


/* start http server */
// import './server'



const main = async()=> {
	try {
		scanner() //do not await
		rater() 
		
		
		// const rawids: string[] = require('../tests/image-txids').default
		// const txids = rawids.slice(1,2)
		// console.log(txids.length)

		// await NsfwTools.loadModel()
		
		// NsfwTools.checkImageTxid('xswu7ZO5BL-hHTkI_K6Fn6RHKxuK9W8Ijvm-j25Bj4k')

		// await Promise.all(txids.map(txid => NsfwTools.checkImageTxid(txid)))



		
		
		console.log(col.green('finished main :-)'))
	} catch (e) {
		logger('Error in main!\t', e.name, ':', e.message)
	}
}
main()

