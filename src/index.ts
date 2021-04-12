require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { logger } from './utils/logger'
import { scanner } from './scanner/poller'
import { checkImage, checkImageTxid } from './rating/image-rating'


/* start http server */
// import './server'



const main = async()=> {
	try {
		// scanner() //do not await
		

		
		const txids: string[] = require('../tests/image-txids').default
		console.log(txids.length)

		// for (const txid of txids) {
		// 	await checkImageTxid(txid)
		// }

		await Promise.all(txids.map(txid => checkImageTxid(txid)))


		
		
		console.log(col.green('finished main :-)'))
	} catch (e) {
		logger('Error in main!\t', e.name, ':', e.message)
	}
}
main()

