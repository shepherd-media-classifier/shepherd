import { lambdaInvokerUpdateTxtLists } from "../utils/lambda-invoker"
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

		/** fresh bucket, create the txt lists */
		if (!await keyExists('blacklist.txt')) {
			console.info(`list 'blacklist.txt' does not exist. creating txt lists...`)
			await lambdaInvokerUpdateTxtLists()
		}

	} finally {
		_inProgess_initLists = false
	}
	console.info(initLists.name, 'done')
}
