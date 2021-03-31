//TODO: scan txs per block, then can wait for new blocks
//TODO: maybe wait about 15 minutes to give time for tx data to seed ?

import * as Gql from 'ar-gql'
import { imageTypes, textTypes, unsupportedTypes, videoTypes } from './constants'
import { StateRecord, TxScanned, TxsRecord } from './types'
import getDbConnection from './utils/db-connection'
import { logger } from './utils/logger'

const db = getDbConnection()

interface IGetIdsResults {
	images: TxScanned[]
	videos: TxScanned[]
	textsAndUnsupported: TxScanned[]
}

export const getIds = async (minBlock: number, maxBlock: number): Promise<IGetIdsResults> => {
	try{

		/* our general parametrized query */

		const query = `query($cursor: String, $mediaTypes: [String!]!, $minBlock: Int, $maxBlock: Int) {
			transactions(
				# your query parameters
				block: {
					min: $minBlock,
					max: $maxBlock,
				}
				tags: [
					{ name: "Content-Type", values: $mediaTypes}
				]
				after: $cursor
			) {
				pageInfo {
					hasNextPage
				}
				edges {
					cursor
					# whatever else you want to query for
					node{
						id
						data{
							size
							type
						}
					}
				}
			}
		}`

		/* Generic getRecords */

		const getRecords = async (mediaTypes: string[]) => {
			
			const metas = await Gql.all(query, { 
				minBlock,
				maxBlock,
				mediaTypes: mediaTypes,
			})
	
			let records: TxScanned[] = []
			for (const item of metas) {
				const txid = item.node.id
				const content_type = item.node.data.type
				const content_size = item.node.data.size

				records.push({
					txid, 
					content_type,
					content_size,
				})

				try{
					const result = await db<TxsRecord>('txs').insert({
						txid, 
						content_type,
						content_size,
					})
				}	catch(e){
					if(e.code && Number(e.code) === 23505){
						logger('Duplicate key value violates unique constraint', txid, e.detail) //probably just a dataItem
					} else throw e
				}
			}

			return records
		}

		/* get supported types metadata */

		const images = await getRecords(imageTypes)
		const videos = await getRecords(videoTypes)
		const textsAndUnsupported = await getRecords([...textTypes,...unsupportedTypes])

		const res = await db<StateRecord>('states')
			.where({pname: 'scanner_position'})
			.update({blocknumber: maxBlock})


		return {
			images,
			videos,
			textsAndUnsupported,
		}

	} catch(e){
		logger(e.name, ':', e.message)
		e.toJSON && logger(e.toJSON())
		throw new Error("Error in getIds. See above.")
	}
}