require('dotenv').config() //first line of entrypoint
import { expect } from 'chai'
import { createScreencaps } from '../src/rating/video/screencaps'
import { addToDownloads, videoDownload } from '../src/rating/video/downloader'
import col from 'ansi-colors'
import { VidDownloadRecord } from '../src/rating/video/VidDownloads'

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
			expect(e.message).eq('Invalid data found when processing input')
		}
	}).timeout(0)

	it('SxP57BAAiZB0WEipA0_LtyQJ0SY51DwI4vE4N03ykJ0: expect error 404', async()=>{
		//@ts-ignore
		const badData: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 0,
			txid: 'SxP57BAAiZB0WEipA0_LtyQJ0SY51DwI4vE4N03ykJ0', // error 404
		}
		try{
			const res = await videoDownload(badData)
		}catch(e){
			expect(e.message).eq('Request failed with status code 404')
		}
	}).timeout(0)

})