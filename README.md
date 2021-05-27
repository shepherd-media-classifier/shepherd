# ar-blacklist

Server that creates & maintains a strict adult content filter list.

Notes: 
- This is a work in progress. Bug reports appreciated :-)
- Expect false positives. The aim is to have zero adult content get through.


## prerequisites

1. install docker & docker-compose

2. install pm2 globally, and consider running `pm2 save` (I will remove this step later)

3. create a `.env` file and enter *all* required values (see .env.example)

## install and run

```bash
> npm install
> npm start
```

## usage

On initial start it will take some time (maybe 24 hours for example) to read in and categorize all media files from the permaweb. Expect the server to run hot during this initial phase.

Your new server will expose a plain text ('text/plain') list of blacklisted txids separated by newlines. In production mode this can be accessed via 
```
http://localhost/blacklist.txt
```
In development mode it's on 
```
http://localhost:3001/blacklist.txt
```

### npm scripts

- **npm install** creates the docker container that holds the app database, and install all dependencies.
- **npm uninstall** tears down the docker container.
- **npm start** runs production mode. The server port number => 80
- **npm run dev** runs development mode. Developent in name only. Just sets the server port number => 3001 and is suitable for production use.
- **npm run logs** view the pm2 logs output. Or you could just run pm2 logs yourself