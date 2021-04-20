### Tear down

- `docker-compose down --remove-orphans`
- `sudo rm -r /mnt/<custom-dir>`

### Set up

- fill out vars in .env
- create a folder for the external volume
- `docker-compose up --build`

### Manual testing

`docker container ps`

`docker exec -it XXXXXXXX psql -U postgres arblacklist`

docker exec -it ar-blacklist_dbpostgres_1 psql -U postgres arblacklist