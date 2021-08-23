import knex, { Knex } from 'knex'
import { checkHeartbeat } from 'knex-utils';
import { logger } from './logger';

let cachedConnection: Knex<any, unknown[]>

export default () => {
  if (cachedConnection) {
    logger("using cached db connection");
    return cachedConnection;
  }
	let connTimeout = 60000 //default value
	if(process.env.NODE_ENV === 'test'){
		connTimeout = 2000
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
		},
		acquireConnectionTimeout: connTimeout
	})

	checkHeartbeat(connection).then(res=>{
		if(res.isOk){
			logger('db connection tested OK')
			return
		}
		logger('*** ERROR IN DB CONNECTION ***', JSON.stringify(res))
	})

	cachedConnection = connection;
  return connection;
};
