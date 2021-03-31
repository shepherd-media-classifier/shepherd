import col from 'ansi-colors'
import { EOL } from 'os'
import fs from 'fs'

export const logger = (...args: any[]) => {
	let prefix = '[logger]'
	if(args.length > 1){
		prefix = '[' + args[0] + ']'
		args.shift()
	}

	console.log(col.blue(prefix), ...args)
	fs.appendFile(
		'server-logs.log', 
		"\"" + new Date().toUTCString() + '\"\t,' + prefix + ',' + args.join(',') + EOL,
		()=>{}
	)
}