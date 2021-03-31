import express from 'express'
import { logger } from './utils/logger'

const app = express()
const port = (process.env.NODE_ENV === 'production') ? 80 : 3001

// app.use(cors())

app.get('/', (req, res)=> {
	res.status(200).send('Welcome to nothing.')
})

app.listen(port, ()=> logger(`server started on http://localhost:${port}`))
