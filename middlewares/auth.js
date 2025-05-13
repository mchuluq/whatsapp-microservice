const config = require('../config');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate API requests using token
 */
const authenticateToken = (req, res, next) => {
	// Get token from header
	const token = req.headers['x-api-token'];
	
	// Check if token exists
	if (!token) {
		logger.warn(`Unauthorized access attempt: Missing API token`);
		return res.status(401).json({ 
			success: false, 
			message: 'Access denied. API token is required' 
		});
	}

	// Validate token
	if (token !== config.security.apiToken) {
		logger.warn(`Unauthorized access attempt: Invalid API token provided`);
		return res.status(403).json({ 
			success: false, 
			message: 'Access denied. Invalid API token' 
		});
	}
	next();
};

module.exports = {
  	authenticateToken
};