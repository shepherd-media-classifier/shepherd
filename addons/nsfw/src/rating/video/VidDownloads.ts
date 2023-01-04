import rimraf from "rimraf"
import { VID_TMPDIR } from "../../constants"
import { logger } from "../../utils/logger"
import { cleanupAfterProcessing } from "../../harness"
import { slackLogger } from "../../utils/slackLogger"


export interface VidDownloadRecord  {
	txid: string
	content_size: string
	content_type: string
	receiptHandle: string
	complete: 'TRUE' | 'FALSE' | 'ERROR' | (string & {})
	retried: boolean
}

export class VidDownloads implements Iterable<VidDownloadRecord> {
	
	/* singleton boilerplate */
	private static instance: VidDownloads
	private constructor(){}
	public static getInstance(): VidDownloads {
		if(!VidDownloads.instance){
			VidDownloads.instance = new VidDownloads()
		}
		return VidDownloads.instance;
	}

	/* array we are wrapping */
	private static array: VidDownloadRecord[] = []

	/* expose methods/properties of internal array */
	public [Symbol.iterator] = ()=> VidDownloads.array[Symbol.iterator]()
	public length = ()=> VidDownloads.array.length	//it's become a function
	public push = (vdl: VidDownloadRecord)=> {
		let retry = false /* we have a weird hacky clause */
		for (const item of VidDownloads.array) {
			if(vdl.txid === item.txid){
				if(item.retried){
					retry = true
				}else{
					throw new Error(`VidDownloadsError: item '${vdl.txid}' already in array. retried: ${item.retried}`)
				}
			}
		}
		if(!retry) VidDownloads.array.push(vdl)
	}

	/* extra methods */
	public size = ()=> VidDownloads.array.reduce((acc, curr)=> acc + Number(curr.content_size), 0)

	public cleanup = (vdl: VidDownloadRecord)=> {
		rimraf(VID_TMPDIR + vdl.txid, (e)=> e && logger(vdl.txid, 'Error deleting temp folder', e))
		VidDownloads.array = VidDownloads.array.filter(d => d !== vdl)
		cleanupAfterProcessing(vdl.receiptHandle, vdl.txid, +vdl.content_size)
	}

	public listIds = ()=> {
		let ids: string[] = []
		for (const item of this) {
			ids.push(item.txid)
		}
		return ids
	}
}

