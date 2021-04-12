require('dotenv').config()
import { checkImage,  } from './clarifai-images'
import { expect } from 'chai'
import sinon from 'sinon'

import txids from '../../tests/image-txids'


describe('clarifai module test', ()=> {

	const badImageDataId = "JKi55pMfW9gVKpa6fUH4vtPlR1wTxwd_kha3A_Ryy8I"

	afterEach(() => {
		sinon.restore()
	})

	// it('checkImage processes 1 image and gets valid results', async()=> {

	// 	console.log(txids[1])

	// 	let result = await checkImage(txids[1])

	// 	console.log(result)

	// 	expect(result).to.greaterThan(0).and.lessThan(1)
	// 	expect(result).equal(0.007969954051077366)
	// }).timeout(20000)

	it('check mockCheckImage works for our unit test', async()=> {

		console.log(txids[1])

		let result = await checkImage(txids[1])

		console.log(result)

		expect(result).to.greaterThan(0).and.lessThan(1)
		expect(result).equal(0.007969954051077366)
	}).timeout(20000)

	// it('checkImage handles bad image data', async()=> {
	// 	try {
	// 		let result = await checkImage(badImageDataId)

	// 	} catch (e) {
	// 		expect(e).equal('Failure')
	// 	}

	// }).timeout(20000)

	// it('checkImages processes up to 128 images and gets valid results', async()=> {

	// 	let result = await checkImages(txids.slice(8,20))

	// 	expect(Object.keys(result).length).to.equal(128)
	// 	for (const key in result) {
	// 		expect(result[key]).not.to.be.NaN
	// 	}

	// }).timeout(20000)

})