import { TxRecord } from '../types'
import getDbConnection from '../utils/db-connection'
const db = getDbConnection()

export const noDataFound404 = async(txid: string)=> {

	await db<TxRecord>('txs').where({txid}).update({
		flagged: false,
		valid_data: false,
		data_reason: '404',
		last_update_date: new Date(),
	})

}

export const corruptDataFound = async(txid: string)=> {
	
	await db<TxRecord>('txs').where({txid}).update({
		flagged: false,
		valid_data: false,
		data_reason: 'corrupt',
		last_update_date: new Date(),
	})
	
}

export const corruptDataFoundMaybe = async(txid: string)=> {
	
	await db<TxRecord>('txs').where({txid}).update({
		// flagged: false, <= try filetype detection first
		valid_data: false,
		data_reason: 'corrupt',
		last_update_date: new Date(),
	})
	
}

export const partialDataFound = async(txid: string)=> {
	
	await db<TxRecord>('txs').where({txid}).update({
		// flagged: <= cannot flag yet!
		valid_data: false,
		data_reason: 'partial',
		last_update_date: new Date(),
	})
	
}

export const oversizedPngFound = async(txid: string)=> {

	await db<TxRecord>('txs').where({txid}).update({
		// flagged: <= cannot flag yet!
		valid_data: false,
		data_reason: 'oversized',
		last_update_date: new Date(),
	})
	
}

export const timeoutOccurred = async(txid: string)=> {

	await db<TxRecord>('txs').where({txid}).update({
		// flagged: <= need recheck: may be due to other delay during timeout or data not seeded yet
		valid_data: false,
		data_reason: 'timeout',
		last_update_date: new Date(),
	})
	
}