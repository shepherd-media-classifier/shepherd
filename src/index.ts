require('dotenv').config() //first line of entrypoint
import { checkImage, checkImages } from './clarifai'
import col from 'ansi-colors'
import { getIds } from './scanner'
import { logger } from './utils/logger'
import dbConnection from './utils/db-connection'
import { StateRecord } from './types'
import axios from 'axios'
/* start http server */
// import './server'

const TRAIL_BEHIND = 15

const main = async()=> {
	try {
		const db = dbConnection()
		let position = await db<StateRecord>('states').where({pname: 'scanner_position'})

		const numOfBlocks = 50

		let min = position[0].blocknumber + 1
		let max = min + numOfBlocks - 1
		let topBlock = 0

		while(true){

			// wait until we have enough blocks ahead
			if(max + TRAIL_BEHIND >= topBlock){
				topBlock = await pollForNewBlock(max + TRAIL_BEHIND)
			}

			const res = await getIds(min, max)
			logger('images', res.images.length)
			logger('videos', res.videos.length)
			logger('other', res.textsAndUnsupported.length)

			logger('scanner_position', max)
			min += numOfBlocks
			max += numOfBlocks 


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

const topBlock = async () => Number((await axios.get('https://arweave.net/info')).data.height)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const pollForNewBlock =  async (height: number) => {

	while(true){

		let h = await topBlock()
		console.log('polling height', h)
		if(h >= height){
			return h;
		}
		await sleep(30000)
	}
}