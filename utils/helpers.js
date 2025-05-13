const config = require('../config');
const path = require('path');

/**
 * Generate a random delay within the specified range
 * @returns {number} Random delay in milliseconds
 */
const getRandomDelay = () => {
	const min = config.whatsapp.minMessageDelay;
	const max = config.whatsapp.maxMessageDelay;
	return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Validate phone number format
 * @param {string} phoneNumber Phone number to validate
 * @returns {string|boolean} Formatted phone number or false if invalid
 */
const validatePhoneNumber = (phoneNumber) => {
	// Remove any non-digit characters
	const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
	
	// Check if it's a valid number (simple validation)
	if (cleanNumber.length < 10) return false;
	
	// Make sure the number has a country code
	return cleanNumber;
};

/**
 * Process message content and attachments
 * @param {Object} message Message object
 * @returns {Object} Processed message object
 */
const processMessageContent = (message) => {
	//console.log('Processing message content:', message);
	const result = {
		hasText: Boolean(message.text && message.text.trim()),
		hasMedia: Boolean(message.media),
		hasDocument: Boolean(message.document),
		content: {},
	};

	if (result.hasText && (!result.hasMedia && !result.hasDocument)) {
	  	result.content.text = message.text.trim();
	}

	if (result.hasMedia) {
		result.hasText = false; // If media is present, text is not needed
		result.content.media = message.media;
		result.content.caption = message.text.trim() || '';
	}

	if (result.hasDocument) {
		result.hasText = false; // If document is present, text is not needed
		result.content.document = message.document;
		result.content.documentFilename = message.documentFilename || 'document';
		result.content.caption = message.text.trim() || '';
	}

	return result;
};

/**
 * Format error messages
 * @param {Error} error Error object
 * @returns {string} Formatted error message
 */
const formatError = (error) => {
  	return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
};

const getErrorLocation = (error) => {
	const stackLines = error.stack.split('\n');
	// Ambil baris pertama yang mengandung file path
	const fileLine = stackLines.find(line => line.includes('file://'));
	if (!fileLine) return '';
	
	// Extract filename dan line number
	const match = fileLine.match(/([^/\\]+:\d+:\d+)/);
	return match ? match[1] : '';
};

/**
 * Extract MIME type from base64 data URI
 * @param {string} base64String Base64 data URI string
 * @returns {string|null} MIME type or null if invalid
 */
const getMimeTypeFromBase64 = (base64String) => {
	if (!base64String || typeof base64String !== 'string') {
		return null;
	}

	try {
		// Check if string starts with data:
		if (!base64String.startsWith('data:')) {
		return null;
		}

		// Extract mime type
		const matches = base64String.match(/^data:([^;]+);base64,/);
		if (!matches || !matches[1]) {
		return null;
		}

		return matches[1];
	} catch (error) {
		return null;
	}
};

/**
 * Get mime type based on file extension
 * @param {string} filePath Path to the file
 * @returns {string} MIME type
 */
const getMimeType = (filePath) => {
	const ext = path.extname(filePath).toLowerCase();
	
	const mimeTypes = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.pdf': 'application/pdf',
		'.doc': 'application/msword',
		'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'.xls': 'application/vnd.ms-excel',
		'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'.ppt': 'application/vnd.ms-powerpoint',
		'.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		'.mp3': 'audio/mpeg',
		'.mp4': 'video/mp4',
		'.wav': 'audio/wav',
		'.txt': 'text/plain',
		'.csv': 'text/csv',
		'.json': 'application/json',
		'.zip': 'application/zip'
	};
	
	return mimeTypes[ext] || 'application/octet-stream';
};

module.exports = {
	getRandomDelay,
	validatePhoneNumber,
	processMessageContent,
	formatError,
	getErrorLocation,
	getMimeTypeFromBase64,
	getMimeType
};