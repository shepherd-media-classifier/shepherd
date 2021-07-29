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

export const processVids = async()=> {
	
	/* check if any vids finished downloading & process */

	for (const dl of downloads) {
		if(dl.complete === 'TRUE'){
			logger(dl.txid, 'begin processing')
			
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
}

