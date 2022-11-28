/**
 * objectives:
 * - check that IPs in lists are correctly blocking data after it is flagged.
 * - also run the resource intensive rangelist dertivations so that they do not 
 * 	 build up and crash the system.
 * 
 * this file separates out the functions for test.
 */
import { PassThrough } from "stream";
import readline from 'readline'
import { logger } from "../common/shepherd-plugin-interfaces/logger";
import { slackLogger } from "../common/utils/slackLogger";
import { slackLoggerPositive } from "../common/utils/slackLoggerPositive";
import { getBlacklist, getRangelist } from "./blacklist";
import { fetchRetryConnection } from "./txidToRange/fetch-retry";


const prefix = 'check-blocked'


/* load the IP access lists */

// pop off first IP. this should always be a test IP
const accessBlacklist: string[] = JSON.parse(process.env.BLACKLIST_ALLOWED || '[]')
accessBlacklist.shift() // pop off first IP. this should always be a test IP
logger(prefix, `accessBlacklist (BLACKLIST_ALLOWED)`, accessBlacklist)

// pop off first IP. this should always be a test IP
const accessRangelist: string[] = JSON.parse(process.env.RANGELIST_ALLOWED || '[]')
accessRangelist.shift() // pop off first IP. this should always be a test IP
logger(prefix, `accessRangelist (RANGELIST_ALLOWED)`, accessRangelist)

const gwUrls: string[] = JSON.parse(process.env.GW_URLS || '[]')
logger(prefix, `gwUrls`, gwUrls)

/* module level vars for caching */
let _lastBlack: string[] = []
let _lastRange: string[] = []

export const streamLists = async () => {

	/* check all blacklist txids against GWs */

	if (gwUrls.length === 0) {
		logger(prefix, `gwUrls empty`)
	} else {
		// we're reusing the server's streaming function
		const rwBlack = new PassThrough()

		getBlacklist(rwBlack).then(() => rwBlack.end())

		const txids = readline.createInterface(rwBlack)
		for await (const txid of txids) {
			(process.env.NODE_ENV === 'test') && console.log(`readline txid`, txid)

			//TODO: be smarter later and not recheck txids confirmed as blocked

			gwUrls.forEach(gw => checkBlocked(`${gw}/${txid}`, txid))
		}
		rwBlack.destroy(); txids.close();
	}

	/* check all ranges against nodes (and GWs too?) */

	if (gwUrls.length === 0 && accessRangelist.length === 0) {
		logger(prefix, `gwUrls & accessRangelist empty`)
	} else {
		const rwRange = new PassThrough()
		getRangelist(rwRange).then(() => rwRange.end())

		const ranges = readline.createInterface(rwRange)
		for await (const range of ranges) {
			(process.env.NODE_ENV === 'test') && console.log(`readline range`, range)

			const [range1, range2] = range.split(',')

			accessRangelist.forEach(ip => checkBlocked(`http://${ip}:1984/chunk/${+range1 + 1}`, range))
			gwUrls.forEach(gw => checkBlocked(`${gw}/chunk/${+range1 + 1}`, range))
		}
		rwRange.destroy(); ranges.close();
	}
}

export const checkBlocked = async (url: string, item: string) => {
	const { aborter, res: { status } } = await fetchRetryConnection(url)
	aborter?.abort()
	if (status !== 404) {
		logger(prefix, `WARNING! ${item} not blocked on ${url} (status: ${status})`)

		/* make sure Slack doesn't display anything */
		
		let nodisplay = url.split('/')
		let display = url
		if(nodisplay.length === 4){
			nodisplay.pop()
			display = nodisplay.join('/')
		} 
		slackLoggerPositive('warning', `[${prefix}] ${item} not blocked on \`${display}\` (status: ${status})`)
		return;
	}
	logger(prefix, `OK. ${item} blocked on ${url} (status:${status})`)
	// slackLogger(prefix, `✅ OK. ${item} blocked on \`${url}\` (status:${status})`) //remove this noise later
}

