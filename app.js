const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const routes = require('./routes');
const { restoreSessions } = require('./services/session');
const fileUpload = require('express-fileupload');


// Create Express app
const app = express();

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  	fs.mkdirSync(logDir, { recursive: true });
}

// Create WhatsApp sessions directory if it doesn't exist
const waSessionsDir = path.resolve(config.whatsapp.dataPath);
if (!fs.existsSync(waSessionsDir)) {
  	fs.mkdirSync(waSessionsDir, { recursive: true });
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '50mb' })); // Parse JSON requests with increased limit for media
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded requests
app.use(fileUpload({ 
	limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
	createParentPath: true 
})); // File upload middleware

// Logging middleware
if (config.app.environment === 'development') {
  	app.use(morgan('dev'));
} else {
	// Create a write stream for access logs
	const accessLogStream = fs.createWriteStream(
		path.join(logDir, 'access.log'),
		{ flags: 'a' }
	);
	app.use(morgan('combined', { stream: accessLogStream }));
}

// Mount API routes
app.use('/api', routes);

// Handle 404 errors
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.app.port;
const server = app.listen(PORT, async () => {
	logger.info(`Server running in ${config.app.environment} mode on port ${PORT}`);
	logger.info(`Debug mode: ${config.app.debugMode}`);
	restoreSessions();
});