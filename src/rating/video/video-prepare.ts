import axios from 'axios'
import { IncomingMessage } from 'http'
import { NO_STREAM_TIMEOUT, VID_TMPDIR, VID_TMPDIR_MAXSIZE } from '../../constants'
import fs from 'fs'
import ffmpeg from 'ffmpeg'
import filetype from 'file-type'
import { logger } from '../../utils/logger'
import { TxRecord } from '../../types'
import { corruptDataConfirmed, noDataFound, wrongMimeType } from '../mark-bad-txs'

export interface VidDownloadRecord extends TxRecord {
	complete: 'TRUE' | 'FALSE' | 'ERROR' | (string & {})
}

let downloads: VidDownloadRecord[] = []

const downloadsTotalSize = ()=> {
	let sum = 0
	for (const dl of downloads) {
		sum += dl.content_size
	}
	return sum
}
const reduceTotSize = downloads.reduce((acc, curr)=> acc + curr.content_size, 0)

export const checkVid = async(vid: TxRecord)=> {
	
	/* Check previous downloads */
	if(downloads.length > 0){
		//check if any finished downloading
		for (const dl of downloads) {
			if(dl.complete){
				console.log(dl.txid, 'ready for processing')
				//TODO: process downloaded videos
			}
		}
	}

	/* Get the next video started if we have enough room */
	const tmpSize = downloadsTotalSize()
	if(tmpSize < VID_TMPDIR_MAXSIZE){
		console.log('we have space to download a video', tmpSize, '/', VID_TMPDIR_MAXSIZE)

		const res = await videoDownload( Object.assign({complete: 'FALSE'}, vid) )

	} else{
		console.log('no space to download another video', tmpSize, '/', VID_TMPDIR_MAXSIZE)
	}
}

export const videoDownload = async(vid: VidDownloadRecord)=> {
	return new Promise(async(resolve, reject)=> {

		const url = 'https://arweave.net/' + vid.txid
		const filewriter = fs.createWriteStream(VID_TMPDIR + vid.txid, {encoding: 'binary'})
	
		const source = axios.CancelToken.source()
		let timer: NodeJS.Timeout | null = null
		
		try{
			
			const { data, headers } = await axios.get(url, {
				cancelToken: source.token,
				responseType: 'stream',
			})

			/* Video size might be incorrect */
			const contentLength = Number(headers['content-length'])
			if(vid.content_size !== contentLength){
				logger(vid.txid, 'content-length. gql:', vid.content_size, 'header:', contentLength)
				vid.content_size = contentLength
			}

			timer = setTimeout( ()=>{
				source.cancel()
				logger(vid.txid, `setTimeout ${NO_STREAM_TIMEOUT} ms exceeded`)
				noDataFound(vid.txid)
			}, NO_STREAM_TIMEOUT )
			
			const stream: IncomingMessage = data
			
			let mimeNotFound = true
			let filehead = new Uint8Array(0)
	
			stream.on('data', async(chunk: Uint8Array)=>{
				clearTimeout(timer!)

				/* check the file head for mimetype & abort download if necessary */
				if(mimeNotFound){
					if(filehead.length < 4100){
						filehead = Buffer.concat([filehead, chunk])
					} else {
						mimeNotFound = false
						const res = await filetype.fromBuffer(filehead)
						if(!res){
							logger(vid.txid, 'no video file-type:', res)
							source.cancel()
							corruptDataConfirmed(vid.txid)
						}else if(!res.mime.startsWith('video/')){
							logger(vid.txid, 'invalid video file-type:', res.mime)
							source.cancel()
							wrongMimeType(vid.txid, res.mime)
						} 
					}
				}
					
				filewriter.write(chunk)
			})
	
			stream.on('end', ()=>{
				// logger(vid.txid, 'END')
				filewriter.end()
				vid.complete = 'TRUE'
				resolve(true)
			})
	
			stream.on('error', (e: Error)=>{
				// logger(vid.txid, 'Stream closing with error:', e.message)
				filewriter.end()
				vid.complete = 'ERROR'
				reject(e)
			})
			
		}catch(e){
			logger(vid.txid, 'ERROR IN videoDownload', e.name, ':', e.message)
			if(timer){
				clearTimeout(timer)
			}
			vid.complete = 'ERROR'
			filewriter.end()
			reject(e)
		}
	})//end Promise
}