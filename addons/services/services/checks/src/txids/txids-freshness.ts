import pool from '../../../../libs/utils/pgClient'
import { s3GetObjectWebStream } from '../../../../libs/utils/s3-services'
import { readlineWeb } from '../../../../libs/utils/webstream-utils'
import { slackLog } from '../../../../libs/utils/slackLog'


const STALE_AFTER = 15 * 60_000

const FLAGGED_ROWS = `SELECT count(*)::int AS n FROM txs WHERE flagged = true`
const OWNER_ROWS = `
	SELECT coalesce(sum((xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I', tablename), false, true, '')))[1]::text::bigint), 0)::int AS n
	FROM pg_tables
	WHERE tablename LIKE 'owner\\_%'
	AND NOT EXISTS (SELECT 1 FROM owners_whitelist w WHERE pg_tables.tablename = 'owner_' || replace(w.owner, '-', '~'))
`

/** db row counts per list over time */
const _samples: { [list: string]: { t: number, n: number }[] } = {}
const _stale: { [list: string]: boolean } = {}

/** alarm when a list file still lacks rows that were in the db 15+ mins ago, i.e. updateTxtLists has stalled */
const checkList = async (list: string, countQuery: string) => {
	const now = Date.now()
	const { rows } = await pool.query<{ n: number }>(countQuery)
	const samples = _samples[list] ??= []
	/** counts only shrink on whitelisting/deletes, old samples are then invalid */
	if (samples.length && rows[0].n < samples[samples.length - 1].n) samples.length = 0
	samples.push({ t: now, n: rows[0].n })
	while (samples.length > 1 && samples[1].t <= now - STALE_AFTER) samples.shift()
	const old = samples[0]
	if (old.t > now - STALE_AFTER) return //not enough history yet

	let fileCount = 0
	for await (const line of readlineWeb(await s3GetObjectWebStream(process.env.LISTS_BUCKET!, list))) {
		if (line) fileCount++
	}

	const stale = fileCount < old.n
	const minsAgo = Math.round((now - old.t) / 60_000)
	console.info(checkList.name, list, JSON.stringify({ fileCount, dbCountThen: old.n, minsAgo, stale }))
	if (stale !== !!_stale[list]) {
		_stale[list] = stale
		await slackLog(checkFreshness.name, stale
			? `❌ txt lists STALE. ${list} has ${fileCount} txids, but the db had ${old.n} rows ${minsAgo} mins ago. updateTxtLists may have stalled.`
			: `✅ txt lists caught up. ${list} has ${fileCount} txids.`)
	}
}

export const checkFreshness = async () => {
	await checkList('txidflagged.txt', FLAGGED_ROWS)
	await checkList('txidowners.txt', OWNER_ROWS)
}
