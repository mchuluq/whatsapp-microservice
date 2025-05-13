const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

const redisConfig = {
	host: config.redis.host,
	port: config.redis.port,
	db: config.redis.db,
};

if (config.redis.password) {
  	redisConfig.password = config.redis.password;
}

const createRedisClient = () => {
	const client = new Redis(redisConfig);
	
	client.on('connect', () => {
		logger.info('Redis client connected');
	});
	
	client.on('error', (err) => {
		logger.error(`Redis client error: ${err}`);
	});
	
	return client;
};

module.exports = {
  	createRedisClient
};