require('dotenv').config()
import { checkImage, checkImages } from '../src/clarifai'
import { expect } from 'chai'

import txids from './image-txids'


describe('clarifai module test', ()=> {

	const badImageDataId = "JKi55pMfW9gVKpa6fUH4vtPlR1wTxwd_kha3A_Ryy8I"

	it('checkImage processes 1 image and gets valid results', async()=> {
		let result = await checkImage(txids[0])

		expect(result).to.greaterThan(0).and.lessThan(1)
		expect(result).equal(0.00012133860582252964)
	}).timeout(20000)

	it('checkImage handles bad image data', async()=> {
		try {
			let result = await checkImage(badImageDataId)

		} catch (e) {
			expect(e).equal('Failure')
		}

	}).timeout(20000)

	it('checkImages processes up to 128 images and gets valid results', async()=> {

		let result = await checkImages(txids.slice(8,20))

		expect(Object.keys(result).length).to.equal(128)
		for (const key in result) {
			expect(result[key]).not.to.be.NaN
		}

	}).timeout(20000)

})