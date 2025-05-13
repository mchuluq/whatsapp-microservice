const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('../config');

// Define log directory
const logDir = 'logs';

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp }) => {
  	return `${timestamp} ${level}: ${message}`;
});

// Define transport for daily rotating log files
const fileRotateTransport = new DailyRotateFile({
	filename: path.join(logDir, 'application', 'application-%DATE%.log'),
	datePattern: 'YYYY-MM-DD',
	maxSize: '20m',
	maxFiles: '14d',
	format: combine(
		timestamp(),
		json()
	)
});

// Create logger instance
const logger = createLogger({
	level: config.app.logLevel,
	format: combine(
		timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		json()
	),
	defaultMeta: { service: 'whatsapp-bulk-sender' },
	transports: [
		// Write to all logs with level specified in environment variable or 'info'
		fileRotateTransport,
		// Console transport with color
		new transports.Console({
		format: combine(
			colorize(),
			timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
			consoleFormat
		)
		})
	]
});

// Create a separate logger for WhatsApp events with a different file
const whatsappLogger = createLogger({
	level: config.app.logLevel,
	format: combine(
		timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		json()
	),
	defaultMeta: { service: 'whatsapp-events' },
	transports: [
		new DailyRotateFile({
		filename: path.join(logDir,'whatsapp', 'whatsapp-%DATE%.log'),
		datePattern: 'YYYY-MM-DD',
		maxSize: '20m',
		maxFiles: '14d',
		format: combine(
			timestamp(),
			json()
		)
		}),
		// Also log to console in development
		...(config.app.environment === 'development' ? [
		new transports.Console({
			format: combine(
			colorize(),
			timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
			consoleFormat
			)
		})
		] : [])
	]
});

module.exports = logger;
module.exports.whatsappLogger = whatsappLogger;