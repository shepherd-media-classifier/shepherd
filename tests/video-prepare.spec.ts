require('dotenv').config() //first line of entrypoint
import { expect } from 'chai'
import { checkFrames } from '../src/rating/video/check-frames'
import { createScreencaps } from '../src/rating/video/screencaps'
import { checkInFlightVids, VidDownloadRecord, videoDownload } from '../src/rating/video/video-prepare'
import { TxRecord } from '../src/types'
import col from 'ansi-colors'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('video-prepare tests', ()=> {

	/* Set up some test data */

	const smalltx = 'nSX3Qaz-r1NF2dJ4Xh-pMrD6VNt_5wmtu6AgezO3h9U'// 'oROdHYx2xAhp8vMMrARMqgQQcJ8bpxQHl_-nAYIf1kg'
	
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

	it('1. videoDownload: downloads a video (smallvid)', async()=> {
		//@ts-ignore
		const smallvid: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 1053651,
			txid: smalltx,
			content_type: 'video/mp4',
		}
		const res = await videoDownload(smallvid)
		while(smallvid.complete === 'FALSE') await sleep(500)
		expect(res).to.be.true
	}).timeout(0)

	it('2. videoDownload: times out when no first byte', async()=> {
		try {
			const x = await videoDownload(nodata) 
		} catch (e) {
			expect(e.message).to.equal('aborted')//`Timeout of ${NO_STREAM_TIMEOUT}ms exceeded`)
		}
	}).timeout(0)

	it('3. videoDownload: incorrect file-type can be detected & download aborted', async()=> {
		try {
			const x = await videoDownload(notvid) 
		} catch (e) {
			expect(e.message).to.equal('aborted')
		}
	}).timeout(0)
	
	it('4. createScreencaps: create screencaps from "smallvid" video test', async()=> {
		//@ts-ignore
		const smallvid: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 1053651,
			txid: smalltx,
			content_type: 'video/mp4',
		}
		await videoDownload(smallvid)
		while(smallvid.complete !== 'TRUE') await sleep(500)
		const frames = await createScreencaps(smallvid.txid) 
		expect(frames.length).equal(2)
	}).timeout(0)

	it('5. checkFrames: check screencaps for nsfw content', async()=> {
		//@ts-ignore
		const smallvid: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 1053651,
			txid: smalltx,
			content_type: 'video/mp4',
		}
		await videoDownload(smallvid)
		while(smallvid.complete === 'FALSE') await sleep(500)
		const frames = await createScreencaps(smallvid.txid) 
		const res = await checkFrames(frames, smallvid.txid) 
		expect(res).to.exist
		if(res){ expect(res[0].txid).equal(smalltx) }
	}).timeout(0)
	
	it('6. checkInFlightVids: for one call', async()=>{
		//@ts-ignore
		const smallvid2: VidDownloadRecord = {
			complete: 'FALSE',
			content_size: 597283,
			content_type: 'video/mp4',
			txid: '5ptIH1GrUYrgzrrwCf-mVE8aWMGbiZ4vt9z4VcMYaNA',//'9rE8vXMG2T702EVMxomVBCUKvRBzeZPiCUpgryr60Eo',
		}
		const keepgoing = await checkInFlightVids([smallvid2])
		expect(keepgoing).true
		//wait for and test completed download
		let count = 20
		while((smallvid2.complete !== 'TRUE') && count--){
			await sleep(1000)
		}
		expect(smallvid2.complete).to.eq('TRUE')
	}).timeout(0)
	
	it('7. checkInflightVids: call in a loop', async()=> {
		const vids: Partial<TxRecord>[] = [
			{ txid: 'TMNvO4FW2KcxICAbjC7lPbc8cpYIjvZKYfkCr1s1H4E', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'jfS-I4EezaKvb3IqVK9A5ZF7cy8Z0qiOQwoUaNn1_W4', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'y3A8zFkW7JDdi4BhyH21Q94A7W3SUO1bQvgHFQGTbA0', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'ot-1S7orJTBEqS6Ss-HA6BJKCeKyf5CYuSezzTn65ic', content_type: 'video/mp4', content_size: 123 },
			{ txid: '2d0lWsrvHF7QrighQJJ0zggBrlMF02Ol8-l9JUiKK8A', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'w3NL20SWrYCt5BL7BDMciRuTq5KNKOk9CE-ujz9yA0M', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'a8A07H3ipRSOymPTr2WLOu91GbMpNvuXonAuewksAJc', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'vuVms1UdvCo21fHHMzdU8rL4gAz7U02icpTSyMjnsb4', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'rZi26DUvSbtRejfxrdIUb04bhKcK-mWtMZDlMViZBjE', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'SxP57BAAiZB0WEipA0_LtyQJ0SY51DwI4vE4N03ykJ0', content_type: 'video/mp4', content_size: 123 }, // 404
			{ txid: 'elpBavBac2bMYEPSXYFUd5vvnzd0yTMVirNbWkhEECI', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'paL_F_eLx4g8u_T2pm8XaB3HdBt-kk9z72hQ8g9u74s', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'B3-nchXLEDW49vTgR6IHIss0CIYqWE0fNOaVljj7mys', content_type: 'video/mp4', content_size: 123 },
			{ txid: '4mDNc9h6Fb4Lr05YGcT5HIXKOqeXEzQktDKwCOrxNeg', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'Qmd6z8qegC-QjXV2pl-_gziWM-GJymK-EMTaSVpe0-s', content_type: 'video/mp4', content_size: 123 },
			{ txid: '50nhmb0OvRrrGCMvE3JtX8mlSpWeL0kQRdis9jp_kNc', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'Pgde3HwSmQBro6AAPY_KJFCP2kl8zTcZeZUyZblAISQ', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'IULq2gqSoWArP-Hl9RswNGBoGmyZxHRa_WgeelNSisQ', content_type: 'video/mp4', content_size: 123 },
			{ txid: '9JslC8aI8-27G2TtQmZaRHcZnvb5lldXW8G7IXsRyyM', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'JK0gNsJm0t4eMt2dbEsmQHAkMSitYidRiommcn3bRME', content_type: 'video/mp4', content_size: 123 },
			{ txid: '2BbcxzQKZKC3XV8_ntVUchG5JP1d26vbV_q71b1Dtx0', content_type: 'video/mp4', content_size: 123 },
			{ txid: '9Ux8eFUsvODyPdw8vj5A0JypXqMa2KY47Ivw2oLKFk4', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'kcXMCa2-st0HCKtK3sbuDB86DRG4tBjjeYHrUDi1WUM', content_type: 'video/mp4', content_size: 123 },
			{ txid: 'tqdtuC3GZTOmDsD06GFgmjx6zbvAAv2dCFdwKgBQYdE', content_type: 'video/mp4', content_size: 16498 },
			{ txid: 'mCTQ5tFinF-MEk3GuurkdnyS8kF1SZN4Le35Ph29_fM', content_type: 'video/mp4', content_size: 5186 },
			{ txid: 'p6bDSRfcFw_diGsipJXv33Xr9ZvBDwlgtcIrZEEFXTU', content_type: 'video/mp4', content_size: 5254 },
			{ txid: '-Fskzr13zaTWUt4hMaIbi798H8uGkPITd4De_ohcKag', content_type: 'video/mp4', content_size: 7117 },
			{ txid: 'FeMssuZJmJ089l7_FLWwRrGEEfN8He3zHb_8E67kHFs', content_type: 'video/mp4', content_size: 16231 },
			{ txid: 'AiZ_VQjjmcl5JTG1D7U-MXosXtM1c9EfMk8e_vsunmI', content_type: 'video/mp4', content_size: 16231 },
			{ txid: '2Kqid0BQk9-nfMniOWoo9xgMDHtjNi3yrsFOj1JEhlk', content_type: 'video/mp4', content_size: 16498 },
			{ txid: 'uk_eY9lpXARei891WxLo8kaK2OVudBq1h8MVKIoGa8A', content_type: 'video/mp4', content_size: 17664 },
			{ txid: 'elPSdJAfHJeC98gmSNKOSDcC7vQbgeoIcElSg2E8FHE', content_type: 'video/mp4', content_size: 17912 },
			{ txid: 'nSX3Qaz-r1NF2dJ4Xh-pMrD6VNt_5wmtu6AgezO3h9U', content_type: 'video/mp4', content_size: 10108 },
			{ txid: 'Ds_Q-BaSQd-3P7_CqKmRR1xHWLGdTEXV_E12KWF2jqA', content_type: 'video/mp4', content_size: 516754 },
		]
		let keepgoing = true
		while(keepgoing){
			for (const vid of vids) {
				keepgoing = await checkInFlightVids([vid as TxRecord]) 
				await sleep(1000)
			}
		}
	}).timeout(0)

	

})