import { getByteRange } from '../byte-ranges/byteRanges'
import { APIFilterResult } from '../common/shepherd-plugin-interfaces'
import { logger } from '../common/utils/logger'
import { dbCorruptDataConfirmed, dbCorruptDataMaybe, dbInflightDel, dbOversizedPngFound, dbPartialImageFound, dbUnsupportedMimeType, dbWrongMimeType, getTxFromInbox, updateInboxDb } from '../common/utils/db-update-txs'
import { slackLogger } from '../common/utils/slackLogger'
import { slackLoggerPositive } from '../common/utils/slackLoggerPositive'
import { moveInboxToTxs } from './move-records'
import { doneAdd } from './done-records'



let count = 0
export const pluginResultHandler = async(body: APIFilterResult)=>{
	const txid = body.txid
	const result = body.filterResult

	const c = ++count
	logger(txid, `handler begins. count ${c}`)

	if((typeof txid !== 'string') || txid.length !== 43){
		logger('Fatal error',`txid is not defined correctly: ${body?.txid}`)
		throw new TypeError('txid is not defined correctly')
	}

	try{

		if(result.flagged !== undefined){
			if(result.flagged === true){
				logger(txid, JSON.stringify(body))
				slackLoggerPositive('matched', JSON.stringify(body))
			}
			if(result.flag_type === 'test'){
				slackLogger('✅ *Test Message* ✅', JSON.stringify(body))
			}

			let byte_start, byte_end
			if(
				Number(result.top_score_value) > 0.9
				|| result.flagged === true
			){
				try{
					/** get the tx data from the database */
					const record = await getTxFromInbox(txid)

					/** sqs messages can be read more than once */
					if(!record){
						logger(txid, pluginResultHandler.name, 'record not found in inbox. assuming multi read of sqs mesg', JSON.stringify(result))
						return
					}

					/** calculate the byte range */
					const { start, end } = await getByteRange(txid, record.parent, record.parents)
					byte_start = start.toString()
					byte_end = end.toString()

					console.log(txid, `calculated byte-range ${byte_start} to ${byte_end}`)
				}catch(err:unknown){
					const e = err as Error
					logger(txid, `Error calculating byte-range: ${e.name}:${e.message}`, JSON.stringify(e))
					slackLogger(txid, pluginResultHandler.name, `Error calculating byte-range: ${e.name}:${e.message}`, JSON.stringify(e))
				}
			}

			const res = await updateInboxDb(txid, {
				flagged: result.flagged,
				valid_data: true,
				...(result.flag_type && { flag_type: result.flag_type}),
				...(result.top_score_name && { top_score_name: result.top_score_name}),
				...(result.top_score_value && { top_score_value: result.top_score_value}),
				...(byte_start && { byte_start, byte_end }),
				last_update_date: new Date(),
			})

			if(res !== txid){
				logger('Fatal error', `Could not update database. "${res} !== ${txid}"`)
				slackLogger('Fatal error', `Could not update database. "${res} !== ${txid}"`)
				throw new Error('Could not update database')
			}

			/** flagged records go straight to txs */
			if(result.flagged === true){
				try{
					const moved = await moveInboxToTxs([txid])
					if( moved !== 1 ){
						slackLogger(`${txid}. ${moveInboxToTxs.name} returned '${moved}' not '1'`)
						throw new Error(`${txid}. ${moveInboxToTxs.name} returned '${moved}' not '1'`)
					}
					return
				}catch(e){
					logger(txid, 'Error moving flagged record from inbox to txs', JSON.stringify(e))
					slackLogger(txid, 'Error moving flagged record from inbox to txs', JSON.stringify(e))
				}
			}else{
				await doneAddTested(txid)
			}

		}else if(result.data_reason === undefined){
			logger(txid, 'data_reason and flagged cannot both be undefined. deleting from inflights.')
			await dbInflightDel(txid)
			throw new TypeError('data_reason and flagged cannot both be undefined')
		}else{
			switch (result.data_reason){
			case 'corrupt-maybe':
				await dbCorruptDataMaybe(txid)
				break
			case 'corrupt':
				await dbCorruptDataConfirmed(txid)
				break
			case 'oversized':
				await dbOversizedPngFound(txid)
				break
			case 'partial':
				await dbPartialImageFound(txid)
				break
			case 'unsupported':
				await dbUnsupportedMimeType(txid)
				break
			case 'mimetype':
				await dbWrongMimeType(txid, result.err_message!)
				break
			case 'retry':
				await dbInflightDel(txid) //this is all we actually want done
				return

			default:
				logger(pluginResultHandler.name, 'UNHANDLED plugin result in http-api', txid)
				slackLogger(pluginResultHandler.name, 'UNHANDLED plugin result in http-api', txid)
				throw new Error('UNHANDLED plugin result in http-api:\n' + JSON.stringify(result))
			}
			await doneAddTested(txid)
		}
	} finally {
		// await dbInflightDel(txid)
		logger(txid, `handler finished. count ${c}`)
	}
}

const doneAddTested = async(txid: string)=> {
	const record = await getTxFromInbox(txid)
	if(record){
		if(record.flagged !== undefined || record.valid_data !== undefined){
			logger(txid, 'flagged or valid_data set. calling doneAdd')
			await doneAdd(txid, record.height)
		}else{
			logger(txid, 'flagged or valid_data not set.')
		}
	}
}
