import axios from 'axios'
import { IncomingMessage } from 'http'
import { NO_STREAM_TIMEOUT, VID_TMPDIR, VID_TMPDIR_MAXSIZE } from '../../constants'
import fs from 'fs'
import filetype from 'file-type'
import { logger } from '../../utils/logger'
import { TxRecord } from '../../types'
import { corruptDataConfirmed, corruptDataMaybe, noDataFound, noDataFound404, wrongMimeType } from '../mark-txs'
import { createScreencaps } from './screencaps'
import { checkFrames } from './check-frames'
import rimraf from 'rimraf'

/* Video download queue */
export interface VidDownloadRecord extends TxRecord {
	complete: 'TRUE' | 'FALSE' | 'ERROR' | (string & {})
}

let downloads: VidDownloadRecord[] = []

const downloadsSize = ()=> downloads.reduce((acc, curr)=> acc + curr.content_size, 0)

const cleanUpDownload = (dl: VidDownloadRecord)=> {
	rimraf(VID_TMPDIR + dl.txid, (e)=> e && logger(dl.txid, 'Error deleting temp folder', e))
	downloads = downloads.filter(d => d !== dl)
}

export const checkInFlightVids = async(inputVid: TxRecord[])=> {
	
	/* Check previous downloads */
	
	//cleanup aborted/errored downloads
	for (const dl of downloads) {
		if(dl.complete === 'ERROR'){
			cleanUpDownload(dl)
		}
	}
	
	//check if any finished downloading & process 1 only
	for (const dl of downloads) {
		if(dl.complete === 'TRUE'){
			logger(dl.txid, 'ready for processing')
			
			//create screencaps & handle errors
			let frames: string[] = []
			try{
				frames = await createScreencaps(dl.txid)
			}catch(e){
				if(e.message === 'corrupt video data'){
					logger(dl.txid, 'ffprobe: corrupt video data')
					corruptDataConfirmed(dl.txid)
				}else{
					logger(dl.txid, 'ffmpeg: error in screencaps')
					corruptDataMaybe(dl.txid)
				}
				//delete the temp files
				cleanUpDownload(dl)
				break;
			}

			//let tfjs run through the screencaps & write to db
			if(frames.length < 2){
				logger(dl.txid, 'ERROR: No frames to process!')
			}else{ 
				await checkFrames(frames, dl.txid)
			}
			
			//delete the temp files
			cleanUpDownload(dl)
			
			break; //process 1 only
		}
	}

	/* Start downloading the next video if we have enough room */

	if(inputVid.length === 1){
		const vid = inputVid[0]
		if(downloads.length < 10 && downloadsSize() < VID_TMPDIR_MAXSIZE){
			let dl: VidDownloadRecord = Object.assign({complete: 'FALSE'}, vid) 
			downloads.push(dl)
			//call async as potentially large download
			videoDownload( dl ).then( (res)=> {
				logger(dl.txid, 'finished downloading', res)
			})
	
			logger(vid.txid, 'downloading video', downloadsSize(), '/', VID_TMPDIR_MAXSIZE, `${downloads.length}/10`)
			return (downloads.length < 10)
		} else{
			return false
		}
	}
	return true
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
						if(res === undefined){
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
				filewriter.end()
				vid.complete = 'TRUE'
				resolve(true)
			})
	
			stream.on('error', (e: Error)=>{
				filewriter.end()
				vid.complete = 'ERROR'
				e.message === 'aborted' ? resolve(true) : reject(e)
			})
			
		}catch(e){
			if(timer){
				clearTimeout(timer)
			}
			vid.complete = 'ERROR'
			filewriter.end()
			if(e.message === 'Request failed with status code 404'){
				logger(vid.txid, 'Error 404', e.name, ':', e.message)
				noDataFound404(vid.txid)
				resolve(true)
			}else{
				logger(vid.txid, 'UNHANDLED ERROR in videoDownload', e.name, ':', e.message)
				reject(e)
			}
		}
	})//end Promise
}
