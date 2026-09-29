import { waitForHost, pauseHost } from '../../../../libs/utils/rate-limit'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * use GQL height over /info height, as both can get out of sync.
 * retry on all errors.
 * */
export const gqlHeight = async (endpoint: string) => {
	let attempt = 0
	while(true){
		await waitForHost(endpoint)
		try{
			const query = 'query($minBlock: Int){ blocks( height:{min:$minBlock} first:1 ){ edges{node{height}} }}'
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ query })
			})

			//429s pause every request to the host, then retry indefinitely
			if (res.status === 429) {
				const wait = pauseHost(endpoint, res.headers.get('retry-after'), attempt++)
				console.warn(`gql height 429. pausing all requests to ${new URL(endpoint).host} for ${wait}s`)
				continue
			}
			if(!res.ok) throw Error(`${res.status} : ${res.statusText}`)

			return +(await res.json()).data.blocks.edges[0].node.height
		}catch(err: unknown){
			const e = err as Error
			console.log('error polling gql height', `"${e.message}"`, 'retrying in 10s..')
			await sleep(10000)
		}
	}
}
