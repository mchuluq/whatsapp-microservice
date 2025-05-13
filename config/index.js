require('dotenv').config();

module.exports = {
	app: {
		port: process.env.PORT || 3000,
		environment: process.env.NODE_ENV || 'development',
		debugMode: process.env.DEBUG_MODE === 'true',
		logLevel: process.env.LOG_LEVEL || 'info'
	},
	redis: {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379'),
		password: process.env.REDIS_PASSWORD || undefined,
		db: parseInt(process.env.REDIS_DB || '0')
	},
	security: {
		apiToken: process.env.API_TOKEN || 'default-api-token-please-change'
	},
	whatsapp: {
		dataPath: process.env.WA_DATA_PATH || './wa-sessions',
		minMessageDelay: parseInt(process.env.MIN_MESSAGE_DELAY || '2000'),
		maxMessageDelay: parseInt(process.env.MAX_MESSAGE_DELAY || '5000'),
		temporaryMediaPath: process.env.TEMP_MEDIA_PATH || './media',
	},
	queue : {
		retryCount : parseInt(process.env.QUEUE_RETRY_COUNT || '2'),
		retryDelay : parseInt(process.env.QUEUE_RETRY_DELAY || '3000'),
	}
};