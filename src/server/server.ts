import express from 'express'
import { logger } from '../utils/logger'
import { getBlacklist } from './blacklist'

const prefix = 'server'

const app = express()
const port = (process.env.NODE_ENV === 'production') ? 80 : 3001

// app.use(cors())

app.get('/', (req, res)=> {
	res.status(200).send('Welcome to nothing.')
})

app.get('/blacklist.txt', async(req, res)=> {
	res.setHeader('Content-Type', 'text/plain')
	const text = await getBlacklist(true)
	res.send(text)
})

app.get('/whitelist.txt', async(req, res)=> {
	res.setHeader('Content-Type', 'text/plain')
	const text = await getBlacklist(false)
	res.send(text)
})



app.listen(port, ()=> logger(prefix, `started on http://localhost:${port}`))