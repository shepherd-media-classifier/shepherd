create user dbowner with password 'dbowner';
grant all privileges on database arblacklist to dbowner;

-- Deploy fresh database tables
\i '/docker-entrypoint-initdb.d/tables/txs.sql'




