require('dotenv').config() //first line of entrypoint
import { checkImage, checksImages } from './clarifai'
/* start http server */
// import './server'


const main = async()=> {
	try {

		/**
		 * API Restrictions
		 * - 128 is the maximum number of images that can be sent at once
		 * - Each image should be less than 20MB
		 * - Format restrictions: https://docs.clarifai.com/api-guide/data/supported-formats
		 * 
		 */

		let txids = [
			/* These are all dodgy pics from evermore nfts */
			'OIiLO3Y6YSCsqN2YLh2g-ZDh8RV3sGZi2jCRstaIaxQ', //gif
			'3PfH66e2hWCN-aHpAEUiHvRaXr0jO3km1un917s1H1A',
			'1JQGNlgGZyy0EeZWabkeRJL2KPFjt1XSd-Nd8t3I6GM',
			'X6n4Rl3W-_k-47MA8h6gHIxUXv0N1WAbp1dmX_6J6w4',
			'56Ri9RDk-6orjTiircOKtYyxSWkjFhenxbr9PK0m49M',
			'KDAqyeRx_efGIkdCC4XvX8CZIckkXH1VWkOdjDIERnw',
			'NXle3o-ULtCJaX0BOM1iHqfUPzguw6qqvO-qoV4PWy4',
			'ag6rEfFq7QT6ZJKrnWsHRo-EgfOQTakfHxHdsdMsMII',
			'TnQhOMqgWu_Zj05SxKbMWxQUm7wlhvH8BmXV5N6PsZg',
			'R6UxwnihOxYvDfiRHVZVIwWArjK9Oa57Hcwmj-keSpY',
			'3vmLBaGzBD0wM-kemAPoEWWrR7BSAVnvCKselnys21E',
			'sL3zehjMjg_aNFHvSwgs7Okn7ZXlLJj_SF59XF0pxpE',
			'sAEBETJTySGALO05nmHZRoXfokIt8NgsZwxwRcQ3Lso',
			'XuUme_Awa63-_fCg7OpJ0kJit9aiZ1Uu94-QTnAQETs',
			'f-jLeXSfWpEOFcJhHpV0W4wmITMyb7Bn6LZ0sAEy7Fg',
			'RRyBUTWJ1tdc2cYlI84jJdpAsA0PawopPwviEE2WBEA',
			'brA3jdKNilce3mwl9R2QM7jris1dWGCexea6E-Suue0',
			'QCWnjfJI4c6p5SA0ni0__2vZpiWGnW-u7NSIybe56hk',
			'ZIDhFbN-F5PzmEExix1lLCeArF2EDL4vdSkdYsddr1Q',
			// '1DDMmrVloP2zMWUQyddtJaYn5iyIil9Wce0yX5lqOQg', //video <= need to use different clarifai in/outs
			"hbX9tnYWW7HlBNkywEOLV_ygOcLOG1fHuBcYFvtgwEk",
			"Gt-uHsLgMNFMR_ITmuQCyWjTKyhu5dMV0fvtMVbZSJE",
			"BYQr6P19OLT2UtFYH77P2cCRGzTODIvFPrBR4o94tcI",
			"FNz0zcOblcXlbDsBNrZeZnmCS1GyLiTXeqmH-V5-BEY",
			"Nb4HKSI1nx6AmGZ9kngSrBHwJUxztE3S_sO6XXC8HJs",
			"pfUg3UoCz5JJfXkX43tYU6W9rfvedACjLMKtLA3kxvg",
			"7Zf47lB0QnTAVJpVeLzN9B5Pnip86mWBKJndx60LBKE",
			"E7e13P0_hRMXrj8Fg81keCEW0axk57fv-uN5jGtRXS4",
			"rIgExyeCysDqeTz4qwyRsNm6jXnh7yHEROIdwepQNbY",
			"AR15cA7_dvQIDLLo92UnKIpo2Z6Pt91diaVevoIr8a0",
		]
	
		let r1 = await checkImage(txids[0])
		console.log(r1)
	
		let r2 = await checksImages(txids)
		console.log(r2)
		
	} catch (e) {
		console.log('Error!\t', e.code, ':', e.message)
	}
}
main()

