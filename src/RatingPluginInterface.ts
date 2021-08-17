export interface RatingResult {
	flagged: boolean | undefined
	valid_data: boolean | undefined
	data_reason?: 'oversized' | 'partial' | 'unsupported' | 'corrupt' | (string & {})
	err_message?: string // might help plugin dev?
	scores?: string	// just something to query when detection goes wrong?
}
export interface RatingPluginInterface {
	/**
	 * init()
	 * This will be called early to instantiate your rater plugin. You should do things like load AI models here.
	 * Consider using Singleton/ESM module level variables/static coding patterns to conserve ram.
	 */
	init(): Promise<void>
	/**
	 * @param buffer - buffer containing image data. Already checked for mime-type, but actual data is often corrupt
	 * @param mimetype - the mime-type indicated
	 * @param txid - the Arweave txid, useful for debugging against the actual served data
	 */
	checkImage(buffer: Buffer, mimetype: string, txid: string): Promise<RatingResult>
}