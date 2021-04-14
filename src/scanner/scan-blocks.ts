import * as Gql from 'ar-gql'
import { imageTypes, otherTypes, videoTypes } from '../constants'
import { StateRecord, TxScanned } from '../types'
import getDbConnection from '../utils/db-connection'
import { logger } from '../utils/logger'
import axios from 'axios'

const prefix = 'scanner'

const db = getDbConnection()

interface IGetIdsResults {
	images: TxScanned[]
	videos: TxScanned[]
	others: TxScanned[]
}

export const scanBlocks = async (minBlock: number, maxBlock: number): Promise<IGetIdsResults> => {
	try{

		/* our general parametrized query */

		const query = `query($cursor: String, $mediaTypes: [String!]!, $minBlock: Int, $maxBlock: Int) {
			transactions(
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
				let content_type = item.node.data.type
				const content_size = item.node.data.size

				if(!content_type){ //this seems to only happen to media in Bundles?
					content_type = await getContentType(txid)
				}

				records.push({
					txid, 
					content_type,
					content_size,
				})

				try{
					const result = await db<TxScanned>('txs').insert({txid, content_type, content_size})
				}	catch(e){
					if(e.code && Number(e.code) === 23505){
						logger(prefix, 'Duplicate key value violates unique constraint', txid, e.detail) //prob just a dataItem
					} else if(e.code && Number(e.code) === 23502){
						logger(prefix, 'Null value in column violates not-null constraint', txid, e.detail) 
						throw e
					} else { 
						if(e.code) logger(prefix, e.code)
						throw e
					}
				}

			}

			return records
		}

		/* get supported types metadata */

		logger(prefix, `making three scans of ${((maxBlock - minBlock) + 1)} blocks..`)
		const images = await getRecords(imageTypes)
		const videos = await getRecords(videoTypes)
		const others = await getRecords(otherTypes)

		await db<StateRecord>('states')
			.where({pname: 'scanner_position'})
			.update({value: maxBlock})


		return {
			images,
			videos,
			others,
		}

	} catch(e){
		logger(prefix, e.name, ':', e.message)
		e.toJSON && logger(e.toJSON())
		throw new Error("Error in scanBlocks. See above.")
	}
}

/* This only gets called once in a blue moon */
const getContentType = async (txid: string) => {

	logger(prefix, 'grabbing missing Content-Type', txid)

	const query = `query{ transactions(ids: ["${txid}"]){
		edges{ node{ 
			tags { name value }
		}}
	}}`

	const {data: res} = await axios.post('https://arweave.net/graphql', JSON.stringify({query}), { 
		headers: { 'Content-Type': 'application/json'}
	})
	const tags = res.data.transactions.edges[0].node.tags
	for (const tag of tags) {
		if(tag.name === 'Content-Type') return tag.value //we know this exists
	}
}