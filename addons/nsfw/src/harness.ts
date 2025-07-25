import { AWSError, SQS } from 'aws-sdk'
import { s3, sqs, AWS_INPUT_BUCKET, AWS_SQS_INPUT_QUEUE } from './utils/aws-services'
import { S3Event } from 'aws-lambda'
import { logger } from './utils/logger'
import memoize from 'moize'
import { VidDownloads } from './rating/video/VidDownloads'
import { addToDownloads } from './rating/video/downloader'
import { processVids } from './rating/video/process-files'
import { checkImageTxid } from './rating/filter-host'
import { slackLogger } from './utils/slackLogger'
import { filterPendingOnly } from './utils/promises'

const prefix = 'nsfw-main'

//debug output for sanity
console.log('process.env.NUM_FILES', process.env.NUM_FILES)
const NUM_FILES = +process.env.NUM_FILES!
console.log('process.env.TOTAL_FILESIZE_GB', process.env.TOTAL_FILESIZE_GB)
const TOTAL_FILESIZE = +process.env.TOTAL_FILESIZE_GB! * 1024 * 1024 * 1024


const _currentVideos = VidDownloads.getInstance()

//keep track and set limits based on env inputs
let _currentTotalSize = 0
let _currentFileTasks: ReturnType<typeof messageHandler>[] = []
const _currentImageIds: {[name:string]:number} = {}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const getMessages = async(maxNumberOfMessages: number): Promise<SQS.Message[]> => {
	//dont waste a n/w request
	if(maxNumberOfMessages === 0) return []

	const getMax10Messages =async (numberOfMessages: number) => {
		const { Messages } = await sqs.receiveMessage({
			QueueUrl: AWS_SQS_INPUT_QUEUE,
			MaxNumberOfMessages: Math.min(10, numberOfMessages),
			MessageAttributeNames: ['All'],
			VisibilityTimeout: 900, //15mins
			WaitTimeSeconds: 0,
		}).promise()
		return Messages || []
	}

	let toBeDone = maxNumberOfMessages
	let msgs: SQS.Message[] = []
	while(toBeDone > 0){
		const newMsgs = await getMax10Messages(toBeDone)

		if(newMsgs.length === 0) break //no new messages

		toBeDone -= newMsgs.length
		msgs = [...msgs, ...newMsgs]
	}

	logger(getMessages.name, `received ${msgs.length} messages`)

	return msgs
}

/** used in unit test for connectivity/package config */
export const getFile = async(Key: string)=> s3.getObject({ Bucket: AWS_INPUT_BUCKET, Key }).promise()

/** memoize this function so we can just re-call it without worrying about performance */
const getFileHead = memoize(
	async(Key: string, ReceiptHandle: string):Promise<{contentType: string, contentLength: number} | undefined>=> {
		while(true){
			try{
				const head = await s3.headObject({ Bucket: AWS_INPUT_BUCKET, Key }).promise()
				logger('getFileHead', Key, `info. head returned ${head.ContentType}, OK.`)
				return {
					contentType: head.ContentType!,
					contentLength: head.ContentLength!,
				}
			}catch(err){
				const e = err as AWSError
				if(e.statusCode === 404 || e.statusCode === 403){
					logger('getFileHead', Key, `warning! ${e.name}(${e.statusCode}):${e.message}. deleting message...`)
					deleteMessage(ReceiptHandle, Key)
					return undefined
				}
				logger('getFileHead', Key, `warning! ${e.name}(${e.statusCode}):${e.message}. retrying...`, e)
				slackLogger('getFileHead', Key, `warning! ${e.name}(${e.statusCode}):${e.message}. retrying...`, e)
			}
		}
	},
	{
		maxSize: 2 * NUM_FILES,
		maxAge:  900_000, //15 minutes: 15 * 60 * 1000 = 900000 ms
	},
)

const releaseMessage = async(ReceiptHandle: string)=> sqs.changeMessageVisibility({
	QueueUrl: AWS_SQS_INPUT_QUEUE,
	VisibilityTimeout: 0,
	ReceiptHandle,
}).promise()


export const harness = async()=> {
	console.log(prefix, 'main begins')

	/* message consumer loop */
	while(true){

		/** remove non-pending promises from _currentFileTasks */
		_currentFileTasks = await filterPendingOnly(_currentFileTasks)
		const numFiles = _currentFileTasks.length
		console.log(JSON.stringify({_currentFileTasks}))

		logger(prefix, JSON.stringify({numFiles, _currentTotalSize: _currentTotalSize.toLocaleString(), vidsProcessing: _currentVideos.length(), imgsProcessing: Object.keys(_currentImageIds).length}))
		logger(prefix, `vids: ${JSON.stringify(_currentVideos.listIds())}, imgs: ${JSON.stringify(_currentImageIds)}`)

		if(numFiles >= NUM_FILES || _currentTotalSize >= TOTAL_FILESIZE){
			logger(prefix, 'internal queue full. waiting 1s.')
			await sleep(1000)
			continue
		}

		const messages = await getMessages( Math.max(0, NUM_FILES - numFiles) )
		if(messages.length === 0){
			await sleep(5000)
			continue
		}

		const newPromises = messages.map(message => messageHandler(message))
		_currentFileTasks = [..._currentFileTasks, ...newPromises]

		await sleep(1)
	}
}

