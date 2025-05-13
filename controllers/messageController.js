const queueService = require('../services/queue');
const sessionService = require('../services/session');
const logger = require('../utils/logger');
const config = require('../config');
const { validatePhoneNumber } = require('../utils/helpers');
const crypto = require('crypto');
const path = require('path');

/**
 * Send message to one or multiple recipients
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const sendMessage = async (req, res, next) => {
	try {
		let { unit_id, recipients, message, media, document, debug_mode } = req.body;

		// sesuaikan format penerima
		if(typeof recipients === 'string') {
			try {
				recipients = JSON.parse(recipients);
			}catch (error) {
				recipients = recipients.split(',').map(r => r.trim());
			}
		}

		// Handle media from form-data
		if (req.files && req.files.media) {
			const mediaFile = req.files.media;
			const tempFileName = `${crypto.randomBytes(16).toString('hex')}-${path.extname(mediaFile.name)}`;
			const tempFilePath = path.join(config.whatsapp.temporaryMediaPath, tempFileName);
			await mediaFile.mv(tempFilePath);

			media = {
				path: tempFilePath,
				mimetype: mediaFile.mimetype,
				filename: mediaFile.name
			};
		}

		// Handle document from form-data
		if (req.files && req.files.document) {
			const docFile = req.files.document;
			const tempFileName = `${crypto.randomBytes(16).toString('hex')}-${path.extname(docFile.name)}`;
			const tempFilePath = path.join(config.whatsapp.temporaryMediaPath, tempFileName);
			await docFile.mv(tempFilePath);

			document = {
				path: tempFilePath,
				mimetype: docFile.mimetype,
				filename: docFile.name
			};
		}

		// Convert debugMode to boolean if it's string
		if (typeof debug_mode === 'string') {
			debug_mode = debug_mode.toLowerCase() === 'true';
		}
		
		// Validate request body
		if (!unit_id) {
			return res.status(400).json({
				success: false,
				message: 'unit_id is required'
			});
		}
		
		if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
			return res.status(400).json({
				success: false,
				message: 'At least one recipient is required'
			});
		}
		
		if (!message || (!message && !media && !document)) {
			return res.status(400).json({
				success: false,
				message: 'Message content is required (text, media, or document)'
			});
		}
		
		// Check if session exists and is ready
		if (!sessionService.isSessionReady(unit_id)) {
			return res.status(400).json({
				success: false,
				message: `WhatsApp session for unit_id ${unit_id} is not ready`
			});
		}
		
		// Validate phone numbers
		const recipientList = Array.isArray(recipients) ? recipients : [recipients];
		const invalidNumbers = recipientList.filter(num => !validatePhoneNumber(num));
		
		if (invalidNumbers.length > 0) {
			return res.status(400).json({
				success: false,
				message: 'Invalid phone number(s) found',
				invalidNumbers
			});
		}
		
		// Determine debug mode
		const useDebugMode = (debug_mode === true) ||  (debug_mode === undefined && config.app.debugMode === true);
		
		logger.info(`Queuing message from unit_id ${unit_id} to ${recipientList.length} recipient(s)`);
		
		// Queue message
		const result = await queueService.queueMessage(
			unit_id,
			recipientList,
			{
				text : message,
				media: media,
				document: document
			},
			useDebugMode
		);
		
		res.status(202).json({
			success: true,
			message: 'Message queued successfully',
			data: result
		});
	} catch (error) {
		logger.error(`Error queuing message: ${error.message}`);
		next(error);
	}
};

/**
 * Get queue statistics
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const getQueueStats = async (req, res, next) => {
	try {
		const { unit_id } = req.params;
		if (unit_id) {
			// Get stats for specific unitId
			logger.info(`Getting queue statistics for unitId: ${unit_id}`);			
			try {
				const stats = await queueService.getQueueStats(unit_id);				
				res.status(200).json({
					success: true,
					data: stats
				});
			} catch (error) {
				return res.status(404).json({
					success: false,
					message: `No queue found for unitId: ${unit_id}`
				});
			}
		} else {
			// Get stats for all queues
			logger.info('Getting queue statistics for all units');
			const stats = await queueService.getAllQueuesStats();			
			res.status(200).json({
				success: true,
				count: stats.length,
				data: stats
			});
		}
	} catch (error) {
		logger.error(`Error getting queue statistics: ${error.message}`);
		next(error);
	}
};

/**
 * Clear queue for a specific unitId
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const clearQueue = async (req, res, next) => {
	try {
		const { unit_id } = req.params;		
		if (!unit_id) {
			return res.status(400).json({
				success: false,
				message: 'unitId is required'
			});
		}		
		logger.info(`Clearing queue for unitId: ${unit_id}`);
		try {
			const result = await queueService.clearQueue(unit_id);
			res.status(200).json({
				success: true,
				message: `Cleared ${result.removedCount} jobs from queue for unitId ${unit_id}`
			});
		} catch (error) {
			return res.status(404).json({
				success: false,
				message: `No queue found for unitId: ${unit_id}`
			});
		}
	} catch (error) {
		logger.error(`Error clearing queue: ${error.message}`);
		next(error);
	}
};

module.exports = {
	sendMessage,
	getQueueStats,
	clearQueue
};