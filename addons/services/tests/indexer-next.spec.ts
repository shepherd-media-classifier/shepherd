import './_import-test-env-vars'
import { tipLoop } from '../services/indexer-next/src/index-by-height'
import pool from '../libs/utils/pgClient'
import assert from "node:assert/strict";
import { after, before, describe, it, mock } from 'node:test'


describe('indexer-next tests', {}, () => {

	let saved: { pname: string, value: number }[]
	before(async () => {
		saved = (await pool.query(`SELECT pname, value FROM states WHERE pname IN ('indexer_pass1', 'indexer_pass2')`)).rows
		await pool.query(`UPDATE states SET value = 0 WHERE pname IN ('indexer_pass1', 'indexer_pass2')`)
	})
	after(async () => {
		for (const { pname, value } of saved) await pool.query(`UPDATE states SET value = $1 WHERE pname = $2`, [value, pname])
		await pool.end()
	})

	it('should test the tipLoop function', async () => {
		const heights = [100, 100, 101, 101, 103]
		const gqlHeightMock = mock.fn(async (s: string) => {
			if (heights.length === 0) throw new Error('test finished')
			return heights.shift()!
		})
		const sleepMock = mock.fn(async () => { })
		const gqlQueryMock = mock.fn(async (args: { min: number, max: number, indexName: string }) => { })

		try {
			await tipLoop({
				loop: true,
				sleep: sleepMock,
				gqlHeight: gqlHeightMock,
				gqlQuery: gqlQueryMock
			})
		} catch (e) {
			if ((e as Error).message !== 'test finished') throw e
		}

		/** seeded to 100 - 4 - 30 = 66 */
		assert.deepEqual(gqlQueryMock.mock.calls.map(c => c.arguments[0]), [
			{ min: 67, max: 100, indexName: 'indexer_pass1' },
			{ min: 67, max: 96, indexName: 'indexer_pass2' },
			{ min: 101, max: 101, indexName: 'indexer_pass1' },
			{ min: 97, max: 97, indexName: 'indexer_pass2' },
			{ min: 102, max: 103, indexName: 'indexer_pass1' },
			{ min: 98, max: 99, indexName: 'indexer_pass2' },
		])
		const rows = (await pool.query(`SELECT pname, value FROM states WHERE pname IN ('indexer_pass1', 'indexer_pass2') ORDER BY pname`)).rows
		assert.deepEqual(rows, [{ pname: 'indexer_pass1', value: 103 }, { pname: 'indexer_pass2', value: 99 }])
	})

})
