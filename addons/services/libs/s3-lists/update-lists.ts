import { lambdaInvokerUpdateTxtLists } from "../utils/lambda-invoker"
import { slackLog } from "../utils/slackLog"
import { keyExists, s3GetTag, updateAddresses } from "./update-addresses"


/** this is called once on service start */
let _inProgess_initLists = false
export const initLists = async () => {
	if (_inProgess_initLists) {
		console.info(initLists.name, 'already in progress')
		return;
	}
	_inProgess_initLists = true
	try {

		/** check if addresses.txt need to be created */
		if (!await keyExists('addresses.txt') || !await s3GetTag('addresses.txt', 'SHA-1')) {
			console.info(`list 'addresses.txt' or it's SHA-1 hash does not exist. creating...`)
			console.info(
				'addresses.txt count',
				await updateAddresses()
			)
		}

		/** rebuild on every start, heals a rebuild lost to a restart mid-ingest. don't block startup on failure */
		await lambdaInvokerUpdateTxtLists().catch(e => slackLog(initLists.name, `updateTxtLists failed on startup ${(e as Error).name}:${(e as Error).message}`))

	} finally {
		_inProgess_initLists = false
	}
	console.info(initLists.name, 'done')
}
