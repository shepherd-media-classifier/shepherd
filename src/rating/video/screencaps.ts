import ffmpeg from 'ffmpeg'
import { VID_TMPDIR } from '../../constants'
import { logger } from '../../utils/logger'


export const createScreencaps = async(txid: string)=> {
	const folderpath = VID_TMPDIR + txid + '/'

	const video = await new ffmpeg(folderpath + txid)
	// logger(txid, video.metadata)

	const duration = video.metadata.duration!.seconds
	if(duration > 1){
		video.setVideoStartTime(1)
	}
	const frames = await video.fnExtractFrameToJPG(folderpath,{
		every_n_seconds: 10,
	})

	logger(txid, 'duration:', duration, 'number of screencaps:', (frames.length - 1)) //frames[0] is the video path

	return frames
}

