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

const getTopBlock = async () => Number((await axios.get('https://arweave.net/info')).data.height)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const waitForNewBlock =  async (height: number) => {
	while(true){
		let h = await getTopBlock()
		console.log('polling height', h)
		if(h >= height){
			return h; //stop waiting
		}
		await sleep(30000)
	}
}

const main = async()=> {
	try {
		/**
		 * numOfBlocks - to scan at once
		 * very rough guide:
		 * early weave this should be high: ~1000
		 * mid weave about 100?
		 * above ~400,000 <=> 657796: 50 appears optimal
		 * keep pace once at the top: 1
		 */
		const db = dbConnection()
		let position = (await db<StateRecord>('states').where({pname: 'scanner_position'}))[0].blocknumber
		let height = await getTopBlock()
		const initialHeight = height // we do not want to keep calling getTopBlock during initial catch up phase

		const calcBulkBlocks = (position: number) => {
			if(position < 150000) return 1000
			if(position < 400000) return 100
			return 50
		}
		
		let numOfBlocks = calcBulkBlocks(position)

		let min = position + 1
		let max = min + numOfBlocks - 1
		let topBlock = 0

		while(true){

			if((initialHeight - position) > 50){
				logger('calcBulkBlocks(position)')
				numOfBlocks = calcBulkBlocks(position)
			} else if(max + TRAIL_BEHIND >= topBlock){ // wait until we have enough blocks ahead
				logger('wait for new block')
				numOfBlocks = 1
				topBlock = await waitForNewBlock(max + TRAIL_BEHIND)
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

