const {ClarifaiStub, grpc} = require("clarifai-nodejs-grpc");

const stub = ClarifaiStub.grpc();

// This will be used by every Clarifai endpoint call.
const metadata = new grpc.Metadata();

if(!process.env.CLARIFAI_APP_KEY) throw new Error('process.env.CLARIFAI_APP_KEY is undefined')
metadata.set("authorization", `Key ${process.env.CLARIFAI_APP_KEY}`)

const modelNsfw = 'e9576d86d2004ed1a38ba0cf39ecb4b1'
const modelGeneral = "aaa03c23b3724a16a56b629203edc62c"

export const checkImage = async (txid: string) => {
	return new Promise( (resolve, reject) => {
		const url = `https://arweave.net/${txid}`
	
		stub.PostModelOutputs({
				model_id: modelNsfw,
				inputs: [{data: {image: {url}}}]
			},
			metadata,
			(err: any, response: any) => {

				if (err) {
					console.log("Error: " + err);
					reject(err)
					return;
				}
				
				const statusCode = response.status.code
				if (statusCode !== 10000) {
					console.log("Received failed status: " + response.status.description + "\t" + response.status.details);
					reject(response.status.description + "\t" + response.status.details);
					return;
				}

				console.log(url)
				console.log("Predicted concepts, with confidence values:")
				let nsfwValue = 0
				for (const concept of response.outputs[0].data.concepts) {
					console.log(concept.name + ": " + concept.value);
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
export const checksImages = async (txids: string[]): Promise<ICheckImagesResult> => {
	
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
					console.log("Error: " + err);
					reject(err.code + ':' + err.message);
				}

				const statusCode = response.status.code
				if (statusCode !== 10000) {
					console.log("Received failed status: " + response.status.description + "\t" + response.status.details);
					reject(response.status);
				}

				let nsfwValues: ICheckImagesResult = {}
				for (let index = 0; index < response.outputs.length; index++) {
					const output = response.outputs[index];
					
					// console.log("Predicted concepts, with confidence values:")
					for (const concept of output.data.concepts) {
						// console.log(concept.name + ": " + concept.value)
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