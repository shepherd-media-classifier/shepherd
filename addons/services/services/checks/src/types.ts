
export type ListName = ('txidflagged.txt' | 'txidowners.txt' | `${string}/txids.txt`)

export interface TxidItem {
	id: string
	base32: string
}
