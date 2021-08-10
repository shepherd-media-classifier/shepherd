import { TxRecord } from '../types'
import getDb from '../utils/db-connection'
import { logger } from '../utils/logger'

const db = getDb()

//serve cache for 5 mins
const timeout = 5 * 60 * 1000 // min 5 mins between list updates
let _lastBlack = 0
let _lastWhite = 0
let _whiteText = ''
let _blackText = ''

export const getBlacklist = async(black: boolean)=> {

	const now = new Date().valueOf()
	if(black){
		if(now - _lastBlack > timeout) _lastBlack = now
		else{ 
			logger('serving cached blacklist')
			return _blackText	
		}
	} else{
		if(now - _lastWhite > timeout) _lastWhite = now
		else{ 
			logger('serving cached whitelist')
			return _whiteText 
		}
	}

	const records = await db<TxRecord>('txs').where({flagged: black})
	logger('flagged txs retrieved', records.length)
	let text = ''
	for (const record of records) {
		text += record.txid + '\n'
	}

	if(black) _blackText = text
	else _whiteText = text
	
	return text
}

export const getBlacklistTestOnly = async(black: boolean)=> {

	const records = await db<TxRecord>('txs').where({flagged: black}).orderBy('id', 'desc')
	logger('flagged txs retrieved', records.length)
	let html = '<html><body style="font-family:\'Courier New\',monospace;"><h1>Number of records: ' + records.length + '</h1><table>\n'
	for (const record of records) {
		html += `<tr><td><a href="https://arweave.net/${record.txid}">${record.txid}</a></td><td>${record.content_size}</td><td>${record.content_type}</td><td>porn=${record.nsfw_porn}</td><td>sexy=${record.nsfw_sexy}</td><td>hentai=${record.nsfw_hentai}</td><td>drawings=${record.nsfw_drawings}</td><td>neutral=${record.nsfw_neutral}</td></tr>\n`
	}

	return html + '</table></body></html>'
}