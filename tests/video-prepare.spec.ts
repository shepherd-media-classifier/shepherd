require('dotenv').config() //first line of entrypoint
import { expect } from 'chai'
import { checkFrames } from '../src/rating/video/check-frames'
import { createScreencaps } from '../src/rating/video/screencaps'
import { processVids } from '../src/rating/video/process-files'
import { TxRecord } from '../src/types'
import col from 'ansi-colors'
import { VidDownloadRecord, VidDownloads } from '../src/rating/video/VidDownloads'
import { addToDownloads, videoDownload } from '../src/rating/video/downloader'
import rimraf from 'rimraf'
import { exec } from 'shelljs'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('video-prepare tests', ()=> {

	before(()=>{
		rimraf('temp-screencaps/./*', (e)=>e&&console.log('error in before cleaning tempdir'))
	})

	afterEach(()=>{
		rimraf('temp-screencaps/./*', (e)=>e&&console.log('error in afterEach cleaning tempdir'))
	})

	it('1. videoDownload: downloads a video', async()=> {
		//@ts-ignore
		const smallvid: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 1053651,
			txid: 'nSX3Qaz-r1NF2dJ4Xh-pMrD6VNt_5wmtu6AgezO3h9U',
			content_type: 'video/mp4',
		}
		const res = await videoDownload(smallvid)
		while(smallvid.complete === 'FALSE') await sleep(500)
		expect(res).to.be.true
	}).timeout(0)

	it('2. videoDownload: times out when no first byte', async()=> {
		//@ts-ignore
		const nodata: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 14343687,
			txid: 'mKtVp1UVE7TScGBoGrZ8Qi741v2G06a-An8baaceY2M', //no data (it's actually a missing image)
		}
		try {
			const x = await videoDownload(nodata) 
		} catch (e) {
			expect(e.message).to.equal('aborted')//`Timeout of ${NO_STREAM_TIMEOUT}ms exceeded`)
		}
	}).timeout(0)

	it('3. videoDownload: incorrect file-type can be detected & download aborted', async()=> {
		//@ts-ignore
		const notvid: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 419080,
			txid: 'rbm6bKvIKhuui9wATaySbLDuRUKq1KLb8qmaihNpsbU', // an image file
		}
		try {
			const x = await videoDownload(notvid) 
		} catch (e) {
			expect(e.message).to.equal('aborted')
		}
	}).timeout(0)
	
	it('4. createScreencaps: create screencaps from video', async()=> {
		//@ts-ignore
		const vid: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 1053651,
			txid: 'MudCCqbbf--ktx1b0EMrhSdNWP3ZT9XnMJP-oC486cM',
			content_type: 'video/mp4',
		}
		//exec(`ffplay https://arweave.net/${vid.txid}`)
		await videoDownload(vid)
		while(vid.complete !== 'TRUE') await sleep(500)
		const frames = await createScreencaps(vid.txid) 
		expect(frames.length).greaterThan(1)
	}).timeout(0)

	it('5. checkFrames: check screencaps for nsfw content', async()=> {
		//@ts-ignore
		const vid: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 1053651,
			txid: 'Uq1EEdlNvM-rjqerjPHhPMv3oBAHu9DysIjQNq0YTdk',
			content_type: 'video/mp4',
		}
		await videoDownload(vid)
		while(vid.complete === 'FALSE') await sleep(500)
		const frames = await createScreencaps(vid.txid) 
		const res = await checkFrames(frames, vid.txid) 
		expect(res).to.exist
		if(res){ expect(res[0].txid).equal(vid.txid) }
	}).timeout(0)
	
	it('6. full processing of a video', async()=>{
		//@ts-ignore
		const vid: TxRecord = {
			content_size: 597283,
			content_type: 'video/mp4',
			txid: '5ptIH1GrUYrgzrrwCf-mVE8aWMGbiZ4vt9z4VcMYaNA',//'9rE8vXMG2T702EVMxomVBCUKvRBzeZPiCUpgryr60Eo',
		}
		await addToDownloads(vid)
		//@ts-ignore
		let dl: VidDownloadRecord = {}
		for (const d of VidDownloads.getInstance()){
			if(d.txid === vid.txid) dl = d;
		}
		while(dl.complete === 'FALSE') await sleep(500)
		expect(dl.complete).to.eq('TRUE')
		await processVids()
		expect(VidDownloads.getInstance().length()).eq(0)
		
	}).timeout(0)
	

	

})