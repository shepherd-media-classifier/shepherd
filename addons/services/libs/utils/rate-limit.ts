import { setTimeout as sleep } from 'node:timers/promises'

/** per host (e.g. arweave.net): a 429 pauses every request this process makes to that host, not just the one that got it */
const pausedUntil = new Map<string, number>()

/** wait until `url`'s host is no longer paused */
export const waitForHost = async (url: string, signal?: AbortSignal) => {
	const host = new URL(url).host
	while ((pausedUntil.get(host) ?? 0) > Date.now()) await sleep(pausedUntil.get(host)! - Date.now(), undefined, { signal })
}

/** pause `url`'s host for a 429's `retry-after` seconds (default 10), doubling on each repeat for the same request (max x16). returns the pause in seconds */
export const pauseHost = (url: string, retryAfter: string | null | undefined, attempt = 0) => {
	const host = new URL(url).host
	const wait = (Number(retryAfter) || 10) * Math.min(2 ** attempt, 16)
	pausedUntil.set(host, Math.max(pausedUntil.get(host) ?? 0, Date.now() + wait * 1_000))
	return wait
}
