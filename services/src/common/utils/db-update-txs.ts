import { InflightsRecord, TxRecord } from '../shepherd-plugin-interfaces/types'
import getDbConnection from './db-connection'
import { logger } from '../shepherd-plugin-interfaces/logger'
import { slackLogger } from './slackLogger'


const knex = getDbConnection()


/** master update 'txs' function */
export const updateTxsDb = async(txid: string, updates: Partial<TxRecord>)=> {
	try{
		const checkId = await knex<TxRecord>('txs').where({txid}).update(updates, 'txid')
		const retTxid = checkId[0]?.txid
		if(retTxid !== txid){
			logger(txid, 'ERROR UPDATING txs DATABASE!', `(${JSON.stringify(updates)}) => ${checkId}`)
			slackLogger(txid, 'ERROR UPDATING txs DATABASE!', `(${JSON.stringify(updates)}) => ${checkId}`)
		}
		return retTxid;

	}catch(e:any){
		logger(txid, 'ERROR UPDATING txs DATABASE!', e.name, ':', e.message)
		slackLogger(txid, 'ERROR UPDATING txs DATABASE!', e.name, ':', e.message, JSON.stringify(updates))
		logger(txid, e) // `throw e` does nothing, use the return
	}
}
/** master update 'inbox_txs' function */
export const updateInboxDb = async(txid: string, updates: Partial<TxRecord>)=> {
	try{
		const checkId = await knex<TxRecord>('inbox_txs').where({txid}).update(updates, 'txid')
		const retTxid = checkId[0]?.txid
		if(retTxid !== txid){
			logger(txid, 'ERROR UPDATING inbox_txs DATABASE!', `(${JSON.stringify(updates)}) => ${checkId}`)
			slackLogger(txid, 'ERROR UPDATING inbox_txs DATABASE!', `(${JSON.stringify(updates)}) => ${checkId}`)
		}
		return retTxid;

	}catch(e:any){
		logger(txid, 'ERROR UPDATING inbox_txs DATABASE!', e.name, ':', e.message)
		slackLogger(txid, 'ERROR UPDATING inbox_txs DATABASE!', e.name, ':', e.message, JSON.stringify(updates))
		logger(txid, e) // `throw e` does nothing, use the return
	}
}

export const dbInflightDel = async(txid: string)=> {
	try{
		const ret = await knex<InflightsRecord>('inflights').where({ txid, }).del('txid')
		if(ret[0]?.txid !== txid){
			logger(txid, 'DB_ERROR DELETING FROM INFLIGHTS', ret)
			return;
		}
		return ret[0].txid;
	}catch(e:any){
		logger(txid, 'DB_ERROR DELETING FROM INFLIGHTS', e.name, ':', e.message)
		logger(txid, e) // `throw e` does nothing, use the return
	}
}

export const dbInflightAdd = async(txid: string)=> {
	try{
		const ret = await knex<InflightsRecord>('inflights').insert({ txid }, 'txid')

		if(ret[0].txid !== txid){
			logger(txid, 'DB_ERROR ADDING TO INFLIGHTS', ret)
		}
		return ret[0].txid;
	}catch(e:any){
		logger(txid, 'DB_ERROR ADDING TO INFLIGHTS', e.name, ':', e.message)
		slackLogger(txid, 'DB_ERROR ADDING TO INFLIGHTS', e.name, ':', e.message)
		logger(txid, e) // `throw e` does nothing, use the return
	}	
}


export const dbNoDataFound404 = async(txid: string)=> {
	await dbInflightDel(txid)
	return updateInboxDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: '404',
		last_update_date: new Date(),
	})
}

export const dbNoDataFound = async(txid: string)=> {
	await dbInflightDel(txid)
	return updateInboxDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: 'nodata',
		last_update_date: new Date(),
	})
}
export const dbNegligibleData = async(txid: string)=> {
	await dbInflightDel(txid)
	return updateInboxDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: 'negligible-data',
		last_update_date: new Date(),
	})
}
export const dbMalformedXMLData = async(txid: string)=> {
	await dbInflightDel(txid)
	return updateInboxDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: 'MalformedXML-data',
		last_update_date: new Date(),
	})
}

export const dbCorruptDataConfirmed = async(txid: string)=> {
	return updateInboxDb(txid,{
		flagged: false,
		valid_data: false,
		data_reason: 'corrupt',
		last_update_date: new Date(),
	})
}

export const dbCorruptDataMaybe = async(txid: string)=> {
	return updateInboxDb(txid,{
		// flagged: false, <= try filetype detection first
		valid_data: false,
		data_reason: 'corrupt-maybe',
		last_update_date: new Date(),
	})
}

export const dbPartialImageFound = async(txid: string)=> {
	return updateInboxDb(txid,{
		// flagged: <= cannot flag yet! display with puppeteer & rate again
		valid_data: false, // this removes it from current queue
		data_reason: 'partial',
		last_update_date: new Date(),
	})
}

export const dbPartialVideoFound = async(txid: string)=> {
	slackLogger(txid, 'info: `partial-seed` video found, gets retried until done?') //check if these actually happen
	return updateInboxDb(txid,{
		// flagged: undefined,  // this gets set in the normal way in another call
		// valid_data: undefined,
		data_reason: 'partial-seed', //check later if fully seeded. these never occurred?
		last_update_date: new Date(),
	})
}

export const dbOversizedPngFound = async(txid: string)=> {
	return updateInboxDb(txid,{
		// flagged: <= cannot flag yet! use tinypng, then rate again
		valid_data: false, // this removes it from current queue
		data_reason: 'oversized',
		last_update_date: new Date(),
	})
}

export const dbWrongMimeType = async(txid: string, content_type: string)=> {
	const nonMedia = !content_type.startsWith('image') && !content_type.startsWith('video')
	return updateInboxDb(txid,{
		// this will be retried in the relevant queue or:
		...(nonMedia && {
			flagged: false,
			valid_data: false,
		}),
		content_type,
		data_reason: 'mimetype',
		last_update_date: new Date(),
	})
}

export const dbUnsupportedMimeType = async(txid: string)=> {
	return updateInboxDb(txid,{
		// flagged: <= cannot flag yet! display with puppeteer & rate again
		valid_data: false, // this removes it from current queue
		data_reason: 'unsupported',
		last_update_date: new Date(),
	})
}

/** retrieve a single TxRecord by txid */
export const getTxRecord = async(txid: string)=> {
	try{
		const ret = await knex<TxRecord>('inbox_txs').where({ txid })
		if(ret.length === 0) throw new Error('No inbox tx record found.')
		return ret[0];
	}catch(e:any){
		logger(txid, 'Error getting inbox tx record', e.name, ':', e.message, JSON.stringify(e))
		slackLogger(txid, 'Error getting inbox tx record', e.name, ':', e.message, JSON.stringify(e))
		throw e;
	}
}