const messageHandler = async (message: SQS.Message) => {
	const s3event = JSON.parse(message.Body!) as S3Event
	/* check if it's an s3 event */
	if(
		s3event.Records 
		&& s3event.Records.length === 1
		&& typeof s3event.Records[0].s3?.object?.key === 'string'
		&& typeof s3event.Records[0].s3?.bucket?.name === 'string'
	){
		const key = s3event.Records[0].s3.object.key
		const receiptHandle = message.ReceiptHandle!
		// const bucket = s3Record.s3.bucket.name
		// logger(prefix, `found s3 event for '${key}' in '${bucket}`)

		/* process s3 event */

		//check we have room to add a new item (& that object exists)
		const headRes = await getFileHead(key, receiptHandle)
		if(!headRes){
			try{
				const delSqs = await deleteMessage(receiptHandle, key)
				logger(key, 'deleted message.', JSON.stringify(delSqs))
			}catch(err: unknown){
				const e = err as AWSError
				logger(key, `Error! deleting message from AWS_SQS_INPUT_QUEUE ${e.name}(${e.statusCode}):${e.message} => ${e.stack}`, e)
			}
			return false
		}

		const {contentLength, contentType} = headRes
		const videoLength = !contentType.startsWith('image') ? contentLength : 0 //images don't get stored in VID_TMPDIR
		if(_currentTotalSize + videoLength > TOTAL_FILESIZE){
			logger(prefix, key, `no room for this ${contentLength.toLocaleString()} byte file. releasing back to queue (aware DLQ)`, {_currentTotalSize})
			await releaseMessage(message.ReceiptHandle!) //message may end up in DLQ if this is excessive.
			return false
		}
		const numFiles = _currentFileTasks.length
		if(numFiles > NUM_FILES){
			logger(prefix, 'Warning. queue overflow', {numFiles})
		}
		_currentTotalSize += videoLength

		//send to vid or image processing
		if(!contentType.startsWith('image')){
			/* add to video download queue */
			await addToDownloads({
				content_size: contentLength.toString(),
				content_type: contentType,
				txid: key,
				receiptHandle,
			})
		}else{
			/* process image */
			_currentImageIds[key] = 1
			let res = false
			try{
				res = await checkImageTxid(key, contentType)
			}catch(err:unknown){
				const e = err as Error
				if(['RequestTimeTooSkewed', 'NoSuchKey'].includes(e.name)){
					//this item has spent too much time in the internal queue, another plugin instance has already run `cleanupAfterProcessing`
					logger(key, `${e.name}:${e.message}. Assuming another instance has run 'cleanupAfterProcessing'.`)
					delete _currentImageIds[key]
				}else{
					//we should never get here
					console.log(key, '****** UNCAUGHT ERROR ********* in process image', e)
					slackLogger(key, '****** UNCAUGHT ERROR ********* in process image', e)
				}
			}
			logger(key, 'checkImageTxid result:', res)
			delete _currentImageIds[key]
			await cleanupAfterProcessing(receiptHandle, key, 0)
		}

		//process downloaded videos
		await processVids()
		//cleanup aborted/errored downloads
		for(const item of _currentVideos){
			if(item.complete === 'ERROR'){
				_currentVideos.cleanup(item)
			}
		}
		return true
	}else{
		logger(prefix, `error! unrecognized body. MessageId '${message.MessageId}'. not processing.`)
		console.log('message.Body', JSON.stringify(s3event, null,2))
		return false
	}
}

/* processing succesful, so delete event message + object */
export const cleanupAfterProcessing = async(ReceiptHandle: string, Key: string, videoLength: number)=> {
	logger(cleanupAfterProcessing.name, `called for ${Key}`)
	_currentTotalSize -= videoLength

	try{
		const delSqs = await deleteMessage(ReceiptHandle, Key)
		logger(Key, 'deleted message.', JSON.stringify(delSqs))
	}catch(err: unknown){
		const e = err as AWSError
		logger(Key, `Error! deleting message from AWS_SQS_INPUT_QUEUE ${e.name}(${e.statusCode}):${e.message} => ${e.stack}`, e)
	}

	try{
		const delObj = await s3.deleteObject({
			Bucket: AWS_INPUT_BUCKET,
			Key,
		}).promise()
		logger(Key, 'deleted object.', JSON.stringify(delObj))
	}catch(err: unknown){
		const e = err as AWSError
		logger(Key, `ERROR DELETING OBJECT! ${e.name}(${e.statusCode}):${e.message} => ${e.stack}`, e)
	}
}

const deleteMessage = async(ReceiptHandle: string, Key: string)=> sqs.deleteMessage({
	QueueUrl: AWS_SQS_INPUT_QUEUE,
	ReceiptHandle,
}).promise()

