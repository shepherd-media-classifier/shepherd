import './_import-test-env-vars'
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, describe, it } from 'node:test'

import { txidToRange } from '../libs/byte-ranges/txidToRange/txidToRange'
import { CHUNK_ALIGN_GENESIS, CHUNK_SIZE } from '../libs/byte-ranges/txidToRange/constants-byteRange'

import { clearTimerHttpApiNodes } from '../libs/utils/update-range-nodes'
import { destroyChunkStreamAgent } from '../libs/chunkStreams/chunkFetch'

describe('txidToRange tests', () => {
	after(() => {
		clearTimerHttpApiNodes()
		destroyChunkStreamAgent()
	})

	describe('txidToRange tests', () => {
		it('tests an L1 gets processed', async () => {
			const bytes = await txidToRange('Yn9PXQvhb1stfjVxJwY4Ei4aIrqUbYVVkwlQiah_8FQ', null, undefined)
			assert.equal(bytes.start, 87742364819702n)
			assert.equal(bytes.end, 87742365081846n)

		})

		it('tests an ans104 dataItem gets processed', async () => {
			const bytes = await txidToRange('I210xM6oaK2G2AnHH1tN49E-Nu_WPWosWHFSLz2UbQ0', 'Yn9PXQvhb1stfjVxJwY4Ei4aIrqUbYVVkwlQiah_8FQ', undefined)
			const chunkStart = 87742364819702n
			const chunkEnd = 87742365081846n
			assert.equal(bytes.start, chunkStart)
			assert.equal(bytes.end, chunkEnd)
		})

		it('tests a dataItem in a massive, 10,000 dataItem arbundles', async () => {
			/**
			 * maybe useful sometime:
			 * diIds[9999] = 'MItt5-z39ipds_lCcCASBpdb7ZLAWYZffOCYnGibXic'
			 */

			const parentId = 'MemPKvViQVcXnJdQWRlg9-jwNhSpTDH7g97MtzaQgEY'
			const parent = {
				size: 11227812n,
				offset: 88972798718874n,
				start: 88972798718874n - 11227812n, // 88972787491062n
				//  + 1n, // 88972787491063n
			}
			const headerLength = 32n + 10000n * 64n
			const dataItemIndex = 635n
			const dataItemsSize = 1053n * 10n + 1055n * 90n + 1057n * (dataItemIndex - 100n)
			const diRange = {
				start: parent.start + headerLength + dataItemsSize,
				end: parent.start + headerLength + dataItemsSize + 1057n,
			}
			const chunkStart = diRange.start - ((diRange.start - CHUNK_ALIGN_GENESIS) % CHUNK_SIZE)
			const modEnd = (diRange.end - CHUNK_ALIGN_GENESIS) % CHUNK_SIZE
			const chunkEnd = diRange.end + (modEnd === 0n ? 0n : CHUNK_SIZE - modEnd)

			const bytes = await txidToRange('0ATaqsTm3_u9HnfS6jj9OKM6ptM_CbbRgYeJYnX0ao8', parentId, undefined)
			assert.equal(bytes.start, chunkStart, 'should equal chunkStart')
			assert.equal(bytes.end, chunkEnd, 'should eq chunkEnd')
		})


	})

	describe('extra tests', () => {
		it('tests an L1 bundle gets processed', async () => {
			const bytes = await txidToRange('i1UYzkLruqwtNYHsHQCANkC-f48E6x7HIce8QXD25KA', null, undefined)
			assert.equal(bytes.start, 83105540251894n, 'start byte should match')
			assert.equal(bytes.end, 83106255118582n, 'end byte should match')

		})

		it('tests an ans104 dataItem gets processed', async () => {
			/**
			 * we are using the L1 tested in the previous test `i1UYzkLruqwtNYHsHQCANkC-f48E6x7HIce8QXD25KA`
			 * this is actually a bundle.
			 * there are 3000 DIs in this bundle. we are picking the first di i.e. index=0
			 * 1 chunk can hold 4096.5 index records => startByte == bundleStart
			 * calculations for endByte below.
			 */
			const bytes = await txidToRange('XGRfpi5HwZUd4FNPbrRBsoDP4awpZ_oJv1cFcn-DHqk', 'i1UYzkLruqwtNYHsHQCANkC-f48E6x7HIce8QXD25KA', undefined) //first di in the bundle
			const chunkStart = 83105540251894n //<= this is right
			const headerLength = 32n + (3000n * 64n)
			const diLength = 1203643n
			const end = (chunkStart + headerLength + diLength)
			const chunkEnd = end + (CHUNK_SIZE - (end - CHUNK_ALIGN_GENESIS) % CHUNK_SIZE)
			assert.equal(bytes.end, chunkEnd, 'should equal chunkEnd')
			assert.equal(bytes.start, chunkStart, 'should equal chunkStart')
		})

		it('tests a dataItem in the variably-split last-2-chunks of an L1 bundle', async () => {
			/**
			 * Regression: the last 2 chunks of a tx can be split into arbitrary sizes by the
			 * uploader client (NOT a fixed protocol rebalance), with padding after the real data
			 * out to the 256KB chunk boundary. /chunk(2) return only the real data, never the padding.
			 *
			 * `AcvSNJ...` is a 7424-byte image/png, the LAST dataItem (index 784/785) in L1
			 * bundle `45MQ...` (size 3953832). The second-last chunk holds 141908 real bytes (the
			 * uploader's choice), so this item's real data starts at bundle offset 3811924
			 * (= 14 full chunks * 262144 + 141908) and the true skip into the fetched stream is 134311.
			 *
			 * The naive math (assuming every preceding chunk is a full 262144) gives dataStart=14075,
			 * landing ~120236 bytes (the second-last chunk's padding) into garbage. We must READ the
			 * second-last chunk's real size from the node — there is no formula for the split.
			 */
			const txid = 'AcvSNJGwVwp9MX_u8FMu4kUMhvKsY4wHbHQOVHIMrAw'
			const parent = '45MQkIdAetkAEjgipwugitrNAOicM8oP_jsxqQ8Py_4'
			const bytes = await txidToRange(txid, parent, undefined)

			assert.equal(bytes.dataStart, 134311n, 'dataStart should skip past the second-last chunk\'s real data, not its padded grid distance')
			assert.equal(bytes.dataSize, 7597n, 'dataSize should be the full dataItem size (header + payload)')
			assert.equal(bytes.start, 387551298625782n, 'weaveStart should be the grid-aligned start of the last chunk\'s bucket')
			assert.equal(bytes.end, 387551298887926n, 'weaveEnd should be the grid-aligned end of the bundle')
		})

		it('tests a dataItem that starts earlier but ends in the last chunk of an L1 bundle', async () => {
			/**
			 * Regression: `LcARVHq1...` (index 744 in `45MQ...`) starts in chunk 3 and its last 100235 bytes
			 * are in the last chunk (bucket 15). weaveEnd must cover that bucket, not stop at bucket 14's end.
			 */
			const bytes = await txidToRange('LcARVHq1Gj_w9kVO_IaHnfIyJR7m0HB1JPatpE2N65c', '45MQkIdAetkAEjgipwugitrNAOicM8oP_jsxqQ8Py_4', undefined)

			assert.equal(bytes.start, 387551295480054n, 'weaveStart should be chunk 3\'s bucket')
			assert.equal(bytes.end, 387551298887926n, 'weaveEnd should include the last chunk\'s bucket')
			assert.equal(bytes.dataStart, 192483n)
			assert.equal(bytes.dataSize, 2933244n)
		})

		it('tests a pre-CHUNK_ALIGN_GENESIS dataItem uses its chunks\' real bounds', async () => {
			//block 812960. chunks are not on the 256KB grid
			const bytes = await txidToRange('48YX8lqFs80IDpBa2dGOnVx7sfxR9vvDgVcng_6SIgM', 'rDHiHhqwZiDk_bufw0ZZEd54iVZZyYzDo0gtd_bON5M', undefined)

			assert.equal(bytes.start, 30602409953273n, 'weaveStart should be the first chunk\'s real start')
			assert.equal(bytes.end, 30602414147577n, 'weaveEnd should be the last chunk\'s real end')
			assert.equal(bytes.dataStart, 253382n)
			assert.equal(bytes.dataSize, 3741983n)
		})

		it('returns a 404 range for an unknown id', async () => {
			const bytes = await txidToRange('1234567890123456789012345678901234567890_-_', 'Yn9PXQvhb1stfjVxJwY4Ei4aIrqUbYVVkwlQiah_8FQ', undefined)
			assert.equal(bytes.status, 404)
			assert.equal(bytes.start, -1n)
		})

	})



	// describe('individual quick test',()=>{

	// 	it('individual quick test', async()=> {
	// 		const testId = '8igoU1KVoQZfajZMpMdVImp_pmPCRAEJWqOydRU0h20'
	// 		const bytes = await txidToRange(testId)

	// 		console.log(`*** fetching entire bundle data. this may take some time...`)
	// 		const reader = axios.get(`https://arweave.net/${testId}`, {responseType:'stream'})


	// 		assert.equal(bytes.start).eq(-7n)
	// 		assert.equal(bytes.end).eq(-7n)

	// 	})
	// })

})