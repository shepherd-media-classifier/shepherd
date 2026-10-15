import pool from '../../../../libs/utils/pgClient'
import { s3GetObjectWebStream } from '../../../../libs/utils/s3-services'
import { readlineWeb } from '../../../../libs/utils/webstream-utils'
import { slackLog } from '../../../../libs/utils/slackLog'


const STALE_AFTER = 15 * 60_000

/** db flagged counts over time. flagged can never be unset, so the count only grows */
const _samples: { t: number, n: number }[] = []
let _stale = false

/** alarm when txidflagged.txt still lacks flags that were in the db 15+ mins ago, i.e. updateTxtLists has stalled */
export const checkFreshness = async () => {
	const now = Date.now()
	const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM txs WHERE flagged = true`)
	_samples.push({ t: now, n: rows[0].n })
	while (_samples.length > 1 && _samples[1].t <= now - STALE_AFTER) _samples.shift()
	const old = _samples[0]
	if (old.t > now - STALE_AFTER) return //not enough history yet

	let fileCount = 0
	for await (const line of readlineWeb(await s3GetObjectWebStream(process.env.LISTS_BUCKET!, 'txidflagged.txt'))) {
		if (line) fileCount++
	}

	const stale = fileCount < old.n
	console.info(checkFreshness.name, JSON.stringify({ fileCount, dbCountThen: old.n, minsAgo: Math.round((now - old.t) / 60_000), stale }))
	if (stale !== _stale) {
		_stale = stale
		await slackLog(checkFreshness.name, stale
			? `❌ txt lists STALE. txidflagged.txt has ${fileCount} txids, but the db had ${old.n} flagged ${Math.round((now - old.t) / 60_000)} mins ago. updateTxtLists may have stalled.`
			: `✅ txt lists caught up. txidflagged.txt has ${fileCount} txids.`)
	}
}
