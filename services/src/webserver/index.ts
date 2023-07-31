console.log(`process.env.SLACK_WEBHOOK ${process.env.SLACK_WEBHOOK}`)
console.log(`process.env.SLACK_POSITIVE ${process.env.SLACK_POSITIVE}`)
console.log(`process.env.SLACK_PROBE ${process.env.SLACK_PROBE}`)

import express from 'express'
import { logger } from '../common/shepherd-plugin-interfaces/logger'
import { ipAllowBlacklist, ipAllowRangelist } from './ipAllowLists'
import { getBlacklist, getRangelist } from './blacklist'
import { getPerfHistory, getDevStats } from './metrics'
import si from 'systeminformation'
// import './perf-cron' //starts automatically
import './checkBlocking/checkBlocking-timer' //starts automatically
import { network_EXXX_codes } from '../common/constants'
import { Socket } from 'net'

const prefix = 'webserver'
const app = express()
const port = 80

// app.use(cors())




app.get('/', async (req, res) => {
	res.setHeader('Content-Type', 'text/plain')
	res.write('Webserver operational.\n\n\n')

	const ip = req.headers['x-forwarded-for'] as string || 'undefined'
	res.write(`your ip is ${ip}\n`)
	if (process.env.BLACKLIST_ALLOWED) {
		res.write(`access blacklist: ${ipAllowBlacklist(ip)}\n`)
	} else {
		res.write('$BLACKLIST_ALLOWED is not defined\n')
	}
	if (process.env.RANGELIST_ALLOWED) {
		res.write(`access rangelist: ${ipAllowRangelist(ip)}\n`)
	} else {
		res.write('$RANGELIST_ALLOWED is not defined\n')
	}
	res.write('\n\n')

	const text = JSON.stringify(await si.osInfo())
	res.write('\n\n\n' + text)

	res.status(200).end()
})



app.get('/blacklist.txt', async (req, res) => {
	/* if $BLACKLIST_ALLOWED not defined we let everyone access */
	if (process.env.BLACKLIST_ALLOWED) {
		const ip = req.headers['x-forwarded-for'] as string || 'undefined'
		if (!ipAllowBlacklist(ip)) {
			logger('blacklist', `ip '${ip}' denied access`)
			return res.status(403).send('403 Forbidden')
		}
		logger('blacklist', `ip '${ip}' access granted`)
	}

	res.setHeader('Content-Type', 'text/plain')
	await getBlacklist(res)
	res.status(200).end()
})

app.get('/rangelist.txt', async (req, res) => {
	/* if $RANGELIST_ALLOWED not defined we let everyone access */
	if (process.env.RANGELIST_ALLOWED) {
		const ip = req.headers['x-forwarded-for'] as string || 'undefined'
		if (!ipAllowRangelist(ip)) {
			logger('rangelist', `ip '${ip}' denied access`)
			return res.status(403).send('403 Forbidden')
		}
		logger('rangelist', `ip '${ip}' access granted`)
	}

	res.setHeader('Content-Type', 'text/plain')
	await getRangelist(res)
	res.status(200).end()
})

app.get('/stats', async (req, res) => {
	res.writeHead(200, {
		'Content-Type': 'text/html',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Keep-Alive': 'timeout=60, max=1',
	})
	res.flushHeaders()
	await getDevStats(res)
	res.end()
})

app.get('/perf', async (req, res) => {
	res.setHeader('Content-Type', 'text/html')
	await getPerfHistory(res)
	res.status(200).end()
})

const server = app.listen(port, () => logger(`started on http://localhost:${port}`))

/**
 * catch malformed client requests.
 * useful for testing: curl -v -X POST -H 'content-length: 3' --data-raw 'aaaa' http://localhost
 */
server.on('clientError', (e: any, socket: Socket)=> {

	logger(`express-clientError`, `${e.name} (${e.code}) : ${e.message}. socket.writable=${socket.writable} \n${e.stack}`)
	//debug
	console.log(`Socket:`, {
		timeout: socket.timeout,
		allowHalfOpen: socket.allowHalfOpen,
		destroyed: socket.destroyed,
		remoteAddress: socket.remoteAddress,
		remoteFamily: socket.remoteFamily,
		remotePort: socket.remotePort,
		bytesRead: socket.bytesRead,
		bytesWritten: socket.bytesWritten,
		connecting: socket.connecting,
		readyState: socket.readyState,
		closed: socket.closed,
		errored: socket.errored,
		pending: socket.pending,
		readable: socket.readable,
		writable: socket.writable,
	})

	//make sure connection still open
	if(
		( e.code && network_EXXX_codes.includes(e.code) )
		|| !socket.writable) {
    return;
  }

	socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})


