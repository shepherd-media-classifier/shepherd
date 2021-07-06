require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { expect } from 'chai'
import { checkVid, VidDownloadRecord, videoDownload } from '../src/rating/video/video-prepare'

describe('video-prepare tests', ()=> {

	/* Set up some test data */

	//@ts-ignore
	const smallvid: VidDownloadRecord = {
		complete: 'FALSE',
		content_size: 1053651,
		txid: 'oROdHYx2xAhp8vMMrARMqgQQcJ8bpxQHl_-nAYIf1kg',
		content_type: 'video/mp4',
	}
	
	//@ts-ignore
	const nodata: VidDownloadRecord = {
		complete: 'FALSE',
		content_size: 123456,
		txid: 'mKtVp1UVE7TScGBoGrZ8Qi741v2G06a-An8baaceY2M', //no data (it's actually a missing image)
	}

	//@ts-ignore
	const notvid: VidDownloadRecord = {
		complete: 'FALSE',
		content_size: 419080,
		txid: 'rbm6bKvIKhuui9wATaySbLDuRUKq1KLb8qmaihNpsbU', // an image file
	}


	it('videoDownload: downloads a video', async()=> {
		const res = await videoDownload(smallvid)

		expect(res).to.be.true
	}).timeout(0)

	it('videoDownload: times out when no first byte', async()=> {
		try {
			const x = await videoDownload(nodata) 
			
		} catch (e) {
			expect(e.message).to.equal('aborted')//`Timeout of ${NO_STREAM_TIMEOUT}ms exceeded`)
		}
	}).timeout(0)

	it('videoDownload: incorrect file-type can be detected & download aborted', async()=> {
		try {
			const x = await videoDownload(notvid) 
			
		} catch (e) {
			expect(e.message).to.equal('aborted')
		}
	}).timeout(0)

	it('checkVid: for one call', async()=>{
		try{
			await checkVid(smallvid)
			expect(smallvid.complete).to.equal('TRUE')
		}catch(e){
			console.log('this is not suppose to happen')
			throw e
		}
	}).timeout(0)

	it('videoDownload: incorrect file-type can be detected & download aborted', async()=> {
		try {
			const x = await checkVid(notvid) 
			
		} catch (e) {
			expect(e.message).to.equal('aborted')
		}
	}).timeout(0)

})