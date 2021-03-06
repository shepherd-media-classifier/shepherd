process.env['NODE_ENV'] = 'test'
import { expect } from 'chai'
import { after } from 'mocha'
import { TxRecord, TxScanned } from '../src/types'
import dbConnection from '../src/utils/db-connection'
import { server } from '../src/http-api' //start the http interface server
import axios, { AxiosError } from 'axios'
import { APIFilterResult } from '../src/shepherd-plugin-interfaces'

const knex = dbConnection()

const mockRecord: TxScanned = {
	txid: '1234567890123456789012345678901234567890123',
	content_size: '100',
	content_type: 'test/dummy',
	height: 123
}

describe('http-api tests', ()=>{

	/* insert mock tx records into db */
	before(async function () {
		this.timeout(5000)

		await knex<TxRecord>('txs').insert({ 
			txid: mockRecord.txid, 
			content_size: mockRecord.content_size,
			content_type: mockRecord.content_type,
			height: mockRecord.height,
		})
	})
	/* remove mock records after testing */
	after(async function () {
		try{
			await knex<TxRecord>('txs').delete().where({ txid: mockRecord.txid })
		}finally{
			server.close(e=>e && console.log('error closing server', e))
		}
	})

	it('1. tests that a tx record gets updated', async()=>{
		const data: APIFilterResult = {
			txid: mockRecord.txid,
			result: { flagged: false,	}
		}
		const res = await axios.post('http://localhost:84/postupdate', data)
		expect(res.status).eq(200)
	}).timeout(5000)

	it('2. tests that a non-existant record gets rejected', async()=>{
		const data: APIFilterResult = {
			txid: mockRecord.txid.replace('1','X'),
			result: { flagged: false,	}
		}
		try{
			const res = await axios.post('http://localhost:84/postupdate', data)
			throw new Error('test should fail') 
		}catch(e){
			if(axios.isAxiosError(e)){
				expect((<AxiosError>e).response!.status).eq(406)
			}else{ throw e }
		}
	}).timeout(5000)

	it('3. tests that a badly formed txid in the payload get rejected', async()=>{
		expect(1)
		const data = {
			txid: 'this-is-a-bad-txid',
			result: { flagged: false,	}
		}
		try{
			const res = await axios.post('http://localhost:84/postupdate', data)
			throw new Error('test should fail') 
		}catch(e){
			if(axios.isAxiosError(e)){
				expect((<AxiosError>e).response!.status).eq(400)
			}else{ throw e }
		}
	}).timeout(5000)

	it('4. tests that a badly formed payloads get rejected', async()=>{
		expect(1)
		const data = {
			notxid: 'no txid in the payload',
			result: { flagged: false,	},
		}
		try{
			await axios.post('http://localhost:84/postupdate', data)
			throw new Error('test should fail') 
		}catch(e){
			if(axios.isAxiosError(e)){
				expect((<AxiosError>e).response!.status).eq(400)
			}else{ throw e }
		}
	}).timeout(5000)

	it('5. tests that a badly result in the payload get rejected', async()=>{
		expect(1)
		const data = {
			txid: mockRecord.txid,
			result: {
				scores: 'scores are optional. flagged || data_reason are not.'
			}
		}
		try{
			await axios.post('http://localhost:84/postupdate', data)
			throw new Error('test should fail') 
		}catch(e){
			if(axios.isAxiosError(e)){
				expect((<AxiosError>e).response!.status).eq(400)
			}else{ throw e }
		}
	}).timeout(5000)

})