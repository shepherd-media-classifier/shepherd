import fs from 'fs'
import { HOST_URL } from '../../constants'
import { TxRecord } from '../../types'
import { logger } from '../../utils/logger'
import { NsfwTools } from "../image-rater"
import { updateDb } from '../mark-txs'


const prefix = 'nsfwtool'

export const checkFrames = async(frames: string[], txid: string)=> {
	const videopath = frames.shift()
	if(frames.length === 0) throw new Error(txid + ' Error: no frames to check')

	const vidUrl = HOST_URL + '/' + videopath!.split('/').pop()

	//go through caps. break if nsfw found
	let flagged = false
	let score: Partial<{nsfw_hentai: number, nsfw_porn: number, nsfw_sexy: number }> = {}

	for (const frame of frames) {
		const pic = fs.readFileSync(frame)
		const predictions = await NsfwTools.checkImage(pic)
		const class1 = predictions[0].className
		const prob1 = predictions[0].probability
		
		if(class1 === 'Hentai'){
			if(prob1 >= 0.5){
				logger(txid, 'hentai video detected', vidUrl)
				flagged = true
				score.nsfw_hentai = prob1
			}else{
				logger(txid, 'hentai < 0.5', vidUrl)
			}
			break;
		}
		if(class1 === 'Porn'){
			logger(txid, 'porn video detected', vidUrl)
			flagged = true
			score.nsfw_porn = prob1
			break;
		}
		if(class1 === 'Sexy'){
			logger(txid, 'sexy video detected', vidUrl)
			flagged = true
			score.nsfw_sexy = prob1
			break;
		}
	}
	if(!flagged){ 
		logger(txid, 'video clean', vidUrl)
	}
	if(process.env.NODE_ENV !== 'production'){
		logger(txid, flagged, score, vidUrl)
	}

	return updateDb(txid,{
		flagged,
		valid_data: true,
		...(true && score), //use some spread trickery to add non-null (or zero value) keys
		last_update_date: new Date(),
	})
}




