import ffmpeg from 'ffmpeg'
import { VID_TMPDIR } from '../../constants'
import { logger } from '../../utils/logger'


export const createScreencaps = async(txid: string)=> {
	try{
		const folderpath = VID_TMPDIR + txid + '/'

		const video = await new ffmpeg(folderpath + txid)
		

		if(process.env.NODE_ENV === 'test'){
			console.log(txid, video.metadata)
			// //@ts-ignore
			// console.log(txid, video.info_configuration)
		}
		// video.setDisableAudio() 
		//@ts-ignore
		if(video.metadata.filename === ''){
			throw new Error('corrupt video data')
		}

		const duration = video.metadata.duration!.seconds
		// if(duration > 1){
		// 	video.setVideoStartTime(1)
		// }
		const frames = await video.fnExtractFrameToJPG(folderpath,{
			every_n_seconds: 10,
		})

		logger(txid, 'duration:', duration, 'number of screencaps:', (frames.length - 1)) //frames[0] is the video path

		return frames
	}catch(e){
		if(process.env.NODE_ENV === 'test'){
			logger(txid, 'error in createScreencaps', e.code)
			// logger(txid, 'error in createScreencaps', e.message)
		}
		throw e
	}
}

// export const createScreencapsFluentFfmpeg = async(txid: string)=> {
// 	try{
// 		const folderpath = VID_TMPDIR + txid + '/'

// 		const video = Fluent(folderpath + txid, { /*logger:*/ })//.withNoAudio().keepDisplayAspectRatio()
		
// 		if(process.env.NODE_ENV === 'test'){
// 			video.on('codecData', data=>{
// 				logger(txid, 'codecData', data.video)
// 			})
// 			video.ffprobe( (err, data)=> {
// 				if(err) logger(txid, 'ffprobe error', err)
// 				logger(txid, 'ffprobe', data)
// 			})
// 		}

// 		// video.on('stderr', e=>{
// 		// 	logger(txid, 'STDERR HERE:', e)
// 		// })

// 		video.on('error', e=>{
// 			logger(txid, 'ERRORRR', e.name )
// 			logger(txid, 'ERRORRR', e.message )
// 		})

// 		video.on('end', ()=> logger(txid, 'finished creating caps'))

// 		video.screenshots({
// 			count: 4,
// 			folder: folderpath,

// 		})

// 		return frames
// 	}catch(e){
// 		console.log(e.name, ':', e.message)
// 		throw e
// 	}
// }

