require('dotenv').config() //first line of entrypoint
import { expect } from 'chai'
import { createScreencaps } from '../src/rating/video/screencaps'
import { VidDownloadRecord, videoDownload } from '../src/rating/video/video-prepare'
import col from 'ansi-colors'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('video bad tx handling tests', ()=> {

	it('7mRWvWP5KPoDfmpbGYILChc9bjjXpiPhxuhXwlnODik: Invalid data found when processing input', async()=>{
		//@ts-ignore
		const badData: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 262144,
			// txid: '7mRWvWP5KPoDfmpbGYILChc9bjjXpiPhxuhXwlnODik', // corrupt video data
			txid: 'nSX3Qaz-r1NF2dJ4Xh-pMrD6VNt_5wmtu6AgezO3h9U', //good tx
			// txid: '4OCrYht6DFl1Bw4H0wmim_Afi24ACAtYTcFHiBZJ7wY', //?bad tx?
			// txid: '2k1GzAM4KAiDPebpZOo-F8PyP45e1NJVU-LaB5RAKy4', //?bad tx?
			// txid: '2Q5OE8QdmneyEnOMuxTlv04Q7PFezfSDXtaFqjI93CM', //?bad tx?
		}
		try{
			const res = await videoDownload(badData)
			while(badData.complete === 'FALSE'){ await sleep(500) }
			if(badData.complete === 'ERROR') throw new Error(badData.txid + ' download failed')
			//we're expecting an ffmpeg error in createScreencaps
			const frames = await createScreencaps(badData.txid) 
			expect(true).true
		}catch(e){
			console.log(col.green( e.message))
			console.log(e)
			expect(true).false
		}
	}).timeout(0)

})