import { gqlHeight as gqlHeightOrig } from "./gql-height"
import { gqlPages } from "../index-shared/query-processor"
import pool from '../../../../libs/utils/pgClient'
const sleepOrig = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))


const GQL_URL = process.env.GQL_URL as string //ario by default
const GQL_URL_SECONDARY = process.env.GQL_URL_SECONDARY as string //goldsky by default
console.info(`GQL_URL: ${GQL_URL}`)
console.info(`GQL_URL_SECONDARY : ${GQL_URL_SECONDARY}`)
if (!GQL_URL) throw new Error('GQL_URL not set')
if (!GQL_URL_SECONDARY) throw new Error('GQL_URL_SECONDARY not set')



export const tipLoop = async (
	/* dependency injection for test */
	{
		loop = true,
		sleep = sleepOrig,
		gqlHeight = gqlHeightOrig,
		gqlQuery = gqlQueryOrig,
	},
) => {
	let pass1 = (await pool.query(`SELECT value FROM states WHERE pname = 'indexer_pass1'`)).rows[0].value
	let pass2 = (await pool.query(`SELECT value FROM states WHERE pname = 'indexer_pass2'`)).rows[0].value
	if (pass2 === 0) {
		pass1 = pass2 = (await gqlHeight(GQL_URL)) - 4 - 30 // seed: 30 block lookback for goldsky lag at cutover/migration
		await pool.query(`UPDATE states SET value = $1 WHERE pname IN ('indexer_pass1', 'indexer_pass2')`, [pass1])
	}
	do {
		const tip = await gqlHeight(GQL_URL)
		/* one block per query, state written after each: a failure only costs the block in flight */
		while (pass1 < tip) {
			await gqlQuery({ height: pass1 + 1, indexName: 'indexer_pass1' })
			await pool.query(`UPDATE states SET value = $1 WHERE pname = 'indexer_pass1'`, [++pass1])
		}
		while (pass2 < tip - 4) {
			await gqlQuery({ height: pass2 + 1, indexName: 'indexer_pass2' })
			await pool.query(`UPDATE states SET value = $1 WHERE pname = 'indexer_pass2'`, [++pass2])
		}
		await sleep(30_000)
	} while (loop)
}

const gqlQueryOrig = async ({ height, indexName }: { height: number, indexName: string }) => {
	console.debug(indexName, 'querying block', height)
	const query = `query($cursor: String, $height: Int) {
		transactions(
			block: {
				min: $height,
				max: $height,
			}
			first: 100
			after: $cursor
		) {
			pageInfo { hasNextPage }
			edges {
				cursor
				node{
					id
					data{ size type }
					tags{ name value }
					block{ height }
					parent{ id }
					owner{ address }
				}
			}
		}
	}`
	const variables = {
		height,
	}

	//call generic handler
	await gqlPages({
		query,
		variables,
		indexName,
		gqlUrl: GQL_URL, //arweave.net
		gqlUrlBackup: GQL_URL_SECONDARY, //goldsky.com
		streamSourceName: 'nodes',
	})
}