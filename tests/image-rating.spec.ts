require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { expect } from 'chai'
import { NsfwTools } from '../src/rating/image-rating'
import getDbConnection from '../src/utils/db-connection'
import { TxRecord } from '../src/types'



describe('image-rating ad-hoc tests', ()=> {

	before( async()=>{

		await NsfwTools.loadModel()

	})

	

	// it('tests handling TF bad data error when Content-Type is image/png', async()=>{
	// 	try {
	// 		const txidBadPng = 'https://arweave.net/DFzY841LjCmoEZ0ou4V5uFoorOcEvANQzAMi-CA93lA'
	// 		const res = await NsfwTools.checkImageUrl(txidBadPng)

	// 		console.log(col.green(JSON.stringify(res)))

	// 		expect(res).throw('Invalid TF_Status: 3\nMessage: Invalid PNG data')

	// 	} catch (e) {
	// 		console.log('CATCHING',e)
	// 		console.log(col.green('e.name:' + e.name))
	// 		console.log(col.green('e.message:' + e.message))
	// 	}
	// 	expect(true).to.be.true
	// })

	// it('tests handling TF bad data error when Content-Type is image/png', async()=>{
	// 	try {
	// 		const txidBadPng = 'DFzY841LjCmoEZ0ou4V5uFoorOcEvANQzAMi-CA93lA'
	// 		const res = await NsfwTools.checkImageTxid(txidBadPng, 'image/png')

	// 		console.log(col.green(JSON.stringify(res)))

			

	// 	} catch (e) {
	// 		console.log('CATCHING',e)
	// 		console.log(col.green('e.name:' + e.name))
	// 		console.log(col.green('e.message:' + e.message))
	// 	}
	// 	expect(true).to.be.true
	// })

	// it('tests handling bad content length when Content-Type is image/png', async()=>{
	// 	try {
	// 		const txidBadPng = 'mKtVp1UVE7TScGBoGrZ8Qi741v2G06a-An8baaceY2M' 
	// 		const res = await NsfwTools.checkImageTxid(txidBadPng, 'image/png')

	// 		console.log(col.green(JSON.stringify(res)))



	// 	} catch (e) {
	// 		console.log('CATCHING',e)
	// 		console.log(col.green('e.name:' + e.name))
	// 		console.log(col.green('e.message:' + e.message))
	// 	}
	// 	expect(true).to.be.true
	// }).timeout(60000)
	
		it('tests rating single image/gif', async()=>{
	
			try {
	
				const txid = 'OIiLO3Y6YSCsqN2YLh2g-ZDh8RV3sGZi2jCRstaIaxQ' 
	
				const res = await NsfwTools.checkGifTxid(txid)
	
	
	
				console.log(col.green(JSON.stringify(res)))
	
	
	
			} catch (e) {
				console.log('CATCHING',e)
				console.log(col.green('e.name:' + e.name))
				console.log(col.green('e.message:' + e.message))
			}
			expect(true).to.be.true
		}).timeout(60000)

	it('tests rating all image/gif from db', async()=>{

		const db = getDbConnection()

		try {

			let records = await db<TxRecord>('txs').where({content_type: 'image/gif'})

			for (const record of records) {
				const res = await NsfwTools.checkGifTxid(record.txid)
				
			}



			console.log(col.green(JSON.stringify(records.length)))



		} catch (e) {
			console.log('CATCHING',e)
			console.log(col.green('e.name:' + e.name))
			console.log(col.green('e.message:' + e.message))
		}
		expect(true).to.be.true
	}).timeout(60000)

})