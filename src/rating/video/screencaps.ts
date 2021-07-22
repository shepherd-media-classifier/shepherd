import { VID_TMPDIR } from '../../constants'
import { logger } from '../../utils/logger'
import { execSync } from 'child_process'
import shelljs from 'shelljs'
import { FfmpegError } from '../../types'


export const createScreencaps = async(txid: string)=> {
	try {
		const folderpath = VID_TMPDIR + txid + '/'
		/**
		 * TODO: Perhaps skipping the first second of video makes sense - depending on the length of video of course - I am thinking fade-ins
		 * - check video duration <= requires extra initial call to ffmpeg or ffprobe
		 * - regex the duration from the output
		 * - conditionally add option "-ss 00:00:01" if video longer than 2 seconds?
		 */
		const command = `ffmpeg -i ${folderpath}${txid} -r 1/6 ${folderpath}${txid}-%03d.png`
		execSync(command,{ stdio: 'pipe' })
		
		let list = shelljs.ls(folderpath)
		let frames: string[] = []
		for(const fname of list) {
			frames.push(folderpath + fname)
		}
		
		if(process.env.NODE_ENV === 'test'){
			logger(txid, command)
			logger(txid, frames)
		}
		logger(txid, 'number of screencaps:', (frames.length - 1))

		return frames

	}catch(e){
		const errMsg = e.message.split(':').pop().trim()
		logger(txid, e.name, ':', errMsg, e.status)
		const err: FfmpegError = { name: e.name, message: errMsg, status: e.status }
		throw err
	}
}



