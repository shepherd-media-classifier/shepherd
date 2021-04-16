import { TxRecord } from '../types'
import getDb from '../utils/db-connection'
import { logger } from '../utils/logger'

const db = getDb()
const prefix = 'server'

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
			logger(prefix, 'serving cached blacklist')
			return _blackText	
		}
	} else{
		if(now - _lastWhite > timeout) _lastWhite = now
		else{ 
			logger(prefix, 'serving cached whitelist')
			return _whiteText 
		}
	}

	const records = await db<TxRecord>('txs').where({flagged: black})
	logger(prefix, 'flagged txs retrieved', records.length)
	let text = ''
	for (const record of records) {
		text += record.txid + '\n'
	}

	if(black) _blackText = text
	else _whiteText = text
	
	return text
}

export const getBlacklistTestOnly = async(black: boolean)=> {

	const records = await db<TxRecord>('txs').where({flagged: black})
	logger(prefix, 'flagged txs retrieved', records.length)
	let html = '<html><body style="font-family:\'Courier New\',monospace;"><h1>Number of records: ' + records.length + '</h1><p>\n'
	for (const record of records) {
		html += `<a href="https://arweave.net/${record.txid}">${record.txid}</a> ${record.content_size} ${record.content_type} porn=${record.nsfw_porn} sexy=${record.nsfw_sexy} hentai=${record.nsfw_hentai} drawings=${record.nsfw_drawings} neutral=${record.nsfw_neutral} <br/>\n`
	}

	return html + '</p></body></html>'
}