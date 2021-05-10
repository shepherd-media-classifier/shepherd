require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { expect } from 'chai'
import { NsfwTools } from '../src/rating/image-rater'
import getDbConnection from '../src/utils/db-connection'
import { TxRecord } from '../src/types'
import { logger } from '../src/utils/logger'



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
	
	// 	it('tests rating single image/gif', async()=>{
	
	// 		try {
	
	// 			const txid = 'OIiLO3Y6YSCsqN2YLh2g-ZDh8RV3sGZi2jCRstaIaxQ' 
	
	// 			const res = await NsfwTools.checkGifTxid(txid)
	
	
	
	// 			console.log(col.green(JSON.stringify(res)))
	
	
	
	// 		} catch (e) {
	// 			console.log('CATCHING',e)
	// 			console.log(col.green('e.name:' + e.name))
	// 			console.log(col.green('e.message:' + e.message))
	// 		}
	// 		expect(true).to.be.true
	// 	}).timeout(60000)

	// it('tests rating all image/gif from db', async()=>{

	// 	const db = getDbConnection()

	// 	try {

	// 		let records = await db<TxRecord>('txs').where({content_type: 'image/gif'})
			
	// 		logger('test', records.length, 'total records found')

	// 		while(records.length > 0){
				
	// 			const batchLen = 10
	// 			let batch = records.splice(0, (records.length > batchLen ? batchLen : records.length ))
				

	// 			await Promise.all(batch.map( async (record) => {
	// 				console.log(record.txid, 'processing...')
	// 				return await NsfwTools.checkGifTxid(record.txid)
	// 			}))
				
	// 			logger('test', records.length, 'records left')
	// 		}


	// 		console.log(col.green(JSON.stringify(records.length)))



	// 	} catch (e) {
	// 		console.log('CATCHING',e)
	// 		console.log(col.green('e.name:' + e.name))
	// 		console.log(col.green('e.message:' + e.message))
	// 	}
	// 	expect(true).to.be.true
	// }).timeout(0)

	// it('tests new rating system for previously rated images', async()=>{

	// 	const db = getDbConnection()

	// 	try {

	// 		let records = await db<TxRecord>('txs')
	// 		.where({flagged: true})
	// 		.andWhere( function(){
				
	// 			this.orWhere({ content_type: 'image/jpeg'})
	// 			.orWhere({ content_type: 'image/png'})
	// 			.orWhere({ content_type: 'image/bmp'})
	// 		})
			
	// 		console.log('test', records.length, 'total flagged records found')
	// 		let unflagged = 0

	// 		for (let index = 0; index < records.length; index++) {
	// 			const r = records[index]

	// 			interface Score { name: string; value: number }

	// 			const scores: Score[] = [
	// 				{value: r.nsfw_drawings, name: 'drawings'},
	// 				{value: r.nsfw_hentai, name: 'hentai'},
	// 				{value: r.nsfw_neutral, name: 'neutral'},
	// 				{value: r.nsfw_porn, name: 'porn'},
	// 				{value: r.nsfw_sexy, name: 'sexy'},
	// 			]

	// 			const max = scores.reduce( (prev, current)=>{
	// 				return (prev.value > current.value) ? prev : current
	// 			})
				
	// 			switch (max.name) {
	// 				case 'porn':
	// 					case 'sexy':
	// 						// logger('test', 'https://arweave.net/'+r.txid+' ', max.name+' is max', JSON.stringify(scores))
	// 						break;
	// 					case 'hentai':
	// 						if(max.value > 0.6){
	// 							// logger('test', 'https://arweave.net/'+r.txid+' ', 'hentai is >0.6', JSON.stringify(scores))
	// 							break;
	// 						}
	// 						//else unflagged
						
	// 					default:
	// 					unflagged++
	// 					console.log('** NEW CLEAN **', 'https://arweave.net/'+r.txid+' ', JSON.stringify(scores))
	// 					break;
	// 			}
	// 		}


	// 		console.log(col.green('new unflagged records ' + unflagged))



	// 	} catch (e) {
	// 		console.log('CATCHING',e)
	// 		console.log(col.green('e.name:' + e.name))
	// 		console.log(col.green('e.message:' + e.message))
	// 	}
	// 	expect(true).to.be.true
	// }).timeout(0)

	// it('tests new rating system for previously unflagged images', async()=>{

	// 	const db = getDbConnection()

	// 	try {

	// 		let records = await db<TxRecord>('txs')
	// 		.where({flagged: false}).whereNotNull('nsfw_drawings')
	// 		.andWhere( function(){
				
	// 			this.orWhere({ content_type: 'image/jpeg'})
	// 			.orWhere({ content_type: 'image/png'})
	// 			.orWhere({ content_type: 'image/bmp'})
	// 		})
			
	// 		console.log('test', records.length, 'total unflagged records found')
	// 		let flagged = 0

	// 		for (let index = 0; index < records.length; index++) {
	// 			const r = records[index]

	// 			interface Score { name: string; value: number }

	// 			const scores: Score[] = [
	// 				{value: r.nsfw_drawings, name: 'drawings'},
	// 				{value: r.nsfw_hentai, name: 'hentai'},
	// 				{value: r.nsfw_neutral, name: 'neutral'},
	// 				{value: r.nsfw_porn, name: 'porn'},
	// 				{value: r.nsfw_sexy, name: 'sexy'},
	// 			]

	// 			const max = scores.reduce( (prev, current)=>{
	// 				return (prev.value > current.value) ? prev : current
	// 			})
				
	// 			switch (max.name) {
	// 				case 'porn':
	// 					case 'sexy':
	// 						flagged++
	// 						logger('test', 'https://arweave.net/'+r.txid+' ', max.name+' is max', JSON.stringify(scores))
	// 						break;
	// 					case 'hentai':
	// 						if(max.value > 0.6){
	// 							flagged++
	// 							logger('test', 'https://arweave.net/'+r.txid+' ', 'hentai is >0.6', JSON.stringify(scores))
	// 							break;
	// 						}
	// 						//else unflagged
						
	// 					default:
	// 					// console.log('** NEW CLEAN **', 'https://arweave.net/'+r.txid+' ', JSON.stringify(scores))
	// 					break;
	// 			}
	// 		}


	// 		console.log(col.green('newly flagged records ' + flagged))



	// 	} catch (e) {
	// 		console.log('CATCHING',e)
	// 		console.log(col.green('e.name:' + e.name))
	// 		console.log(col.green('e.message:' + e.message))
	// 	}
	// 	expect(true).to.be.true
	// }).timeout(0)

	it('tests new rating system for previously unflagged gifs', async()=>{

		const db = getDbConnection()

		try {

			let records = await db<TxRecord>('txs').where({content_type: 'image/gif'})
			
			console.log('test', records.length, 'gif records found')

			const BATCH = 10

			while(records.length > 0){
				let gifs = records.splice(0, Math.min(records.length, BATCH))

				await Promise.all(gifs.map( async(gif)=> {

					//store current flagged
					const original = gif.flagged
					//run new algo
					await NsfwTools.checkGifTxid(gif.txid)
					//retrieve new value
					const newRecord = await db<TxRecord>('txs').where({id: gif.id})
					const newValue = newRecord[0].flagged

					if(original !== newValue){
						logger('**** TEST ****', 'changed flag to', newValue, 
						`for https://arweave.net/${gif.txid}`)
					}
				}))
			}

		} catch (e) {
			console.log('CATCHING',e)
			console.log(col.green('e.name:' + e.name))
			console.log(col.green('e.message:' + e.message))
		}
		expect(true).to.be.true
	}).timeout(0)

})



