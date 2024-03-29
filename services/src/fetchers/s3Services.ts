import { S3 } from 'aws-sdk'
import { Readable } from 'stream'
import { FetchersStatus } from '../common/constants'
import { dbCorruptDataConfirmed, dbMalformedXMLData } from '../common/utils/db-update-txs'
import { logger } from '../common/utils/logger'
import { slackLogger } from '../common/utils/slackLogger'

const prefix = 's3stream'

console.assert(process.env.AWS_DEFAULT_REGION, 'process.env.AWS_DEFAULT_REGION is undefined')
console.assert(process.env.AWS_ACCESS_KEY_ID, 'process.env.AWS_ACCESS_KEY_ID is undefined')
console.assert(process.env.AWS_SECRET_ACCESS_KEY, 'process.env.AWS_SECRET_ACCESS_KEY is undefined')
console.assert(process.env.AWS_INPUT_BUCKET, 'process.env.AWS_INPUT_BUCKET is undefined')


const s3 = new S3({
	apiVersion: '2006-03-01',
	...(process.env.S3_LOCAL==='yes' && {
		endpoint: process.env.S3_LOCAL_ENDPOINT!,
		accessKeyId: 'minioroot',
		secretAccessKey: 'minioroot',
		s3ForcePathStyle: true, // *** needed with minio ***
	}),
})

const bucketName = process.env.AWS_INPUT_BUCKET as string

export const s3UploadStream = async(readable: Readable, mimetype: string, txid: string)=> {

	logger(prefix, 'uploading', txid, mimetype)

	const streamStatuses: FetchersStatus[] = ['NO_DATA', 'NEGLIGIBLE_DATA', 'BAD_MIME']

	readable.on('error', e =>{
		const code = (e as Error & {code: string}).code
		if(streamStatuses.includes(e.message as FetchersStatus)){
			logger(prefix, 'aborting. error', e.message, txid)
			uploader.abort()
		}else if(code && ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND'].includes(code)){
			logger(prefix, 'aborting. error', code, txid)
			uploader.abort()
		}else{
			logger(prefix, 'UNHANDLED error event', e.message, txid, e)
			slackLogger(prefix, 'UNHANDLED error event', e.message, txid, e)
			throw e
		}
	})

	let uploader: S3.ManagedUpload
	try{

		uploader = s3.upload({
			Bucket: bucketName,
			Key: txid,
			ContentType: mimetype.replace(/\r|\n/g, ''),
			Body: readable,
		})
		const data = await uploader.promise()
		logger(prefix, 'uploaded buffer. Location', data.Location)
		return 'OK'

	}catch(e){

		if(e instanceof Error){
			if(e.name === 'RequestAbortedError'){
				// not an error. we requested to abort
				return 'ABORTED'
			}
			if(e.name === 'TimeoutError'){
				// n/w error
				return 'NW_ERROR'
			}
			if(e.name === 'MalformedXML'){
				logger(prefix, 'MalformedXML', e.message, txid)
				await dbMalformedXMLData(txid)
				return 'MalformedXML'
			}
			if(e.message === 'Invalid character in header content ["Content-Type"]'){
				logger(prefix, txid, `${e.name}:${e.message}.`)
				await dbCorruptDataConfirmed(txid)
				return 'Invalid-Content-Type'
			}
			//@ts-expect-error `code` is not defined on type Error
			const code = e.code
			logger(prefix, txid, 'UNHANDLED S3 ERROR', `${e.name}(${code}):${e.message}`, e)
			if(
				(typeof +code === 'number' && +code >=400)
				|| streamStatuses.includes(e.message as FetchersStatus) //rare but can appear here
			){
				logger(prefix, txid, `${e.name}(${code}):${e.message}. Allowing to bubble up.`)
				//no need to slackLogger this, let bubble up
			}else{
				slackLogger(prefix, txid, 'UNHANDLED S3 ERROR', `${e.name}(${code}):${e.message}`)
			}
		}
		//just throw errors like NoSuchBucket, UnknownEndpoint, etc. needs to be handled externally
		throw e

	}
}

export const s3Delete = async (txid: string) => {

	await s3.deleteObject({
		Bucket: bucketName,
		Key: txid,
	}).promise()

	logger(s3Delete.name, `sent delete command for ${txid}`)
}