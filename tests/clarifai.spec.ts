require('dotenv').config()
import { checksImages } from '../src/clarifai'
import { expect } from 'chai'

import txids from './image-txids'


describe('clarifai module test', ()=> {

	it('checkImages processes up to 128 images and gets valid results', async()=> {

		let result = await checksImages(txids.slice(0,128))

		expect(Object.keys(result).length).to.equal(128)
		for (const key in result) {
			expect(result[key]).not.to.be.NaN
		}

	}).timeout(20000)

})