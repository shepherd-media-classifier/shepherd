import { slackLog } from '../../../libs/utils/slackLog'
import knexCreate from '../../../libs/utils/knexCreate'
import { initLists } from '../../../libs/s3-lists/update-lists'
import { getOwnersTablenames } from '../../../libs/block-owner/owner-table-utils'
import { s3GetObject } from '../../../libs/utils/s3-services'
import { ownerIngestLoop } from './owner-blocking/owner-ingest'
import { tipLoop } from './index-by-height'
import { ownerChecks } from './owner-blocking'
import { feedServer } from './feed/server'


/** catch all unhandled server errors */
process.on('uncaughtException', (e, origin) => {
	slackLog('[indexer-next] uncaught exception', JSON.stringify({ e, origin })).then(() => process.exit(1))
})
process.on('unhandledRejection', (reason, promise) => {
	slackLog('[indexer-next] unhandled rejection', JSON.stringify({ promise, reason })).then(() => process.exit(1))
})



/** check this stuff right at the entrypoint */
if (!process.env.LISTS_BUCKET) throw new Error('missing env var, LISTS_BUCKET')

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const knex = knexCreate()


/** restart on errors */
while (true) {
	try {

		/* knex migrate:latest */
		const [batchNo, logs] = await knex.migrate.latest({
			directory: new URL('../migrations/', import.meta.url).pathname,
			// tableName: 'knex_migrations_wallets',
		})
		if (logs.length !== 0) {
			console.info('migrate >>', 'Database upgrades complete', batchNo, logs)
			console.info('migrate >>', 'now running vacuum...')
			await knex.raw('vacuum verbose analyze;')
			const vacResults = await knex.raw('SELECT relname, last_vacuum, last_autovacuum FROM pg_stat_user_tables;')
			for (const row of vacResults.rows) {
				console.info('migrate >> vacuum results:', JSON.stringify(row))
			}
		} else {
			console.info('migrate >>', 'Database upgrade not required', batchNo, logs)
		}

		/** initialise lists if necessary, i.e. missing or behind due to error */
		let ownerRows = 0
		for (const t of await getOwnersTablenames()) ownerRows += Number((await knex(t).count({ n: '*' }))[0].n)
		const flaggedRows = Number((await knex('txs').where({ flagged: true }).count({ n: '*' }))[0].n)
		const [flaggedLines, ownerLines] = await Promise.all(['txidflagged.txt', 'txidowners.txt'].map(key =>
			s3GetObject(process.env.LISTS_BUCKET!, key).then(text => text.split('\n').length - 1, () => -1)
		))
		if (flaggedLines !== flaggedRows || ownerLines !== ownerRows)
			await initLists()
		else
			console.info('lists match the db, not rebuilding', JSON.stringify({ flaggedRows, ownerRows }))

		/** start ingest loops. n.b. never return, have own catch loops */
		ownerIngestLoop()
		ownerChecks()
		// tipLoop({})
		feedServer()

		break;
	} catch (err: unknown) {
		const e = err as Error
		await slackLog(
			'indexer-next startup failed.',
			`Fatal error ❌ ${e.name}:${e.message}\n`,
			e,
			'\nrestarting in 30 seconds...'
		)
		await sleep(30_000)
	}
}
