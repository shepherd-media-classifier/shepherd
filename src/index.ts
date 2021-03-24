require('dotenv').config()
// import express from 'express'

// const app = express()
// const port = (process.env.NODE_ENV === 'production') ? 80 : 3001

// // app.use(cors())

// app.get('/', (req, res)=> {
// 	res.status(200).send('Welcome to nothing.')
// })

// app.listen(port, ()=> console.log(`server started on http://localhost:${port}`))


const {ClarifaiStub, grpc} = require("clarifai-nodejs-grpc");

const stub = ClarifaiStub.grpc();

// This will be used by every Clarifai endpoint call.
const metadata = new grpc.Metadata();

if(!process.env.CLARIFAI_APP_KEY) throw new Error('process.env.CLARIFAI_APP_KEY is undefined')
metadata.set("authorization", `Key ${process.env.CLARIFAI_APP_KEY}`)

const modelNsfw = 'e9576d86d2004ed1a38ba0cf39ecb4b1'
const modelGeneral = "aaa03c23b3724a16a56b629203edc62c"

const check = async (txid: string) => {
	// return new Promise( (resolve, reject) => {
		const url = `https://arweave.net/${txid}`
	
		let res = await stub.PostModelOutputs({
				model_id: modelGeneral,
				inputs: [{data: {image: {url}}}]
			},
			metadata
		)
		console.log(res)

		// 	(err: any, response: any) => {
		// 			if (err) {
		// 					console.log("Error: " + err);
		// 					return;
		// 			}
	
		// 			if (response.status.code !== 10000) {
		// 					console.log("Received failed status: " + response.status.description + "\t" + response.status.details);
		// 					return;
		// 			}
	
		// 			console.log(url)
		// 			console.log("Predicted concepts, with confidence values:")
		// 			for (const c of response.outputs[0].data.concepts) {
		// 					console.log(c.name + ": " + c.value);
		// 			}
		// 			// resolve(0)
		// 	}
		// )

	// })
}

const main = async()=> {

	let txids = [
		'1DDMmrVloP2zMWUQyddtJaYn5iyIil9Wce0yX5lqOQg', //video
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
	]

	const sleep = async (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

	let queue = 0
	let index = 0
	while(index !== txids.length){

		await check(txids[index])
		++index
	}
}
main()


// process.stdout.write('\rindex=' + index)
// if(index % 9 === 0){
// 	await sleep(1000)
// }