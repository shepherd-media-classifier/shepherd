# ar-blacklist

Server that creates & maintains a strict adult content filter list.

Notes: 
- This is a work in progress. 
- Expect false positives. The aim is to have zero adult content get through.

## initial set up instructions

### prerequisites

1. docker & docker-compose

2. create .env file and enter *all* required values (see .env.example)
<!-- - `docker-compose up --build` (add `-d` to detach) -->

3. run and install

```bash
npm install
npm start
```