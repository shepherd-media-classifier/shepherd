import axios from 'axios'
import { IncomingMessage } from 'http'
import { NO_STREAM_TIMEOUT, VID_TMPDIR, VID_TMPDIR_MAXSIZE } from '../../constants'
import fs from 'fs'
import ffmpeg from 'ffmpeg'
import filetype from 'file-type'
import { logger } from '../../utils/logger'
import { TxRecord } from '../../types'
import { corruptDataConfirmed, noDataFound, wrongMimeType } from '../mark-txs'
import { createScreencaps } from './screencaps'
import { checkFrames } from './check-frames'
import rimraf from 'rimraf'

/* Video download queue */
export interface VidDownloadRecord extends TxRecord {
	complete: 'TRUE' | 'FALSE' | 'ERROR' | (string & {})
}

let downloads: VidDownloadRecord[] = []

const downloadsSize = ()=> downloads.reduce((acc, curr)=> acc + curr.content_size, 0)

export const checkInFlightVids = async(vid: TxRecord)=> {
	
	/* Check previous downloads */
	
	//cleanup aborted/errored downloads
	downloads = downloads.filter(dl => dl.complete !== 'ERROR')
	
	//check if any finished downloading & process 1 only
	for (const dl of downloads) {
		if(dl.complete === 'TRUE'){
			console.log(dl.txid, 'ready for processing')
			
			//create screencaps
			const frames = await createScreencaps(dl.txid)

			//let tfjs run through the screencaps & write to db
			await checkFrames(frames, vid.txid)
			
			//delete the temp files
			rimraf(`${VID_TMPDIR}${dl.txid}/`, (e)=> e && logger(vid.txid, 'Error deleting temp folder', e))
			downloads = downloads.filter(d => d !== dl)
			
			break; //process 1 only
		}
	}

	/* Start downloading the next video if we have enough room */

	if(downloads.length < 10 && downloadsSize() < VID_TMPDIR_MAXSIZE){
		let dl = Object.assign({complete: 'FALSE'}, vid) //new VidDownloadRecord
		downloads.push(dl)
		//call async as potentially large download
		videoDownload( dl ).then( (res)=> {
			logger(dl.txid, 'finished downloading', res)
		})

		logger(vid.txid, 'downloading video', downloadsSize(), '/', VID_TMPDIR_MAXSIZE, `${downloads.length}/10`)
		return (downloads.length < 10)
	}
	return false
}



export const videoDownload = async(vid: VidDownloadRecord)=> {
	return new Promise(async(resolve, reject)=> {

		const url = 'https://arweave.net/' + vid.txid
		const folderpath = VID_TMPDIR + vid.txid + '/'
		fs.mkdirSync(folderpath, { recursive: true })
		const filewriter = fs.createWriteStream(folderpath + vid.txid, { encoding: 'binary' })
	
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
						return;
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
				filewriter.end(()=>{
					rimraf(folderpath, (e)=> e && logger(vid.txid, 'Error deleting temp folder', e))
				})
				
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
