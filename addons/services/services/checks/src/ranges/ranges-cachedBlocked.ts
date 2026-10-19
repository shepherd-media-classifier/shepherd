import { s3GetObjectWebStream } from "../../../../libs/utils/s3-services"
import { readlineWeb } from "../../../../libs/utils/webstream-utils"


export type ByteRange = [number, number]

/** rangelist.txt (already merged), streamed straight from minio */
export const getBlockedRanges = async () => {
	const t0 = performance.now()
	const ranges: ByteRange[] = []
	for await (const line of readlineWeb(await s3GetObjectWebStream(process.env.LISTS_BUCKET!, 'rangelist.txt'))) {
		if (!line) continue
		const [start, end] = line.split(',').map(Number)
		ranges.push([start, end])
	}
	console.info(getBlockedRanges.name, `fetched ${ranges.length} ranges in ${(performance.now() - t0).toFixed(0)}ms.`)
	return ranges
}
