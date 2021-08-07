# shepherd

This server produces a blacklist that you can load in to an Arweave node, in order to protect it from storing and serving adult material.

It creates & maintains a strict adult content blacklist. This should be loaded by your Arweave node using the CLI parameter detailed below in the Usage section. Your node will refresh the list as it updates, automatically adding the new content to be blacklisted by your node.

>Notes: 
>- This is a work in progress. Bug reports appreciated :-) just open a github issue.
>- Expect false positives. The aim is to have zero adult content get through.


## Prerequisites

1. less than 3GB of free disk space

2. install docker & docker-compose

3. install nodejs (the version should not matter)

3. create a `.env` file and enter all required values (e.g. `cp .env.example .env`)

## Install and run

> Note well: Do **not** run 'npm install'

Clone this repo and cd in to the `ar-blacklist` directory. Run this command

```
npm start
```
That's it!

## Usage

### Initial Set Up

On initial start it will take some time (maybe 24 hours for example) to read in and categorize all media files from the permaweb. Expect the server to run hot during this initial phase.

You can check on progress using logs
```
npm run logs
```
but there's no need to wait for it to sync to the latest block, you can start using the list produced straight away.

### Load and Use the Blacklist

Your new blacklist server will expose a list of blacklisted content on the `/blacklist.txt` route. Either locally by `http://localhost/blacklist.txt` or remotely by IP address `http://<YOUR-IP-ADDRESS>/blacklist.txt`

You can use this in the CLI start command of your Arweave node by adding the `transaction_blacklist_url` parameter. For example, if your node & blacklist are running on the same server:
```
./bin/start mine mining_addr <YOUR-MINING-ADDRESS> transaction_blacklist_url http://localhost/blacklist.txt peer 188.166.200.45 peer 188.166.192.169 peer 163.47.11.64 peer 139.59.51.59 peer 138.197.232.192
```
otherwise you can add it via your blacklist server's IP address. 

### Final Thoughts

Your arweave node will automatically refresh and update blacklisted content as the list grows. There should be no more needed to be done. If you find that there are other tasks to be performed, please open a GitHub issue, thanks!