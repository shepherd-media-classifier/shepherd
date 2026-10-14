import { slackLog } from './slackLog'
import { redis } from './redis-state'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** lazy-load handlers to avoid circular dependency (lambdas import from libs/) */
const getHandler = async (name: string): Promise<(event: any) => Promise<any>> => {
	switch (name) {
		case 'fnInitLists': return (await import('../../libFunctions/fnInitLists/index')).handler
		case 'fnTemp': return (await import('../../libFunctions/fnTemp/index')).handler
		default: throw new Error(`Unknown handler: '${name}'. Available: fnInitLists, fnTemp`)
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

/** 
 * everything below is temporary for fnTemp lambda.
 * TODO: remove this once fnTemp is removed.
 */

const FNTEMP_LOCK = 'fnTemp-lock'
const FNTEMP_REQUESTS = 'fnTemp-requests'
const FNTEMP_LOCK_TTL = 300_000

/**
 * Dedicated function for fnTemp calls, shared across services via redis.
 * Every call bumps the request counter. Whoever holds the lock reruns fnTemp until no new requests arrived during its run.
 */
export const lambdaInvokerFnTemp = async () => {
	await redis.incr(FNTEMP_REQUESTS)
	while (await redis.set(FNTEMP_LOCK, Date.now(), 'PX', FNTEMP_LOCK_TTL, 'NX')) {
		const seen = await redis.get(FNTEMP_REQUESTS)
		const heartbeat = setInterval(() => redis.pexpire(FNTEMP_LOCK, FNTEMP_LOCK_TTL).catch(console.error), 60_000)
		try {
			await lambdaInvoker('fnTemp', {}, 0)
		} finally {
			clearInterval(heartbeat)
			await redis.del(FNTEMP_LOCK)
		}
		if (await redis.get(FNTEMP_REQUESTS) === seen) return
	}
	console.info(lambdaInvokerFnTemp.name, 'already running, request queued')
}
