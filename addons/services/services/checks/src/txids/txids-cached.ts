import { s3GetObjectWebStream } from '../../../../libs/utils/s3-services'
import { readlineWeb } from '../../../../libs/utils/webstream-utils'
import { ListName } from '../types'


/** the txids in a list file, streamed straight from minio */
export const getBlockedTxids = async (list: ListName) => {
	const t0 = performance.now()
	const txids: string[] = []
	for await (const line of readlineWeb(await s3GetObjectWebStream(process.env.LISTS_BUCKET!, list))) {
		if (line) txids.push(line)
	}
	console.info(getBlockedTxids.name, list, `fetched ${txids.length} txids in ${(performance.now() - t0).toFixed(0)}ms.`)
	return txids
}
