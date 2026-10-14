import { slackLog } from './slackLog'
import { redis } from './redis-state'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** lazy-load handlers to avoid circular dependency (lambdas import from libs/) */
const getHandler = async (name: string): Promise<(event: any) => Promise<any>> => {
	switch (name) {
		case 'fnInitLists': return (await import('../../libFunctions/fnInitLists/index')).handler
		case 'updateTxtLists': return (await import('../../libFunctions/updateTxtLists/index')).handler
		default: throw new Error(`Unknown handler: '${name}'. Available: fnInitLists, updateTxtLists`)
	}
}

/** invoke a lambda handler directly. N.B. defaults to infinite retries */
export const lambdaInvoker = async (handlerName: string, payload: object, retries?: number) => {
	const totalRetries = retries
	const handler = await getHandler(handlerName)

	while (true) {
		try {
			const result = await handler(payload)
			console.info(handlerName, `returned ${result}`)
			return result
		} catch (err: unknown) {
			const e = err as Error

			if (retries !== undefined && --retries <= 0) {
				throw new Error(`${handlerName} failed after ${totalRetries} retries. Last error: ${e.message}`)
			}

			slackLog(handlerName, `HANDLER ERROR ${e.name}:${e.message}. retrying after 10 seconds`, e)
			await sleep(10_000)
			continue
		}
	}
}

const TXT_LISTS_LOCK = 'updateTxtLists-lock'
const TXT_LISTS_REQUESTS = 'updateTxtLists-requests'
const TXT_LISTS_LOCK_TTL = 300_000

/**
 * Dedicated function for updateTxtLists calls, shared across services via redis.
 * Every call bumps the request counter. Whoever holds the lock reruns updateTxtLists until no new requests arrived during its run.
 */
export const lambdaInvokerUpdateTxtLists = async () => {
	await redis.incr(TXT_LISTS_REQUESTS)
	while (await redis.set(TXT_LISTS_LOCK, Date.now(), 'PX', TXT_LISTS_LOCK_TTL, 'NX')) {
		const seen = await redis.get(TXT_LISTS_REQUESTS)
		const heartbeat = setInterval(() => redis.pexpire(TXT_LISTS_LOCK, TXT_LISTS_LOCK_TTL).catch(console.error), 60_000)
		try {
			await lambdaInvoker('updateTxtLists', {}, 0)
		} finally {
			clearInterval(heartbeat)
			await redis.del(TXT_LISTS_LOCK)
		}
		if (await redis.get(TXT_LISTS_REQUESTS) === seen) return
	}
	console.info(lambdaInvokerUpdateTxtLists.name, 'already running, request queued')
}
