require('dotenv').config() //first line of entrypoint
import { logger } from '../utils/logger'
import { rater } from './rating-queues'

const prefix = 'rating'


const ratingMain = async()=> {
	try {
		
		rater() 




	} catch (e) {
		logger(prefix, 'Error in ratingMain!\t', e.name, ':', e.message)
	}
}
ratingMain()