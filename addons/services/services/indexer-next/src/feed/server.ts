import express from 'express'
import { GQLEdgeInterface } from 'ar-gql/dist/faces'
import { slackLog } from '../../../../libs/utils/slackLog'
import { verifyReport } from './verify'
import { canonicalOwner, dispatchEdges, limit } from '../index-shared/query-processor'


const prefix = 'feed'
const port = 85
const MAX_PENDING_BATCHES = 50 //shared with gqlPages. past this the node drops the page and the gql indexer covers it

/** node address => name */
const feedNodes: Record<string, string> = JSON.parse(process.env.HB_FEED_NODES || '{}')

interface FeedItem {
	id: string
	data: { size: string, type?: string }
	tags: { name: string, value: string }[]
	owner: { address: string, key: string }
}

/** ids go into raw sql in filterMetas, so check them strictly */
const isItem = (i: any): i is FeedItem =>
	/^[a-zA-Z0-9_-]{43}$/.test(i?.id)
	&& /^\d+$/.test(i?.data?.size)
	&& ['undefined', 'string'].includes(typeof i.data.type)
	&& Array.isArray(i.tags) && i.tags.every((t: any) => typeof t?.name === 'string' && typeof t?.value === 'string')
	&& typeof i.owner?.key === 'string'

let pageCount = 0

const ingest = async (items: FeedItem[], name: string) => {
	const edges = [...new Map(items.map(i => [i.id, i])).values()].map(i => ({
		cursor: '',
		node: { ...i, owner: { address: canonicalOwner(i.owner.key), key: i.owner.key }, block: null, parent: null },
	}) as unknown as GQLEdgeInterface)

	const results = await dispatchEdges(edges, `${name}-${pageCount++}`, `feed-${name}`, prefix)

	const sum = (f: (r: typeof results[number]) => number) => results.reduce((acc, r) => acc + f(r), 0)
	console.info(prefix, `${name}: ${edges.length} items, ${sum(r => r.numQueued)} queued, ${sum(r => r.numUpdated)} inserts, ${sum(r => r.errored.length)} errored`)
}

export const feedServer = () => {
	const app = express()

	app.post('/feed', express.raw({ type: () => true, limit: '1mb' }), (req, res) => {
		let signer: string
		try {
			signer = verifyReport(req.headers, req.body)
		} catch (e) {
			console.warn(prefix, '401', (e as Error).message, req.headers['x-forwarded-for'])
			return res.sendStatus(401)
		}
		const name = feedNodes[signer]
		if (!name) {
			console.warn(prefix, '403', `unknown signer ${signer}`, req.headers['x-forwarded-for'])
			return res.sendStatus(403)
		}

		let items: unknown
		try {
			items = JSON.parse(req.body.toString()).items
		} catch (e) { }
		if (!Array.isArray(items) || !items.every(isItem)) {
			console.warn(prefix, '400', `malformed report from ${name}`)
			return res.sendStatus(400)
		}

		if (limit.pendingCount > MAX_PENDING_BATCHES) {
			console.warn(prefix, '503', `${limit.pendingCount} batches pending, dropping ${items.length} items from ${name}`)
			return res.sendStatus(503)
		}

		res.sendStatus(202)
		ingest(items, name).catch(e => slackLog(prefix, name, 'ingest failed', String(e)))
	})

	return app.listen(port, () => console.info(prefix, `listening on ${port}. nodes: ${Object.values(feedNodes).join(', ') || 'none'}`))
}
