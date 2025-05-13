const logger = require('../utils/logger');

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
	const statusCode = err.statusCode || 500;
	const errorMessage = err.message || 'Internal Server Error';
	
	// Log the error
	logger.error(`${statusCode} - ${errorMessage} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
	
	// Log stack trace in development mode
	if (process.env.NODE_ENV === 'development') {
		logger.error(err.stack);
	}
	
	// Send error response
	res.status(statusCode).json({
		success: false,
		message: errorMessage,
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	});
};

/**
 * 404 Not Found middleware
 */
const notFound = (req, res, next) => {
	const error = new Error(`Not Found - ${req.originalUrl}`);
	error.statusCode = 404;
	next(error);
};

module.exports = {
	errorHandler,
	notFound
};