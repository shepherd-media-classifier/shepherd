process.env['NODE_ENV'] = 'test'
import { expect } from 'chai'
import {  } from 'mocha'
import { SQS } from 'aws-sdk'
import { dataStream } from '../src/fetchers/fetchers'
import sinon from 'sinon'
import axios from 'axios'
import { PassThrough } from 'stream'

// some test sqs messages
const goodMsg: SQS.Message = {
	MessageId: 'msg-id-good',
	ReceiptHandle: '001',
	Body: JSON.stringify({
		txid: 'FPuYjox6xWNlH4djbh7if81svPB1_U6UO8_qQnMVopg',
		content_type: 'image/png',
	})
}
const nodataMsg: SQS.Message = {
	MessageId: 'msg-id-no-data',
	ReceiptHandle: '002',
	Body: JSON.stringify({
		// txid: 'MdOMjck45888zaIuS_VE8SY2jspssvUrDIJPUzVjiF8',
		txid: 'mKtVp1UVE7TScGBoGrZ8Qi741v2G06a-An8baaceY2M',
		content_type: 'video/mp4',
	})
}
const partialdataMsg: SQS.Message = {
	MessageId: 'msg-id-partial-data',
	ReceiptHandle: '003',
	Body: JSON.stringify({
		txid: 'emYGkiQ0wuu5_e0OJBV3itfLbXjRKmvBD1eIkkCS0c0',
		content_type: 'video/mp4',
	})
}

describe('fetchers tests', ()=>{

	afterEach(()=> sinon.restore())

	it('tests a good message gets processed', async()=> {
		const res = await dataStream(goodMsg)
		expect(res).eq('OK')
	}).timeout(0)

	it('tests a NO_DATA message gets processed', async()=> {
		const mockStream = new PassThrough()
		//@ts-ignore
		mockStream.setTimeout = (t: number, cb: Function) => setTimeout(cb, 1000)
		const fakeAxios = sinon.stub(axios, 'get').resolves({ 
			data: mockStream, headers: { 'content-length': 123 }
		})

		const res = await dataStream(nodataMsg)
		expect(fakeAxios.called).true
		expect(res).eq('NO_DATA')
	}).timeout(0)

	it('tests PARTIAL_DATA message gets processed', async()=> {
		const mockStream = new PassThrough() 
		//@ts-ignore
		mockStream.setTimeout = (t: number, cb: Function) => setTimeout(cb, 1000)
		const fakeAxios = sinon.stub(axios, 'get').resolves({ 
			data: mockStream, headers: { 'content-length': 123 }
		})
		mockStream.push('fake-partial-data')
		
		
		const res = await dataStream(partialdataMsg)
		expect(fakeAxios.called).true
		expect(res).eq('OK')
	}).timeout(0)

})