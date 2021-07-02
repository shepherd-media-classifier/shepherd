require('dotenv').config() //first line of entrypoint
import { logger } from '../utils/logger'
import { rater } from './rating-queues'

const prefix = 'rating'


const main = async()=> {
	try {
		
		rater() 

	} catch (e) {
		logger(prefix, 'Unhandled error in main!\t', e.name, ':', e.message)
	}
}
main()