# ar-blacklist

Server that creates & maintains a strict adult content filter list.

Notes: 
- This is a work in progress. Bug reports appreciated :-) just open a github issue.
- Expect false positives. The aim is to have zero adult content get through.


## prerequisites

1. install docker & docker-compose

2. create a `.env` file and enter *all* required values (see .env.example)

## install and run

```bash
> docker-compose up --build -d
```

## usage

On initial start it will take some time (maybe 24 hours for example) to read in and categorize all media files from the permaweb. Expect the server to run hot during this initial phase.

Your new server will expose a plain text ('text/plain') list of blacklisted txids separated by newlines. In production mode this can be accessed via 
```
http://localhost/blacklist.txt
```
