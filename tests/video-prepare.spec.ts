require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { expect } from 'chai'
import { NO_STREAM_TIMEOUT } from '../src/constants'
import { videoDownload } from '../src/rating/video-prepare'

describe('video-prepare test', ()=> {

	it('tests that a video gets downloaded', async()=> {
		const txid = '8CZAB0pTMsf-QVaIsYruoTssO6KxMOsQRtE2BFDtumM' //small video

		const res = await videoDownload(txid)

		expect(res).to.be.true
	}).timeout(0)

	it('tests that video download times out when no first byte', async()=> {
		const txid = 'mKtVp1UVE7TScGBoGrZ8Qi741v2G06a-An8baaceY2M' //no data (it's actually a missing image)

		try {
			const x = await videoDownload(txid) 
			
		} catch (e) {
			expect(e.message).to.equal('aborted')//`Timeout of ${NO_STREAM_TIMEOUT}ms exceeded`)
		}
	}).timeout(0)

	it('tests that incorrect file-type can be detected & download aborted', async()=> {
		const txid = 'rbm6bKvIKhuui9wATaySbLDuRUKq1KLb8qmaihNpsbU' // an image file
		try {
			const x = await videoDownload(txid) 
			
		} catch (e) {
			expect(e.message).to.equal('aborted')
		}

	})


})