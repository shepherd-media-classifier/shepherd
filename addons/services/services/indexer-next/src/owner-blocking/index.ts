import { slackLog } from '../../../../libs/utils/slackLog'
import { checkForManuallyModifiedOwners } from './check-manually-added-owners'
import { processBlockedOwnersQueue } from '../../../../libs/block-owner/owner-blocking'
import { lambdaInvokerUpdateTxtLists } from '../../../../libs/utils/lambda-invoker'


if (!process.env.LISTS_BUCKET) throw new Error('missing env var, LISTS_BUCKET')

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))


export const ownerChecks = async () => {
	while (true) {
		try {

			/** check if lists need to be updated */

			const tempWhitelisted = await checkForManuallyModifiedOwners()
			const queueProcessing = await processBlockedOwnersQueue() //blocks 1 owner from queue

			/** update txt lists */
			if (queueProcessing || tempWhitelisted) {
				await lambdaInvokerUpdateTxtLists()
			}

			if (!queueProcessing) {
				console.info(ownerChecks.name, 'nothing to do. sleeping for 50 seconds...')
				await new Promise(resolve => setTimeout(resolve, 50_000))
			}

		} catch (err: unknown) {
			const e = err as Error
			await slackLog(
				ownerChecks.name,
				`Fatal error ❌ ${e.name}:${e.message}${e.name === 'GQLError' ? ` from ${new URL(process.env.GQL_URL!).host}` : ''}\n`,
				err,
				'\nrestarting in 30 seconds...'
			)
			await sleep(30_000)
		}
	}
}
