import './_import-test-env-vars'
import { blockOwnerIngest } from '../services/indexer-next/src/owner-blocking/owner-ingest'
import pool from '../libs/utils/pgClient'
import fnOwnerPool from '../libFunctions/fnOwnerBlocking/utils/pgClient'
import { redis } from '../libs/utils/redis-state'
import assert from "node:assert/strict";
import { after, before, describe, it, mock } from 'node:test'
import { clearTimerHttpApiNodes } from '../libs/utils/update-range-nodes'


describe('owner-ingest tests', {}, () => {

	let saved: number
	before(async () => {
		saved = (await pool.query(`SELECT value FROM states WHERE pname = 'owner_ingest'`)).rows[0].value
		await pool.query(`UPDATE states SET value = 0 WHERE pname = 'owner_ingest'`)
	})
	after(async () => {
		await pool.query(`UPDATE states SET value = $1 WHERE pname = 'owner_ingest'`, [saved])
		await fnOwnerPool.end()
		await pool.end()
		await redis.quit().catch(console.error)
		clearTimerHttpApiNodes()
	})

	it('should ingest block ranges trailing the tip by 20', async () => {
		const heights = [100, 100, 100, 101, 103]
		const gqlHeightMock = mock.fn(async (s: string) => {
			if (heights.length === 0) throw new Error('test finished')
			return heights.shift()!
		})
		const sleepMock = mock.fn(async () => { })
		/** the saved position when each range starts */
		const positions: number[] = []
		const ingestRangeMock = mock.fn(async (min: number, max: number) => {
			positions.push((await pool.query(`SELECT value FROM states WHERE pname = 'owner_ingest'`)).rows[0].value)
		})

		try {
			await blockOwnerIngest({
				loop: true,
				sleep: sleepMock,
				gqlHeight: gqlHeightMock,
				ingestRange: ingestRangeMock,
			})
		} catch (e) {
			if ((e as Error).message !== 'test finished') throw e
		}

		/** seeded to 100 - 20 - 30 = 50. no range while the tip stays at 100 */
		assert.deepEqual(ingestRangeMock.mock.calls.map(c => c.arguments), [
			[51, 80],
			[81, 81],
			[82, 83],
		])
		assert.deepEqual(positions, [50, 80, 81])
		const { value } = (await pool.query(`SELECT value FROM states WHERE pname = 'owner_ingest'`)).rows[0]
		assert.equal(value, 83)
	})

})
