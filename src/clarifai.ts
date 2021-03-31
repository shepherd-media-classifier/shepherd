import { logger } from "./utils/logger";

const {ClarifaiStub, grpc} = require("clarifai-nodejs-grpc"); //no TS support - says there is in the repo

const stub = ClarifaiStub.grpc();

const metadata = new grpc.Metadata();

if(!process.env.CLARIFAI_APP_KEY) throw new Error('process.env.CLARIFAI_APP_KEY is undefined')
metadata.set("authorization", `Key ${process.env.CLARIFAI_APP_KEY}`)

const modelNsfw = 'e9576d86d2004ed1a38ba0cf39ecb4b1'
// const modelGeneral = "aaa03c23b3724a16a56b629203edc62c"

export const checkImage = async (txid: string): Promise<Number> => {
	return new Promise( (resolve, reject) => {
		const url = `https://arweave.net/${txid}`
	
		stub.PostModelOutputs({
				model_id: modelNsfw,
				inputs: [{data: {image: {url}}}]
			},
			metadata,
			(err: any, response: any) => {

				if (err) {
					logger("Error: " + err);
					reject(err)
					return;
				}
				
				const statusCode = response.status.code
				if (statusCode !== 10000) {
					logger("Received failed status: " + response.status.description + "\t" + response.status.details);
					reject(response.status.description);
					return;
				}

				logger(url)
				logger("Predicted concepts, with confidence values:")
				let nsfwValue = 0
				for (const concept of response.outputs[0].data.concepts) {
					logger(concept.name + ": " + concept.value);
					if(concept.name === 'nsfw'){
						nsfwValue = concept.value
						break;
					}
				}
				resolve(nsfwValue);
				return;
			}
		)

	})
}

export interface ICheckImagesResult {
	[id: string]: Number
}
export const checkImages = async (txids: string[]): Promise<ICheckImagesResult> => {
	
	if(txids.length > 128) throw Error("Max 128 images at one time")

	const inputs = txids.map(txid => {
		return  {data: {image: {url: `https://arweave.net/${txid}`}}}
	})

	return new Promise( (resolve, reject) => {
	
		stub.PostModelOutputs({
				model_id: modelNsfw,
				inputs
			},
			metadata,

			(err: any, response: any) => {
				if (err) {
					logger("Error: " + err);
					reject(err.code + ':' + err.message);
					return;
				}

				const statusCode = response.status.code
				if (statusCode !== 10000) {
					logger("Received failed status: " + response.status.description + "\t" + response.status.details);
					reject(response.status)
					return;
				}

				let nsfwValues: ICheckImagesResult = {}
				for (let index = 0; index < response.outputs.length; index++) {
					const output = response.outputs[index];
					
					// logger("Predicted concepts, with confidence values:")
					for (const concept of output.data.concepts) {
						// logger(concept.name + ": " + concept.value)
						if(concept.name === 'nsfw'){
							nsfwValues[txids[index]] = concept.value
							break;
						}
					}
				}
				resolve(nsfwValues);
			}
		)

	})
}