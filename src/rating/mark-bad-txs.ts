import { TxRecord } from '../types'
import getDbConnection from '../utils/db-connection'
import { logger } from '../utils/logger'
const db = getDbConnection()


const updateDb = async(txid: string, updates: Partial<TxRecord>)=> {
	try{

		return await db<TxRecord>('txs').where({txid}).update(updates, ['txid'])

	}catch(e){
		logger(txid, 'ERROR WRITING TO DATABASE!', e.name, ':', e.message)
		logger(txid, e) // `throw e` does nothing, use return
	}
}



export const noDataFound404 = async(txid: string)=> {
	return updateDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: '404',
		last_update_date: new Date(),
	})
}

export const noDataFound = async(txid: string)=> {
	return updateDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: 'nodata',
		last_update_date: new Date(),
	})
}

export const corruptDataConfirmed = async(txid: string)=> {
	return updateDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: 'corrupt',
		last_update_date: new Date(),
	})
}

export const corruptDataMaybe = async(txid: string)=> {
	return updateDb(txid,{
		// flagged: false, <= try filetype detection first
		valid_data: false,
		data_reason: 'corrupt',
		last_update_date: new Date(),
	})
}

export const partialDataFound = async(txid: string)=> {
	return updateDb(txid,{
		// flagged: <= cannot flag yet! display with puppeteer & rate again
		valid_data: false,
		data_reason: 'partial',
		last_update_date: new Date(),
	})
}

export const oversizedPngFound = async(txid: string)=> {
	return updateDb(txid,{
		// flagged: <= cannot flag yet! use tinypng, then rate again
		valid_data: false,
		data_reason: 'oversized',
		last_update_date: new Date(),
	})
}

export const timeoutInBatch = async(txid: string)=> {
	return updateDb(txid,{
		// flagged: <= need recheck: may be due to other delay during timeout or data not seeded yet
		valid_data: false,
		data_reason: 'timeout',
		last_update_date: new Date(),
	})
}

export const wrongMimeType = async(txid: string, content_type: string)=> {
	return updateDb(txid,{
		// this will be retried in the relevant queue
		content_type,
		data_reason: 'mimetype',
		last_update_date: new Date(),
	})
}

