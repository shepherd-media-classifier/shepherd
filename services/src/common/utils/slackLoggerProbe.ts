import { IncomingWebhook } from '@slack/webhook'
import { logger } from '../shepherd-plugin-interfaces/logger'
import os from 'os'
import { APIFilterResult } from '../shepherd-plugin-interfaces'

console.assert(process.env.SLACK_PROBE, "process.env.SLACK_PROBE is undefined")
let webhook: IncomingWebhook
if(process.env.SLACK_PROBE){
	webhook = new IncomingWebhook(process.env.SLACK_PROBE!)
}

let _last = { text: 'dummy', time: 0}
const timeout = 60*60*1000 //1 hour

export const slackLoggerProbe = async (level: ('alarm'|'ok'|'test'), text: string) => {
	if(!process.env.SLACK_PROBE){
		return; //silently exit if no SLACK_PROBE integration
	}

	let prefix = ''
	
	prefix += (level === 'alarm') ? '⛔ *NOT BLOCKED* ⛔' : (
		(level === 'test') ? '⭐️ *Test Message* ⭐️' : '✅ *OK* ✅'
	)
	
	if(process.env.NODE_ENV !== 'production'){
		prefix = '***Ignore these test posts***'
	}

	const time = Date.now()

	if(text === _last.text && (_last.time + timeout) > time ){
		return;
	}
	_last = { text, time }

	try{
		const res = await webhook.send({
			"blocks": [
				{
					"type": "section", 
					"text": {
						"type": "mrkdwn",
						"text": `${prefix} ${new Date().toUTCString()}`,
					} 
				},
				{
					"type": "section", 
					"text": {
						"type": "mrkdwn",
						"text": text,
					} 
				}
			]
		})
		return res
	}catch(e:any){
		logger(slackLoggerProbe.name, 'DID NOT WRITE TO SLACK_PROBE', (e.code)?`${e.code}:`:'', e.message)
	}
}


