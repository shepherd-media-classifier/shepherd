import pg, { batchInsertFnOwner, ownerToTablename } from './utils/pgClient'
import { slackLog } from './utils/slackLog'
import { OwnerTableRecord } from '../../types'
import { getByteRange } from '../../libs/byte-ranges/byteRanges'
import { GQLEdgeInterface } from 'ar-gql/dist/faces'
import { min_data_size } from '../../libs/constants'


/** the handler will receive 1 page of blocked wallet results. 
 * potentially for different wallets, but at scale only from 1 wallet.
 */
export const handler = async (event: any) => {
	try {
		const inputs = event as { page: GQLEdgeInterface[], pageNumber: number }
		if (!inputs.page || !Array.isArray(inputs.page) || inputs.page.length === 0) {
			throw new Error('missing inputs. should have { "page": "GQLEdgeInterface[non-zero]", "pageNumber": "number" }')
		}
		console.info(`processing page ${inputs.pageNumber}, ${inputs.page.length} items`)

		/** new plan:
		 * receive page of gql nodes for different blocked wallets
		 * build records for each node
		 * add them to separate record arrays for each wallet
		 * batch insert each wallet"s records
		 */

		let records: { [owner: string]: OwnerTableRecord[] } = {}

		await Promise.all(inputs.page.map(async ({ node }) => {

			/** skip small files */
			if (node.data.size !== null && +node.data.size < min_data_size) {
				console.log(`file too small, size: ${node.data.size}, txid: ${node.id}`)
				return;
			}

			/** skip bundles & redstone-oracles. arweave.net 400s on tag `op: NEQ` so no gql filter */
			if (node.tags.some(t => t.name.toLowerCase() === 'bundle-version' || (t.name.toLowerCase() === 'type' && t.value === 'redstone-oracles'))) return;

			/** build records */
			const txid = node.id
			const parent = node.parent?.id || null
			const parents = undefined
			let owner = node.owner.address
			if (owner.length !== 43) owner = (await pg.query(`SELECT owner FROM owners_list WHERE owner_native = $1`, [owner])).rows[0].owner

			/** calculate byte-range */
			const range = await getByteRange(txid, parent, parents)

			if (range.start === -1n) {
				console.error(`Error in range calculation for txid: ${txid}`)
				return;
			}

			/** add to records */
			if (!records[owner]) records[owner] = []

			records[owner].push({
				txid,
				parent,
				parents,
				byte_start: range.start.toString(),
				byte_end: range.end.toString(),
			})
		})) //eo promise.all(map)

		/** batch insert this pages results */
		const counts: { [owner: string]: number; total: number } = { total: 0 }
		for (const key of Object.keys(records)) {
			const inserted = await batchInsertFnOwner(records[key], ownerToTablename(key))

			if (!counts[key]) counts[key] = 0
			counts[key] += inserted!
			counts.total += inserted!
		}


		//@ts-expect-error null is incorrect type, but we just want gc
		records = null

		console.info(`completed processing page ${inputs.pageNumber} ${JSON.stringify(counts)}`)

		return counts
	} catch (err: unknown) {
		const e = err as Error
		await slackLog('fnOwner.handler', `Fatal error ❌ ${e.name}:${e.message}`, JSON.stringify(e))
		throw e
	}
}
