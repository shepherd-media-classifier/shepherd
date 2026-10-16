/**
 * Manually rebuild the txt lists. Skips the redis lock, so it works while a hung run holds it.
 *
 * Usage:
 *   npx tsx tools/BUILD-TXT-LISTS.ts
 *
 * Required env vars: DB_HOST, LISTS_BUCKET, REDIS_HOST (+ AWS S3 credentials)
 */
import '../tests/_import-test-env-vars'
import { buildTxtLists } from '../libFunctions/updateTxtLists/index'
//make it stop
import pgClient from '../libs/utils/pgClient'
import { redis } from '../libs/utils/redis-state'


console.info(`Running ${buildTxtLists.name}...`)
const t0 = Date.now()
try {
	const result = await buildTxtLists()
	console.info(`${buildTxtLists.name} completed in ${((Date.now() - t0) / 1000).toFixed(1)}s. Result:`, result)
} catch (e) {
	console.error(`${buildTxtLists.name} failed after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, e)
} finally {
	await pgClient.end()
	redis.disconnect()
}
