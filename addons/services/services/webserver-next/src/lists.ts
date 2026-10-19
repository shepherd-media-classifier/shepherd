import { Readable, Writable } from 'stream'
import { pipeline } from 'stream/promises'
import { ReadableStream } from 'stream/web'
import { s3GetObjectWebStream, s3HeadObject } from '../../../libs/utils/s3-services'

if (!process.env.LISTS_BUCKET) throw new Error('missing env var, LISTS_BUCKET')
console.debug('LISTS_BUCKET', process.env.LISTS_BUCKET)

export type GetListPath = ('/addresses.txt'
	| '/blacklist.txt'
	| '/rangelist.txt'
	| '/rangeflagged.txt'	//needed for shep-v
	| '/rangeowners.txt'	//needed for shep-v
	| '/testing.txt'
	| `${string}/txids.txt`		//addons
	| `${string}/ranges.txt`	//addons
	| '/reported/txids.txt'
)

export const getETag = async (path: GetListPath) => {
	const key = path.replace(/^\//, '') //remove starting `/`
	const etag = (await s3HeadObject(process.env.LISTS_BUCKET!, key)).ETag!
	console.info(`${getETag.name}(${path}) head request. etag: ${etag}`)
	return etag
}

/** stream the list straight from minio, as stored */
export const getList = async (response: Writable, path: GetListPath) => {
	const res = response as Writable & { setHeader?: (k: string, v: string) => void }
	if (typeof res.setHeader === 'function') res.setHeader('eTag', await getETag(path))
	const stream = await s3GetObjectWebStream(process.env.LISTS_BUCKET!, path.replace(/^\//, ''))
	await pipeline(Readable.fromWeb(stream as ReadableStream), res) //sdk types it as the dom ReadableStream
}
