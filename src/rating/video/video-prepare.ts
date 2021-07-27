import axios from 'axios'
import { IncomingMessage } from 'http'
import { NO_STREAM_TIMEOUT, VID_TMPDIR, VID_TMPDIR_MAXSIZE } from '../../constants'
import fs from 'fs'
import filetype, { FileTypeResult } from 'file-type'
import { logger } from '../../utils/logger'
import { TxRecord } from '../../types'
import { dbCorruptDataConfirmed, dbCorruptDataMaybe, dbNoDataFound, dbNoDataFound404, dbNoMimeType, dbWrongMimeType } from '../mark-txs'
import { createScreencaps } from './screencaps'
import { checkFrames } from './check-frames'
import rimraf from 'rimraf'
import { exec } from 'child_process'
import { VidDownloadRecord, VidDownloads } from './VidDownloads'

/* Video download queue */
const downloads = VidDownloads.getInstance()


export const checkInFlightVids = async(inputVid: TxRecord[])=> {
	
	/* Check previous downloads */
	
	//cleanup aborted/errored downloads
	for (const dl of downloads) {
		if(dl.complete === 'ERROR'){
			downloads.cleanup(dl)
		}
	}
	
	//check if any finished downloading & process 
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
					dbCorruptDataConfirmed(dl.txid)
				}else{
					logger(dl.txid, 'ffmpeg: error creating screencaps')
					dbCorruptDataMaybe(dl.txid)
				}
				//delete the temp files
				downloads.cleanup(dl)
				continue;
			}

			//let tfjs run through the screencaps & write to db
			if(frames.length < 2){
				logger(dl.txid, 'ERROR: No frames to process!')
				dbCorruptDataMaybe(dl.txid)
			}else{ 
				await checkFrames(frames, dl.txid)
			}
			
			//delete the temp files
			downloads.cleanup(dl)
		}
	}

	/* Start downloading the next video if we have enough room */

	if(inputVid.length === 1){
		const vid = inputVid[0]
		if(downloads.length() < 10 && downloads.size() < VID_TMPDIR_MAXSIZE){
			let dl: VidDownloadRecord = Object.assign({complete: 'FALSE'}, vid) 
			downloads.push(dl)
			//call async as potentially large download
			videoDownload( dl ).then( (res)=> {
				logger(dl.txid, 'finished downloading', res)
			})
	
			logger(vid.txid, 'downloading video', downloads.size(), '/', VID_TMPDIR_MAXSIZE, `${downloads.length()}/10`)
			return (downloads.length() < 10)
		} else{
			return false
		}
	}
	return true
}

const playDownloadedFile = (txid:string)=>{
	const path = VID_TMPDIR + txid + '/' + txid
	exec('ffplay ' + path, (err, stdout, stderr)=> {
		if(err){
			logger(txid, `exec error: ${err}`)
			return
		}
		logger(txid, `stdout: ${stdout}`)
		logger(txid, `stderr: ${stderr}`)
	})
	exec('start https://arweave.net/' + txid)
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
				dbNoDataFound(vid.txid)
			}, NO_STREAM_TIMEOUT )
			
			const stream: IncomingMessage = data
			
			let mimeNotFound = true
			let filehead = new Uint8Array(0)

			const fileTypeGood = (res: FileTypeResult | undefined)=>{
				if(res === undefined){
					logger(vid.txid, 'no video file-type:', res)
					dbNoMimeType(vid.txid)
					return false
				}else if(!res.mime.startsWith('video/')){
					logger(vid.txid, 'invalid video file-type:', res.mime)
					dbWrongMimeType(vid.txid, res.mime)
					return false
				}
				logger(vid.txid, 'detected mime:', res.mime)
				return true
			}
			
			stream.on('data', async(chunk: Uint8Array)=>{
				clearTimeout(timer!)
				/* check the file head for mimetype & abort download if necessary */
				if(mimeNotFound){
					if(filehead.length < 4100){
						filehead = Buffer.concat([filehead, chunk])
					} else {
						mimeNotFound = false
						const res = await filetype.fromBuffer(filehead)
						if(!fileTypeGood(res)){
							source.cancel()
							return;
						}
					}
				}
					
				filewriter.write(chunk)
			})
	
			stream.on('end', async()=>{
				filewriter.end()
				vid.complete = 'TRUE'
				if(mimeNotFound){
					const res = await filetype.fromBuffer(filehead)
					logger(vid.txid, 'mime was not found during download:', res)
					if(!fileTypeGood(res)){
						vid.complete = 'ERROR'
					}
				}
				// if(process.env.NODE_ENV === 'test') playDownloadedFile(vid.txid)
				resolve(true)
			})
	
			stream.on('error', (e: Error)=>{
				vid.complete = 'ERROR'
				filewriter.end()
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
				dbNoDataFound404(vid.txid)
				resolve(true)
			}else{
				logger(vid.txid, 'UNHANDLED ERROR in videoDownload', e.name, ':', e.message)
				reject(e)
			}
		}
	})//end Promise
}
