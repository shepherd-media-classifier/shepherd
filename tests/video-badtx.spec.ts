require('dotenv').config() //first line of entrypoint
import { expect } from 'chai'
import { createScreencaps } from '../src/rating/video/screencaps'
import { VidDownloadRecord, videoDownload } from '../src/rating/video/video-prepare'
import col from 'ansi-colors'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('video bad tx handling tests', ()=> {

	it('7mRWvWP5KPoDfmpbGYILChc9bjjXpiPhxuhXwlnODik: ffmpeg (ffprobe) corrupt data found', async()=>{
		//@ts-ignore
		const badData: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 262144,
			txid: '7mRWvWP5KPoDfmpbGYILChc9bjjXpiPhxuhXwlnODik', // corrupt video data
		}
		try{
			const res = await videoDownload(badData)
			while(badData.complete === 'FALSE'){ await sleep(500) }
			if(badData.complete === 'ERROR') throw new Error(badData.txid + ' download failed')
			//we're expecting an ffmpeg error in createScreencaps
			const frames = await createScreencaps(badData.txid) 
		}catch(e){
			expect(e.message).eq('corrupt video data')
		}
	}).timeout(0)

	it('2Q5OE8QdmneyEnOMuxTlv04Q7PFezfSDXtaFqjI93CM: ffmpeg fell over creating screencaps', async()=>{
		//@ts-ignore
		const badData: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 262144,
			// txid: 'nSX3Qaz-r1NF2dJ4Xh-pMrD6VNt_5wmtu6AgezO3h9U', //good tx
			txid: '2Q5OE8QdmneyEnOMuxTlv04Q7PFezfSDXtaFqjI93CM', //partial file
		}
		try{
			const res = await videoDownload(badData)
			while(badData.complete === 'FALSE'){ await sleep(500) }
			if(badData.complete === 'ERROR') throw new Error(badData.txid + ' download failed')
			//we're expecting an ffmpeg error in createScreencaps
			const frames = await createScreencaps(badData.txid) 
		}catch(e){
			expect(e.code).eq(69 || 1)
		}
	}).timeout(0)

})