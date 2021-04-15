require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { logger } from './utils/logger'
import { scanner } from './scanner/poller'
import { rater } from './rating/rating'


/* start http server */
import './server/server'



const main = async()=> {
	try {
		scanner() //do not await
		rater() 

		

		console.log(col.green('finished main :-)'))
	} catch (e) {
		logger('Error in main!\t', e.name, ':', e.message)
	}
}
main()

