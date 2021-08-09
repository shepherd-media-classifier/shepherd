import knex, { Knex } from 'knex'
import { logger } from './logger';

let cachedConnection: Knex<any, unknown[]>

export default () => {
  if (cachedConnection) {
    logger("using cached db connection");
    return cachedConnection;
  }

	logger("creating new db connection");
	const connection = knex({
		client: 'pg',
		pool: {
			propagateCreateError: false,
		},
		connection: {
			host: process.env.DB_HOST,
			port: 5432,
			user: process.env.DB_USER,
			password: process.env.DB_PWD,
			database: 'arblacklist',
		}
	})
  cachedConnection = connection;
  return connection;
};
