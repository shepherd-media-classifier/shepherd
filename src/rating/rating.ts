require('dotenv').config() //first line of entrypoint
import { logger } from '../utils/logger'
import { imageRater } from './rating-images'

const prefix = 'rating'


const rater = async()=> {
	try {
		
		imageRater() 




	} catch (e) {
		logger(prefix, 'Error in rater!\t', e.name, ':', e.message)
	}
}
rater()