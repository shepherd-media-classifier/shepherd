import { arGql } from 'ar-gql'
import moize from 'moize'

const gql = arGql({ endpointUrl: process.env.GQL_URL, retries: 1 }) //defaults to arweave

export const ownerTotalCount = moize(
	async (owner: string) => {
		const query = `
			query ($owner: String!){ 
				transactions( 
					owners:[ $owner ]
					#remove pending results
					sort: HEIGHT_DESC
				){ 
					count 
				} 
			}
		`
		const variables = {
			owner
		}
		const { data } = await gql.run(query, variables)

		//@ts-expect-error ar-gql doesn't have `count` in its types
		const count = data.transactions.count
		console.info(`ownerTotalCount( ${owner} ) = ${count}`)

		return Number(count) //arweave.net returns a string
	},
	{
		maxSize: 1_000, //is this enough?
		isPromise: true,
		maxAge: 86_400_000 //1000 * 60 * 60 * 24 = 1 day
	}
)

