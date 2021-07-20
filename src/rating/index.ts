require('dotenv').config() //first line of entrypoint
import rimraf from 'rimraf'
import { VID_TMPDIR } from '../constants'
import { logger } from '../utils/logger'
import { rater } from './rating-queues'

const prefix = 'rating'


const main = async()=> {
	try {

		//clean up tempdir from previous run
		rimraf(VID_TMPDIR + '*', (e)=>e && logger(prefix, 'error: could not clean', VID_TMPDIR))
		
		rater() 

	} catch (e) {
		logger(prefix, 'Unhandled error in main!\t', e.name, ':', e.message)
	}
}
main()