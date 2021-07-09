require('dotenv').config() //first line of entrypoint
import col from 'ansi-colors'
import { expect } from 'chai'
import { checkFrames } from '../src/rating/video/check-frames'
import { createScreencaps } from '../src/rating/video/screencaps'
import { checkInFlightVids, VidDownloadRecord, videoDownload } from '../src/rating/video/video-prepare'
import { TxRecord } from '../src/types'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
	const smallvid2: VidDownloadRecord = {
		complete: 'FALSE',
		content_size: 597283,
		txid: '9rE8vXMG2T702EVMxomVBCUKvRBzeZPiCUpgryr60Eo',
		content_type: 'video/mp4',
	}
	
	//@ts-ignore
	const nodata: VidDownloadRecord = {
		complete: 'FALSE',
		content_size: 14343687,
		txid: 'mKtVp1UVE7TScGBoGrZ8Qi741v2G06a-An8baaceY2M', //no data (it's actually a missing image)
	}

	//@ts-ignore
	const notvid: VidDownloadRecord = {
		complete: 'FALSE',
		content_size: 419080,
		txid: 'rbm6bKvIKhuui9wATaySbLDuRUKq1KLb8qmaihNpsbU', // an image file
	}

	// it('videoDownload: downloads a video (smallvid)', async()=> {
	// 	const res = await videoDownload(smallvid)
	// 	expect(res).to.be.true
	// }).timeout(0)

	// it('videoDownload: times out when no first byte', async()=> {
	// 	try {
	// 		const x = await videoDownload(nodata) 
	// 	} catch (e) {
	// 		expect(e.message).to.equal('aborted')//`Timeout of ${NO_STREAM_TIMEOUT}ms exceeded`)
	// 	}
	// }).timeout(0)

	// it('videoDownload: incorrect file-type can be detected & download aborted', async()=> {
	// 	try {
	// 		const x = await videoDownload(notvid) 
	// 	} catch (e) {
	// 		expect(e.message).to.equal('aborted')
	// 	}
	// }).timeout(0)
	
	// it('createScreencaps: create screencaps from "smallvid" video test', async()=> {
	// 	/**
	// 	 * this is using the downloaded file written from the first test
	// 	 */
	// 	const frames = await createScreencaps(smallvid.txid) 
	// 	expect(frames.length).equal(3)
	// }).timeout(0)

	// it('checkFrames: check screencaps for nsfw content', async()=> {
	// 	/**
	// 	 * this is using the screencap files written during the previous test
	// 	 */
	// 	const frames = await createScreencaps(smallvid.txid) 
	// 	const res = await checkFrames(frames, smallvid.txid) 
	// 	expect(res).to.exist
	// 	if(res){ expect(res[0].txid).equal('oROdHYx2xAhp8vMMrARMqgQQcJ8bpxQHl_-nAYIf1kg') }
	// }).timeout(0)
	
	// 	it('checkInFlightVids: for one call', async()=>{
	// 		const keepgoing = await checkInFlightVids(smallvid2)
	// 		expect(keepgoing).true
	// 		//wait for and test completed download
	// 		let count = 10
	// 		while((smallvid2.complete !== 'TRUE') && count--){
	// 			await sleep(1000)
	// 		}
	// 		expect(smallvid.complete).to.eq('TRUE')
	// 	}).timeout(0)
	
	it('checkInflightVids: call in a loop', async()=> {
		const vids: Partial<TxRecord>[] = [
			{ txid: 'mCTQ5tFinF-MEk3GuurkdnyS8kF1SZN4Le35Ph29_fM', content_type: 'video/mp4', content_size: 5186 },
			{ txid: 'p6bDSRfcFw_diGsipJXv33Xr9ZvBDwlgtcIrZEEFXTU', content_type: 'video/mp4', content_size: 5254 },
			{ txid: '-Fskzr13zaTWUt4hMaIbi798H8uGkPITd4De_ohcKag', content_type: 'video/mp4', content_size: 7117 },
			{ txid: 'nSX3Qaz-r1NF2dJ4Xh-pMrD6VNt_5wmtu6AgezO3h9U', content_type: 'video/mp4', content_size: 10108 },
			{ txid: '4OCrYht6DFl1Bw4H0wmim_Afi24ACAtYTcFHiBZJ7wY', content_type: 'video/mp4', content_size: 15331 },
			{ txid: 'FeMssuZJmJ089l7_FLWwRrGEEfN8He3zHb_8E67kHFs', content_type: 'video/mp4', content_size: 16231 },
			{ txid: 'AiZ_VQjjmcl5JTG1D7U-MXosXtM1c9EfMk8e_vsunmI', content_type: 'video/mp4', content_size: 16231 },
			{ txid: '2Kqid0BQk9-nfMniOWoo9xgMDHtjNi3yrsFOj1JEhlk', content_type: 'video/mp4', content_size: 16498 },
			{ txid: 'uk_eY9lpXARei891WxLo8kaK2OVudBq1h8MVKIoGa8A', content_type: 'video/mp4', content_size: 17664 },
			{ txid: '2k1GzAM4KAiDPebpZOo-F8PyP45e1NJVU-LaB5RAKy4', content_type: 'video/mp4', content_size: 17912 },
			{ txid: 'elPSdJAfHJeC98gmSNKOSDcC7vQbgeoIcElSg2E8FHE', content_type: 'video/mp4', content_size: 17912 },
			{ txid: '5ptIH1GrUYrgzrrwCf-mVE8aWMGbiZ4vt9z4VcMYaNA', content_type: 'video/mp4', content_size: 16498 },
		]
		let keepgoing = true
		while(keepgoing){
			for (const vid of vids) {
				keepgoing = await checkInFlightVids(vid as TxRecord) 
				await sleep(500)
			}
		}
	}).timeout(0)

	

})