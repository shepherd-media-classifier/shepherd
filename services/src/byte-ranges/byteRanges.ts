import { logger } from '../common/utils/logger'
import { updateTxsDb } from '../common/utils/db-update-txs'
import { ByteRange, txidToRange } from './txidToRange/txidToRange'
import { slackLogger } from '../common/utils/slackLogger'


/** this is used in retrospective syncing */
export const byteRangesUpdateDb = async (id: string, parent: string | null, parents: string[] | undefined, tablename: string = 'txs') => {

	/* update database - (expensive to do this separately, consider combined operation) */

	const chunkRange = await getByteRange(id, parent, parents)

	/** rare retrospective update, so go direct to output table */
	const checkId = await updateTxsDb(
		id,
		{
			byte_start: chunkRange.start.toString(),
			byte_end: chunkRange.end.toString(),
		},
		tablename,
	)
	if(checkId !== id){
		throw new Error(`Error writing byte-range to database! Wanted '${id}'. Returned '${checkId}'.`)
	}

	return chunkRange
}

/** just returns the byte-range for the id */
export const getByteRange = async (id: string, parent: string | null, parents: string[] | undefined) => {

	/* get byte-range (if applicable) */

	let chunkRange: ByteRange = { start: -1n, end: -1n }
	try{
		chunkRange = await txidToRange(id, parent, parents)
	}catch(err:unknown){
		const e = err as Error
		logger(getByteRange.name, 'UNHANLDED error', e.name, e.message, `id:${id}, parent:${parent}, parents:${parents}}`, e)
		slackLogger(getByteRange.name, 'UNHANLDED error', e.name, e.message, `id:${id}, parent:${parent}, parents:${parents}}`)
	}

	return chunkRange
}

